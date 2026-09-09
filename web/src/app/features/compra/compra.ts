import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';
import { FuncionesService } from '../../core/services/funciones.service';
import { PeliculasService } from '../../core/services/peliculas.service';
import { ButacasService } from '../../core/services/butacas.service';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { Funcion } from '../../core/models/funcion.model';
import { Pelicula } from '../../core/models/pelicula.model';
import { Butaca } from '../../core/models/butaca.model';
import { MapaButacas } from '../../shared/components/mapa-butacas/mapa-butacas';

@Component({
  selector: 'app-compra',
  imports: [FormsModule, RouterLink, MapaButacas],
  templateUrl: './compra.html',
  styleUrl: './compra.scss',
})
export class Compra implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly funcionesService = inject(FuncionesService);
  private readonly peliculasService = inject(PeliculasService);
  private readonly butacasService = inject(ButacasService);
  private readonly supabase = inject(SupabaseService);
  protected readonly auth = inject(AuthService);

  private readonly funcionId = this.route.snapshot.paramMap.get('funcionId')!;
  private canal: RealtimeChannel | null = null;

  readonly funcion = signal<Funcion | null>(null);
  readonly pelicula = signal<Pelicula | null>(null);
  readonly butacas = signal<Butaca[]>([]);
  readonly ocupadas = signal<Set<number>>(new Set());
  readonly seleccionadas = signal<Set<number>>(new Set());

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly emailInvitado = signal('');
  readonly confirmoVip = signal(false);
  readonly comprando = signal(false);
  readonly compraFinalizada = signal<{ id: string; cantidad: number } | null>(null);

  readonly butacasSeleccionadas = computed(() => {
    const ids = this.seleccionadas();
    return this.butacas().filter((b) => ids.has(b.id));
  });

  readonly hayVipSeleccionada = computed(() =>
    this.butacasSeleccionadas().some((b) => b.tipo === 'vip'),
  );

  readonly total = computed(() => {
    const f = this.funcion();
    if (!f) return 0;
    return this.butacasSeleccionadas().reduce(
      (acc, b) => acc + (b.tipo === 'vip' ? f.precio_vip : f.precio_base),
      0,
    );
  });

  readonly edadUsuario = computed(() => {
    const perfil = this.auth.perfil();
    if (!perfil) return null;
    const nacimiento = new Date(perfil.fecha_nacimiento);
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad;
  });

  readonly bloqueadoPorEdad = computed(() => {
    const restriccion = this.pelicula()?.restriccion_edad;
    const edad = this.edadUsuario();
    if (!restriccion || edad === null) return false;
    return edad < restriccion;
  });

  readonly puedeComprar = computed(() => {
    if (this.butacasSeleccionadas().length === 0) return false;
    if (this.bloqueadoPorEdad()) return false;
    if (this.hayVipSeleccionada() && !this.confirmoVip()) return false;
    if (!this.auth.estaLogueado() && !this.emailInvitado().trim()) return false;
    return true;
  });

  constructor() {
    this.cargar();
  }

  private async cargar() {
    try {
      const funcion = await this.funcionesService.obtenerPorId(this.funcionId);
      if (!funcion) {
        this.error.set('La función no existe o ya no está disponible.');
        return;
      }
      this.funcion.set(funcion);

      const [pelicula, butacas, ocupadas] = await Promise.all([
        this.peliculasService.obtenerPorId(funcion.pelicula_id),
        this.butacasService.listarPorSala(funcion.sala_id),
        this.butacasService.listarOcupadas(this.funcionId),
      ]);
      this.pelicula.set(pelicula);
      this.butacas.set(butacas);
      this.ocupadas.set(new Set(ocupadas));

      this.canal = this.butacasService.suscribirseAOcupacion(this.funcionId, async () => {
        const actualizadas = await this.butacasService.listarOcupadas(this.funcionId);
        this.ocupadas.set(new Set(actualizadas));
      });
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo cargar la función');
    } finally {
      this.cargando.set(false);
    }
  }

  toggleButaca(butaca: Butaca) {
    const actual = new Set(this.seleccionadas());
    if (actual.has(butaca.id)) {
      actual.delete(butaca.id);
    } else {
      actual.add(butaca.id);
    }
    this.seleccionadas.set(actual);
  }

  async confirmarCompra() {
    const funcion = this.funcion();
    const butacas = this.butacasSeleccionadas();
    if (!funcion || butacas.length === 0) return;

    this.comprando.set(true);
    this.error.set(null);
    try {
      const usuario = this.auth.usuario();
      // Generamos el id en el cliente y no pedimos la fila de vuelta (sin
      // .select()): si lo hiciéramos, Postgres también aplicaría la política
      // de SELECT de "compras" al valor de RETURNING, y una compra de
      // invitado (usuario_id null) no es visible para nadie por esa política
      // -> la inserción entera se rechaza aunque el INSERT fuera válido.
      const compraId = crypto.randomUUID();
      const { error: errorCompra } = await this.supabase.client.from('compras').insert({
        id: compraId,
        usuario_id: usuario?.id ?? null,
        email_invitado: usuario ? null : this.emailInvitado().trim(),
        total: this.total(),
        estado: 'pagada',
      });
      if (errorCompra) throw errorCompra;

      const filas = butacas.map((b) => ({
        compra_id: compraId,
        funcion_id: funcion.id,
        butaca_id: b.id,
        precio: b.tipo === 'vip' ? funcion.precio_vip : funcion.precio_base,
      }));
      const { error: errorEntradas } = await this.supabase.client
        .from('compra_entradas')
        .insert(filas);
      if (errorEntradas) throw errorEntradas;

      this.compraFinalizada.set({ id: compraId, cantidad: butacas.length });
    } catch (e) {
      const mensaje =
        e instanceof Error
          ? e.message
          : typeof e === 'object' && e !== null && 'message' in e
            ? String((e as { message: unknown }).message)
            : 'No se pudo completar la compra. Puede que alguna butaca ya se haya vendido, probá de nuevo.';
      this.error.set(mensaje);
      const actualizadas = await this.butacasService.listarOcupadas(this.funcionId);
      this.ocupadas.set(new Set(actualizadas));
      this.seleccionadas.set(new Set());
    } finally {
      this.comprando.set(false);
    }
  }

  volverAHome() {
    this.router.navigateByUrl('/');
  }

  ngOnDestroy() {
    if (this.canal) this.butacasService.desuscribirse(this.canal);
  }
}
