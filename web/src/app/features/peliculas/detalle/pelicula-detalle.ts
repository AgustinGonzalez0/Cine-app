import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PeliculasService } from '../../../core/services/peliculas.service';
import { FuncionesService } from '../../../core/services/funciones.service';
import { ResenasService } from '../../../core/services/resenas.service';
import { AuthService } from '../../../core/services/auth.service';
import { Pelicula } from '../../../core/models/pelicula.model';
import { Funcion } from '../../../core/models/funcion.model';
import { Resena } from '../../../core/models/resena.model';

@Component({
  selector: 'app-pelicula-detalle',
  imports: [FormsModule, RouterLink],
  templateUrl: './pelicula-detalle.html',
  styleUrl: './pelicula-detalle.scss',
})
export class PeliculaDetalle {
  private readonly route = inject(ActivatedRoute);
  private readonly peliculasService = inject(PeliculasService);
  private readonly funcionesService = inject(FuncionesService);
  private readonly resenasService = inject(ResenasService);
  protected readonly auth = inject(AuthService);

  readonly pelicula = signal<Pelicula | null>(null);
  readonly funciones = signal<Funcion[]>([]);
  readonly resenas = signal<Resena[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly miEstrellas = signal(5);
  readonly miComentario = signal('');
  readonly guardandoResena = signal(false);

  readonly funcionesPorDia = computed(() => {
    const grupos = new Map<string, Funcion[]>();
    for (const f of this.funciones()) {
      const dia = new Date(f.inicio).toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      if (!grupos.has(dia)) grupos.set(dia, []);
      grupos.get(dia)!.push(f);
    }
    return Array.from(grupos.entries());
  });

  constructor() {
    this.cargar();
  }

  private async cargar() {
    const id = this.route.snapshot.paramMap.get('id')!;
    try {
      const [pelicula, funciones, resenas] = await Promise.all([
        this.peliculasService.obtenerPorId(id),
        this.funcionesService.listarPorPelicula(id),
        this.resenasService.listarPorPelicula(id),
      ]);
      this.pelicula.set(pelicula);
      this.funciones.set(funciones);
      this.resenas.set(resenas);

      const usuario = this.auth.usuario();
      if (usuario) {
        const mia = resenas.find((r) => r.usuario_id === usuario.id);
        if (mia) {
          this.miEstrellas.set(mia.estrellas);
          this.miComentario.set(mia.comentario ?? '');
        }
      }
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo cargar la película');
    } finally {
      this.cargando.set(false);
    }
  }

  async enviarResena() {
    const usuario = this.auth.usuario();
    const pelicula = this.pelicula();
    if (!usuario || !pelicula) return;

    this.guardandoResena.set(true);
    try {
      await this.resenasService.guardar(
        pelicula.id,
        usuario.id,
        this.miEstrellas(),
        this.miComentario(),
      );
      this.resenas.set(await this.resenasService.listarPorPelicula(pelicula.id));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo guardar la reseña');
    } finally {
      this.guardandoResena.set(false);
    }
  }

  formatoHora(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }
}
