import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/landing').then((m) => m.LandingPage) },
  { path: 'login', loadComponent: () => import('./pages/auth-page').then((m) => m.AuthPage) },
  { path: 'register', loadComponent: () => import('./pages/auth-page').then((m) => m.AuthPage) },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./shell/shell').then((m) => m.Shell),
    children: [
      { path: '', loadComponent: () => import('./pages/dashboard').then((m) => m.DashboardPage) },
      { path: 'onboarding', loadComponent: () => import('./pages/onboarding').then((m) => m.OnboardingPage) },
      {
        path: 'lab/linear-regression',
        loadComponent: () => import('./pages/lab-page').then((m) => m.LabPage),
      },
      {
        path: 'lab/linear-regression/:id',
        loadComponent: () => import('./pages/lab-page').then((m) => m.LabPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
