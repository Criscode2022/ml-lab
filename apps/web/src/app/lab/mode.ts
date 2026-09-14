import { Injectable, computed, signal } from '@angular/core';

export type StudioMode = 'basic' | 'advanced';

const KEY = 'ml-lab-mode';

@Injectable({ providedIn: 'root' })
export class LabMode {
  readonly mode = signal<StudioMode>(readMode());
  readonly basic = computed(() => this.mode() === 'basic');
  readonly advanced = computed(() => this.mode() === 'advanced');

  set(next: StudioMode) {
    this.mode.set(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore quota / private mode */
    }
  }
}

function readMode(): StudioMode {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === 'advanced' || raw === 'basic') return raw;
  } catch {
    /* ignore */
  }
  return 'basic';
}
