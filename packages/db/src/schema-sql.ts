export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learner_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  goal text NOT NULL DEFAULT 'understand-ml',
  experience_level text NOT NULL DEFAULT 'beginner',
  daily_minutes integer NOT NULL DEFAULT 20,
  learning_mode text NOT NULL DEFAULT 'fast',
  onboarded boolean NOT NULL DEFAULT false,
  preferred_framework text NOT NULL DEFAULT 'numpy',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS experiments (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concept_id text NOT NULL,
  name text NOT NULL,
  dataset jsonb NOT NULL,
  parameters jsonb NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS experiments_user_id_idx ON experiments(user_id);

CREATE TABLE IF NOT EXISTS progress (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concept_id text NOT NULL,
  mastery real NOT NULL DEFAULT 0,
  confidence real NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'not_started',
  mistakes jsonb NOT NULL DEFAULT '[]'::jsonb,
  time_spent_ms integer NOT NULL DEFAULT 0,
  last_seen_at timestamptz,
  PRIMARY KEY (user_id, concept_id)
);

CREATE TABLE IF NOT EXISTS notebooks (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  experiment_id uuid REFERENCES experiments(id) ON DELETE SET NULL,
  cells jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concept_id text NOT NULL,
  prompt jsonb NOT NULL,
  expected jsonb,
  answer jsonb,
  score real,
  feedback jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learner_memory (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  facts jsonb NOT NULL DEFAULT '[]'::jsonb,
  weak_concepts text[] NOT NULL DEFAULT '{}',
  mastered_concepts text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  experiment_id uuid,
  model text,
  task_type text,
  input_tokens integer,
  output_tokens integer,
  latency_ms integer,
  status text NOT NULL,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
`;
