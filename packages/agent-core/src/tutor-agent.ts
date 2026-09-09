import { ToolLoopAgent, tool, type LanguageModel } from 'ai';
import { z } from 'zod';
import type { ExperimentSnapshot, LearnerContext } from '@ml-lab/contracts';
import { TUTOR_INSTRUCTIONS, modelFacingContext } from './context';
import {
  analyzeProgress,
  evaluateChallengeAnswer,
  inspectDataset,
  inspectExperiment,
  retrieveConcept,
} from './tools';

export class AiProviderUnavailableError extends Error {
  constructor() {
    super('AI provider unavailable');
    this.name = 'AiProviderUnavailableError';
  }
}

export function resolveTutorModel(): string {
  if (process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN) {
    return 'xai/grok-4.6';
  }
  if (process.env.XAI_API_KEY) {
    return 'xai/grok-4.6';
  }
  throw new AiProviderUnavailableError();
}

export function scopedTutorTools(getExperiment: () => ExperimentSnapshot | null) {
  return {
    inspectExperiment: tool({
      description: 'Inspect the current experiment parameters, metrics, and dataset shape.',
      inputSchema: z.object({}),
      execute: async () => {
        const exp = getExperiment();
        if (!exp) return { error: 'No experiment loaded' };
        return inspectExperiment(exp);
      },
    }),
    inspectDataset: tool({
      description: 'Summarize the current dataset.',
      inputSchema: z.object({}),
      execute: async () => {
        const exp = getExperiment();
        if (!exp) return { error: 'No experiment loaded' };
        return inspectDataset(exp);
      },
    }),
    retrieveConcept: tool({
      description: 'Retrieve concept metadata and formulation.',
      inputSchema: z.object({ conceptId: z.string() }),
      execute: async ({ conceptId }) => retrieveConcept(conceptId),
    }),
    evaluateChallenge: tool({
      description: 'Score a numeric or diverge challenge answer.',
      inputSchema: z.object({
        kind: z.enum(['mse', 'diverge', 'explain']),
        answer: z.unknown(),
        expected: z.unknown(),
      }),
      execute: async ({ kind, answer, expected }) =>
        evaluateChallengeAnswer({ kind, answer, expected }),
    }),
    analyzeUserProgress: tool({
      description: 'Recommend a next step from mastery and recent divergence.',
      inputSchema: z.object({
        mastery: z.number(),
        status: z.string(),
        divergedRecently: z.boolean(),
        challengeScore: z.number().optional(),
      }),
      execute: async (input) => analyzeProgress(input),
    }),
  };
}

export function createTutorAgent(options: {
  model: string | LanguageModel;
  getExperiment: () => ExperimentSnapshot | null;
  mode?: 'socratic' | 'direct' | 'debug' | 'mathematical' | 'intuitive';
}) {
  const modeLine =
    options.mode === 'direct'
      ? 'Mode: Direct. Explain immediately using tool results.'
      : options.mode === 'mathematical'
        ? 'Mode: Mathematical. Lead with ŷ and MSE, then the gradient.'
        : options.mode === 'debug'
          ? 'Mode: Debug. Inspect parameters and loss history first.'
          : options.mode === 'intuitive'
            ? 'Mode: Intuitive. Use the residual picture before symbols.'
            : 'Mode: Socratic. Ask one targeted question before explaining.';

  return new ToolLoopAgent({
    model: options.model,
    instructions: `${TUTOR_INSTRUCTIONS}\n${modeLine}`,
    tools: scopedTutorTools(options.getExperiment),
  });
}

export function tutorPrompt(ctx: LearnerContext, message: string, why?: boolean) {
  const facing = modelFacingContext(ctx);
  const whyPrefix = why
    ? 'The learner pressed Why? on the live experiment. Use inspectExperiment. Ask what they think caused the latest loss change before explaining.\n'
    : '';
  return `${whyPrefix}Learner context (structured, not a chat history dump):\n${JSON.stringify(facing)}\n\nLearner: ${message}`;
}

export function isHardcodedTutorPath(): boolean {
  return false;
}
