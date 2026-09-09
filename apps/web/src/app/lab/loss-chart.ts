import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-loss-chart',
  template: `
    <svg viewBox="0 0 720 160" class="h-40 w-full" role="img" [attr.aria-label]="'Loss curve, ' + losses().length + ' steps'">
      <rect x="0" y="0" width="720" height="160" fill="#0b0d12" rx="12" />
      @if (path()) {
        <path [attr.d]="path()" fill="none" stroke="#5eead4" stroke-width="2" />
      }
      <text x="16" y="22" fill="#8b919c" font-size="11" font-family="IBM Plex Mono, monospace">loss</text>
      @if (diverged()) {
        <text x="560" y="22" fill="#f87171" font-size="11" font-family="IBM Plex Mono, monospace">diverging</text>
      }
    </svg>
  `,
})
export class LossChart {
  readonly losses = input.required<number[]>();
  readonly diverged = input(false);

  readonly path = computed(() => {
    const ls = this.losses().filter((v) => Number.isFinite(v));
    if (ls.length < 2) return '';
    const max = Math.max(...ls);
    const min = Math.min(...ls);
    const span = max - min || 1;
    return ls
      .map((v, i) => {
        const x = 16 + (i / (ls.length - 1)) * 688;
        const y = 140 - ((v - min) / span) * 110;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  });
}
