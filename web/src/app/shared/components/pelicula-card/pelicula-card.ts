import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Pelicula } from '../../../core/models/pelicula.model';

@Component({
  selector: 'app-pelicula-card',
  imports: [RouterLink],
  templateUrl: './pelicula-card.html',
  styleUrl: './pelicula-card.scss',
})
export class PeliculaCard {
  readonly pelicula = input.required<Pelicula>();
  readonly destacada = input(false);
}
