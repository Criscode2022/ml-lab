'use strict';

require('reflect-metadata');

/**
 * Vercel serverless entry for the NestJS API.
 * Local development still uses apps/api/src/main.ts (listen).
 */
let cached;

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
    const server = await bootstrap();
    return server(req, res);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'bootstrap_failed';
    res.statusCode = 503;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: message, service: 'ml-lab-api' }));
  }
};
