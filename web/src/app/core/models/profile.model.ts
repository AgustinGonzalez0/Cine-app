export type RolUsuario = 'cliente' | 'admin' | 'empleado';

export interface Profile {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  tipo_sangre: string | null;
  color_ojos: string | null;
  dias_vacaciones: number | null;
  rol: RolUsuario;
  puntos: number;
  credito: number;
  primera_compra_usada: boolean;
  created_at: string;
}

export interface RegistroForm {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  tipo_sangre?: string;
  color_ojos?: string;
  dias_vacaciones?: number;
}
