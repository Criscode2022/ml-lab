#!/usr/bin/env node
/**
 * Emit Vercel Build Output API v3 so nested /api/* routes hit Nest.
 * Auto-detected api/[...path].js only matched a single path segment.
 */
import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { nodeFileTrace } from '@vercel/nft';

const root = process.cwd();
const staticSrc = join(root, 'apps/web/dist/web/browser');
const handlerRel = 'api/[...path].js';
const outDir = join(root, '.vercel/output');
const funcDir = join(outDir, 'functions/api/[...path].func');
const staticDir = join(outDir, 'static');

if (!existsSync(staticSrc)) {
  throw new Error(`Angular browser build missing at ${staticSrc}`);
}
if (!existsSync(join(root, handlerRel))) {
  throw new Error(`Missing ${handlerRel}`);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(staticDir, { recursive: true });
mkdirSync(funcDir, { recursive: true });
cpSync(staticSrc, staticDir, { recursive: true });

function copyIntoFunc(absPath) {
  const rel = relative(root, absPath);
  if (!rel || rel.startsWith('..')) return;
  if (rel.startsWith(`node_modules${'/@ml-lab'}`)) return;
  const dest = join(funcDir, rel);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(absPath, dest, { recursive: true, dereference: true });
}

const { fileList } = await nodeFileTrace([handlerRel], {
  base: root,
  mixedModules: true,
});
for (const file of fileList) {
  copyIntoFunc(resolve(root, file));
}

for (const pkg of ['contracts', 'db', 'ml-core', 'i18n', 'sandbox', 'agent-core']) {
  const dest = join(funcDir, 'node_modules/@ml-lab', pkg);
  mkdirSync(dest, { recursive: true });
  cpSync(join(root, 'packages', pkg, 'package.json'), join(dest, 'package.json'));
  cpSync(join(root, 'packages', pkg, 'dist'), join(dest, 'dist'), {
    recursive: true,
    dereference: true,
  });
}

for (const extra of [
  'apps/api/dist',
  'packages/contracts/dist',
  'packages/db/dist',
  'packages/ml-core/dist',
  'packages/i18n/dist',
  'packages/sandbox/dist',
  'packages/agent-core/dist',
  'packages/contracts/package.json',
  'packages/db/package.json',
  'packages/ml-core/package.json',
  'packages/i18n/package.json',
  'packages/sandbox/package.json',
  'packages/agent-core/package.json',
  'node_modules/@vercel/sandbox',
]) {
  const abs = join(root, extra);
  if (existsSync(abs)) copyIntoFunc(abs);
}

writeFileSync(
  join(funcDir, '.vc-config.json'),
  JSON.stringify(
    {
      runtime: 'nodejs20.x',
      handler: handlerRel,
      launcherType: 'Nodejs',
      shouldAddHelpers: true,
      maxDuration: 60,
    },
    null,
    2,
  ),
);

writeFileSync(
  join(root, '.vercel/output/config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { handle: 'filesystem' },
        { src: '^/api(?:/.*)?$', dest: '/api/[...path]' },
        { src: '/(.*)', dest: '/index.html' },
      ],
    },
    null,
    2,
  ),
);

console.log('vercel output: static + /api/[...path] catch-all');
