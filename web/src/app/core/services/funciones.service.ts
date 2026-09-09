import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Funcion } from '../models/funcion.model';

@Injectable({ providedIn: 'root' })
export class FuncionesService {
  constructor(private readonly supabase: SupabaseService) {}

  async listarPorPelicula(peliculaId: string): Promise<Funcion[]> {
    const { data, error } = await this.supabase.client
      .from('funciones')
      .select('*, salas(nombre)')
      .eq('pelicula_id', peliculaId)
      .gte('inicio', new Date().toISOString())
      .order('inicio', { ascending: true });
    if (error) throw error;
    return data as unknown as Funcion[];
  }

  async obtenerPorId(id: string): Promise<Funcion | null> {
    const { data, error } = await this.supabase.client
      .from('funciones')
      .select('*, salas(nombre)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as unknown as Funcion | null;
  }
}
