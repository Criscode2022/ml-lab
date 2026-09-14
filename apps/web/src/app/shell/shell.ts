import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { t } from '@ml-lab/i18n';
import { Session } from '../core/session';
import { LABS } from '../lab/catalog';
import { LabMode } from '../lab/mode';
import { Palette } from './palette';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Palette],
  template: `
    <div class="flex min-h-screen bg-ink">
      <nav class="flex w-[240px] shrink-0 flex-col border-r border-line" aria-label="Labs">
        <a routerLink="/app" class="px-5 py-5">
          <span class="block font-mono text-[11px] tracking-[0.22em] text-accent">ML LAB</span>
          <span class="mt-1 block text-xs text-muted">Learn by playing</span>
        </a>
        <p class="px-5 pb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{{ t('labs') }}</p>
        <ul class="flex-1 space-y-0.5 px-3">
          @for (lab of visibleLabs(); track lab.id) {
            <li>
              <a
                [routerLink]="lab.href"
                routerLinkActive="bg-panel-2 text-text"
                class="flex items-start gap-2 rounded-xl px-2 py-2.5 text-sm text-muted hover:bg-panel-2 hover:text-text"
              >
                <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" [class.bg-accent]="lab.ready" [class.bg-line]="!lab.ready"></span>
                <span>
                  <span class="block leading-snug">{{ mode.basic() ? lab.playTitle : lab.title }}</span>
                  <span class="mt-0.5 block text-[11px] text-muted">{{ mode.basic() ? lab.playBlurb : lab.cluster }}</span>
                </span>
              </a>
            </li>
          }
        </ul>
        <button type="button" class="m-3 rounded-xl border border-line px-3 py-2 text-left text-xs text-muted" (click)="palette.set(true)">
          Search · ⌘K
        </button>
      </nav>
      <div class="flex min-w-0 flex-1 flex-col">
        <header class="flex items-center justify-between gap-3 border-b border-line px-5 py-2.5">
          <p class="text-sm text-muted">{{ t('product') }}</p>
          <div class="flex items-center gap-3">
            <div class="flex rounded-full border border-line p-0.5" role="group" [attr.aria-label]="t('modeGroup')">
              <button
                type="button"
                class="rounded-full px-3 py-1 text-xs"
                [class.bg-accent]="mode.basic()"
                [class.font-semibold]="mode.basic()"
                [class.text-ink]="mode.basic()"
                [class.text-muted]="!mode.basic()"
                (click)="mode.set('basic')"
              >
                {{ t('modeBasic') }}
              </button>
              <button
                type="button"
                class="rounded-full px-3 py-1 text-xs"
                [class.bg-accent]="mode.advanced()"
                [class.font-semibold]="mode.advanced()"
                [class.text-ink]="mode.advanced()"
                [class.text-muted]="!mode.advanced()"
                (click)="mode.set('advanced')"
              >
                {{ t('modeAdvanced') }}
              </button>
            </div>
            <span class="hidden text-xs text-muted sm:inline">{{ session.email() }}</span>
            <button type="button" class="text-xs text-muted" (click)="session.logout()">Sign out</button>
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
  readonly mode = inject(LabMode);
  readonly palette = signal(false);
  readonly t = t;
  private readonly router = inject(Router);
  readonly visibleLabs = computed(() => (this.mode.basic() ? LABS.filter((l) => l.ready) : LABS));

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
