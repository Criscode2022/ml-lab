import { CONCEPT_CATALOG } from '@ml-lab/contracts';

export type LabEntry = {
  id: string;
  title: string;
  playTitle: string;
  cluster: string;
  blurb: string;
  playBlurb: string;
  ready: boolean;
  href: string;
};

const BLURB: Record<string, { pro: string; play: string; playTitle: string }> = {
  'data-fundamentals': {
    playTitle: 'What the dots mean',
    play: 'Coming later — what each measurement is.',
    pro: 'What a feature, a target, and a row actually are.',
  },
  'linear-regression': {
    playTitle: 'Fit a line',
    play: 'Drag a line through dots. See when it matches.',
    pro: 'Fit a line to noisy points. Residuals and MSE update as you drag.',
  },
  'gradient-descent': {
    playTitle: 'Find it automatically',
    play: 'Let the computer walk the line toward the dots. You can also make it fail.',
    pro: 'Step down the loss. A large learning rate will explode.',
  },
  regularization: {
    playTitle: 'Stop overreacting',
    play: 'Coming later — when a line memorizes noise.',
    pro: 'Penalize large weights when the line starts memorizing noise.',
  },
};

export const LABS: LabEntry[] = CONCEPT_CATALOG.map((c) => {
  const copy = BLURB[c.id];
  return {
    id: c.id,
    title: c.title,
    playTitle: copy?.playTitle ?? c.title,
    cluster: c.cluster,
    blurb: copy?.pro ?? c.title,
    playBlurb: copy?.play ?? c.title,
    ready: c.labReady || c.id === 'gradient-descent',
    href: `/app/lab/${c.id}`,
  };
});

export function labById(id: string | null | undefined): LabEntry | undefined {
  return LABS.find((l) => l.id === id);
}

export function isRunnableLab(id: string | null | undefined): boolean {
  return id === 'linear-regression' || id === 'gradient-descent';
}
