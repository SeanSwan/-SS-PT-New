import { beforeEach, describe, expect, it, vi } from 'vitest';

const emitted = [];

vi.mock('../../socket/socketManager.mjs', () => ({
  getIO: () => ({
    to: (room) => ({
      emit: (event, payload) => emitted.push({ room, event, payload }),
    }),
  }),
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

const { emitGamificationEvent } = await import('../../socket/gamificationEvents.mjs');
const { emitLedgerRealtimeEvent } = await import('../../services/gamification/GamificationRealtimeEvents.mjs');

describe('gamificationEvents Socket.IO bridge', () => {
  beforeEach(() => {
    emitted.length = 0;
  });

  it('emits through the primary socket manager in ESM runtime', () => {
    emitGamificationEvent(
      'level_up',
      { userId: 7, level: 3 },
      { debounce: false },
    );

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({
      room: 'user:7',
      event: 'gamification:level_up',
      payload: {
        userId: 7,
        level: 3,
      },
    });
    expect(emitted[0].payload.timestamp).toEqual(expect.any(String));
  });

  it('falls back to the shared gamification room for non-user-scoped broadcasts', () => {
    emitGamificationEvent(
      'points_awarded',
      { points: 5 },
      { debounce: false },
    );

    expect(emitted[0]).toMatchObject({
      room: 'gamification',
      event: 'gamification:points_awarded',
      payload: {
        points: 5,
      },
    });
  });

  it('emits distinct committed workout ledger rows within the legacy debounce window', () => {
    emitLedgerRealtimeEvent({
      duplicate: false,
      pointsAwarded: 5,
      newBalance: 105,
      pointTransaction: { id: 1201, sourceId: 501 },
    }, {
      userId: 7,
      source: 'workout_completion',
      sourceId: 501,
      transactionType: 'earn',
    });
    emitLedgerRealtimeEvent({
      duplicate: false,
      pointsAwarded: 8,
      newBalance: 113,
      pointTransaction: { id: '1202', sourceId: 502 },
    }, {
      userId: 7,
      source: 'workout_completion',
      sourceId: 502,
      transactionType: 'earn',
    });

    expect(emitted.filter(item => item.event === 'gamification:workout_completed')).toHaveLength(2);
    expect(emitted.map(item => item.payload.eventId)).toEqual([
      'point-transaction:1201',
      'point-transaction:1202',
    ]);
  });
});
