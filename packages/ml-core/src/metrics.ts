import { mse, predictY, type Point } from './linear-regression';
import { mulberry32 } from './prng';

export function rSquared(points: Point[], slope: number, intercept: number): number {
  if (points.length < 2) return Number.NaN;
  let yMean = 0;
  for (const p of points) yMean += p.y;
  yMean /= points.length;
  let ssTot = 0;
  let ssRes = 0;
  for (const p of points) {
    const d = p.y - yMean;
    ssTot += d * d;
    const e = p.y - predictY(p.x, slope, intercept);
    ssRes += e * e;
  }
  if (ssTot < 1e-18) return Number.NaN;
  return 1 - ssRes / ssTot;
}

export function splitPoints(
  points: Point[],
  seed: number,
  holdoutFraction = 0.25,
): { train: Point[]; holdout: Point[] } {
  if (points.length === 0) return { train: [], holdout: [] };
  const rand = mulberry32(seed + 991);
  const idx = points.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = idx[i];
    idx[i] = idx[j];
    idx[j] = tmp;
  }
  const nHold = Math.max(1, Math.min(points.length - 2, Math.round(points.length * holdoutFraction)));
  const holdout = idx.slice(0, nHold).map((i) => points[i]);
  const train = idx.slice(nHold).map((i) => points[i]);
  return { train, holdout };
}

export type HistBin = { start: number; end: number; count: number };

export function residualHistogram(
  points: Point[],
  slope: number,
  intercept: number,
  binCount = 8,
): HistBin[] {
  const errs = points.map((p) => p.y - predictY(p.x, slope, intercept));
  if (errs.length === 0) return [];
  let min = Math.min(...errs);
  let max = Math.max(...errs);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const width = (max - min) / binCount;
  const bins: HistBin[] = [];
  for (let i = 0; i < binCount; i++) {
    bins.push({ start: min + i * width, end: min + (i + 1) * width, count: 0 });
  }
  for (const e of errs) {
    let i = Math.floor((e - min) / width);
    if (i >= binCount) i = binCount - 1;
    if (i < 0) i = 0;
    bins[i].count += 1;
  }
  return bins;
}

export type SurfaceCell = { s: number; b: number; mse: number };

export function lossSurface(
  points: Point[],
  slopeCenter: number,
  interceptCenter: number,
  span = 3,
  steps = 28,
): SurfaceCell[] {
  const cells: SurfaceCell[] = [];
  if (points.length === 0) return cells;
  const s0 = slopeCenter - span;
  const b0 = interceptCenter - span;
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < steps; j++) {
      const s = s0 + (i / (steps - 1)) * span * 2;
      const b = b0 + (j / (steps - 1)) * span * 2;
      cells.push({ s, b, mse: mse(points, s, b) });
    }
  }
  return cells;
}
