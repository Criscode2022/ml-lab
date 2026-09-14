import { Component, inject, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { t } from '@ml-lab/i18n';
import { LABS } from '../lab/catalog';
import { LabMode } from '../lab/mode';

type Cmd = { id: string; title: string; group: string; href?: string; action?: string };

@Component({
  selector: 'app-palette',
  template: `
    <div class="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-24" role="dialog" aria-label="Command palette" (click)="closed.emit()">
      <div class="w-full max-w-lg rounded-2xl border border-line bg-panel shadow-2xl" (click)="$event.stopPropagation()">
        <input
          class="w-full rounded-t-2xl bg-transparent px-4 py-3 text-sm outline-none"
          placeholder="Open a lab, inspect, ask…"
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
  private readonly mode = inject(LabMode);
  constructor(private readonly router: Router) {}

  private commands(): Cmd[] {
    const basic = this.mode.basic();
    const labs: Cmd[] = LABS.filter((lab) => !basic || lab.ready).map((lab) => ({
      id: 'lab-' + lab.id,
      title: basic ? lab.playTitle : lab.title,
      group: lab.ready ? 'Labs' : 'Later',
      href: lab.href,
    }));
    return [
      ...labs,
      { id: 'inspect', title: t('paletteInspect'), group: 'Inspect', action: 'inspect' },
      { id: 'math', title: t('paletteMath'), group: 'Inspect', action: 'math' },
      { id: 'code', title: t('paletteCode'), group: 'Inspect', action: 'code' },
      { id: 'ask', title: t('why'), group: 'Tutor', href: undefined, action: 'ask' },
      { id: 'ols', title: t('paletteOls'), group: 'Lab', action: 'ols' },
      { id: 'break', title: t('paletteBreak'), group: 'Lab', action: 'break' },
      { id: 'dash', title: t('paletteDashboard'), group: 'Navigate', href: '/app' },
    ];
  }

  filtered() {
    const q = this.query().toLowerCase();
    return this.commands().filter((c) => !q || c.title.toLowerCase().includes(q) || c.group.toLowerCase().includes(q));
  }

  run(c: Cmd) {
    if (c.href) void this.router.navigateByUrl(c.href);
    if (c.action) this.action.emit(c.action);
    this.closed.emit();
  }
}
