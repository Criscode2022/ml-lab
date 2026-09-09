import type { ExperimentSnapshot, LearnerContext } from '@ml-lab/contracts';

export function summarizeDataset(experiment: ExperimentSnapshot | null) {
  if (!experiment) return null;
  const pts = experiment.dataset.points;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return {
    n: pts.length,
    xMin: xs.length ? Math.min(...xs) : null,
    xMax: xs.length ? Math.max(...xs) : null,
    yMin: ys.length ? Math.min(...ys) : null,
    yMax: ys.length ? Math.max(...ys) : null,
  };
}

export function modelFacingContext(ctx: LearnerContext) {
  const exp = ctx.currentExperiment;
  return {
    learnerLevel: ctx.learnerLevel,
    masteredConcepts: ctx.masteredConcepts,
    weakConcepts: ctx.weakConcepts,
    currentConcept: ctx.currentConcept,
    learningMode: ctx.learningMode,
    goals: ctx.goals,
    recentMistakes: ctx.recentMistakes ?? [],
    currentCode: ctx.currentCode ? ctx.currentCode.slice(0, 4000) : undefined,
    dataset: summarizeDataset(exp),
    parameters: exp?.parameters ?? null,
    metrics: exp?.metrics ?? null,
    experimentName: exp?.name ?? null,
  };
}

export const TUTOR_INSTRUCTIONS = `You are the ML Lab tutor for Linear Regression.

Default teaching mode is Socratic: ask what the learner observed before explaining.
You receive structured experiment context (parameters, metrics, dataset shape, code).
If loss diverged after a large learning rate, ask what they think caused the oscillation, then explain using the actual numbers from tools.
Use tools when you need to inspect the experiment, retrieve the concept, or grade a challenge.
Do not invent metrics. Do not claim you ran code unless a tool did.
If a tool error occurs, say so.
Keep replies tight. Fast mode: one visual intuition. Deep mode: allow the math.
Never produce a generic LMS lecture.`;
