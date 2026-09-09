import { LocalPythonRunner, hasVercelSandboxCredentials } from './local-runner';
import { VercelPythonRunner } from './vercel-runner';
import type { SandboxRunner } from './types';

export function createSandboxRunner(): SandboxRunner {
  const onVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  if (
    process.env.SANDBOX_BACKEND === 'vercel' ||
    (onVercel && process.env.SANDBOX_BACKEND !== 'local') ||
    (process.env.NODE_ENV === 'production' && hasVercelSandboxCredentials())
  ) {
    return new VercelPythonRunner();
  }
  return new LocalPythonRunner();
}

export { hasVercelSandboxCredentials };
