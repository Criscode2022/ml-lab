import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { ExperienceLevel, LearningGoal } from '@ml-lab/contracts';
import { Api } from '../core/api';

@Component({
  selector: 'app-onboarding',
  template: `
    <div class="mx-auto max-w-2xl px-6 py-10">
      <p class="font-mono text-xs uppercase tracking-[0.2em] text-muted">How should we start?</p>
      <h1 class="mt-2 text-3xl font-semibold">A path, then an experiment — not a syllabus.</h1>
      <div class="mt-8 space-y-6">
        <fieldset>
          <legend class="text-xs uppercase tracking-wide text-muted">Goal</legend>
          <div class="mt-2 grid gap-2 md:grid-cols-2">
            @for (g of goals; track g.id) {
              <button type="button" class="rounded-xl border px-3 py-2 text-left text-sm"
                [class.border-accent]="goal() === g.id"
                [class.border-line]="goal() !== g.id"
                (click)="goal.set(g.id)">{{ g.label }}</button>
            }
          </div>
        </fieldset>
        <fieldset>
          <legend class="text-xs uppercase tracking-wide text-muted">Experience</legend>
          <div class="mt-2 grid gap-2">
            @for (e of levels; track e.id) {
              <button type="button" class="rounded-xl border px-3 py-2 text-left text-sm"
                [class.border-accent]="level() === e.id"
                [class.border-line]="level() !== e.id"
                (click)="level.set(e.id)">{{ e.label }}</button>
            }
          </div>
        </fieldset>
        <label class="block text-xs uppercase tracking-wide text-muted">Minutes you can spend
          <input type="range" min="10" max="60" step="5" class="mt-2 w-full" [value]="minutes()" (input)="minutes.set(+$any($event.target).value)" />
          <span class="font-mono text-accent">{{ minutes() }}</span>
        </label>
        <button type="button" class="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-ink" (click)="go()">
          Start Linear Regression
        </button>
      </div>
    </div>
  `,
})
export class OnboardingPage {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  readonly goal = signal<LearningGoal>('understand-ml');
  readonly level = signal<ExperienceLevel>('beginner');
  readonly minutes = signal(20);
  readonly goals: { id: LearningGoal; label: string }[] = [
    { id: 'understand-ml', label: 'Understand ML' },
    { id: 'ml-engineer', label: 'Become an ML engineer' },
    { id: 'interviews', label: 'Prepare for interviews' },
    { id: 'mathematics', label: 'Understand the mathematics' },
    { id: 'experiment', label: 'Experiment with datasets' },
    { id: 'ai-products', label: 'Build AI products' },
  ];
  readonly levels: { id: ExperienceLevel; label: string }[] = [
    { id: 'beginner', label: 'I am new to ML' },
    { id: 'python-stats', label: 'I know Python and linear algebra' },
    { id: 'practitioner', label: 'I have trained models before' },
    { id: 'expert', label: 'Skip the basics' },
  ];

  go() {
    this.api
      .saveProfile({
        goal: this.goal(),
        experienceLevel: this.level(),
        dailyMinutes: this.minutes(),
        learningMode: this.level() === 'beginner' ? 'fast' : 'deep',
      })
      .subscribe({
        next: () => this.router.navigateByUrl('/app/lab/linear-regression'),
      });
  }
}
