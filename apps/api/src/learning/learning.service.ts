import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import {
  challenges,
  experiments,
  learnerMemory,
  learnerProfiles,
  notebooks,
  progress,
  type AppDatabase,
} from '@ml-lab/db';
import { CONCEPT_CATALOG, type ExperimentSnapshot, type LearningGoal, type ExperienceLevel, type LearningMode } from '@ml-lab/contracts';
import { generateMseChallenge, generateDivergeChallenge, evaluateChallengeAnswer, analyzeProgress } from '@ml-lab/agent-core';
import { DATABASE } from '../db.module';

@Injectable()
export class LearningService {
  constructor(@Inject(DATABASE) private readonly db: AppDatabase) {}

  async saveProfile(
    userId: string,
    body: {
      goal: LearningGoal;
      experienceLevel: ExperienceLevel;
      dailyMinutes: number;
      learningMode?: LearningMode;
    },
  ) {
    await this.db
      .update(learnerProfiles)
      .set({
        goal: body.goal,
        experienceLevel: body.experienceLevel,
        dailyMinutes: body.dailyMinutes,
        learningMode: body.learningMode ?? 'fast',
        onboarded: true,
        updatedAt: new Date(),
      })
      .where(eq(learnerProfiles.userId, userId));
    await this.touchProgress(userId, 'linear-regression', { status: 'in_progress', masteryDelta: 0.05 });
    return this.recommendation(userId);
  }

  startingPoint(experienceLevel: ExperienceLevel) {
    if (experienceLevel === 'expert' || experienceLevel === 'practitioner') {
      return {
        conceptId: 'linear-regression',
        href: '/lab/linear-regression',
        note: 'Skip the pep talk. The laboratory opens on Linear Regression — drag the line, then break gradient descent.',
      };
    }
    if (experienceLevel === 'python-stats') {
      return {
        conceptId: 'linear-regression',
        href: '/lab/linear-regression',
        note: 'Python is assumed. Start with the residuals and MSE, then the math depth slider.',
      };
    }
    return {
      conceptId: 'linear-regression',
      href: '/lab/linear-regression',
      note: 'Begin here: a noisy cloud, a draggable line, then gradient descent.',
    };
  }

  async createExperiment(userId: string, snap: ExperimentSnapshot) {
    const id = randomUUID();
    await this.db.insert(experiments).values({
      id,
      userId,
      conceptId: snap.conceptId,
      name: snap.name,
      dataset: snap.dataset,
      parameters: snap.parameters,
      metrics: snap.metrics,
      notes: snap.notes ?? null,
      version: snap.version ?? 1,
    });
    await this.touchProgress(userId, snap.conceptId, {
      status: 'practiced',
      masteryDelta: snap.metrics.diverged ? 0.04 : 0.08,
    });
    if (snap.metrics.diverged) {
      await this.rememberWeak(userId, 'linear-regression:learning-rate');
    }
    return { id };
  }

  async listExperiments(userId: string) {
    return this.db
      .select()
      .from(experiments)
      .where(eq(experiments.userId, userId))
      .orderBy(desc(experiments.updatedAt));
  }

  async getExperiment(userId: string, id: string) {
    const rows = await this.db.select().from(experiments).where(eq(experiments.id, id));
    const row = rows[0];
    if (!row) throw new NotFoundException();
    if (row.userId !== userId) throw new ForbiddenException();
    return row;
  }

  async updateExperiment(userId: string, id: string, snap: Partial<ExperimentSnapshot>) {
    const current = await this.getExperiment(userId, id);
    await this.db
      .update(experiments)
      .set({
        name: snap.name ?? current.name,
        dataset: snap.dataset ?? current.dataset,
        parameters: snap.parameters ?? current.parameters,
        metrics: snap.metrics ?? current.metrics,
        notes: snap.notes ?? current.notes,
        version: (current.version ?? 1) + 1,
        updatedAt: new Date(),
      })
      .where(eq(experiments.id, id));
    return this.getExperiment(userId, id);
  }

  async getProgress(userId: string) {
    const rows = await this.db.select().from(progress).where(eq(progress.userId, userId));
    const rec = await this.recommendation(userId);
    return { items: rows, recommendation: rec };
  }

  async recommendation(userId: string) {
    const rows = await this.db
      .select()
      .from(progress)
      .where(and(eq(progress.userId, userId), eq(progress.conceptId, 'linear-regression')));
    const mem = await this.db.select().from(learnerMemory).where(eq(learnerMemory.userId, userId));
    const lr = rows[0];
    const analysis = analyzeProgress({
      mastery: lr?.mastery ?? 0,
      status: lr?.status ?? 'not_started',
      divergedRecently: (mem[0]?.weakConcepts ?? []).includes('linear-regression:learning-rate'),
    });
    const concept = CONCEPT_CATALOG.find((c) => c.id === 'linear-regression');
    return {
      conceptId: 'linear-regression',
      title: concept?.title ?? 'Linear Regression',
      reason: analysis.recommendation,
      estimatedMinutes: analysis.estimatedMinutes,
      href: analysis.href,
      weakConcepts: analysis.weakConcepts,
    };
  }

  async saveNotebook(userId: string, cells: unknown, experimentId?: string) {
    const existing = await this.db.select().from(notebooks).where(eq(notebooks.userId, userId));
    if (existing[0]) {
      await this.db
        .update(notebooks)
        .set({ cells, experimentId: experimentId ?? existing[0].experimentId, updatedAt: new Date() })
        .where(eq(notebooks.id, existing[0].id));
      return { id: existing[0].id };
    }
    const id = randomUUID();
    await this.db.insert(notebooks).values({ id, userId, experimentId: experimentId ?? null, cells });
    return { id };
  }

  async getNotebook(userId: string) {
    const rows = await this.db.select().from(notebooks).where(eq(notebooks.userId, userId));
    return rows[0] ?? { cells: [] };
  }

  async createChallenge(userId: string, experiment: ExperimentSnapshot, kind: 'mse' | 'diverge') {
    const generated =
      kind === 'diverge'
        ? generateDivergeChallenge(experiment.parameters.learningRate, experiment.metrics.diverged)
        : generateMseChallenge(experiment);
    const id = randomUUID();
    await this.db.insert(challenges).values({
      id,
      userId,
      conceptId: generated.conceptId,
      prompt: generated,
      expected: generated.expected,
    });
    return { id, ...generated };
  }

  async submitChallenge(userId: string, id: string, answer: unknown) {
    const rows = await this.db.select().from(challenges).where(eq(challenges.id, id));
    const row = rows[0];
    if (!row) throw new NotFoundException();
    if (row.userId !== userId) throw new ForbiddenException();
    const prompt = row.prompt as { kind: 'mse' | 'diverge' | 'explain' };
    const grade = evaluateChallengeAnswer({
      kind: prompt.kind,
      expected: row.expected,
      answer,
    });
    await this.db
      .update(challenges)
      .set({ answer, score: grade.score, feedback: grade })
      .where(eq(challenges.id, id));
    await this.touchProgress(userId, row.conceptId, {
      status: grade.correct ? 'practiced' : 'weak',
      masteryDelta: grade.correct ? 0.1 : 0.02,
      mistake: grade.correct ? undefined : prompt.kind,
    });
    return grade;
  }

  private async touchProgress(
    userId: string,
    conceptId: string,
    opts: { status: string; masteryDelta: number; mistake?: string },
  ) {
    const rows = await this.db
      .select()
      .from(progress)
      .where(and(eq(progress.userId, userId), eq(progress.conceptId, conceptId)));
    const current = rows[0];
    const mastery = Math.max(0, Math.min(1, (current?.mastery ?? 0) + opts.masteryDelta));
    const mistakes = ([...(Array.isArray(current?.mistakes) ? current.mistakes : []), opts.mistake].filter(Boolean) as string[]).slice(-20);
    const status = mastery >= 0.8 ? 'mastered' : opts.status;
    if (!current) {
      await this.db.insert(progress).values({
        userId,
        conceptId,
        mastery,
        confidence: mastery,
        status,
        mistakes,
        lastSeenAt: new Date(),
      });
    } else {
      await this.db
        .update(progress)
        .set({ mastery, confidence: mastery, status, mistakes, lastSeenAt: new Date() })
        .where(and(eq(progress.userId, userId), eq(progress.conceptId, conceptId)));
    }
  }

  private async rememberWeak(userId: string, tag: string) {
    const rows = await this.db.select().from(learnerMemory).where(eq(learnerMemory.userId, userId));
    const current = new Set(rows[0]?.weakConcepts ?? []);
    current.add(tag);
    if (!rows[0]) {
      await this.db.insert(learnerMemory).values({ userId, weakConcepts: [...current] });
    } else {
      await this.db
        .update(learnerMemory)
        .set({ weakConcepts: [...current], updatedAt: new Date() })
        .where(eq(learnerMemory.userId, userId));
    }
  }
}

