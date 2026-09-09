import { Injectable, computed, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { Profile, RegistroForm } from '../models/profile.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly session = signal<Session | null>(null);
  private readonly profile = signal<Profile | null>(null);
  private readonly cargando = signal(true);

  readonly usuario = computed(() => this.session()?.user ?? null);
  readonly perfil = this.profile.asReadonly();
  readonly estaLogueado = computed(() => this.usuario() !== null);
  readonly listo = computed(() => !this.cargando());
  readonly rol = computed(() => this.profile()?.rol ?? null);

  constructor(private readonly supabase: SupabaseService) {
    this.supabase.client.auth.getSession().then(({ data }) => {
      this.session.set(data.session);
      this.cargarPerfil(data.session);
      this.cargando.set(false);
    });

    this.supabase.client.auth.onAuthStateChange((_event, session) => {
      this.session.set(session);
      this.cargarPerfil(session);
    });
  }

  private async cargarPerfil(session: Session | null) {
    if (!session) {
      this.profile.set(null);
      return;
    }
    const { data } = await this.supabase.client
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();
    this.profile.set(data as Profile | null);
  }

  async registrarse(datos: RegistroForm) {
    const { data, error } = await this.supabase.client.auth.signUp({
      email: datos.email,
      password: datos.password,
    });
    if (error) throw error;

    if (data.session) {
      const { error: perfilError } = await this.supabase.client.from('profiles').insert({
        id: data.user!.id,
        email: datos.email,
        nombre: datos.nombre,
        apellido: datos.apellido,
        fecha_nacimiento: datos.fecha_nacimiento,
        tipo_sangre: datos.tipo_sangre ?? null,
        color_ojos: datos.color_ojos ?? null,
        dias_vacaciones: datos.dias_vacaciones ?? null,
      });
      if (perfilError) throw perfilError;
      await this.cargarPerfil(data.session);
    }

    return data;
  }

  async iniciarSesion(email: string, password: string) {
    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  async cerrarSesion() {
    await this.supabase.client.auth.signOut();
  }
}
