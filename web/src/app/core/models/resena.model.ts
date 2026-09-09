export interface Resena {
  id: string;
  pelicula_id: string;
  usuario_id: string;
  estrellas: number;
  comentario: string | null;
  created_at: string;
  nombre: string;
  apellido: string;
}
