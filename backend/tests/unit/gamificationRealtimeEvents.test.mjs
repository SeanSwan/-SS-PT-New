import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  emitGamificationEvent: vi.fn()
}));

vi.mock('../../socket/gamificationEvents.mjs', () => ({
  emitGamificationEvent: mocks.emitGamificationEvent
}));

const { emitLedgerRealtimeEvent } = await import('../../services/gamification/GamificationRealtimeEvents.mjs');

describe('GamificationRealtimeEvents ledger emissions', () => {
  beforeEach(() => {
    mocks.emitGamificationEvent.mockReset();
  });

  const baseEntry = {
    userId: 7,
    source: 'social_engagement',
    sourceId: 42,
    transactionType: 'earn'
  };

  const baseResult = {
    duplicate: false,
    pointsAwarded: 5,
    newBalance: 105,
    newTier: 'silver_glade',
    pointTransaction: { sourceId: 42 }
  };

  it('emits level-up only when primitive levels increase', () => {
    emitLedgerRealtimeEvent({
      ...baseResult,
      newLevel: 3,
      previousLevel: 2
    }, baseEntry);

    expect(mocks.emitGamificationEvent).toHaveBeenCalledWith(
      'level_up',
      expect.objectContaining({
        userId: 7,
        newLevel: 3,
        previousLevel: 2
      }),
      { debounce: false }
    );
  });

  it('does not emit level-up when level values rely on array coercion', () => {
    emitLedgerRealtimeEvent({
      ...baseResult,
      newLevel: ['3'],
      previousLevel: 2
    }, baseEntry);

    expect(mocks.emitGamificationEvent).toHaveBeenCalledWith(
      'points_awarded',
      expect.objectContaining({
        userId: 7,
        points: 5,
        level: ['3'],
        previousLevel: 2
      }),
      { debounce: false }
    );
    expect(mocks.emitGamificationEvent).not.toHaveBeenCalledWith(
      'level_up',
      expect.anything(),
      expect.anything()
    );
  });

  it('emits the committed ledger identity and never debounces ledger workout awards', () => {
    emitLedgerRealtimeEvent({
      ...baseResult,
      pointTransaction: { id: 901, sourceId: 42, metadata: null },
    }, {
      ...baseEntry,
      source: 'workout_completion',
    });

    expect(mocks.emitGamificationEvent).toHaveBeenCalledWith(
      'workout_completed',
      expect.objectContaining({
        userId: 7,
        eventId: 'point-transaction:901',
        transactionId: 901,
        sourceId: 42,
      }),
      { debounce: false },
    );
  });

  it('forwards only allowlisted achievement metadata from the committed ledger row', () => {
    emitLedgerRealtimeEvent({
      ...baseResult,
      pointTransaction: {
        id: 902,
        sourceId: 42,
        metadata: {
          achievementName: 'Five Workouts',
          privateNote: 'must not cross the socket boundary',
        },
      },
    }, {
      ...baseEntry,
      source: 'achievement_earned',
      metadata: { achievementName: 'Entry fallback' },
    });

    expect(mocks.emitGamificationEvent).toHaveBeenCalledWith(
      'achievement_unlocked',
      expect.objectContaining({
        eventId: 'point-transaction:902',
        transactionId: 902,
        achievementName: 'Five Workouts',
      }),
      { debounce: false },
    );
    expect(mocks.emitGamificationEvent.mock.calls[0][1]).not.toHaveProperty('privateNote');
  });

  it('downgrades a streak source without authoritative days to generic points feedback', () => {
    emitLedgerRealtimeEvent({
      ...baseResult,
      pointTransaction: {
        id: 903,
        sourceId: null,
        metadata: { reason: 'recovery_day' },
      },
    }, {
      ...baseEntry,
      source: 'streak_bonus',
    });

    expect(mocks.emitGamificationEvent).toHaveBeenCalledWith(
      'points_awarded',
      expect.objectContaining({
        eventId: 'point-transaction:903',
        transactionId: 903,
        points: 5,
      }),
      { debounce: false },
    );
    expect(mocks.emitGamificationEvent.mock.calls[0][1]).not.toHaveProperty('streakDays');
  });
});
