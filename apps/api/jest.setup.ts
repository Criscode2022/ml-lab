import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

for (const line of readFileSync(resolve(__dirname, '../../.env'), 'utf8').split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq < 1) continue;
  const key = trimmed.slice(0, eq);
  const value = trimmed.slice(eq + 1);
  if (!process.env[key]) process.env[key] = value;
}

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-test-secret-test-secret-32';
process.env.NODE_ENV = 'test';
delete process.env.DATABASE_DRIVER;
delete process.env.XAI_API_KEY;
delete process.env.AI_GATEWAY_API_KEY;
delete process.env.VERCEL_OIDC_TOKEN;
