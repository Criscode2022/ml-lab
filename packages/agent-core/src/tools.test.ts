import { describe, expect, it } from 'vitest';
import type { ExperimentSnapshot, LearnerContext } from '@ml-lab/contracts';
import { inspectDataset, inspectExperiment, retrieveConcept, evaluateChallengeAnswer } from './tools';
import { isHardcodedTutorPath, modelFacingContext, tutorPrompt } from './index';

const diverging: ExperimentSnapshot = {
  conceptId: 'linear-regression',
  name: 'explode-lr',
  dataset: {
    points: [
      { x: -1, y: -0.4 },
      { x: 0, y: 0.5 },
      { x: 1, y: 1.7 },
      { x: 2, y: 3.1 },
    ],
    spec: { n: 4 },
  },
  parameters: {
    slope: 0.2,
    intercept: 0.1,
    learningRate: 1.0,
    iterations: 20,
    noise: 0.1,
    sampleCount: 4,
    outliers: 0,
    seed: 1,
    trueSlope: 1.4,
    trueIntercept: 0.5,
  },
  metrics: {
    mse: 180,
    mae: 9,
    lossHistory: [2.1, 8, 40, 180],
    diverged: true,
    oscillated: true,
  },
};

describe('tutor tools and context plumbing', () => {
  it('inspectExperiment returns metrics derived from the payload', () => {
    const view = inspectExperiment(diverging);
    expect(view.parameters.learningRate).toBe(1.0);
    expect(view.metrics.diverged).toBe(true);
    expect(view.metrics.lossHistory.at(-1)).toBe(180);
    expect(view.dataset?.n).toBe(4);
    expect(view.conceptId).toBe('linear-regression');
  });

  it('inspectDataset reports shape from the same payload', () => {
    const ds = inspectDataset(diverging);
    expect(ds.n).toBe(4);
    expect(ds.xMin).toBe(-1);
    expect(ds.xMax).toBe(2);
  });

  it('retrieveConcept returns the linear regression formulation', () => {
    const c = retrieveConcept('linear-regression');
    expect(c.found).toBe(true);
    if (c.found) {
      expect(c.id).toBe('linear-regression');
      expect(c.formulation).toMatch(/MSE/);
    }
  });

  it('evaluateChallenge scores against the payload, not a canned string', () => {
    const expected = { mse: 4 };
    const good = evaluateChallengeAnswer({ kind: 'mse', expected, answer: 4 });
    const bad = evaluateChallengeAnswer({ kind: 'mse', expected, answer: 99 });
    expect(good.correct).toBe(true);
    expect(bad.correct).toBe(false);
    expect(bad.feedback.toLowerCase()).not.toMatch(/lorem/);
  });

  it('model-facing context includes experiment fields', () => {
    const ctx: LearnerContext = {
      learnerLevel: 'beginner',
      masteredConcepts: [],
      weakConcepts: ['regularization'],
      currentConcept: 'linear-regression',
      currentExperiment: diverging,
      learningMode: 'fast',
      goals: ['understand-ml'],
      currentCode: 'print(mse)',
    };
    const facing = modelFacingContext(ctx);
    expect(facing.currentConcept).toBe('linear-regression');
    expect(facing.parameters?.learningRate).toBe(1.0);
    expect(facing.metrics?.diverged).toBe(true);
    expect(facing.dataset?.n).toBe(4);
    const prompt = tutorPrompt(ctx, 'Why did loss explode?', true);
    expect(prompt).toMatch(/learningRate/);
    expect(prompt).toMatch(/Why\?/);
  });

  it('production tutor path is not a hardcoded reply table', () => {
    expect(isHardcodedTutorPath()).toBe(false);
  });

  it('createTutorAgent constructs a ToolLoopAgent with experiment-scoped tools', async () => {
    const { ToolLoopAgent } = await import('ai');
    const { createTutorAgent } = await import('./tutor-agent');
    const agent = createTutorAgent({
      model: 'xai/grok-4.6',
      getExperiment: () => diverging,
    });
    expect(agent).toBeInstanceOf(ToolLoopAgent);
  });

  it('agent loop with a fake model emits a tool call then uses experiment context', async () => {
    const { MockLanguageModelV3 } = await import('ai/test');
    const { createTutorAgent, tutorPrompt } = await import('./tutor-agent');
    const usage = {
      inputTokens: { total: 8, noCache: 8, cacheRead: undefined, cacheWrite: undefined },
      outputTokens: { total: 4, text: 4, reasoning: undefined },
    };
    let calls = 0;
    const model = new MockLanguageModelV3({
      doGenerate: async (options) => {
        calls += 1;
        const blob = JSON.stringify(options.prompt);
        expect(blob).toMatch(/learningRate|linear-regression|inspectExperiment/);
        if (calls === 1) {
          return {
            content: [
              {
                type: 'tool-call' as const,
                toolCallId: 'call-inspect',
                toolName: 'inspectExperiment',
                input: {},
              },
            ],
            finishReason: 'tool-calls' as const,
            usage,
            warnings: [],
          };
        }
        return {
          content: [
            {
              type: 'text' as const,
              text: 'What do you think caused the oscillation after the learning rate hit 1.0?',
            },
          ],
          finishReason: 'stop' as const,
          usage,
          warnings: [],
        };
      },
    });
    const ctx: LearnerContext = {
      learnerLevel: 'beginner',
      masteredConcepts: [],
      weakConcepts: [],
      currentConcept: 'linear-regression',
      currentExperiment: diverging,
      learningMode: 'fast',
      goals: ['understand-ml'],
    };
    const agent = createTutorAgent({ model, getExperiment: () => diverging });
    const result = await agent.generate({ prompt: tutorPrompt(ctx, 'Why did loss explode?', true) });
    expect(calls).toBeGreaterThanOrEqual(2);
    expect(result.text).toMatch(/learning rate/i);
    expect(result.steps.some((s) => s.toolCalls?.some((c) => c.toolName === 'inspectExperiment'))).toBe(true);
  });
});
