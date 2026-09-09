import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TOKEN_KEY } from './auth.interceptor';

@Injectable({ providedIn: 'root' })
export class Session {
  readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  readonly email = signal<string | null>(localStorage.getItem('ml-lab-email'));
  readonly authed = computed(() => Boolean(this.token()));

  constructor(private readonly router: Router) {}

  set(token: string, email: string) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem('ml-lab-email', email);
    this.token.set(token);
    this.email.set(email);
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('ml-lab-email');
    this.token.set(null);
    this.email.set(null);
    void this.router.navigateByUrl('/');
  }
}
