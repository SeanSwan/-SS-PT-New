import { describe, expect, it } from 'vitest';
import { groupThreads } from './threadGroups';

const now = new Date(2026, 8, 22, 15, 0);
const thread = (id: number, iso: string | null, created = '2026-01-01T00:00:00Z') =>
  ({ id, title: `t${id}`, context: 'coach_assistant', status: 'active', messageCount: 1, lastMessageAt: iso, createdAt: created });

describe('groupThreads', () => {
  it('buckets by local day, newest first, skipping empty groups', () => {
    const groups = groupThreads([
      thread(1, new Date(2026, 8, 22, 9).toISOString()),
      thread(2, new Date(2026, 8, 21, 23).toISOString()),
      thread(3, new Date(2026, 8, 17).toISOString()),
      thread(4, new Date(2026, 7, 1).toISOString()),
      thread(5, new Date(2026, 8, 22, 14).toISOString()),
    ], now);
    expect(groups.map((g) => [g.label, g.threads.map((t) => t.id)])).toEqual([
      ['Today', [5, 1]], ['Yesterday', [2]], ['Previous 7 days', [3]], ['Earlier', [4]],
    ]);
  });
  it('falls back to createdAt and tolerates bad dates', () => {
    const groups = groupThreads([thread(1, null, new Date(2026, 8, 22, 8).toISOString()), thread(2, 'nope', 'nope')], now);
    expect(groups[0]).toMatchObject({ label: 'Today' });
    expect(groups.at(-1)).toMatchObject({ label: 'Earlier' });
  });
});
