import { Component, output, signal } from '@angular/core';
import { Router } from '@angular/router';

type Cmd = { id: string; title: string; group: string; href?: string; action?: string };

const COMMANDS: Cmd[] = [
  { id: 'learn', title: 'Learn Linear Regression', group: 'Learn', href: '/app/lab/linear-regression', action: 'learn' },
  { id: 'exp', title: 'Start experiment', group: 'Lab', href: '/app/lab/linear-regression', action: 'experiment' },
  { id: 'ask', title: 'Ask AI', group: 'Tutor', href: '/app/lab/linear-regression', action: 'ask' },
  { id: 'continue', title: 'Continue learning', group: 'Learn', href: '/app', action: 'continue' },
  { id: 'break', title: 'Break gradient descent', group: 'Lab', href: '/app/lab/linear-regression', action: 'break' },
  { id: 'dash', title: 'Open dashboard', group: 'Navigate', href: '/app' },
];

@Component({
  selector: 'app-palette',
  template: `
    <div class="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-24" role="dialog" aria-label="Command palette" (click)="closed.emit()">
      <div class="w-full max-w-lg rounded-2xl border border-line bg-panel shadow-2xl" (click)="$event.stopPropagation()">
        <input
          #q
          class="w-full rounded-t-2xl bg-transparent px-4 py-3 text-sm outline-none"
          placeholder="Learn, experiment, ask…"
          [value]="query()"
          (input)="query.set($any($event.target).value)"
          (keydown.escape)="closed.emit()"
        />
        <ul class="max-h-80 overflow-auto p-2">
          @for (c of filtered(); track c.id) {
            <li>
              <button type="button" class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-panel-2" (click)="run(c)">
                <span>{{ c.title }}</span>
                <span class="font-mono text-[10px] text-muted">{{ c.group }}</span>
              </button>
            </li>
          }
        </ul>
      </div>
    </div>
  `,
})
export class Palette {
  readonly closed = output();
  readonly action = output<string>();
  readonly query = signal('');
  constructor(private readonly router: Router) {}

  filtered() {
    const q = this.query().toLowerCase();
    return COMMANDS.filter((c) => !q || c.title.toLowerCase().includes(q) || c.group.toLowerCase().includes(q));
  }

  run(c: Cmd) {
    if (c.href) void this.router.navigateByUrl(c.href);
    if (c.action) this.action.emit(c.action);
    this.closed.emit();
  }
}
