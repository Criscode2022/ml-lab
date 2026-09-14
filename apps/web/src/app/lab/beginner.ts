import type { ExperimentSituation } from '@ml-lab/ml-core';

export type BeginnerPreset = {
  id: string;
  label: string;
  blurb: string;
  n: number;
  noise: number;
  outliers: number;
  seed: number;
};

export type HelpItem = { q: string; a: string };

export type TryIdea = { id: string; label: string; detail: string; action: 'find' | 'ols' | 'break' | 'reset' | 'preset' };

export const BEGINNER_PRESETS: BeginnerPreset[] = [
  {
    id: 'easy',
    label: 'Easy dots',
    blurb: 'A clear trend. Good for dragging the line by hand.',
    n: 36,
    noise: 0.06,
    outliers: 0,
    seed: 3,
  },
  {
    id: 'messy',
    label: 'Messy dots',
    blurb: 'More scatter. The best line still exists, it just looks fuzzier.',
    n: 80,
    noise: 0.45,
    outliers: 0,
    seed: 11,
  },
  {
    id: 'wild',
    label: 'A few wild points',
    blurb: 'Most dots follow a line. Two or three sit far away on purpose.',
    n: 56,
    noise: 0.14,
    outliers: 4,
    seed: 19,
  },
  {
    id: 'sparse',
    label: 'Only a few dots',
    blurb: 'Less data. Many lines look “okay” — that is the point.',
    n: 20,
    noise: 0.12,
    outliers: 0,
    seed: 5,
  },
];

export const CHART_LEGEND: { swatch: string; label: string; dashed?: boolean }[] = [
  { swatch: '#5eead4', label: 'Dots — the measurements' },
  { swatch: '#f4f7fb', label: 'Solid line — your guess' },
  { swatch: '#5eead4', dashed: true, label: 'Dashed line — best straight fit' },
  { swatch: '#f5a524', label: 'Amber sticks — how far each dot misses' },
];

export const GLOSSARY: HelpItem[] = [
  {
    q: 'What is this picture?',
    a: 'Each teal dot is one measurement. You are guessing a straight line that goes through the cloud. Machine learning, here, is just: try a guess, see how wrong it is, try a better guess.',
  },
  {
    q: 'What is the Match score?',
    a: '100% means your line is as close as a straight line can get. It will rarely be a perfect 100% because the dots have noise — they do not sit exactly on a line.',
  },
  {
    q: 'What does Find the line do?',
    a: 'The computer nudges the line a little, over and over, to reduce the error. That process is called gradient descent. You do not need the name to watch it work.',
  },
  {
    q: 'What is Best straight line?',
    a: 'A shortcut that jumps to the mathematically best straight line for these dots. Use it to see the target. Finding it yourself is the play.',
  },
  {
    q: 'Why did Break it go crazy?',
    a: 'The search took steps that were too big, overshot the good line, and ran away. That is a real failure mode. Press Start over, then Find the line.',
  },
  {
    q: 'Tilt vs Up / down?',
    a: 'Tilt is how steep the line is. Up / down slides it without changing steepness. Together they are the two numbers that define a straight line.',
  },
];

export function tryIdeas(situation: ExperimentSituation): TryIdea[] {
  const always: TryIdea[] = [
    { id: 'easy', label: 'Try easy dots', detail: 'A clean trend so dragging feels obvious.', action: 'preset' },
    { id: 'find', label: 'Watch it find the line', detail: 'From a bad guess, let the computer walk.', action: 'find' },
    { id: 'ols', label: 'Jump to the best line', detail: 'See the dashed target become the solid line.', action: 'ols' },
    { id: 'break', label: 'See a bad search', detail: 'Steps that are too big make the line fly away.', action: 'break' },
    { id: 'wild', label: 'Add wild points', detail: 'A few far-away dots pull the line.', action: 'preset' },
  ];
  if (situation === 'diverged') {
    return [
      { id: 'reset', label: 'Start over', detail: 'Put the line back and try a calmer search.', action: 'reset' },
      { id: 'find', label: 'Find the line gently', detail: 'Same idea, smaller steps.', action: 'find' },
      ...always.filter((x) => x.id !== 'find' && x.id !== 'break'),
    ];
  }
  if (situation === 'near-ols') {
    return [
      { id: 'wild', label: 'Make the dots harder', detail: 'Wild points show why 100% is rare.', action: 'preset' },
      { id: 'break', label: 'Break a good line', detail: 'See how a bad search undoes a good fit.', action: 'break' },
      ...always.filter((x) => x.id !== 'ols' && x.id !== 'wild'),
    ];
  }
  return always;
}

export function suggestedMove(situation: ExperimentSituation): TryIdea | null {
  const ideas = tryIdeas(situation);
  return ideas[0] ?? null;
}
