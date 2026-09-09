import { mse, type Point } from '@ml-lab/ml-core';
import { CONCEPT_CATALOG, type ExperimentSnapshot } from '@ml-lab/contracts';
import { summarizeDataset } from './context';

export function inspectExperiment(experiment: ExperimentSnapshot) {
  return {
    conceptId: experiment.conceptId,
    name: experiment.name,
    parameters: experiment.parameters,
    metrics: experiment.metrics,
    dataset: summarizeDataset(experiment),
    notes: experiment.notes ?? null,
  };
}

export function inspectDataset(experiment: ExperimentSnapshot) {
  const summary = summarizeDataset(experiment);
  const pts = experiment.dataset.points;
  const sample = pts.slice(0, 8);
  return { ...summary, sample, spec: experiment.dataset.spec };
}

export function retrieveConcept(conceptId: string) {
  const node = CONCEPT_CATALOG.find((c) => c.id === conceptId);
  if (!node) return { found: false as const, conceptId };
  return {
    found: true as const,
    ...node,
    formulation:
      conceptId === 'linear-regression'
        ? 'ŷ = s x + b; MSE = (1/n) Σ (y − ŷ)²'
        : undefined,
  };
}

export function evaluateChallengeAnswer(input: {
  kind: 'mse' | 'diverge' | 'explain';
  expected: unknown;
  answer: unknown;
  points?: Point[];
}): { score: number; correct: boolean; feedback: string; derived?: unknown } {
  if (input.kind === 'mse') {
    const expected = Number((input.expected as { mse?: number })?.mse);
    const answer = Number(input.answer);
    if (!Number.isFinite(answer) || !Number.isFinite(expected)) {
      return { score: 0, correct: false, feedback: 'Need a numeric MSE.' };
    }
    const rel = Math.abs(answer - expected) / Math.max(expected, 1e-6);
    const correct = rel < 0.08 || Math.abs(answer - expected) < 0.05;
    return {
      score: correct ? 1 : Math.max(0, 1 - rel),
      correct,
      feedback: correct
        ? 'MSE matches the current line and dataset.'
        : 'That MSE does not match this dataset and line. Recompute (1/n) Σ (y − ŷ)².',
      derived: { expected },
    };
  }
  if (input.kind === 'diverge') {
    const expected = Boolean((input.expected as { diverges?: boolean })?.diverges);
    const answer = Boolean(input.answer);
    const correct = answer === expected;
    return {
      score: correct ? 1 : 0,
      correct,
      feedback: correct
        ? 'You read the loss trajectory correctly.'
        : expected
          ? 'A learning rate this large overshoots the minimum; loss should grow or oscillate.'
          : 'This learning rate is small enough that MSE should fall on a well-conditioned set.',
    };
  }
  return {
    score: 0.4,
    correct: false,
    feedback: 'Explanation received. Compare against the residual definition and the gradient of MSE.',
  };
}

export function generateMseChallenge(experiment: ExperimentSnapshot) {
  const { slope, intercept } = experiment.parameters;
  const value = mse(experiment.dataset.points, slope, intercept);
  return {
    kind: 'mse' as const,
    conceptId: experiment.conceptId,
    title: 'Compute MSE for the current line',
    body: `The chart shows ${experiment.dataset.points.length} points. Your line is ŷ = ${slope.toFixed(3)} x + ${intercept.toFixed(3)}. What is the mean squared error?`,
    payload: { slope, intercept, n: experiment.dataset.points.length },
    expected: { mse: value },
  };
}

export function generateDivergeChallenge(learningRate: number, diverged: boolean) {
  return {
    kind: 'diverge' as const,
    conceptId: 'linear-regression',
    title: 'Will this learning rate diverge?',
    body: `Learning rate is ${learningRate}. Did (or will) MSE blow up on this dataset? Answer true or false.`,
    payload: { learningRate },
    expected: { diverges: diverged || learningRate >= 1 },
  };
}

export function analyzeProgress(input: {
  mastery: number;
  status: string;
  divergedRecently: boolean;
  challengeScore?: number;
}) {
  if (input.divergedRecently && input.mastery < 0.7) {
    return {
      weakConcepts: ['linear-regression:learning-rate'],
      recommendation:
        'You seem comfortable dragging a fit, but the learning-rate experiment is still unstable. Spend about 7 minutes on Break it, then ask Why?',
      href: '/lab/linear-regression',
      estimatedMinutes: 7,
    };
  }
  if ((input.challengeScore ?? 0) >= 0.85 && input.mastery >= 0.6) {
    return {
      weakConcepts: [],
      recommendation: 'Linear regression is holding. Next: gradient descent as its own concept.',
      href: '/lab/linear-regression',
      estimatedMinutes: 10,
    };
  }
  return {
    weakConcepts: input.mastery < 0.4 ? ['linear-regression'] : [],
    recommendation: 'Continue the Linear Regression laboratory — change the line, then run gradient descent.',
    href: '/lab/linear-regression',
    estimatedMinutes: 12,
  };
}
