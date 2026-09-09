import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PeliculasService } from '../../core/services/peliculas.service';
import { Pelicula } from '../../core/models/pelicula.model';
import { PeliculaCard } from '../../shared/components/pelicula-card/pelicula-card';

@Component({
  selector: 'app-home',
  imports: [FormsModule, PeliculaCard],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly peliculasService = inject(PeliculasService);

  readonly peliculas = signal<Pelicula[]>([]);
  readonly generosDisponibles = signal<string[]>([]);
  readonly generosSeleccionados = signal<Set<string>>(new Set());
  readonly busqueda = signal('');
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly masVendidas = computed(() =>
    [...this.peliculas()]
      .sort((a, b) => b.entradas_vendidas - a.entradas_vendidas)
      .slice(0, 3),
  );

  readonly resultados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const generos = this.generosSeleccionados();
    return this.peliculas().filter((p) => {
      const matchTexto = !texto || p.nombre.toLowerCase().includes(texto);
      const matchGenero = generos.size === 0 || p.generos.some((g) => generos.has(g));
      return matchTexto && matchGenero;
    });
  });

  constructor() {
    this.cargar();
  }

  private async cargar() {
    try {
      const [peliculas, generos] = await Promise.all([
        this.peliculasService.listarCartelera(),
        this.peliculasService.listarGeneros(),
      ]);
      this.peliculas.set(peliculas);
      this.generosDisponibles.set(generos);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo cargar la cartelera');
    } finally {
      this.cargando.set(false);
    }
  }

  toggleGenero(genero: string) {
    const actual = new Set(this.generosSeleccionados());
    if (actual.has(genero)) {
      actual.delete(genero);
    } else {
      actual.add(genero);
    }
    this.generosSeleccionados.set(actual);
  }
}
