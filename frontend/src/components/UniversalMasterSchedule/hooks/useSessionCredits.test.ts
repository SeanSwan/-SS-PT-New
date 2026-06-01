import { describe, expect, it } from 'vitest';
import { normalizeSessionCreditsPayload } from './useSessionCredits';

describe('normalizeSessionCreditsPayload', () => {
  it('fails closed when the credits API returns malformed or negative balances', () => {
    expect(normalizeSessionCreditsPayload({ sessionsRemaining: 'unknown', clientSource: 'swanstudios' })).toMatchObject({
      sessionsRemaining: 0,
      clientSource: 'swanstudios',
    });
    expect(normalizeSessionCreditsPayload({ sessionsRemaining: -4 })).toMatchObject({
      sessionsRemaining: 0,
      clientSource: null,
    });
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
