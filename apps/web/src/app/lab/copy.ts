import type { ExperimentSituation } from '@ml-lab/ml-core';

export type StudioMode = 'basic' | 'advanced';

export function matchPercent(ratio: number): number {
  if (!Number.isFinite(ratio) || ratio <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(100 / ratio)));
}

export function headlineFor(
  situation: ExperimentSituation,
  ratio: number,
  mode: StudioMode,
): string {
  if (mode === 'basic') {
    switch (situation) {
      case 'empty':
        return 'No dots yet.';
      case 'diverged':
        return 'The automatic search ran too fast and the line flew off the page. Press “Find the line” again, or drag it yourself.';
      case 'oscillating':
        return 'The search is bouncing past the best line. Its steps are too big.';
      case 'near-ols':
        return 'Nice match. For a straight line, this is about as close as it gets.';
      case 'improving':
        return 'Getting warmer — the line is sliding toward the dots.';
      case 'far-from-ols':
        return 'The white line does not match the dots yet. Drag it, or press “Find the line”.';
      default:
        return 'Each teal dot is a measurement. The white line is your guess — drag it to follow the dots.';
    }
  }
  switch (situation) {
    case 'empty':
      return 'No points yet.';
    case 'diverged':
      return 'Descent blew up. MSE is no longer a useful number — the learning rate is too large.';
    case 'oscillating':
      return 'Loss is bouncing. The step size is overshooting the minimum.';
    case 'near-ols':
      return 'Close to the least-squares line. Leftover error is mostly noise.';
    case 'improving':
      return 'Loss is falling. Keep stepping, or open Math if you want the gradient.';
    case 'far-from-ols':
      return `This line is a weak fit. MSE is ${ratio.toFixed(1)}× the closed-form minimum.`;
    default:
      return 'A guess line. Drag it on the plot, snap to least squares, or run descent.';
  }
}
