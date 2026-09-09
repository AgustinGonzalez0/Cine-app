import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.estaLogueado()) return true;
  return router.createUrlTree(['/login']);
};

export const rolGuard = (roles: Array<'admin' | 'empleado'>): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const rol = auth.rol();
    if (rol && roles.includes(rol as 'admin' | 'empleado')) return true;
    return router.createUrlTree(['/']);
  };
};
