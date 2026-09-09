import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Session } from '../core/session';
import { Palette } from './palette';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Palette],
  template: `
    <div class="flex min-h-screen bg-ink">
      <nav class="flex w-16 flex-col items-center gap-4 border-r border-line py-4" aria-label="Primary">
        <a routerLink="/app" class="font-mono text-[10px] tracking-widest text-accent">LAB</a>
        <a routerLink="/app" routerLinkActive="text-accent" class="text-xs text-muted" title="Dashboard">Home</a>
        <a routerLink="/app/lab/linear-regression" class="text-xs text-muted" title="Laboratory">Fit</a>
        <button type="button" class="mt-auto text-[10px] text-muted" (click)="palette.set(true)">⌘K</button>
      </nav>
      <div class="flex min-w-0 flex-1 flex-col">
        <header class="flex items-center justify-between border-b border-line px-6 py-3">
          <p class="text-sm text-muted">Linear Regression laboratory</p>
          <div class="flex items-center gap-3 text-xs text-muted">
            <span>{{ session.email() }}</span>
            <button type="button" (click)="session.logout()">Sign out</button>
          </div>
        </header>
        <main class="lab-scroll flex-1 overflow-auto p-6">
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
  readonly lastAction = signal<string | null>(null);

  @HostListener('document:keydown', ['$event'])
  onKey(ev: KeyboardEvent) {
    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k') {
      ev.preventDefault();
      this.palette.update((v) => !v);
    }
  }

  onAction(id: string) {
    this.lastAction.set(id);
    window.dispatchEvent(new CustomEvent('ml-lab-command', { detail: id }));
  }
}
