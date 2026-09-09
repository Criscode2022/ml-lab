export type LearningMode = 'fast' | 'deep' | 'playground' | 'challenge' | 'explain';

export type ExperienceLevel = 'beginner' | 'python-stats' | 'practitioner' | 'expert';

export type LearningGoal =
  | 'understand-ml'
  | 'ml-engineer'
  | 'ai-products'
  | 'university'
  | 'interviews'
  | 'deep-learning'
  | 'llms'
  | 'applied-ds'
  | 'experiment'
  | 'mathematics';

export type ProgressStatus = 'not_started' | 'in_progress' | 'practiced' | 'weak' | 'mastered';

export type Point = { x: number; y: number };

export type ConceptNode = {
  id: string;
  title: string;
  cluster: string;
  prerequisites: string[];
  estimatedMinutes: { fast: number; deep: number };
  labReady: boolean;
};

export const CONCEPT_CATALOG: ConceptNode[] = [
  {
    id: 'data-fundamentals',
    title: 'Data, features, targets',
    cluster: 'Foundations',
    prerequisites: [],
    estimatedMinutes: { fast: 8, deep: 25 },
    labReady: false,
  },
  {
    id: 'linear-regression',
    title: 'Linear Regression',
    cluster: 'Regression',
    prerequisites: ['data-fundamentals'],
    estimatedMinutes: { fast: 12, deep: 40 },
    labReady: true,
  },
  {
    id: 'gradient-descent',
    title: 'Gradient Descent',
    cluster: 'Optimization',
    prerequisites: ['linear-regression'],
    estimatedMinutes: { fast: 10, deep: 35 },
    labReady: false,
  },
  {
    id: 'regularization',
    title: 'Regularization',
    cluster: 'Regression',
    prerequisites: ['linear-regression'],
    estimatedMinutes: { fast: 10, deep: 30 },
    labReady: false,
  },
];

export type ExperimentParameters = {
  slope: number;
  intercept: number;
  learningRate: number;
  iterations: number;
  noise: number;
  sampleCount: number;
  outliers: number;
  seed: number;
  trueSlope: number;
  trueIntercept: number;
};

export type ExperimentMetrics = {
  mse: number;
  mae: number;
  lossHistory: number[];
  diverged: boolean;
  oscillated: boolean;
};

export type ExperimentSnapshot = {
  id?: string;
  conceptId: string;
  name: string;
  dataset: { points: Point[]; spec: Record<string, number | string> };
  parameters: ExperimentParameters;
  metrics: ExperimentMetrics;
  notes?: string;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type LearnerContext = {
  learnerLevel: ExperienceLevel;
  masteredConcepts: string[];
  weakConcepts: string[];
  currentConcept: string;
  currentExperiment: ExperimentSnapshot | null;
  learningMode: LearningMode;
  goals: LearningGoal[];
  currentCode?: string;
  recentMistakes?: string[];
};

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type Profile = {
  goal: LearningGoal;
  experienceLevel: ExperienceLevel;
  dailyMinutes: number;
  learningMode: LearningMode;
  onboarded: boolean;
  preferredFramework: string;
};

export type ProgressRecord = {
  conceptId: string;
  mastery: number;
  confidence: number;
  status: ProgressStatus;
  mistakes: string[];
  timeSpentMs: number;
  lastSeenAt: string | null;
};

export type Recommendation = {
  conceptId: string;
  title: string;
  reason: string;
  estimatedMinutes: number;
  href: string;
};

export type NotebookCellType =
  | 'markdown'
  | 'python'
  | 'visualization'
  | 'experiment'
  | 'ai'
  | 'quiz'
  | 'result';

export type NotebookCell = {
  id: string;
  type: NotebookCellType;
  source: string;
  output?: string;
  status?: 'idle' | 'running' | 'succeeded' | 'failed' | 'stopped';
  collapsed?: boolean;
};

export type SandboxRunRequest = {
  code: string;
  timeoutMs?: number;
  dataset?: { points: Point[]; learningRate?: number; iterations?: number; initSlope?: number; initIntercept?: number };
};

export type SandboxRunResult = {
  runId: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'timeout' | 'stopped' | 'reset';
  stdout: string;
  stderr: string;
  exitCode: number | null;
  interpreterPid: number | null;
  hostPid: number;
  timedOut: boolean;
  durationMs: number;
  isolated: boolean;
};

export type ChallengePrompt = {
  id?: string;
  conceptId: string;
  kind: 'mse' | 'diverge' | 'explain';
  title: string;
  body: string;
  payload: Record<string, unknown>;
};

export type ChallengeGrade = {
  score: number;
  correct: boolean;
  feedback: string;
  expected?: unknown;
};

export type TutorRequest = {
  message: string;
  mode?: 'socratic' | 'direct' | 'debug' | 'mathematical' | 'intuitive';
  experiment?: ExperimentSnapshot;
  code?: string;
  why?: boolean;
};

export type CommandDef = {
  id: string;
  title: string;
  group: string;
  href?: string;
  action?: string;
  keywords: string[];
};
