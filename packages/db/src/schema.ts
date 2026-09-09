import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const learnerProfiles = pgTable('learner_profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  goal: text('goal').notNull().default('understand-ml'),
  experienceLevel: text('experience_level').notNull().default('beginner'),
  dailyMinutes: integer('daily_minutes').notNull().default(20),
  learningMode: text('learning_mode').notNull().default('fast'),
  onboarded: boolean('onboarded').notNull().default(false),
  preferredFramework: text('preferred_framework').notNull().default('numpy'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const experiments = pgTable(
  'experiments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    conceptId: text('concept_id').notNull(),
    name: text('name').notNull(),
    dataset: jsonb('dataset').notNull(),
    parameters: jsonb('parameters').notNull(),
    metrics: jsonb('metrics').notNull().default({}),
    notes: text('notes'),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('experiments_user_id_idx').on(t.userId)],
);

export const progress = pgTable(
  'progress',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    conceptId: text('concept_id').notNull(),
    mastery: real('mastery').notNull().default(0),
    confidence: real('confidence').notNull().default(0),
    status: text('status').notNull().default('not_started'),
    mistakes: jsonb('mistakes').notNull().default([]),
    timeSpentMs: integer('time_spent_ms').notNull().default(0),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.conceptId] })],
);

export const notebooks = pgTable('notebooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  experimentId: uuid('experiment_id').references(() => experiments.id, { onDelete: 'set null' }),
  cells: jsonb('cells').notNull().default([]),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const challenges = pgTable('challenges', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  conceptId: text('concept_id').notNull(),
  prompt: jsonb('prompt').notNull(),
  expected: jsonb('expected'),
  answer: jsonb('answer'),
  score: real('score'),
  feedback: jsonb('feedback'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const learnerMemory = pgTable('learner_memory', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  facts: jsonb('facts').notNull().default([]),
  weakConcepts: text('weak_concepts').array().notNull().default([]),
  masteredConcepts: text('mastered_concepts').array().notNull().default([]),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const agentRuns = pgTable('agent_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  experimentId: uuid('experiment_id'),
  model: text('model'),
  taskType: text('task_type'),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  latencyMs: integer('latency_ms'),
  status: text('status').notNull(),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const schema = {
  users,
  learnerProfiles,
  experiments,
  progress,
  notebooks,
  challenges,
  learnerMemory,
  agentRuns,
};
