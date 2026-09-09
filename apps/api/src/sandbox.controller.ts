import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { REFERENCE_PYTHON } from '@ml-lab/ml-core';
import { createSandboxRunner } from '@ml-lab/sandbox';
import type { SandboxResult } from '@ml-lab/sandbox';
import { AuthGuard } from './auth/auth.guard';

const runner = createSandboxRunner();
const last = new Map<string, SandboxResult>();

@Controller('sandbox')
@UseGuards(AuthGuard)
export class SandboxController {
  @Post('run')
  async run(
    @Body()
    body: {
      code: string;
      timeoutMs?: number;
      dataset?: unknown;
      compareReference?: boolean;
    },
  ) {
    const files: Record<string, string> = {};
    if (body.dataset) {
      files['dataset.json'] = JSON.stringify(body.dataset);
    }
    const result = await runner.run({
      code: body.code,
      timeoutMs: body.timeoutMs,
      files,
    });
    last.set(result.runId, result);
    let reference: SandboxResult | undefined;
    if (body.compareReference && body.dataset) {
      reference = await runner.run({
        code: REFERENCE_PYTHON,
        timeoutMs: body.timeoutMs ?? 8000,
        files,
      });
    }
    return { ...result, stop: true, reset: true, reference };
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return last.get(id) ?? { error: 'unknown run' };
  }

  @Post(':id/stop')
  stop(@Param('id') id: string) {
    const ok = runner.stop(id);
    return { ok, action: 'stop' };
  }

  @Post(':id/reset')
  reset(@Param('id') id: string) {
    const ok = runner.reset(id);
    last.delete(id);
    return { ok, action: 'reset' };
  }
}
