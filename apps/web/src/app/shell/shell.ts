import { Component, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { t } from '@ml-lab/i18n';
import { Session } from '../core/session';
import { LABS } from '../lab/catalog';
import { Palette } from './palette';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Palette],
  template: `
    <div class="flex min-h-screen bg-ink">
      <nav class="flex w-[220px] shrink-0 flex-col border-r border-line" aria-label="Labs">
        <a routerLink="/app" class="px-4 py-4 font-mono text-[11px] tracking-[0.22em] text-accent">ML LAB</a>
        <p class="px-4 pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{{ t('labs') }}</p>
        <ul class="flex-1 space-y-0.5 px-2">
          @for (lab of labs; track lab.id) {
            <li>
              <a
                [routerLink]="lab.href"
                routerLinkActive="bg-panel-2 text-text"
                class="flex items-start gap-2 rounded-lg px-2 py-2 text-sm text-muted hover:bg-panel-2 hover:text-text"
              >
                <span class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" [class.bg-accent]="lab.ready" [class.bg-line]="!lab.ready"></span>
                <span>
                  <span class="block leading-tight">{{ lab.title }}</span>
                  <span class="block font-mono text-[10px] text-muted">{{ lab.cluster }}</span>
                </span>
              </a>
            </li>
          }
        </ul>
        <button type="button" class="m-3 rounded-lg border border-line px-3 py-2 text-left font-mono text-[11px] text-muted" (click)="palette.set(true)">
          ⌘K search
        </button>
      </nav>
      <div class="flex min-w-0 flex-1 flex-col">
        <header class="flex items-center justify-between border-b border-line px-5 py-2.5">
          <p class="text-sm text-muted">{{ t('product') }}</p>
          <div class="flex items-center gap-3 text-xs text-muted">
            <span>{{ session.email() }}</span>
            <button type="button" (click)="session.logout()">Sign out</button>
          </div>
        </header>
        <main class="lab-scroll min-h-0 flex-1 overflow-auto">
          <router-outlet />
        </main>
      </div>
    </div>
    @if (palette()) {
      <app-palette (closed)="palette.set(false)" (action)="onAction($event)" />
    }
  `,
})
export class Shell {
  readonly session = inject(Session);
  readonly palette = signal(false);
  readonly labs = LABS;
  readonly t = t;
  private readonly router = inject(Router);

  @HostListener('document:keydown', ['$event'])
  onKey(ev: KeyboardEvent) {
    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k') {
      ev.preventDefault();
      this.palette.update((v) => !v);
    }
  }

  onAction(id: string) {
    window.dispatchEvent(new CustomEvent('ml-lab-command', { detail: id }));
    if (id === 'labs') void this.router.navigateByUrl('/app');
  }
}
