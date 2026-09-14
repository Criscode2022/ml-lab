import { CONCEPT_CATALOG } from '@ml-lab/contracts';

export type LabEntry = {
  id: string;
  title: string;
  cluster: string;
  blurb: string;
  ready: boolean;
  href: string;
};

const BLURB: Record<string, string> = {
  'data-fundamentals': 'What a feature, a target, and a row actually are.',
  'linear-regression': 'Fit a line to noisy points. Residuals and MSE update as you drag.',
  'gradient-descent': 'Step down the loss. A large learning rate will explode.',
  regularization: 'Penalize large weights when the line starts memorizing noise.',
};

export const LABS: LabEntry[] = CONCEPT_CATALOG.map((c) => ({
  id: c.id,
  title: c.title,
  cluster: c.cluster,
  blurb: BLURB[c.id] ?? c.title,
  ready: c.labReady || c.id === 'gradient-descent',
  href: `/app/lab/${c.id}`,
}));

export function labById(id: string | null | undefined): LabEntry | undefined {
  return LABS.find((l) => l.id === id);
}

export function isRunnableLab(id: string | null | undefined): boolean {
  return id === 'linear-regression' || id === 'gradient-descent';
}
