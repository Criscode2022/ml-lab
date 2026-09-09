import { Body, Controller, Get, Param, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import type { ExperimentSnapshot, ExperienceLevel, LearningGoal, LearningMode } from '@ml-lab/contracts';
import { AuthGuard, type AuthPayload } from '../auth/auth.guard';
import { LearningService } from './learning.service';

@Controller()
@UseGuards(AuthGuard)
export class LearningController {
  constructor(private readonly learning: LearningService) {}

  @Post('profile')
  profile(
    @Req() req: { user: AuthPayload },
    @Body()
    body: {
      goal: LearningGoal;
      experienceLevel: ExperienceLevel;
      dailyMinutes: number;
      learningMode?: LearningMode;
    },
  ) {
    return this.learning.saveProfile(req.user.sub, body);
  }

  @Get('onboarding/start')
  start(@Req() req: { user: AuthPayload }, @Body() _body: unknown) {
    return this.learning.startingPoint('beginner');
  }

  @Post('onboarding/start')
  startPost(
    @Req() req: { user: AuthPayload },
    @Body() body: { experienceLevel?: ExperienceLevel },
  ) {
    return this.learning.startingPoint(body.experienceLevel ?? 'beginner');
  }

  @Post('experiments')
  create(@Req() req: { user: AuthPayload }, @Body() body: ExperimentSnapshot) {
    return this.learning.createExperiment(req.user.sub, body);
  }

  @Get('experiments')
  list(@Req() req: { user: AuthPayload }) {
    return this.learning.listExperiments(req.user.sub);
  }

  @Get('experiments/:id')
  get(@Req() req: { user: AuthPayload }, @Param('id') id: string) {
    return this.learning.getExperiment(req.user.sub, id);
  }

  @Patch('experiments/:id')
  patch(@Req() req: { user: AuthPayload }, @Param('id') id: string, @Body() body: Partial<ExperimentSnapshot>) {
    return this.learning.updateExperiment(req.user.sub, id, body);
  }

  @Get('progress')
  progress(@Req() req: { user: AuthPayload }) {
    return this.learning.getProgress(req.user.sub);
  }

  @Get('progress/linear-regression')
  progressLr(@Req() req: { user: AuthPayload }) {
    return this.learning.getProgress(req.user.sub);
  }

  @Get('notebooks/current')
  notebook(@Req() req: { user: AuthPayload }) {
    return this.learning.getNotebook(req.user.sub);
  }

  @Put('notebooks/current')
  saveNotebook(
    @Req() req: { user: AuthPayload },
    @Body() body: { cells: unknown; experimentId?: string },
  ) {
    return this.learning.saveNotebook(req.user.sub, body.cells, body.experimentId);
  }

  @Post('challenges')
  challenge(
    @Req() req: { user: AuthPayload },
    @Body() body: { experiment: ExperimentSnapshot; kind?: 'mse' | 'diverge' },
  ) {
    return this.learning.createChallenge(req.user.sub, body.experiment, body.kind ?? 'mse');
  }

  @Post('challenges/:id/submit')
  submit(@Req() req: { user: AuthPayload }, @Param('id') id: string, @Body() body: { answer: unknown }) {
    return this.learning.submitChallenge(req.user.sub, id, body.answer);
  }
}
