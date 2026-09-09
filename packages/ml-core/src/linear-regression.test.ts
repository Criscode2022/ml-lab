import { describe, expect, it } from 'vitest';
import {
  generateRegressionDataset,
  gradientDescentStep,
  mse,
  ordinaryLeastSquares,
  predictions,
  residuals,
  runGradientDescent,
} from './linear-regression';

const wellConditioned = generateRegressionDataset({
  n: 64,
  slope: 1.35,
  intercept: 0.4,
  noise: 0.12,
  seed: 42,
  xMin: -2,
  xMax: 2,
});

describe('linear regression core', () => {
  it('a line closer to the generating process has lower MSE than a far line', () => {
    const close = mse(wellConditioned, 1.35, 0.4);
    const far = mse(wellConditioned, -4, 8);
    expect(Number.isFinite(close)).toBe(true);
    expect(Number.isFinite(far)).toBe(true);
    expect(close).toBeLessThan(far);
  });

  it('predictions and residuals are consistent with MSE', () => {
    const slope = 0.5;
    const intercept = -1;
    const yHats = predictions(wellConditioned, slope, intercept);
    const r = residuals(wellConditioned, slope, intercept);
    expect(yHats).toHaveLength(wellConditioned.length);
    expect(r).toHaveLength(wellConditioned.length);
    const fromResiduals =
      r.reduce((acc, e) => acc + e * e, 0) / wellConditioned.length;
    expect(Math.abs(fromResiduals - mse(wellConditioned, slope, intercept))).toBeLessThan(1e-12);
    for (let i = 0; i < wellConditioned.length; i++) {
      expect(r[i]).toBeCloseTo(wellConditioned[i].y - yHats[i], 12);
    }
  });

  it('small learning rate decreases loss on a well-conditioned synthetic set', () => {
    const start = { slope: -2.5, intercept: 3.2 };
    const first = mse(wellConditioned, start.slope, start.intercept);
    const run = runGradientDescent(wellConditioned, start, 0.08, 70);
    const last = run.losses[run.losses.length - 1];
    expect(last).toBeLessThan(first);
    expect(run.diverged).toBe(false);
    const afterOne = gradientDescentStep(wellConditioned, start.slope, start.intercept, 0.08);
    expect(afterOne.mse).toBeLessThan(first);
  });

  it('large learning rate grows or oscillates (divergence)', () => {
    const start = { slope: -1.2, intercept: 2.4 };
    const first = mse(wellConditioned, start.slope, start.intercept);
    const run = runGradientDescent(wellConditioned, start, 1.8, 24);
    const last = run.losses[run.losses.length - 1];
    const grew = last > first;
    const notFinite = !Number.isFinite(last);
    expect(grew || notFinite || run.diverged || run.oscillated).toBe(true);
    expect(run.diverged || run.oscillated || notFinite || last > first).toBe(true);
  });

  it('ordinary least squares beats a random init on MSE', () => {
    const ols = ordinaryLeastSquares(wellConditioned);
    const randomMse = mse(wellConditioned, 0, 0);
    expect(mse(wellConditioned, ols.slope, ols.intercept)).toBeLessThan(randomMse);
  });
});
