#!/usr/bin/env node
/**
 * Emit Vercel Build Output API v3 so nested /api/* routes hit Nest.
 * Bundle the function with esbuild (workspace packages as real files).
 */
import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { build } from 'esbuild';

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

await build({
  absWorkingDir: root,
  entryPoints: [join(root, handlerRel)],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: join(funcDir, 'index.js'),
  packages: 'bundle',
  allowOverwrite: true,
  logLevel: 'warning',
  external: ['@nestjs/microservices', '@nestjs/websockets', 'class-transformer', 'class-validator'],
});

writeFileSync(
  join(funcDir, '.vc-config.json'),
  JSON.stringify(
    {
      runtime: 'nodejs20.x',
      handler: 'index.js',
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

console.log('vercel output: static + bundled /api/[...path]');
