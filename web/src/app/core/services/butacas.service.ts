import { Injectable } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { Butaca } from '../models/butaca.model';

@Injectable({ providedIn: 'root' })
export class ButacasService {
  constructor(private readonly supabase: SupabaseService) {}

  async listarPorSala(salaId: number): Promise<Butaca[]> {
    const { data, error } = await this.supabase.client
      .from('butacas')
      .select('*')
      .eq('sala_id', salaId)
      .order('fila')
      .order('columna');
    if (error) throw error;
    return data as Butaca[];
  }

  /**
   * Butacas ya reservadas/vendidas para una función (excluye compras
   * canceladas). Lee de `ocupacion_butacas`, una tabla espejo pública sin
   * datos sensibles, mantenida por triggers a partir de `compra_entradas`
   * y `compras` (ver migración 0005): así cualquier visitante puede ver
   * qué butacas están ocupadas sin que el RLS de las compras se lo impida.
   */
  async listarOcupadas(funcionId: string): Promise<number[]> {
    const { data, error } = await this.supabase.client
      .from('ocupacion_butacas')
      .select('butaca_id')
      .eq('funcion_id', funcionId);
    if (error) throw error;
    return (data ?? []).map((d) => d['butaca_id'] as number);
  }

  /** Se suscribe a cambios en tiempo real de las butacas ocupadas para esa función. */
  suscribirseAOcupacion(funcionId: string, onCambio: () => void): RealtimeChannel {
    return this.supabase.client
      .channel(`ocupacion-funcion-${funcionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ocupacion_butacas',
          filter: `funcion_id=eq.${funcionId}`,
        },
        () => onCambio(),
      )
      .subscribe();
  }

  desuscribirse(canal: RealtimeChannel) {
    this.supabase.client.removeChannel(canal);
  }
}
