import { FormatoPelicula, IdiomaPelicula } from './pelicula.model';

export interface Funcion {
  id: string;
  pelicula_id: string;
  sala_id: number;
  inicio: string;
  fin: string;
  formato: FormatoPelicula;
  idioma: IdiomaPelicula;
  precio_base: number;
  precio_vip: number;
  es_preventa: boolean;
  salas?: { nombre: string };
}
