import {
  Body,
  Controller,
  Inject,
  Post,
  Req,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import {
  AiProviderUnavailableError,
  createTutorAgent,
  resolveTutorModel,
  tutorPrompt,
} from '@ml-lab/agent-core';
import { eq } from 'drizzle-orm';
import type { ExperimentSnapshot, LearnerContext, LearningGoal, ExperienceLevel, LearningMode } from '@ml-lab/contracts';
import { agentRuns, learnerProfiles, progress, type AppDatabase } from '@ml-lab/db';
import { randomUUID } from 'node:crypto';
import { AuthGuard, type AuthPayload } from './auth/auth.guard';
import { DATABASE } from './db.module';

@Controller('ai')
@UseGuards(AuthGuard)
export class AiController {
  constructor(@Inject(DATABASE) private readonly db: AppDatabase) {}

  @Post('tutor')
  async tutor(
    @Req() req: { user: AuthPayload },
    @Body()
    body: {
      message: string;
      mode?: 'socratic' | 'direct' | 'debug' | 'mathematical' | 'intuitive';
      experiment?: ExperimentSnapshot;
      code?: string;
      why?: boolean;
    },
  ) {
    const ctx = await this.buildContext(req.user.sub, body.experiment, body.code);
    let model: string;
    try {
      model = resolveTutorModel();
    } catch (err) {
      if (err instanceof AiProviderUnavailableError) {
        throw new ServiceUnavailableException({
          error: 'provider_unavailable',
          retry: true,
          message: 'The tutor could not reach a model provider. Nothing was invented in its place.',
        });
      }
      throw err;
    }

    const started = Date.now();
    try {
      const agent = createTutorAgent({
        model,
        mode: body.mode ?? 'socratic',
        getExperiment: () => body.experiment ?? null,
      });
      const result = await agent.generate({
        prompt: tutorPrompt(ctx, body.message, body.why),
      });
      await this.db.insert(agentRuns).values({
        id: randomUUID(),
        userId: req.user.sub,
        model,
        taskType: body.why ? 'why' : 'tutor',
        latencyMs: Date.now() - started,
        status: 'ok',
        inputTokens: result.usage?.inputTokens ?? null,
        outputTokens: result.usage?.outputTokens ?? null,
      });
      return { text: result.text, usage: result.usage };
    } catch (err) {
      await this.db.insert(agentRuns).values({
        id: randomUUID(),
        userId: req.user.sub,
        model,
        taskType: 'tutor',
        latencyMs: Date.now() - started,
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      });
      throw new ServiceUnavailableException({
        error: 'provider_error',
        retry: true,
        message: 'The tutor request failed. Retry; the UI will not substitute a fake explanation.',
      });
    }
  }

  @Post('why')
  why(
    @Req() req: { user: AuthPayload },
    @Body() body: { experiment?: ExperimentSnapshot; code?: string },
  ) {
    return this.tutor(req, {
      message: 'Why did the latest change in this experiment happen?',
      experiment: body.experiment,
      code: body.code,
      why: true,
      mode: 'socratic',
    });
  }

  private async buildContext(
    userId: string,
    experiment?: ExperimentSnapshot,
    code?: string,
  ): Promise<LearnerContext> {
    const profiles = await this.db.select().from(learnerProfiles).where(eq(learnerProfiles.userId, userId));
    const prog = await this.db.select().from(progress).where(eq(progress.userId, userId));
    const profile = profiles[0];
    return {
      learnerLevel: (profile?.experienceLevel as ExperienceLevel) ?? 'beginner',
      masteredConcepts: prog
        .filter((p: { status: string; conceptId: string }) => p.status === 'mastered')
        .map((p: { conceptId: string }) => p.conceptId),
      weakConcepts: prog
        .filter((p: { status: string; conceptId: string }) => p.status === 'weak')
        .map((p: { conceptId: string }) => p.conceptId),
      currentConcept: 'linear-regression',
      currentExperiment: experiment ?? null,
      learningMode: (profile?.learningMode as LearningMode) ?? 'fast',
      goals: [(profile?.goal as LearningGoal) ?? 'understand-ml'],
      currentCode: code,
    };
  }
}
