import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../core/api';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  template: `
    <div class="space-y-8">
      <div>
        <p class="font-mono text-xs uppercase tracking-[0.2em] text-muted">Current objective</p>
        <h1 class="mt-1 text-3xl font-semibold">Continue learning</h1>
      </div>
      <div class="grid gap-4 md:grid-cols-3">
        <article class="rounded-2xl border border-line bg-panel p-5">
          <p class="text-xs uppercase tracking-wide text-muted">Current concept</p>
          <p class="mt-2 text-xl">Linear Regression</p>
        </article>
        <article class="rounded-2xl border border-line bg-panel p-5">
          <p class="text-xs uppercase tracking-wide text-muted">Progress</p>
          <p class="mt-2 font-mono text-xl text-accent">{{ masteryLabel() }}</p>
        </article>
        <article class="rounded-2xl border border-line bg-panel p-5">
          <p class="text-xs uppercase tracking-wide text-muted">Next step</p>
          <p class="mt-2 text-sm text-muted">{{ rec() }}</p>
        </article>
      </div>
      <a routerLink="/app/lab/linear-regression" class="inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink">
        Open laboratory
      </a>
      <section>
        <h2 class="text-xs uppercase tracking-wide text-muted">Recent experiments</h2>
        <ul class="mt-3 space-y-2">
          @for (e of experiments(); track e.id) {
            <li>
              <a class="block rounded-xl border border-line px-4 py-3 text-sm hover:border-accent" [routerLink]="['/app/lab/linear-regression', e.id]">
                {{ e.name }}
              </a>
            </li>
          } @empty {
            <li class="text-sm text-muted">None yet — the lab will save what you run.</li>
          }
        </ul>
      </section>
    </div>
  `,
})
export class DashboardPage {
  private readonly api = inject(Api);
  readonly rec = signal('7-minute Linear Regression experiment');
  readonly masteryLabel = signal('—');
  readonly experiments = signal<Array<{ id: string; name: string }>>([]);

  constructor() {
    this.api.progress().subscribe({
      next: (p) => {
        this.rec.set(p.recommendation.reason);
        const lr = p.items.find((i) => i.conceptId === 'linear-regression');
        this.masteryLabel.set(lr ? `${Math.round(lr.mastery * 100)}%` : '0%');
      },
    });
    this.api.listExperiments().subscribe({
      next: (rows) => this.experiments.set(rows.map((r) => ({ id: r.id!, name: r.name }))),
    });
  }
}
