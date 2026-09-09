import { LocalPythonRunner, hasVercelSandboxCredentials } from './local-runner';
import { VercelPythonRunner } from './vercel-runner';
import type { SandboxRunner } from './types';

export function createSandboxRunner(): SandboxRunner {
  if (process.env.SANDBOX_BACKEND === 'vercel' || (process.env.NODE_ENV === 'production' && hasVercelSandboxCredentials())) {
    return new VercelPythonRunner();
  }
  return new LocalPythonRunner();
}

export { hasVercelSandboxCredentials };
