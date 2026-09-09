import { boxMuller, mulberry32 } from './prng';

export type Point = { x: number; y: number };

export type ResidualPoint = Point & { yHat: number; residual: number };

export type DatasetSpec = {
  n: number;
  slope: number;
  intercept: number;
  noise: number;
  seed: number;
  xMin?: number;
  xMax?: number;
  outliers?: number;
};

export type Gradients = { dSlope: number; dIntercept: number };

export type GdStep = {
  slope: number;
  intercept: number;
  mse: number;
  gradients: Gradients;
};

export type GdRun = {
  steps: GdStep[];
  losses: number[];
  diverged: boolean;
  oscillated: boolean;
  finalSlope: number;
  finalIntercept: number;
};

export function generateRegressionDataset(spec: DatasetSpec): Point[] {
  const rand = mulberry32(spec.seed);
  const xMin = spec.xMin ?? -2;
  const xMax = spec.xMax ?? 2;
  const points: Point[] = [];
  for (let i = 0; i < spec.n; i++) {
    const x = xMin + rand() * (xMax - xMin);
    const noise = boxMuller(rand) * spec.noise;
    const y = spec.slope * x + spec.intercept + noise;
    points.push({ x, y });
  }
  const outlierCount = Math.max(0, Math.min(spec.outliers ?? 0, spec.n));
  for (let i = 0; i < outlierCount; i++) {
    const idx = Math.floor(rand() * points.length);
    points[idx] = {
      x: points[idx].x,
      y: points[idx].y + (rand() > 0.5 ? 1 : -1) * (8 + rand() * 6) * Math.max(spec.noise, 0.3),
    };
  }
  return points;
}

export function predictY(x: number, slope: number, intercept: number): number {
  return slope * x + intercept;
}

export function predictions(points: Point[], slope: number, intercept: number): number[] {
  return points.map((p) => predictY(p.x, slope, intercept));
}

export function residuals(points: Point[], slope: number, intercept: number): number[] {
  return points.map((p) => p.y - predictY(p.x, slope, intercept));
}

export function mse(points: Point[], slope: number, intercept: number): number {
  if (points.length === 0) return Number.NaN;
  let sum = 0;
  for (const p of points) {
    const e = p.y - predictY(p.x, slope, intercept);
    sum += e * e;
  }
  return sum / points.length;
}

export function mae(points: Point[], slope: number, intercept: number): number {
  if (points.length === 0) return Number.NaN;
  let sum = 0;
  for (const p of points) {
    sum += Math.abs(p.y - predictY(p.x, slope, intercept));
  }
  return sum / points.length;
}

export function residualPoints(points: Point[], slope: number, intercept: number): ResidualPoint[] {
  return points.map((p) => {
    const yHat = predictY(p.x, slope, intercept);
    return { x: p.x, y: p.y, yHat, residual: p.y - yHat };
  });
}

/** Gradients of MSE wrt slope and intercept (factor 2/n). */
export function gradients(points: Point[], slope: number, intercept: number): Gradients {
  const n = points.length;
  if (n === 0) return { dSlope: Number.NaN, dIntercept: Number.NaN };
  let dSlope = 0;
  let dIntercept = 0;
  for (const p of points) {
    const err = predictY(p.x, slope, intercept) - p.y;
    dSlope += err * p.x;
    dIntercept += err;
  }
  return { dSlope: (2 / n) * dSlope, dIntercept: (2 / n) * dIntercept };
}

export function gradientDescentStep(
  points: Point[],
  slope: number,
  intercept: number,
  learningRate: number,
): GdStep {
  const g = gradients(points, slope, intercept);
  const nextSlope = slope - learningRate * g.dSlope;
  const nextIntercept = intercept - learningRate * g.dIntercept;
  return {
    slope: nextSlope,
    intercept: nextIntercept,
    mse: mse(points, nextSlope, nextIntercept),
    gradients: g,
  };
}

export function isDivergedLoss(losses: number[]): boolean {
  if (losses.length === 0) return false;
  const first = losses[0];
  const last = losses[losses.length - 1];
  if (!Number.isFinite(last) || Number.isNaN(last)) return true;
  if (Math.abs(last) > 1e6) return true;
  if (Number.isFinite(first) && first >= 0 && last > Math.max(first * 8, first + 20)) return true;
  return false;
}

export function isOscillating(losses: number[]): boolean {
  if (losses.length < 6) return false;
  let flips = 0;
  for (let i = 2; i < losses.length; i++) {
    const d0 = losses[i - 1] - losses[i - 2];
    const d1 = losses[i] - losses[i - 1];
    if (d0 * d1 < 0) flips += 1;
  }
  const last = losses[losses.length - 1];
  const first = losses[0];
  return flips >= Math.floor(losses.length / 3) && last >= first;
}

export function runGradientDescent(
  points: Point[],
  init: { slope: number; intercept: number },
  learningRate: number,
  iterations: number,
): GdRun {
  const steps: GdStep[] = [];
  const losses: number[] = [mse(points, init.slope, init.intercept)];
  let slope = init.slope;
  let intercept = init.intercept;
  for (let i = 0; i < iterations; i++) {
    const step = gradientDescentStep(points, slope, intercept, learningRate);
    slope = step.slope;
    intercept = step.intercept;
    steps.push(step);
    losses.push(step.mse);
    if (!Number.isFinite(step.mse) || Math.abs(step.mse) > 1e12) break;
  }
  return {
    steps,
    losses,
    diverged: isDivergedLoss(losses),
    oscillated: isOscillating(losses),
    finalSlope: slope,
    finalIntercept: intercept,
  };
}

export function ordinaryLeastSquares(points: Point[]): { slope: number; intercept: number } {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  let xMean = 0;
  let yMean = 0;
  for (const p of points) {
    xMean += p.x;
    yMean += p.y;
  }
  xMean /= n;
  yMean /= n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    const dx = p.x - xMean;
    num += dx * (p.y - yMean);
    den += dx * dx;
  }
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: yMean - slope * xMean };
}

export const LINEAR_REGRESSION_CONCEPT_ID = 'linear-regression';

export const REFERENCE_PYTHON = `# Reference linear regression: MSE + batch gradient descent
import json, math
from pathlib import Path

data = json.loads(Path("dataset.json").read_text())
xs = [p["x"] for p in data["points"]]
ys = [p["y"] for p in data["points"]]
lr = float(data.get("learningRate", 0.05))
iters = int(data.get("iterations", 80))
slope = float(data.get("initSlope", 0.0))
intercept = float(data.get("initIntercept", 0.0))
n = len(xs)

def mse(s, b):
    return sum((ys[i] - (s * xs[i] + b)) ** 2 for i in range(n)) / n

history = [mse(slope, intercept)]
for _ in range(iters):
    err = [(slope * xs[i] + intercept) - ys[i] for i in range(n)]
    d_s = (2 / n) * sum(err[i] * xs[i] for i in range(n))
    d_b = (2 / n) * sum(err)
    slope -= lr * d_s
    intercept -= lr * d_b
    history.append(mse(slope, intercept))

print("slope", slope)
print("intercept", intercept)
print("mse", history[-1])
print("diverged", (not math.isfinite(history[-1])) or history[-1] > history[0] * 8)
`;
