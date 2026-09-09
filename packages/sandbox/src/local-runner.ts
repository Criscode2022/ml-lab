import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { SandboxRequest, SandboxResult, SandboxRunner } from './types';

type LiveRun = {
  child: ChildProcess;
  dir: string;
  killed: boolean;
};

const WRAPPER = `import resource
import sys
import traceback

try:
    resource.setrlimit(resource.RLIMIT_CPU, (5, 5))
except Exception:
    pass
try:
    resource.setrlimit(resource.RLIMIT_FSIZE, (2_000_000, 2_000_000))
except Exception:
    pass

try:
    with open("main.py", "r", encoding="utf-8") as handle:
        source = handle.read()
    exec(compile(source, "main.py", "exec"), {"__name__": "__main__"})
except SystemExit:
    raise
except Exception:
    traceback.print_exc()
    sys.exit(1)
`;

export class LocalPythonRunner implements SandboxRunner {
  private readonly live = new Map<string, LiveRun>();

  async run(
    req: SandboxRequest,
    onChunk?: (stream: 'stdout' | 'stderr', chunk: string) => void,
  ): Promise<SandboxResult> {
    const runId = req.runId ?? randomUUID();
    const timeoutMs = req.timeoutMs ?? Number(process.env.SANDBOX_TIMEOUT_MS ?? 8000);
    const pythonBin = req.pythonBin ?? process.env.PYTHON_BIN ?? 'python3';
    const dir = await mkdtemp(join(tmpdir(), 'ml-lab-py-'));
    const hostPid = process.pid;
    await writeFile(join(dir, 'wrapper.py'), WRAPPER, 'utf8');
    await writeFile(join(dir, 'main.py'), req.code, 'utf8');
    for (const [name, contents] of Object.entries(req.files ?? {})) {
      const safe = name.replace(/[^a-zA-Z0-9._-]/g, '_');
      await writeFile(join(dir, safe), contents, 'utf8');
    }

    const started = Date.now();
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let stopped = false;

    const child = spawn(pythonBin, ['-u', 'wrapper.py'], {
      cwd: dir,
      env: {
        PATH: process.env.PATH ?? '/usr/bin:/bin',
        PYTHONUNBUFFERED: '1',
        PYTHONDONTWRITEBYTECODE: '1',
        HOME: process.env.HOME,
        TMPDIR: dir,
        LANG: process.env.LANG,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.live.set(runId, { child, dir, killed: false });

    child.stdout.on('data', (buf: Buffer) => {
      const chunk = buf.toString('utf8');
      stdout += chunk;
      onChunk?.('stdout', chunk);
    });
    child.stderr.on('data', (buf: Buffer) => {
      const chunk = buf.toString('utf8');
      stderr += chunk;
      onChunk?.('stderr', chunk);
    });

    const interpreterPid = child.pid ?? null;

    const result = await new Promise<SandboxResult>((resolve) => {
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, timeoutMs);

      child.on('close', (code) => {
        clearTimeout(timer);
        const live = this.live.get(runId);
        if (live?.killed && !timedOut) stopped = true;
        const status = timedOut
          ? 'timeout'
          : stopped
            ? 'stopped'
            : code === 0
              ? 'succeeded'
              : 'failed';
        resolve({
          runId,
          status,
          stdout,
          stderr,
          exitCode: code,
          interpreterPid,
          hostPid,
          timedOut,
          durationMs: Date.now() - started,
          isolated: interpreterPid !== null && interpreterPid !== hostPid,
          backend: 'local',
        });
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        stderr += err.message;
        resolve({
          runId,
          status: 'failed',
          stdout,
          stderr,
          exitCode: null,
          interpreterPid,
          hostPid,
          timedOut: false,
          durationMs: Date.now() - started,
          isolated: interpreterPid !== null && interpreterPid !== hostPid,
          backend: 'local',
        });
      });
    });

    this.live.delete(runId);
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    return result;
  }

  stop(runId: string): boolean {
    const live = this.live.get(runId);
    if (!live) return false;
    live.killed = true;
    live.child.kill('SIGKILL');
    return true;
  }

  reset(runId: string): boolean {
    return this.stop(runId);
  }
}

export function hasVercelSandboxCredentials(): boolean {
  return Boolean(process.env.VERCEL_TOKEN && process.env.VERCEL_TEAM_ID && process.env.VERCEL_PROJECT_ID);
}
