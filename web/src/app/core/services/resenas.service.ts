import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Resena } from '../models/resena.model';

@Injectable({ providedIn: 'root' })
export class ResenasService {
  constructor(private readonly supabase: SupabaseService) {}

  async listarPorPelicula(peliculaId: string): Promise<Resena[]> {
    const { data, error } = await this.supabase.client
      .from('vista_resenas')
      .select('*')
      .eq('pelicula_id', peliculaId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Resena[];
  }

  async miResena(peliculaId: string, usuarioId: string): Promise<Resena | null> {
    const { data, error } = await this.supabase.client
      .from('vista_resenas')
      .select('*')
      .eq('pelicula_id', peliculaId)
      .eq('usuario_id', usuarioId)
      .maybeSingle();
    if (error) throw error;
    return data as Resena | null;
  }

  async guardar(peliculaId: string, usuarioId: string, estrellas: number, comentario: string) {
    const { error } = await this.supabase.client.from('resenas').upsert(
      {
        pelicula_id: peliculaId,
        usuario_id: usuarioId,
        estrellas,
        comentario: comentario || null,
      },
      { onConflict: 'pelicula_id,usuario_id' },
    );
    if (error) throw error;
  }
}
