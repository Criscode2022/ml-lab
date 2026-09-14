import { describe, expect, it } from 'vitest';
import { generateRegressionDataset, mse, ordinaryLeastSquares, runGradientDescent } from './linear-regression';
import { describeExperiment } from './readout';

const data = generateRegressionDataset({
  n: 64,
  slope: 1.35,
  intercept: 0.4,
  noise: 0.12,
  seed: 42,
  xMin: -2,
  xMax: 2,
});

describe('describeExperiment', () => {
  it('labels a huge learning-rate trajectory as diverged using the real GD run', () => {
    const run = runGradientDescent(data, { slope: 0, intercept: 0 }, 1.8, 24);
    const view = describeExperiment({
      points: data,
      slope: run.finalSlope,
      intercept: run.finalIntercept,
      learningRate: 1.8,
      diverged: run.diverged,
      losses: run.losses,
    });
    expect(run.diverged).toBe(true);
    expect(view.situation).toBe('diverged');
    expect(view.mse).toBeGreaterThan(view.olsMse);
  });

  it('labels the closed-form fit as near the OLS minimum', () => {
    const ols = ordinaryLeastSquares(data);
    const view = describeExperiment({
      points: data,
      slope: ols.slope,
      intercept: ols.intercept,
      learningRate: 0.05,
      diverged: false,
      losses: [mse(data, ols.slope, ols.intercept)],
    });
    expect(view.situation).toBe('near-ols');
    expect(view.ratio).toBeLessThan(1.05);
    expect(Math.abs(view.olsSlope - ols.slope)).toBeLessThan(1e-12);
  });

  it('labels a zero line on noisy data as far from OLS', () => {
    const view = describeExperiment({
      points: data,
      slope: 0,
      intercept: 0,
      learningRate: 0.05,
      diverged: false,
      losses: [mse(data, 0, 0)],
    });
    expect(view.situation).toBe('far-from-ols');
    expect(view.ratio).toBeGreaterThan(2);
  });
});
