import { Component, computed, input } from '@angular/core';
import type { HistBin } from '@ml-lab/ml-core';

@Component({
  selector: 'app-residual-hist',
  template: `
    <svg viewBox="0 0 280 120" class="h-28 w-full" role="img" aria-label="Residual histogram">
      <rect width="280" height="120" fill="#0b0d12" rx="12" />
      @for (b of bars(); track b.k) {
        <rect [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" [attr.height]="b.h" fill="#5eead4" fill-opacity="0.75" />
      }
      <text x="12" y="16" fill="#8b919c" font-size="10" font-family="IBM Plex Mono, monospace">residuals</text>
    </svg>
  `,
})
export class ResidualHist {
  readonly bins = input.required<HistBin[]>();
  readonly bars = computed(() => {
    const bins = this.bins();
    const max = Math.max(1, ...bins.map((b) => b.count));
    const n = bins.length || 1;
    const w = 248 / n;
    return bins.map((b, i) => {
      const h = (b.count / max) * 88;
      return { k: i, x: 16 + i * w, y: 108 - h, w: w - 2, h };
    });
  });
}
