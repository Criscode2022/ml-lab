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
        <p class="font-mono text-xs uppercase tracking-[0.25em] text-muted">Interactive laboratory</p>
        <h1 class="mt-4 max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
          Learn machine learning by dragging it until it breaks.
        </h1>
        <p class="mt-6 max-w-xl text-lg text-muted">
          Not a course. A lab: noisy data, a live fit, gradient descent you can explode, a Socratic tutor, and Python in a sandbox.
        </p>
        <div class="mt-10 flex flex-wrap gap-4">
          <a
            [routerLink]="session.authed() ? '/app/lab/linear-regression' : '/register'"
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
