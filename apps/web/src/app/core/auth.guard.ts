import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Session } from './session';

export const authGuard: CanActivateFn = () => {
  const session = inject(Session);
  const router = inject(Router);
  if (session.authed()) return true;
  return router.parseUrl('/login');
};
