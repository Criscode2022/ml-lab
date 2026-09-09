import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
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

@Component({
  selector: 'app-lab-page',
  imports: [ScatterChart, LossChart],
  template: `
    <div class="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div class="space-y-4">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p class="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{{ t('labTitle') }}</p>
            <h1 class="text-2xl font-semibold">Fit the line. Then make it fail.</h1>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="rounded-full border border-line px-3 py-1.5 text-xs" (click)="why()">{{ t('why') }}</button>
            <button type="button" class="rounded-full border border-danger px-3 py-1.5 text-xs text-danger" (click)="breakIt()">{{ t('breakIt') }}</button>
            <button type="button" class="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-ink" (click)="save()">{{ t('saveExperiment') }}</button>
          </div>
        </div>

        <div class="overflow-hidden rounded-2xl border border-line" data-testid="lab-chart">
          <app-scatter-chart
            class="block h-[420px]"
            [points]="points()"
            [slope]="slope()"
            [intercept]="intercept()"
            [mse]="currentMse()"
            [showResiduals]="true"
            (slopeChange)="slope.set($event)"
            (interceptChange)="intercept.set($event)"
          />
        </div>

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
          <span class="text-xs text-muted">{{ t('breakItHint') }}</span>
        </div>

        <app-loss-chart [losses]="losses()" [diverged]="diverged()" />

        <section class="rounded-2xl border border-line bg-panel p-5">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-medium">{{ t('depth') }}</h2>
            <input type="range" min="1" max="5" [value]="depth()" (input)="depth.set(+$any($event.target).value)" aria-label="Theory depth" />
          </div>
          <p class="mt-3 text-sm leading-relaxed text-muted">{{ depthCopy() }}</p>
          @if (depth() >= 4) {
            <div class="mt-4 rounded-xl bg-ink p-4 font-mono text-sm text-accent" data-testid="math-panel">
              <p>ŷ = s x + b</p>
              <p class="mt-1">MSE = (1/n) Σ (yᵢ − ŷᵢ)²</p>
              <p class="mt-1">∂MSE/∂s = (2/n) Σ (ŷᵢ − yᵢ) xᵢ</p>
              <p class="mt-1">∂MSE/∂b = (2/n) Σ (ŷᵢ − yᵢ)</p>
            </div>
          }
        </section>

        <section class="rounded-2xl border border-line bg-panel p-5">
          <h2 class="text-sm font-medium">{{ t('notebook') }}</h2>
          @for (cell of cells(); track cell.id) {
            <article class="mt-3 rounded-xl border border-line p-3">
              <div class="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted">
                <span>{{ cell.type }}</span>
                <div class="flex gap-2">
                  @if (cell.type === 'python') {
                    <button type="button" (click)="runCell(cell)">{{ t('runCell') }}</button>
                    <button type="button" (click)="stopCell()">{{ t('stopCell') }}</button>
                    <button type="button" (click)="resetCell(cell)">{{ t('resetCell') }}</button>
                  }
                  @if (cell.type === 'experiment') {
                    <button type="button" (click)="runGd()">Refresh</button>
                  }
                  @if (cell.type === 'ai') {
                    <button type="button" (click)="why()">{{ t('why') }}</button>
                  }
                </div>
              </div>
              @if (cell.type === 'python') {
                <textarea class="mt-2 h-28 w-full rounded-lg bg-ink p-2 font-mono text-xs" [value]="cell.source" (input)="updateCell(cell.id, $any($event.target).value)"></textarea>
              } @else {
                <p class="mt-2 whitespace-pre-wrap text-sm text-muted">{{ cell.source }}</p>
              }
              @if (cell.output) {
                <pre class="mt-2 overflow-auto rounded-lg bg-ink p-2 font-mono text-xs">{{ cell.output }}</pre>
              }
            </article>
          }
        </section>

        <section class="rounded-2xl border border-line bg-panel p-5">
          <h2 class="text-sm font-medium">{{ t('challenge') }}</h2>
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
        </section>
      </div>

      <aside class="rounded-2xl border border-line bg-panel p-4">
        <h2 class="text-sm font-medium">{{ t('tutor') }}</h2>
        <p class="mt-1 text-xs text-muted">Socratic by default. Grounded in this experiment.</p>
        <div class="lab-scroll mt-3 max-h-[420px] space-y-2 overflow-auto text-sm">
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
      </aside>
    </div>
  `,
})
export class LabPage {
  private readonly api = inject(Api);
  private readonly route = inject(ActivatedRoute);
  readonly t = t;

  readonly n = signal(64);
  readonly noise = signal(0.18);
  readonly outliers = signal(0);
  readonly seed = signal(7);
  readonly trueSlope = signal(1.35);
  readonly trueIntercept = signal(0.4);
  readonly points = signal<Point[]>([]);
  readonly slope = signal(0);
  readonly intercept = signal(0);
  readonly lr = signal(0.08);
  readonly iters = signal(80);
  readonly losses = signal<number[]>([]);
  readonly diverged = signal(false);
  readonly depth = signal(1);
  readonly savedId = signal<string | null>(null);
  readonly lastRunId = signal<string | null>(null);
  readonly tutorInput = signal('');
  readonly tutorLog = signal<Array<{ role: string; text: string }>>([]);
  readonly tutorError = signal('');
  readonly lastTutorMessage = signal('');
  readonly challenge = signal<{ id: string; body: string } | null>(null);
  readonly challengeAnswer = signal('');
  readonly challengeFeedback = signal('');
  readonly cells = signal<NotebookCell[]>([
    { id: 'md', type: 'markdown', source: "Let's see how linear regression behaves. Drag the line. Residuals are the amber drops." },
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
    { id: 'viz', type: 'visualization', source: 'The scatter above is live — it is not a canned frame.' },
    { id: 'exp', type: 'experiment', source: 'Change the learning rate, run gradient descent, then Break it.' },
    { id: 'ai', type: 'ai', source: 'Ask why the loss moved after the last learning-rate change.' },
  ]);

  readonly currentMse = computed(() => mse(this.points(), this.slope(), this.intercept()));
  readonly currentMae = computed(() => mae(this.points(), this.slope(), this.intercept()));
  readonly residuals = computed(() => residualPoints(this.points(), this.slope(), this.intercept()));

  constructor() {
    this.regen();
    const id = this.route.snapshot.paramMap.get('id');
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
  }

  @HostListener('window:ml-lab-command', ['$event'])
  onCommand(ev: Event) {
    const id = (ev as CustomEvent<string>).detail;
    if (id === 'break') this.breakIt();
    if (id === 'ask') this.why();
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
      conceptId: 'linear-regression',
      name: 'Linear regression lab',
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
