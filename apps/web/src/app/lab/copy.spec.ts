import { describe, expect, it } from 'vitest';
import { headlineFor, matchPercent } from './copy';

describe('lab copy', () => {
  it('explains a bad fit in basic language without jargon', () => {
    const text = headlineFor('far-from-ols', 64.8, 'basic');
    expect(text.toLowerCase()).toContain('dots');
    expect(text).not.toMatch(/MSE|OLS|ŷ|gradient/i);
  });

  it('keeps advanced copy technical', () => {
    const text = headlineFor('far-from-ols', 64.8, 'advanced');
    expect(text).toContain('64.8');
    expect(text).toMatch(/MSE/);
  });

  it('maps OLS ratio 1 to a full match score', () => {
    expect(matchPercent(1)).toBe(100);
    expect(matchPercent(2)).toBe(50);
    expect(matchPercent(Number.POSITIVE_INFINITY)).toBe(0);
  });
});
