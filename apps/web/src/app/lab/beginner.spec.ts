import { describe, expect, it } from 'vitest';
import { BEGINNER_PRESETS, GLOSSARY, suggestedMove, tryIdeas } from './beginner';

describe('beginner help', () => {
  it('offers presets a newcomer can actually run', () => {
    expect(BEGINNER_PRESETS.length).toBeGreaterThanOrEqual(3);
    for (const p of BEGINNER_PRESETS) {
      expect(p.n).toBeGreaterThan(0);
      expect(p.label.toLowerCase()).not.toMatch(/mse|ols|gradient/i);
    }
  });

  it('answers beginner questions without jargon in the question', () => {
    expect(GLOSSARY.length).toBeGreaterThanOrEqual(4);
    for (const item of GLOSSARY) {
      expect(item.q.toLowerCase()).not.toMatch(/\bmse\b|\bols\b|ŷ/);
      expect(item.a.length).toBeGreaterThan(40);
    }
  });

  it('after a blown search, suggests starting over first', () => {
    const first = suggestedMove('diverged');
    expect(first?.action).toBe('reset');
    const ids = tryIdeas('diverged').map((i) => i.action);
    expect(ids).toContain('find');
  });
});
