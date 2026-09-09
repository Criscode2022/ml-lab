'use strict';

require('reflect-metadata');

/**
 * Vercel serverless entry for the NestJS API.
 * Required catch-all so /api/auth/register and /api/sandbox/run reach Nest.
 * Local development still uses apps/api/src/main.ts (listen).
 */
let cached;

function restoreUrl(req) {
  const header =
    req.headers['x-invoke-path'] ||
    req.headers['x-matched-path'] ||
    req.headers['x-forwarded-uri'];
  if (typeof header === 'string' && header.startsWith('/api')) {
    const pathOnly = header.split('?')[0];
    req.url = pathOnly + (req.url && req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
    return;
  }
  const splat = req.query && (req.query['...path'] ?? req.query.path);
  if (splat) {
    const segs = Array.isArray(splat) ? splat : String(splat).split('/');
    const path = '/api/' + segs.filter(Boolean).join('/');
    const qs = req.url && req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    req.url = path + qs;
  }
}

async function bootstrap() {
  if (cached) return cached;
  const express = require('express');
  const { NestFactory } = require('@nestjs/core');
  const { ExpressAdapter } = require('@nestjs/platform-express');
  const { AppModule } = require('../apps/api/dist/app.module');

  const server = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: ['error', 'warn', 'log'],
  });
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.WEB_ORIGIN?.split(',') ?? true,
    credentials: true,
  });
  await app.init();
  cached = server;
  return cached;
}

module.exports = async function handler(req, res) {
  try {
    restoreUrl(req);
    const server = await bootstrap();
    return server(req, res);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'bootstrap_failed';
    res.statusCode = 503;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: message, service: 'ml-lab-api' }));
  }
};
