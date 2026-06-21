import { describe, expect, it } from 'vitest';
import { buttonMotion, expandMotion, fadeSlideMotion } from './MealPlanTab.motion';

describe('MealPlanTab motion contracts', () => {
  it('preserves normal button press motion while removing it for reduced motion', () => {
    expect(buttonMotion(false)).toEqual({
      whileHover: { scale: 1.02 },
      whileTap: { scale: 0.98 },
    });
    expect(buttonMotion(true)).toEqual({});
  });

  it('preserves normal panel entrance motion while removing it for reduced motion', () => {
    expect(fadeSlideMotion(false)).toEqual({
      initial: { opacity: 0, y: 12 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0 },
    });
    expect(fadeSlideMotion(true)).toEqual({});
  });

  it('preserves normal expand motion while removing it for reduced motion', () => {
    expect(expandMotion(false)).toEqual({
      initial: { height: 0, opacity: 0 },
      animate: { height: 'auto', opacity: 1 },
      exit: { height: 0, opacity: 0 },
    });
    expect(expandMotion(true)).toEqual({});
  });
});
