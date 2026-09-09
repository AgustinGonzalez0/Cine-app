import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './registro.html',
  styleUrl: './registro.scss',
})
export class Registro {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    fecha_nacimiento: ['', Validators.required],
    tipo_sangre: [''],
    color_ojos: [''],
    dias_vacaciones: [null as number | null],
  });

  readonly error = signal<string | null>(null);
  readonly cargando = signal(false);
  readonly confirmarEmail = signal(false);

  async enviar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.error.set(null);
    this.cargando.set(true);
    try {
      const valores = this.form.getRawValue();
      const resultado = await this.auth.registrarse({
        email: valores.email,
        password: valores.password,
        nombre: valores.nombre,
        apellido: valores.apellido,
        fecha_nacimiento: valores.fecha_nacimiento,
        tipo_sangre: valores.tipo_sangre || undefined,
        color_ojos: valores.color_ojos || undefined,
        dias_vacaciones: valores.dias_vacaciones ?? undefined,
      });

      if (resultado.session) {
        this.router.navigateByUrl('/');
      } else {
        this.confirmarEmail.set(true);
      }
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo completar el registro');
    } finally {
      this.cargando.set(false);
    }
  }
}
