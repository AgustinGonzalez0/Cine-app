export type FormatoPelicula = '2D' | '3D' | '4D' | '5D';
export type IdiomaPelicula = 'castellano' | 'subtitulada';

export interface Pelicula {
  id: string;
  nombre: string;
  sinopsis: string;
  imagen_url: string | null;
  duracion_minutos: number;
  formato: FormatoPelicula;
  idioma: IdiomaPelicula;
  restriccion_edad: number | null;
  fecha_estreno: string;
  precio_preventa: number | null;
  dias_preventa: number;
  activa: boolean;
  created_at: string;
  promedio_estrellas: number;
  cantidad_resenas: number;
  entradas_vendidas: number;
  generos: string[];
}
