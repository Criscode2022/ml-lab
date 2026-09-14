import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { t } from '@ml-lab/i18n';
import { Api } from '../core/api';
import { LABS } from '../lab/catalog';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  template: `
    <div class="mx-auto max-w-5xl space-y-8 p-6">
      <div>
        <p class="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{{ t('labs') }}</p>
        <h1 class="mt-1 text-3xl font-semibold tracking-tight">Pick an instrument. Nothing is gated.</h1>
        <p class="mt-2 max-w-xl text-sm text-muted">
          Ready labs run now. The others are listed so the map is honest — open them when they exist.
        </p>
      </div>
      <div class="grid gap-3 md:grid-cols-2">
        @for (lab of labs; track lab.id) {
          <a
            [routerLink]="lab.href"
            class="rounded-2xl border border-line bg-panel p-5 transition hover:border-accent/50"
          >
            <div class="flex items-center justify-between">
              <p class="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{{ lab.cluster }}</p>
              <span class="font-mono text-[10px]" [class.text-accent]="lab.ready" [class.text-muted]="!lab.ready">
                {{ lab.ready ? 'ready' : 'not built' }}
              </span>
            </div>
            <h2 class="mt-2 text-lg font-medium">{{ lab.title }}</h2>
            <p class="mt-1 text-sm text-muted">{{ lab.blurb }}</p>
          </a>
        }
      </div>
      <div class="grid gap-4 md:grid-cols-2">
        <article class="rounded-2xl border border-line bg-panel p-5">
          <p class="text-xs uppercase tracking-wide text-muted">{{ t('progress') }}</p>
          <p class="mt-2 font-mono text-xl text-accent">{{ masteryLabel() }}</p>
          <p class="mt-2 text-sm text-muted">{{ rec() }}</p>
        </article>
        <article class="rounded-2xl border border-line bg-panel p-5">
          <p class="text-xs uppercase tracking-wide text-muted">{{ t('recentExperiments') }}</p>
          <ul class="mt-3 space-y-2">
            @for (e of experiments(); track e.id) {
              <li>
                <a class="text-sm text-accent hover:underline" [routerLink]="['/app/lab/linear-regression', e.id]">
                  {{ e.name }}
                </a>
              </li>
            } @empty {
              <li class="text-sm text-muted">Nothing saved yet.</li>
            }
          </ul>
        </article>
      </div>
    </div>
  `,
})
export class DashboardPage {
  private readonly api = inject(Api);
  readonly t = t;
  readonly labs = LABS;
  readonly rec = signal('');
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
