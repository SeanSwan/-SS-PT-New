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
});
