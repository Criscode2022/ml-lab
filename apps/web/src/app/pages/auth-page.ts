import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../core/api';
import { Session } from '../core/session';

@Component({
  selector: 'app-auth',
  imports: [RouterLink],
  template: `
    <main class="flex min-h-screen items-center justify-center bg-ink px-6">
      <form class="w-full max-w-sm rounded-2xl border border-line bg-panel p-8" (submit)="submit($event)">
        <div class="font-mono text-xs tracking-[0.2em] text-accent">ML LAB</div>
        <h1 class="mt-3 text-2xl font-semibold">{{ mode() === 'register' ? 'Create account' : 'Sign in' }}</h1>
        @if (mode() === 'register') {
          <label class="mt-6 block text-xs text-muted">Name
            <input class="mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm" [value]="name()" (input)="name.set($any($event.target).value)" />
          </label>
        }
        <label class="mt-4 block text-xs text-muted">Email
          <input type="email" required class="mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm" [value]="email()" (input)="email.set($any($event.target).value)" />
        </label>
        <label class="mt-4 block text-xs text-muted">Password
          <input type="password" required minlength="8" class="mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm" [value]="password()" (input)="password.set($any($event.target).value)" />
        </label>
        @if (error()) {
          <p class="mt-3 text-sm text-danger" role="alert">{{ error() }}</p>
        }
        <button class="mt-6 w-full rounded-full bg-accent py-2.5 text-sm font-semibold text-ink" type="submit">
          {{ mode() === 'register' ? 'Create account' : 'Sign in' }}
        </button>
        <p class="mt-4 text-center text-sm text-muted">
          @if (mode() === 'register') {
            <a routerLink="/login" class="text-accent">Already registered?</a>
          } @else {
            <a routerLink="/register" class="text-accent">Need an account?</a>
          }
        </p>
      </form>
    </main>
  `,
})
export class AuthPage {
  private readonly api = inject(Api);
  private readonly session = inject(Session);
  private readonly router = inject(Router);
  readonly mode = signal(this.router.url.includes('register') ? 'register' : 'login');
  readonly email = signal('');
  readonly password = signal('');
  readonly name = signal('');
  readonly error = signal('');

  submit(ev: Event) {
    ev.preventDefault();
    this.error.set('');
    const req =
      this.mode() === 'register'
        ? this.api.register(this.email(), this.password(), this.name() || 'Learner')
        : this.api.login(this.email(), this.password());
    req.subscribe({
      next: (res) => {
        this.session.set(res.token, res.user.email);
        void this.router.navigateByUrl(this.mode() === 'register' ? '/app/onboarding' : '/app');
      },
      error: (err: { error?: { message?: string } }) => {
        this.error.set(err.error?.message ?? 'Could not authenticate');
      },
    });
  }
}
