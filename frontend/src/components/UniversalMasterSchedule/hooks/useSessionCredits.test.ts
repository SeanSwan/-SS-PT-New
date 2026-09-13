import { describe, expect, it } from 'vitest';
import { normalizeSessionCreditsPayload } from './useSessionCredits';

describe('normalizeSessionCreditsPayload', () => {
  it('keeps malformed or negative balances unavailable instead of inventing zero', () => {
    expect(() => normalizeSessionCreditsPayload({ sessionsRemaining: 'unknown', clientSource: 'swanstudios' })).toThrow();
    expect(() => normalizeSessionCreditsPayload({ sessionsRemaining: -4 })).toThrow();
    expect(normalizeSessionCreditsPayload({ sessionsRemaining: 0 })).toMatchObject({ sessionsRemaining: 0 });
  });

  it('preserves valid credit metadata while normalizing the count', () => {
    expect(normalizeSessionCreditsPayload({
      sessionsRemaining: '7',
      clientSource: 'move_fitness',
      packageName: 'Move Fitness Tracking',
      expiresAt: '2026-07-01T00:00:00.000Z',
    })).toEqual({
      sessionsRemaining: 7,
      clientSource: 'move_fitness',
      packageName: 'Move Fitness Tracking',
      expiresAt: '2026-07-01T00:00:00.000Z',
    });
  });
});
