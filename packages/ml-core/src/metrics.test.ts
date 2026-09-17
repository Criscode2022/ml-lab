import { describe, expect, it } from 'vitest';
import { generateRegressionDataset, mse, ordinaryLeastSquares, predictY } from './linear-regression';
import { lossSurface, residualHistogram, rSquared, splitPoints } from './metrics';

const data = generateRegressionDataset({
  n: 80,
  slope: 1.2,
  intercept: -0.3,
  noise: 0.15,
  seed: 9,
});

describe('metrics', () => {
  it('gives OLS a higher R² than a zero line on the same data', () => {
    const ols = ordinaryLeastSquares(data);
    const good = rSquared(data, ols.slope, ols.intercept);
    const bad = rSquared(data, 0, 0);
    expect(good).toBeGreaterThan(bad);
    expect(good).toBeLessThanOrEqual(1);
  });

  it('splits into disjoint train and holdout that cover every point', () => {
    const { train, holdout } = splitPoints(data, 3, 0.25);
    expect(train.length + holdout.length).toBe(data.length);
    expect(holdout.length).toBeGreaterThan(0);
    expect(train.length).toBeGreaterThan(holdout.length);
    const keys = new Set([...train, ...holdout].map((p) => `${p.x}:${p.y}`));
    expect(keys.size).toBe(data.length);
  });

  it('builds a residual histogram whose counts sum to n', () => {
    const ols = ordinaryLeastSquares(data);
    const bins = residualHistogram(data, ols.slope, ols.intercept, 8);
    const total = bins.reduce((s, b) => s + b.count, 0);
    expect(total).toBe(data.length);
  });

  it('loss surface reports the OLS cell among the lowest MSE values', () => {
    const ols = ordinaryLeastSquares(data);
    const grid = lossSurface(data, ols.slope, ols.intercept, 2, 21);
    const best = grid.reduce((a, b) => (a.mse < b.mse ? a : b));
    const atOls = mse(data, ols.slope, ols.intercept);
    expect(best.mse).toBeLessThanOrEqual(atOls + 1e-6);
    expect(predictY(0, ols.slope, ols.intercept)).toBeCloseTo(ols.intercept);
  });
});
