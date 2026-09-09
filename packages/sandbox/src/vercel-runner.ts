import { randomUUID } from 'node:crypto';
import type { SandboxRequest, SandboxResult, SandboxRunner } from './types';
import { hasVercelSandboxCredentials } from './local-runner';

/**
 * Vercel Sandbox backend. Used in production when credentials exist.
 * The local runner remains the test/dev adapter behind the same port.
 */
export class VercelPythonRunner implements SandboxRunner {
  private readonly live = new Map<string, { stop: () => Promise<void> }>();

  async run(req: SandboxRequest): Promise<SandboxResult> {
    const runId = req.runId ?? randomUUID();
    const hostPid = process.pid;
    const started = Date.now();
    const onVercel = Boolean(process.env.VERCEL || process.env.VERCEL_OIDC_TOKEN);
    if (!onVercel && !hasVercelSandboxCredentials()) {
      return {
        runId,
        status: 'failed',
        stdout: '',
        stderr: 'Vercel Sandbox credentials missing',
        exitCode: null,
        interpreterPid: null,
        hostPid,
        timedOut: false,
        durationMs: Date.now() - started,
        isolated: true,
        backend: 'vercel',
      };
    }
    const timeoutMs = req.timeoutMs ?? 8000;
    const credentials = hasVercelSandboxCredentials()
      ? {
          token: process.env.VERCEL_TOKEN,
          teamId: process.env.VERCEL_TEAM_ID,
          projectId: process.env.VERCEL_PROJECT_ID,
        }
      : {};
    let sandbox: import('@vercel/sandbox').Sandbox;
    try {
      const { Sandbox } = require('@vercel/sandbox') as typeof import('@vercel/sandbox');
      sandbox = await Sandbox.create({
        ...credentials,
        runtime: 'python3.13',
        timeout: Math.min(Math.max(timeoutMs + 2000, 5000), 60_000),
      });
    } catch (err) {
      return {
        runId,
        status: 'failed',
        stdout: '',
        stderr: err instanceof Error ? err.message : String(err),
        exitCode: null,
        interpreterPid: -1,
        hostPid,
        timedOut: false,
        durationMs: Date.now() - started,
        isolated: true,
        backend: 'vercel',
      };
    }
    this.live.set(runId, { stop: () => sandbox.stop() });
    try {
      await sandbox.writeFiles([{ path: 'main.py', content: Buffer.from(req.code, 'utf8') }]);
      for (const [name, contents] of Object.entries(req.files ?? {})) {
        await sandbox.writeFiles([{ path: name, content: Buffer.from(contents, 'utf8') }]);
      }
      await sandbox.runCommand('python3', ['-m', 'pip', 'install', '--quiet', 'numpy']).catch(() => undefined);
      const cmd = await sandbox.runCommand('python3', ['-u', 'main.py']);
      const stdout = await cmd.stdout();
      const stderr = await cmd.stderr();
      const exitCode = cmd.exitCode ?? 0;
      return {
        runId,
        status: exitCode === 0 ? 'succeeded' : 'failed',
        stdout,
        stderr,
        exitCode,
        interpreterPid: -1,
        hostPid,
        timedOut: false,
        durationMs: Date.now() - started,
        isolated: true,
        backend: 'vercel',
      };
    } catch (err) {
      return {
        runId,
        status: 'failed',
        stdout: '',
        stderr: err instanceof Error ? err.message : String(err),
        exitCode: null,
        interpreterPid: -1,
        hostPid,
        timedOut: false,
        durationMs: Date.now() - started,
        isolated: true,
        backend: 'vercel',
      };
    } finally {
      this.live.delete(runId);
      await sandbox.stop().catch(() => undefined);
    }
  }

  stop(runId: string): boolean {
    const live = this.live.get(runId);
    if (!live) return false;
    void live.stop();
    return true;
  }

  reset(runId: string): boolean {
    return this.stop(runId);
  }
}
