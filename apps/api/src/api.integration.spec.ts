import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './app.module';
import { mse, generateRegressionDataset } from '@ml-lab/ml-core';

describe('ML Lab API', () => {
  let app: INestApplication;
  const password = 'correct-horse-battery';
  jest.setTimeout(60_000);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    const { closeDatabase } = await import('@ml-lab/db');
    await closeDatabase();
  });

  it('health returns the Linear Regression concept', async () => {
    const res = await request(app.getHttpServer()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.concept.id).toBe('linear-regression');
    expect(res.body.concept.title).toMatch(/Linear Regression/i);
    const concepts = await request(app.getHttpServer()).get('/api/concepts/linear-regression');
    expect(concepts.body.id).toBe('linear-regression');
    expect(concepts.body.name).toBeTruthy();
  });

  it('register/login, isolate experiments, save progress, grade a challenge', async () => {
    const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const emailA = `a-${stamp}@lab.test`;
    const emailB = `b-${stamp}@lab.test`;
    const a = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: emailA, password, name: 'Ada' });
    expect(a.status).toBe(201);
    expect(a.body.token).toBeTruthy();
    const tokenA = a.body.token as string;

    const b = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: emailB, password, name: 'Ben' });
    const tokenB = b.body.token as string;

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: emailA, password });
    expect(login.body.token).toBeTruthy();

    await request(app.getHttpServer())
      .post('/api/profile')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ goal: 'understand-ml', experienceLevel: 'beginner', dailyMinutes: 20, learningMode: 'fast' })
      .expect(201);

    const points = generateRegressionDataset({
      n: 20,
      slope: 1.2,
      intercept: 0.4,
      noise: 0.1,
      seed: 3,
      xMin: -2,
      xMax: 2,
    });
    const snap = {
      conceptId: 'linear-regression',
      name: 'ada-fit',
      dataset: { points, spec: { n: 20 } },
      parameters: {
        slope: 1.2,
        intercept: 0.4,
        learningRate: 0.05,
        iterations: 40,
        noise: 0.1,
        sampleCount: 20,
        outliers: 0,
        seed: 3,
        trueSlope: 1.2,
        trueIntercept: 0.4,
      },
      metrics: {
        mse: mse(points, 1.2, 0.4),
        mae: 0.1,
        lossHistory: [1, 0.8, 0.5],
        diverged: false,
        oscillated: false,
      },
    };

    const created = await request(app.getHttpServer())
      .post('/api/experiments')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(snap);
    expect(created.status).toBe(201);
    const expId = created.body.id as string;

    const got = await request(app.getHttpServer())
      .get(`/api/experiments/${expId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(got.status).toBe(200);
    expect(got.body.name).toBe('ada-fit');

    const blocked = await request(app.getHttpServer())
      .get(`/api/experiments/${expId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect([403, 404]).toContain(blocked.status);

    const prog = await request(app.getHttpServer())
      .get('/api/progress/linear-regression')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(prog.status).toBe(200);
    expect(prog.body.recommendation.conceptId).toBe('linear-regression');
    expect(prog.body.recommendation.reason.length).toBeGreaterThan(10);

    const challenge = await request(app.getHttpServer())
      .post('/api/challenges')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ experiment: snap, kind: 'mse' });
    expect(challenge.status).toBe(201);
    const wrong = await request(app.getHttpServer())
      .post(`/api/challenges/${challenge.body.id}/submit`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ answer: 99999 });
    expect(wrong.body.correct).toBe(false);
    const rightValue = (challenge.body.expected as { mse: number }).mse;
    const right = await request(app.getHttpServer())
      .post(`/api/challenges/${challenge.body.id}/submit`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ answer: rightValue });
    expect(right.body.correct).toBe(true);
  }, 60_000);

  it('tutor fails honestly when no provider is configured', async () => {
    const reg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: `c-${Date.now()}@lab.test`, password, name: 'Cee' });
    const res = await request(app.getHttpServer())
      .post('/api/ai/tutor')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ message: 'Why did loss explode?' });
    expect(res.status).toBe(503);
    expect(res.body.retry ?? res.body.message).toBeTruthy();
    const blob = JSON.stringify(res.body).toLowerCase();
    expect(blob).not.toMatch(/you increased the learning rate from 0.01/);
    expect(blob).toMatch(/provider|retry|unavailable|failed/);
  });
});
