import { Component, computed, input, output } from '@angular/core';
import type { Point } from '@ml-lab/ml-core';
import { residualPoints } from '@ml-lab/ml-core';

@Component({
  selector: 'app-scatter-chart',
  template: `
    <svg
      role="img"
      [attr.aria-label]="
        'Scatter plot with ' + points().length + ' points and a fit line. MSE ' + mse().toFixed(3)
      "
      viewBox="0 0 720 420"
      class="h-full w-full touch-none rounded-xl bg-[#0b0d12]"
      (pointerdown)="onDown($event)"
      (pointermove)="onMove($event)"
      (pointerup)="onUp()"
      (pointerleave)="onUp()"
    >
      <defs>
        <linearGradient id="plotFade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="#5eead4" stop-opacity="0.05" />
          <stop offset="1" stop-color="#5eead4" stop-opacity="0" />
        </linearGradient>
      </defs>
      @for (g of grid(); track g.k) {
        <line [attr.x1]="g.x1" [attr.x2]="g.x2" [attr.y1]="g.y1" [attr.y2]="g.y2" stroke="#1c2230" stroke-width="1" />
      }
      @if (showResiduals()) {
        @for (r of residuals(); track $index) {
          <line
            [attr.x1]="sx(r.x)"
            [attr.x2]="sx(r.x)"
            [attr.y1]="sy(r.y)"
            [attr.y2]="sy(r.yHat)"
            stroke="#f5a524"
            stroke-opacity="0.7"
            stroke-width="1.4"
          />
        }
      }
      <line
        [attr.x1]="sx(xMin())"
        [attr.y1]="sy(yAt(xMin()))"
        [attr.x2]="sx(xMax())"
        [attr.y2]="sy(yAt(xMax()))"
        stroke="#f4f7fb"
        stroke-width="2.4"
      />
      @for (p of points(); track $index) {
        <circle [attr.cx]="sx(p.x)" [attr.cy]="sy(p.y)" r="4.2" fill="#5eead4" fill-opacity="0.9" />
      }
      <circle
        [attr.cx]="sx(xMax())"
        [attr.cy]="sy(yAt(xMax()))"
        r="8"
        fill="#0b0d12"
        stroke="#5eead4"
        stroke-width="2"
        class="cursor-nwse-resize"
      />
      <circle
        [attr.cx]="sx((xMin() + xMax()) / 2)"
        [attr.cy]="sy(yAt((xMin() + xMax()) / 2))"
        r="7"
        fill="#5eead4"
        class="cursor-ns-resize"
      />
      <text x="16" y="22" fill="#8b919c" font-size="11" font-family="IBM Plex Mono, monospace">
        ŷ = {{ slope().toFixed(2) }} x + {{ intercept().toFixed(2) }}
      </text>
    </svg>
  `,
})
export class ScatterChart {
  readonly points = input.required<Point[]>();
  readonly slope = input.required<number>();
  readonly intercept = input.required<number>();
  readonly mse = input.required<number>();
  readonly showResiduals = input(true);
  readonly slopeChange = output<number>();
  readonly interceptChange = output<number>();

  private dragging: 'slope' | 'intercept' | null = null;

  readonly residuals = computed(() => residualPoints(this.points(), this.slope(), this.intercept()));

  readonly xMin = computed(() => this.extent('x')[0]);
  readonly xMax = computed(() => this.extent('x')[1]);
  readonly yMin = computed(() => this.extent('y')[0]);
  readonly yMax = computed(() => this.extent('y')[1]);

  readonly grid = computed(() => {
    const lines: { k: string; x1: number; x2: number; y1: number; y2: number }[] = [];
    for (let i = 0; i <= 6; i++) {
      const x = 48 + (i / 6) * 656;
      const y = 20 + (i / 6) * 360;
      lines.push({ k: 'v' + i, x1: x, x2: x, y1: 20, y2: 380 });
      lines.push({ k: 'h' + i, x1: 48, x2: 704, y1: y, y2: y });
    }
    return lines;
  });

  yAt(x: number) {
    return this.slope() * x + this.intercept();
  }

  sx(x: number) {
    const [a, b] = this.extent('x');
    return 48 + ((x - a) / Math.max(b - a, 1e-6)) * 656;
  }

  sy(y: number) {
    const [a, b] = this.extent('y');
    return 20 + (1 - (y - a) / Math.max(b - a, 1e-6)) * 360;
  }

  private invX(px: number) {
    const [a, b] = this.extent('x');
    return a + ((px - 48) / 656) * (b - a);
  }

  private invY(py: number) {
    const [a, b] = this.extent('y');
    return a + (1 - (py - 20) / 360) * (b - a);
  }

  onDown(ev: PointerEvent) {
    const svg = ev.currentTarget as SVGSVGElement;
    const pt = this.local(svg, ev);
    const handleX = this.sx(this.xMax());
    const handleY = this.sy(this.yAt(this.xMax()));
    const midX = this.sx((this.xMin() + this.xMax()) / 2);
    const midY = this.sy(this.yAt((this.xMin() + this.xMax()) / 2));
    if (Math.hypot(pt.x - handleX, pt.y - handleY) < 16) this.dragging = 'slope';
    else this.dragging = 'intercept';
    void midX;
    void midY;
    svg.setPointerCapture(ev.pointerId);
  }

  onMove(ev: PointerEvent) {
    if (!this.dragging) return;
    const svg = ev.currentTarget as SVGSVGElement;
    const pt = this.local(svg, ev);
    const dataX = this.invX(pt.x);
    const dataY = this.invY(pt.y);
    if (this.dragging === 'intercept') {
      const predicted = this.yAt(dataX);
      this.interceptChange.emit(this.intercept() + (dataY - predicted));
    } else {
      const mx = (this.xMin() + this.xMax()) / 2;
      const my = this.yAt(mx);
      const dx = dataX - mx;
      if (Math.abs(dx) < 1e-6) return;
      const newSlope = (dataY - my) / dx;
      this.slopeChange.emit(newSlope);
      this.interceptChange.emit(my - newSlope * mx);
    }
  }

  onUp() {
    this.dragging = null;
  }

  private local(svg: SVGSVGElement, ev: PointerEvent) {
    const r = svg.getBoundingClientRect();
    return {
      x: ((ev.clientX - r.left) / r.width) * 720,
      y: ((ev.clientY - r.top) / r.height) * 420,
    };
  }

  private extent(axis: 'x' | 'y'): [number, number] {
    const pts = this.points();
    if (!pts.length) return [-2, 2];
    const vs = pts.map((p) => p[axis]);
    // include the current line so it stays in frame
    if (axis === 'y') {
      vs.push(this.yAt(this.xMinSafe(pts)), this.yAt(this.xMaxSafe(pts)));
    }
    const min = Math.min(...vs);
    const max = Math.max(...vs);
    const pad = (max - min) * 0.12 || 1;
    return [min - pad, max + pad];
  }

  private xMinSafe(pts: Point[]) {
    return Math.min(...pts.map((p) => p.x));
  }
  private xMaxSafe(pts: Point[]) {
    return Math.max(...pts.map((p) => p.x));
  }
}
