import { Component, computed, input } from '@angular/core';
import type { SurfaceCell } from '@ml-lab/ml-core';

@Component({
  selector: 'app-loss-surface',
  template: `
    <svg viewBox="0 0 280 280" class="h-full w-full" role="img" aria-label="Loss surface over slope and intercept">
      <rect width="280" height="280" fill="#0b0d12" rx="12" />
      @for (c of cells(); track c.k) {
        <rect [attr.x]="c.x" [attr.y]="c.y" [attr.width]="c.w" [attr.height]="c.h" [attr.fill]="c.fill" />
      }
      <circle [attr.cx]="markX()" [attr.cy]="markY()" r="5" fill="none" stroke="#f4f7fb" stroke-width="1.6" />
      <text x="12" y="18" fill="#8b919c" font-size="10" font-family="IBM Plex Mono, monospace">loss surface</text>
      <text x="12" y="268" fill="#5c6370" font-size="9" font-family="IBM Plex Mono, monospace">slope →</text>
    </svg>
  `,
})
export class LossSurface {
  readonly cellsIn = input.required<SurfaceCell[]>();
  readonly slope = input.required<number>();
  readonly intercept = input.required<number>();
  readonly span = input(3);
  readonly steps = input(28);

  readonly cells = computed(() => {
    const raw = this.cellsIn();
    if (!raw.length) return [];
    const finite = raw.filter((c) => Number.isFinite(c.mse));
    if (!finite.length) return [];
    const min = Math.min(...finite.map((c) => c.mse));
    const max = Math.max(...finite.map((c) => c.mse));
    const n = this.steps();
    const w = 256 / n;
    return raw.map((c, idx) => {
      const i = Math.floor(idx / n);
      const j = idx % n;
      const t = max === min ? 0 : (c.mse - min) / (max - min);
      const fill = heat(t);
      return { k: idx, x: 12 + i * w, y: 256 - (j + 1) * w + 12, w: w + 0.4, h: w + 0.4, fill };
    });
  });

  markX() {
    const n = this.steps();
    const span = this.span();
    const s0 = this.slope() - span; // wait, surface is centered on OLS not current
    // cells generated around center stored in first/last
    const raw = this.cellsIn();
    if (!raw.length) return 140;
    const sMin = raw[0].s;
    const sMax = raw[raw.length - 1].s;
    const t = (this.slope() - sMin) / Math.max(sMax - sMin, 1e-6);
    return 12 + t * 256;
  }

  markY() {
    const raw = this.cellsIn();
    if (!raw.length) return 140;
    const bMin = Math.min(...raw.map((c) => c.b));
    const bMax = Math.max(...raw.map((c) => c.b));
    const t = (this.intercept() - bMin) / Math.max(bMax - bMin, 1e-6);
    return 12 + (1 - t) * 256;
  }
}

function heat(t: number): string {
  const u = Math.max(0, Math.min(1, t));
  const r = Math.round(14 + u * 80);
  const g = Math.round(80 - u * 50);
  const b = Math.round(90 + (1 - u) * 80);
  return `rgb(${r},${g},${b})`;
}
