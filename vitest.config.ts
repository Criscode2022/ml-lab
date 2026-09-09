import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@ml-lab/ml-core': resolve(root, 'packages/ml-core/src/index.ts'),
      '@ml-lab/contracts': resolve(root, 'packages/contracts/src/index.ts'),
      '@ml-lab/i18n': resolve(root, 'packages/i18n/src/index.ts'),
      '@ml-lab/sandbox': resolve(root, 'packages/sandbox/src/index.ts'),
      '@ml-lab/agent-core': resolve(root, 'packages/agent-core/src/index.ts'),
      '@ml-lab/db': resolve(root, 'packages/db/src/index.ts'),
    },
  },
  test: {
    include: ['packages/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
