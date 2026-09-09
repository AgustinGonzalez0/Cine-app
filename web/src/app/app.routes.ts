import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'registro',
    loadComponent: () => import('./features/auth/registro/registro').then((m) => m.Registro),
  },
  {
    path: 'peliculas/:id',
    loadComponent: () =>
      import('./features/peliculas/detalle/pelicula-detalle').then((m) => m.PeliculaDetalle),
  },
  {
    path: 'compra/:funcionId',
    loadComponent: () => import('./features/compra/compra').then((m) => m.Compra),
  },
];
