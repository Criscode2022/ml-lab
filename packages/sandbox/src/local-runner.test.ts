import { describe, expect, it } from 'vitest';
import { LocalPythonRunner, hasVercelSandboxCredentials } from './local-runner';
import { createSandboxRunner } from './port';

describe('isolated python runner', () => {
  it('prints a known expression via a child interpreter', async () => {
    const runner = new LocalPythonRunner();
    const result = await runner.run({ code: 'print(2 + 3)\n', timeoutMs: 5000 });
    expect(result.status).toBe('succeeded');
    expect(result.stdout.trim()).toBe('5');
    expect(result.interpreterPid).not.toBeNull();
    expect(result.interpreterPid).not.toBe(result.hostPid);
    expect(result.isolated).toBe(true);
    expect(result.hostPid).toBe(process.pid);
  });

  it('computes a tiny NumPy MSE', async () => {
    const runner = new LocalPythonRunner();
    const result = await runner.run({
      timeoutMs: 8000,
      code: `import numpy as np
y = np.array([1.0, 2.0, 3.0])
yhat = np.array([1.0, 2.0, 4.0])
print(float(np.mean((y - yhat) ** 2)))
`,
    });
    expect(result.status).toBe('succeeded');
    expect(result.stdout).toMatch(/0\.333/);
    expect(result.isolated).toBe(true);
  });

  it('times out a deliberate overrun', async () => {
    const runner = new LocalPythonRunner();
    const result = await runner.run({
      timeoutMs: 400,
      code: 'import time\ntime.sleep(8)\nprint("never")\n',
    });
    expect(result.status).toBe('timeout');
    expect(result.timedOut).toBe(true);
    expect(result.stdout).not.toMatch(/never/);
  });

  it('reports bad code as failed', async () => {
    const runner = new LocalPythonRunner();
    const result = await runner.run({ code: 'raise ValueError("boom")\n', timeoutMs: 4000 });
    expect(result.status).toBe('failed');
    expect(result.stderr).toMatch(/ValueError/);
  });

  it('exposes STOP and RESET on the runner used by the API port', () => {
    const runner = createSandboxRunner();
    expect(typeof runner.stop).toBe('function');
    expect(typeof runner.reset).toBe('function');
    expect(runner.stop('missing')).toBe(false);
    expect(runner.reset('missing')).toBe(false);
  });

  it('records missing Vercel sandbox credentials instead of faking success', () => {
    const present = hasVercelSandboxCredentials();
    if (!present) {
      expect(process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID).toBeFalsy();
    }
    expect(typeof present).toBe('boolean');
  });
});
