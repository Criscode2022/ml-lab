import { gradients, mse, ordinaryLeastSquares, type Gradients, type Point } from './linear-regression';

export type ExperimentSituation =
  | 'empty'
  | 'diverged'
  | 'oscillating'
  | 'far-from-ols'
  | 'near-ols'
  | 'improving'
  | 'idle';

export type ExperimentDescription = {
  situation: ExperimentSituation;
  mse: number;
  olsMse: number;
  olsSlope: number;
  olsIntercept: number;
  ratio: number;
  gradients: Gradients;
  lossDelta: number | null;
};

export function describeExperiment(input: {
  points: Point[];
  slope: number;
  intercept: number;
  learningRate: number;
  diverged: boolean;
  losses: number[];
}): ExperimentDescription {
  const { points, slope, intercept, diverged, losses } = input;
  const ols = ordinaryLeastSquares(points);
  const current = mse(points, slope, intercept);
  const olsMse = mse(points, ols.slope, ols.intercept);
  const ratio = olsMse > 1e-12 ? current / olsMse : current === 0 ? 1 : Number.POSITIVE_INFINITY;
  const g = gradients(points, slope, intercept);
  const finiteLosses = losses.filter((v) => Number.isFinite(v));
  const lossDelta =
    finiteLosses.length >= 2 ? finiteLosses[finiteLosses.length - 1] - finiteLosses[0] : null;

  let situation: ExperimentSituation = 'idle';
  if (points.length === 0) situation = 'empty';
  else if (diverged || !Number.isFinite(current) || Math.abs(current) > 1e6) situation = 'diverged';
  else if (
    finiteLosses.length >= 6 &&
    lossDelta !== null &&
    lossDelta > 0 &&
    input.learningRate >= 0.5
  ) {
    situation = 'oscillating';
  } else if (ratio <= 1.15) situation = 'near-ols';
  else if (lossDelta !== null && lossDelta < -1e-6 && ratio > 1.15) situation = 'improving';
  else if (ratio > 2) situation = 'far-from-ols';

  return {
    situation,
    mse: current,
    olsMse,
    olsSlope: ols.slope,
    olsIntercept: ols.intercept,
    ratio,
    gradients: g,
    lossDelta,
  };
}
