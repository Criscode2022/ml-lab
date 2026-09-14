import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  describeExperiment,
  generateRegressionDataset,
  mae,
  mse,
  ordinaryLeastSquares,
  residualPoints,
  runGradientDescent,
  type Point,
} from '@ml-lab/ml-core';
import { t } from '@ml-lab/i18n';
import type { ExperimentSnapshot, NotebookCell } from '@ml-lab/contracts';
import { Api } from '../core/api';
import { ScatterChart } from '../lab/scatter-chart';
import { LossChart } from '../lab/loss-chart';
import { runPythonBrowser } from '../lab/pyodide-runner';
import { isRunnableLab, labById } from '../lab/catalog';

type Panel = 'happening' | 'math' | 'code' | 'ask';

@Component({
  selector: 'app-lab-page',
  imports: [ScatterChart, LossChart, RouterLink],
  template: `
    @if (!runnable()) {
      <div class="mx-auto max-w-lg p-10">
        <p class="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{{ lab()?.cluster }}</p>
        <h1 class="mt-2 text-2xl font-semibold">{{ lab()?.title ?? 'Lab' }}</h1>
        <p class="mt-3 text-sm text-muted">{{ t('labNotReady') }}</p>
        <a routerLink="/app/lab/linear-regression" class="mt-6 inline-flex rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink">
          {{ t('openReadyLab') }}
        </a>
      </div>
    } @else {
      <div class="flex min-h-full">
        <div class="flex min-w-0 flex-1 flex-col">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
            <div>
              <p class="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{{ lab()?.cluster }}</p>
              <h1 class="text-lg font-semibold">{{ lab()?.title }}</h1>
            </div>
            <div class="flex flex-wrap gap-2">
              <button type="button" class="rounded-full border border-line px-3 py-1.5 text-xs" (click)="open('ask'); why()">{{ t('why') }}</button>
              <button type="button" class="rounded-full border border-danger px-3 py-1.5 text-xs text-danger" (click)="breakIt()">{{ t('breakIt') }}</button>
              <button type="button" class="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-ink" (click)="save()">{{ t('saveExperiment') }}</button>
              @if (savedFlash()) {
                <span class="self-center font-mono text-[11px] text-accent">{{ t('saved') }}</span>
              }
            </div>
          </div>

          <div class="flex items-start justify-between gap-3 border-b border-line px-5 py-3" [class.bg-danger/10]="view().situation === 'diverged'">
            <p class="max-w-3xl text-sm leading-relaxed" [class.text-danger]="view().situation === 'diverged'" [class.text-muted]="view().situation !== 'diverged'">
              {{ headline() }}
            </p>
            <label class="shrink-0 text-[11px] text-muted">
              {{ t('depth') }}
              <input class="ml-2 align-middle" type="range" min="1" max="5" [value]="depth()" (input)="depth.set(+$any($event.target).value)" aria-label="Theory depth" />
            </label>
          </div>

          <div class="lab-scroll flex-1 space-y-4 overflow-auto p-5">
            <div class="overflow-hidden rounded-2xl border border-line" data-testid="lab-chart">
              <app-scatter-chart
                class="block h-[420px]"
                [points]="points()"
                [slope]="slope()"
                [intercept]="intercept()"
                [mse]="currentMse()"
                [olsSlope]="view().olsSlope"
                [olsIntercept]="view().olsIntercept"
                [showResiduals]="true"
                (slopeChange)="slope.set($event)"
                (interceptChange)="intercept.set($event)"
              />
            </div>
            <p class="font-mono text-[10px] text-muted">{{ t('ghostOls') }}</p>

            <div class="grid gap-3 md:grid-cols-4">
              <label class="rounded-xl border border-line bg-panel p-3 text-xs text-muted">{{ t('slope') }}
                <input class="mt-1 w-full" type="range" min="-4" max="4" step="0.01" [value]="slope()" (input)="slope.set(+$any($event.target).value)" />
                <span class="font-mono text-text" data-testid="slope-value">{{ slope().toFixed(3) }}</span>
              </label>
              <label class="rounded-xl border border-line bg-panel p-3 text-xs text-muted">{{ t('intercept') }}
                <input class="mt-1 w-full" type="range" min="-4" max="4" step="0.01" [value]="intercept()" (input)="intercept.set(+$any($event.target).value)" />
                <span class="font-mono text-text">{{ intercept().toFixed(3) }}</span>
              </label>
              <div class="rounded-xl border border-line bg-panel p-3 text-xs text-muted">{{ t('mse') }}
                <p class="mt-2 font-mono text-lg text-accent" data-testid="mse-value">{{ currentMse().toFixed(4) }}</p>
              </div>
              <div class="rounded-xl border border-line bg-panel p-3 text-xs text-muted">{{ t('mae') }}
                <p class="mt-2 font-mono text-lg">{{ currentMae().toFixed(4) }}</p>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <button type="button" class="rounded-full border border-line px-3 py-1.5 text-xs" (click)="fitOls()">{{ t('olsFit') }}</button>
              <span class="font-mono text-[11px] text-muted">ŷ = {{ slope().toFixed(2) }} x + {{ intercept().toFixed(2) }}</span>
            </div>

            <div class="grid gap-3 md:grid-cols-3">
              <label class="text-xs text-muted">{{ t('samples') }}
                <input type="range" min="20" max="160" [value]="n()" (input)="n.set(+$any($event.target).value); regen()" />
              </label>
              <label class="text-xs text-muted">{{ t('noise') }}
                <input type="range" min="0" max="1.2" step="0.05" [value]="noise()" (input)="noise.set(+$any($event.target).value); regen()" />
              </label>
              <label class="text-xs text-muted">{{ t('outliers') }}
                <input type="range" min="0" max="8" [value]="outliers()" (input)="outliers.set(+$any($event.target).value); regen()" />
              </label>
            </div>

            <div class="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-panel p-4">
              <label class="text-xs text-muted">{{ t('learningRate') }}
                <input class="ml-2 w-32 font-mono" type="number" step="0.01" [value]="lr()" (input)="lr.set(+$any($event.target).value)" />
              </label>
              <label class="text-xs text-muted">{{ t('iterations') }}
                <input class="ml-2 w-20 font-mono" type="number" min="1" max="400" [value]="iters()" (input)="iters.set(+$any($event.target).value)" />
              </label>
              <button type="button" class="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-ink" (click)="runGd()">{{ t('runGd') }}</button>
              <button type="button" class="rounded-full border border-line px-3 py-1.5 text-xs" (click)="stepGd()">{{ t('stepGd') }}</button>
              <button type="button" class="rounded-full border border-line px-3 py-1.5 text-xs" (click)="resetFit()">{{ t('resetFit') }}</button>
            </div>

            <app-loss-chart [losses]="losses()" [diverged]="diverged()" />

            @if (depth() >= 4) {
              <div class="rounded-xl bg-ink p-4 font-mono text-sm text-accent" data-testid="math-panel">
                <p>ŷ = s x + b</p>
                <p class="mt-1">MSE = (1/n) Σ (yᵢ − ŷᵢ)²</p>
                <p class="mt-1">∂MSE/∂s = (2/n) Σ (ŷᵢ − yᵢ) xᵢ</p>
                <p class="mt-1">∂MSE/∂b = (2/n) Σ (ŷᵢ − yᵢ)</p>
              </div>
            }
          </div>
        </div>

        <aside class="flex w-[72px] shrink-0 flex-col border-l border-line bg-panel py-3" aria-label="Inspector">
          <button type="button" class="px-2 py-3 text-[11px] leading-tight text-muted hover:text-text" [class.text-accent]="panel() === 'happening'" (click)="toggle('happening')">{{ t('inspect') }}</button>
          <button type="button" class="px-2 py-3 text-[11px] leading-tight text-muted hover:text-text" [class.text-accent]="panel() === 'math'" (click)="toggle('math')">{{ t('math') }}</button>
          <button type="button" class="px-2 py-3 text-[11px] leading-tight text-muted hover:text-text" [class.text-accent]="panel() === 'code'" (click)="toggle('code')">{{ t('code') }}</button>
          <button type="button" class="px-2 py-3 text-[11px] leading-tight text-muted hover:text-text" [class.text-accent]="panel() === 'ask'" (click)="toggle('ask')">{{ t('ask') }}</button>
        </aside>

        @if (panel(); as openPanel) {
          <section class="lab-scroll w-[340px] shrink-0 overflow-auto border-l border-line bg-panel p-4">
            @if (openPanel === 'happening') {
              <h2 class="text-sm font-medium">{{ t('happening') }}</h2>
              <p class="mt-2 text-sm leading-relaxed text-muted">{{ headline() }}</p>
              <dl class="mt-4 space-y-2 font-mono text-[11px]">
                <div class="flex justify-between gap-3"><dt class="text-muted">MSE</dt><dd>{{ view().mse.toFixed(4) }}</dd></div>
                <div class="flex justify-between gap-3"><dt class="text-muted">OLS MSE</dt><dd>{{ view().olsMse.toFixed(4) }}</dd></div>
                <div class="flex justify-between gap-3"><dt class="text-muted">ratio</dt><dd>{{ view().ratio.toFixed(2) }}×</dd></div>
                <div class="flex justify-between gap-3"><dt class="text-muted">∂MSE/∂s</dt><dd>{{ view().gradients.dSlope.toFixed(3) }}</dd></div>
                <div class="flex justify-between gap-3"><dt class="text-muted">∂MSE/∂b</dt><dd>{{ view().gradients.dIntercept.toFixed(3) }}</dd></div>
                <div class="flex justify-between gap-3"><dt class="text-muted">lr</dt><dd>{{ lr() }}</dd></div>
              </dl>
              <p class="mt-4 text-xs text-muted">{{ t('breakItHint') }}</p>
              <div class="mt-6">
                <h3 class="text-sm font-medium">{{ t('challenge') }}</h3>
                @if (!challenge()) {
                  <button type="button" class="mt-3 rounded-full border border-line px-3 py-1.5 text-xs" (click)="poseChallenge()">Generate challenge</button>
                } @else {
                  <p class="mt-2 text-sm">{{ challenge()!.body }}</p>
                  <input class="mt-3 w-full rounded-lg border border-line bg-ink px-3 py-2 font-mono text-sm" [value]="challengeAnswer()" (input)="challengeAnswer.set($any($event.target).value)" />
                  <button type="button" class="mt-3 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-ink" (click)="submitChallenge()">{{ t('submit') }}</button>
                  @if (challengeFeedback()) {
                    <p class="mt-2 text-sm text-accent">{{ challengeFeedback() }}</p>
                  }
                }
              </div>
            }
            @if (openPanel === 'math') {
              <h2 class="text-sm font-medium">{{ t('math') }}</h2>
              <p class="mt-3 text-sm leading-relaxed text-muted">{{ depthCopy() }}</p>
              @if (depth() >= 4) {
                <div class="mt-4 rounded-xl bg-ink p-4 font-mono text-sm text-accent">
                  <p>ŷ = s x + b</p>
                  <p class="mt-1">MSE = (1/n) Σ (yᵢ − ŷᵢ)²</p>
                </div>
              } @else {
                <p class="mt-3 text-xs text-muted">Raise Depth on the bench if you want the derivatives.</p>
              }
            }
            @if (openPanel === 'code') {
              <h2 class="text-sm font-medium">{{ t('notebook') }}</h2>
              @for (cell of pythonCells(); track cell.id) {
                <article class="mt-3 rounded-xl border border-line p-3">
                  <div class="flex gap-2 text-[11px] uppercase tracking-wide text-muted">
                    <button type="button" (click)="runCell(cell)">{{ t('runCell') }}</button>
                    <button type="button" (click)="stopCell()">{{ t('stopCell') }}</button>
                    <button type="button" (click)="resetCell(cell)">{{ t('resetCell') }}</button>
                  </div>
                  <textarea class="mt-2 h-36 w-full rounded-lg bg-ink p-2 font-mono text-xs" [value]="cell.source" (input)="updateCell(cell.id, $any($event.target).value)"></textarea>
                  @if (cell.output) {
                    <pre class="mt-2 overflow-auto rounded-lg bg-ink p-2 font-mono text-xs">{{ cell.output }}</pre>
                  }
                </article>
              }
            }
            @if (openPanel === 'ask') {
              <h2 class="text-sm font-medium">{{ t('tutor') }}</h2>
              <p class="mt-1 text-xs text-muted">Grounded in this experiment. Ask when you want it.</p>
              <div class="lab-scroll mt-3 max-h-[360px] space-y-2 overflow-auto text-sm">
                @for (m of tutorLog(); track $index) {
                  <p [class.text-muted]="m.role === 'user'"><span class="font-mono text-[10px] text-accent">{{ m.role }}</span> {{ m.text }}</p>
                }
              </div>
              @if (tutorError()) {
                <p class="mt-2 text-sm text-danger" role="alert">{{ tutorError() }}
                  <button type="button" class="ml-2 underline" (click)="retryTutor()">{{ t('retry') }}</button>
                </p>
              }
              <form class="mt-3 flex gap-2" (submit)="ask($event)">
                <input class="flex-1 rounded-lg border border-line bg-ink px-3 py-2 text-sm" [value]="tutorInput()" (input)="tutorInput.set($any($event.target).value)" [placeholder]="t('tutorPlaceholder')" />
                <button class="rounded-lg bg-accent px-3 text-xs font-semibold text-ink" type="submit">{{ t('send') }}</button>
              </form>
            }
          </section>
        }
      </div>
    }
  `,
})
export class LabPage {
  private readonly api = inject(Api);
  private readonly route = inject(ActivatedRoute);
  readonly t = t;

  readonly labId = signal(this.route.snapshot.paramMap.get('conceptId') ?? 'linear-regression');
  readonly lab = computed(() => labById(this.labId()));
  readonly runnable = computed(() => isRunnableLab(this.labId()));

  readonly n = signal(64);
  readonly noise = signal(0.18);
  readonly outliers = signal(0);
  readonly seed = signal(7);
  readonly trueSlope = signal(1.35);
  readonly trueIntercept = signal(0.4);
  readonly points = signal<Point[]>([]);
  readonly slope = signal(0);
  readonly intercept = signal(0);
  readonly lr = signal(this.labId() === 'gradient-descent' ? 0.35 : 0.08);
  readonly iters = signal(this.labId() === 'gradient-descent' ? 40 : 80);
  readonly losses = signal<number[]>([]);
  readonly diverged = signal(false);
  readonly depth = signal(1);
  readonly savedId = signal<string | null>(null);
  readonly savedFlash = signal(false);
  readonly lastRunId = signal<string | null>(null);
  readonly tutorInput = signal('');
  readonly tutorLog = signal<Array<{ role: string; text: string }>>([]);
  readonly tutorError = signal('');
  readonly lastTutorMessage = signal('');
  readonly challenge = signal<{ id: string; body: string } | null>(null);
  readonly challengeAnswer = signal('');
  readonly challengeFeedback = signal('');
  readonly panel = signal<Panel | null>(null);
  readonly cells = signal<NotebookCell[]>([
    {
      id: 'py',
      type: 'python',
      source: `import json, numpy as np
data = json.loads(open("dataset.json").read())
X = np.array([p["x"] for p in data["points"]])
y = np.array([p["y"] for p in data["points"]])
s, b = data.get("initSlope", 0.0), data.get("initIntercept", 0.0)
mse = float(np.mean((y - (s * X + b)) ** 2))
print("mse", mse)
print("n", len(X))
`,
    },
  ]);

  readonly currentMse = computed(() => mse(this.points(), this.slope(), this.intercept()));
  readonly currentMae = computed(() => mae(this.points(), this.slope(), this.intercept()));
  readonly residuals = computed(() => residualPoints(this.points(), this.slope(), this.intercept()));
  readonly view = computed(() =>
    describeExperiment({
      points: this.points(),
      slope: this.slope(),
      intercept: this.intercept(),
      learningRate: this.lr(),
      diverged: this.diverged(),
      losses: this.losses(),
    }),
  );
  readonly pythonCells = computed(() => this.cells().filter((c) => c.type === 'python'));

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const concept = params.get('conceptId') ?? 'linear-regression';
      const switched = concept !== this.labId();
      this.labId.set(concept);
      if (switched) {
        this.lr.set(concept === 'gradient-descent' ? 0.35 : 0.08);
        this.iters.set(concept === 'gradient-descent' ? 40 : 80);
        this.panel.set(null);
        this.regen();
      } else if (this.points().length === 0) {
        this.regen();
      }
      const id = params.get('id');
      if (id) {
        this.api.getExperiment(id).subscribe({
          next: (exp) => {
            this.savedId.set(exp.id ?? id);
            this.points.set(exp.dataset.points);
            this.slope.set(exp.parameters.slope);
            this.intercept.set(exp.parameters.intercept);
            this.lr.set(exp.parameters.learningRate);
            this.losses.set(exp.metrics.lossHistory);
            this.diverged.set(exp.metrics.diverged);
          },
        });
      }
    });
  }

  headline(): string {
    const v = this.view();
    switch (v.situation) {
      case 'diverged':
        return t('readoutDiverged');
      case 'oscillating':
        return t('readoutOscillating');
      case 'near-ols':
        return t('readoutNear');
      case 'improving':
        return t('readoutImproving');
      case 'empty':
        return t('readoutEmpty');
      case 'far-from-ols':
        return `This line is a weak fit. MSE is ${v.ratio.toFixed(1)}× the closed-form minimum.`;
      default:
        return t('readoutIdle');
    }
  }

  toggle(next: Panel) {
    this.panel.update((cur) => (cur === next ? null : next));
  }

  open(next: Panel) {
    this.panel.set(next);
  }

  @HostListener('window:ml-lab-command', ['$event'])
  onCommand(ev: Event) {
    const id = (ev as CustomEvent<string>).detail;
    if (id === 'break') this.breakIt();
    if (id === 'ask') {
      this.open('ask');
      this.why();
    }
    if (id === 'inspect') this.open('happening');
    if (id === 'math') this.open('math');
    if (id === 'code') this.open('code');
    if (id === 'ols') this.fitOls();
  }

  regen() {
    const pts = generateRegressionDataset({
      n: this.n(),
      slope: this.trueSlope(),
      intercept: this.trueIntercept(),
      noise: this.noise(),
      seed: this.seed(),
      outliers: this.outliers(),
      xMin: -2,
      xMax: 2,
    });
    this.points.set(pts);
    this.slope.set(0);
    this.intercept.set(0);
    this.losses.set([mse(pts, 0, 0)]);
    this.diverged.set(false);
  }

  resetFit() {
    this.slope.set(0);
    this.intercept.set(0);
    this.losses.set([this.currentMse()]);
    this.diverged.set(false);
  }

  runGd() {
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const run = runGradientDescent(this.points(), { slope: this.slope(), intercept: this.intercept() }, this.lr(), this.iters());
    this.diverged.set(run.diverged || run.oscillated);
    if (reduce) {
      this.slope.set(run.finalSlope);
      this.intercept.set(run.finalIntercept);
      this.losses.set(run.losses);
      return;
    }
    let i = 0;
    const steps = run.steps;
    const frame = () => {
      const step = steps[i];
      if (!step) return;
      this.slope.set(step.slope);
      this.intercept.set(step.intercept);
      this.losses.update((ls) => [...ls, step.mse].slice(-200));
      i += 1;
      if (i < steps.length) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  stepGd() {
    const run = runGradientDescent(this.points(), { slope: this.slope(), intercept: this.intercept() }, this.lr(), 1);
    const last = run.steps.at(-1);
    if (!last) return;
    this.slope.set(last.slope);
    this.intercept.set(last.intercept);
    this.losses.update((ls) => [...ls, last.mse]);
    this.diverged.set(run.diverged);
  }

  breakIt() {
    this.lr.set(1.8);
    this.iters.set(24);
    this.runGd();
  }

  snapshot(): ExperimentSnapshot {
    return {
      id: this.savedId() ?? undefined,
      conceptId: this.labId(),
      name: this.lab()?.title ?? 'Lab',
      dataset: {
        points: this.points(),
        spec: { n: this.n(), noise: this.noise(), outliers: this.outliers(), seed: this.seed() },
      },
      parameters: {
        slope: this.slope(),
        intercept: this.intercept(),
        learningRate: this.lr(),
        iterations: this.iters(),
        noise: this.noise(),
        sampleCount: this.n(),
        outliers: this.outliers(),
        seed: this.seed(),
        trueSlope: this.trueSlope(),
        trueIntercept: this.trueIntercept(),
      },
      metrics: {
        mse: this.currentMse(),
        mae: this.currentMae(),
        lossHistory: this.losses(),
        diverged: this.diverged(),
        oscillated: this.diverged(),
      },
    };
  }

  save() {
    const snap = this.snapshot();
    this.api.saveExperiment(snap).subscribe({
      next: (res) => {
        this.savedId.set(res.id);
        this.savedFlash.set(true);
        setTimeout(() => this.savedFlash.set(false), 1600);
        void this.api.saveNotebook(this.cells(), res.id).subscribe();
      },
    });
  }

  depthCopy() {
    const key = ['intuitionL1', 'intuitionL1', 'intuitionL2', 'intuitionL3', 'intuitionL4', 'intuitionL5'][this.depth()];
    return t(key as 'intuitionL1');
  }

  updateCell(id: string, source: string) {
    this.cells.update((cs) => cs.map((c) => (c.id === id ? { ...c, source } : c)));
  }

  runCell(cell: NotebookCell) {
    const ds = {
      points: this.points(),
      learningRate: this.lr(),
      iterations: this.iters(),
      initSlope: this.slope(),
      initIntercept: this.intercept(),
    };
    const apply = (stdout: string, stderr: string, status: string, extra = '') => {
      this.cells.update((cs) =>
        cs.map((c) =>
          c.id === cell.id
            ? { ...c, output: `${stdout}${stderr}${extra}`, status: status as NotebookCell['status'] }
            : c,
        ),
      );
    };
    const pyodide = () => {
      void runPythonBrowser(cell.source, { 'dataset.json': JSON.stringify(ds) }).then((res) => {
        const extra = `\n--- reference ---\nmse ${this.currentMse().toFixed(6)}\n`;
        apply(res.stdout, res.stderr, res.status, extra);
      });
    };
    this.api.runPython(cell.source, ds, true).subscribe({
      next: (res) => {
        this.lastRunId.set(res.runId);
        const failed = res.status === 'failed' || res.stderr?.includes('ENOENT');
        if (failed) {
          pyodide();
          return;
        }
        const extra = res.reference ? `\n--- reference ---\n${res.reference.stdout}` : '';
        apply(res.stdout, res.stderr, res.status, extra);
      },
      error: () => pyodide(),
    });
  }

  stopCell() {
    const id = this.lastRunId();
    if (id) this.api.stopPython(id).subscribe();
  }

  resetCell(cell: NotebookCell) {
    const id = this.lastRunId();
    if (id) this.api.resetPython(id).subscribe();
    this.cells.update((cs) => cs.map((c) => (c.id === cell.id ? { ...c, output: '', status: 'idle' } : c)));
  }

  poseChallenge() {
    this.api.createChallenge(this.snapshot(), 'mse').subscribe({
      next: (c) => this.challenge.set({ id: c.id, body: c.body }),
    });
  }

  submitChallenge() {
    const ch = this.challenge();
    if (!ch) return;
    this.api.submitChallenge(ch.id, Number(this.challengeAnswer())).subscribe({
      next: (g) => this.challengeFeedback.set(g.feedback),
    });
  }

  ask(ev: Event) {
    ev.preventDefault();
    const message = this.tutorInput();
    this.lastTutorMessage.set(message);
    this.sendTutor(message, false);
  }

  why() {
    this.sendTutor('Why did the latest change happen?', true);
  }

  retryTutor() {
    this.sendTutor(this.lastTutorMessage() || 'Why?', true);
  }

  private sendTutor(message: string, why: boolean) {
    this.tutorError.set('');
    this.tutorLog.update((rows) => [...rows, { role: 'user', text: message }]);
    this.tutorInput.set('');
    const py = this.cells().find((c) => c.type === 'python')?.source;
    this.api.tutor({ message, experiment: this.snapshot(), code: py, why, mode: 'socratic' }).subscribe({
      next: (res) => this.tutorLog.update((rows) => [...rows, { role: 'tutor', text: res.text }]),
      error: (err: { error?: { message?: string } }) => {
        this.tutorError.set(err.error?.message ?? t('aiUnavailable'));
      },
    });
  }

  fitOls() {
    const fit = ordinaryLeastSquares(this.points());
    this.slope.set(fit.slope);
    this.intercept.set(fit.intercept);
  }
}
