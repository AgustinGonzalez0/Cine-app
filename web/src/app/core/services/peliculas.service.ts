import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Pelicula } from '../models/pelicula.model';

@Injectable({ providedIn: 'root' })
export class PeliculasService {
  constructor(private readonly supabase: SupabaseService) {}

  async listarCartelera(): Promise<Pelicula[]> {
    const { data, error } = await this.supabase.client
      .from('vista_peliculas')
      .select('*')
      .eq('activa', true)
      .order('fecha_estreno', { ascending: false });
    if (error) throw error;
    return data as Pelicula[];
  }

  async listarGeneros(): Promise<string[]> {
    const { data, error } = await this.supabase.client
      .from('generos')
      .select('nombre')
      .order('nombre');
    if (error) throw error;
    return (data ?? []).map((g) => g.nombre as string);
  }

  async obtenerPorId(id: string): Promise<Pelicula | null> {
    const { data, error } = await this.supabase.client
      .from('vista_peliculas')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as Pelicula | null;
  }
}
