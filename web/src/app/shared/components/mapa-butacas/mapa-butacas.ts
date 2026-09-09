import { Component, computed, input, output } from '@angular/core';
import { Butaca } from '../../../core/models/butaca.model';

interface FilaVisual {
  fila: string;
  bloques: Butaca[][];
}

@Component({
  selector: 'app-mapa-butacas',
  imports: [],
  templateUrl: './mapa-butacas.html',
  styleUrl: './mapa-butacas.scss',
})
export class MapaButacas {
  readonly butacas = input.required<Butaca[]>();
  readonly ocupadas = input.required<Set<number>>();
  readonly seleccionadas = input.required<Set<number>>();

  readonly toggle = output<Butaca>();

  private bloqueDe(columna: number): number {
    return Math.floor((columna - 1) / 100);
  }

  readonly filas = computed<FilaVisual[]>(() => {
    const porFila = new Map<string, Butaca[]>();
    for (const b of this.butacas()) {
      if (!porFila.has(b.fila)) porFila.set(b.fila, []);
      porFila.get(b.fila)!.push(b);
    }
    return Array.from(porFila.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fila, lista]) => {
        const bloques: Butaca[][] = [[], [], []];
        for (const b of lista) {
          bloques[this.bloqueDe(b.columna)].push(b);
        }
        bloques.forEach((bloque) => bloque.sort((a, b) => a.columna - b.columna));
        return { fila, bloques };
      });
  });

  estadoDe(butaca: Butaca): 'ocupada' | 'seleccionada' | 'vip' | 'accesible' | 'normal' {
    if (this.ocupadas().has(butaca.id)) return 'ocupada';
    if (this.seleccionadas().has(butaca.id)) return 'seleccionada';
    return butaca.tipo;
  }

  onClick(butaca: Butaca) {
    if (this.ocupadas().has(butaca.id)) return;
    this.toggle.emit(butaca);
  }
}
