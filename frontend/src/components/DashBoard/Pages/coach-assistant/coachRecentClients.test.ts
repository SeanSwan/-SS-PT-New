import { describe, expect, it } from 'vitest';
import { recentClientIds } from './coachRecentClients';

describe('recentClientIds (v2 P2.3)', () => {
  it('returns up to 3 distinct recent client ids, excluding the active one', () => {
    const threads = [
      { targetUserId: 84 }, { targetUserId: 84 }, { targetUserId: '91' },
      { targetUserId: null }, { targetUserId: 12 }, { targetUserId: 33 },
    ];
    expect(recentClientIds(threads, 12)).toEqual([84, 91, 33]);
    expect(recentClientIds(threads, null)).toEqual([84, 91, 12]);
    expect(recentClientIds([], null)).toEqual([]);
    expect(recentClientIds([{ targetUserId: -5 }, { targetUserId: 'abc' }], null)).toEqual([]);
  });
});
