import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Session } from '../core/session';

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  template: `
    <main class="min-h-screen bg-ink px-6 py-10 text-text">
      <header class="mx-auto flex max-w-6xl items-center justify-between">
        <div class="font-mono text-sm tracking-[0.2em] text-accent">ML LAB</div>
        <a routerLink="/login" class="text-sm text-muted hover:text-text">Sign in</a>
      </header>
      <section class="mx-auto mt-24 max-w-6xl">
        <p class="font-mono text-xs uppercase tracking-[0.25em] text-muted">A lab to learn and play</p>
        <h1 class="mt-4 max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
          You already know a line. Machine learning is guessing a better one.
        </h1>
        <p class="mt-6 max-w-xl text-lg text-muted">
          Drag it. Watch a score. Let the computer try. Switch to Advanced when you want the real names: MSE, gradient, code.
        </p>
        <div class="mt-10 flex flex-wrap gap-4">
          <a
            [routerLink]="session.authed() ? '/app' : '/register'"
            class="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-ink"
          >
            Enter the laboratory
          </a>
          <a routerLink="/login" class="rounded-full border border-line px-6 py-3 text-sm text-text">
            I already have an account
          </a>
        </div>
      </section>
    </main>
  `,
})
export class LandingPage {
  readonly session = inject(Session);
}
