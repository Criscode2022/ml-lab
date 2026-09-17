import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Session } from '../core/session';

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  template: `
    <main class="lab-shell min-h-screen px-6 py-8 text-text">
      <header class="mx-auto flex max-w-6xl items-center justify-between">
        <div class="font-mono text-sm tracking-[0.22em] text-accent">ML LAB</div>
        <a routerLink="/login" class="text-sm text-muted hover:text-text">Sign in</a>
      </header>
      <section class="mx-auto mt-20 max-w-6xl">
        <p class="text-[11px] font-medium uppercase tracking-[0.22em] text-accent/80">A studio for intuition</p>
        <h1 class="mt-5 max-w-3xl text-5xl font-semibold leading-[1.04] tracking-tight md:text-7xl">
          Guess a line.<br />Watch it learn.<br />Ask why.
        </h1>
        <p class="mt-6 max-w-xl text-lg leading-relaxed text-muted">
          Built for people who have never done machine learning. Start in Basic. Open Advanced when you want the real names.
        </p>
        <div class="mt-10 flex flex-wrap gap-3">
          <a
            [routerLink]="session.authed() ? '/app' : '/register'"
            class="lab-primary rounded-full bg-accent px-7 py-3 text-sm font-semibold text-ink"
          >
            Open the lab
          </a>
          <a routerLink="/login" class="rounded-full border border-line px-7 py-3 text-sm text-text">
            I already have an account
          </a>
        </div>
        <div class="mt-20 grid gap-4 md:grid-cols-3">
          <article class="lab-card rounded-2xl p-5">
            <p class="font-mono text-[11px] text-accent">01</p>
            <h2 class="mt-2 text-base font-medium">Drag</h2>
            <p class="mt-1 text-sm leading-relaxed text-muted">Move a white line through teal dots. The score updates as you go.</p>
          </article>
          <article class="lab-card rounded-2xl p-5">
            <p class="font-mono text-[11px] text-accent">02</p>
            <h2 class="mt-2 text-base font-medium">Let it try</h2>
            <p class="mt-1 text-sm leading-relaxed text-muted">The computer can walk toward a better line — or fail if it steps too hard.</p>
          </article>
          <article class="lab-card rounded-2xl p-5">
            <p class="font-mono text-[11px] text-accent">03</p>
            <h2 class="mt-2 text-base font-medium">Go deeper</h2>
            <p class="mt-1 text-sm leading-relaxed text-muted">Math, code, holdout tests, and a loss surface wait in Advanced. Nothing is forced.</p>
          </article>
        </div>
      </section>
    </main>
  `,
})
export class LandingPage {
  readonly session = inject(Session);
}
