import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  GamificationPointsService: {
    recordLedgerEntry: vi.fn(),
  },
}));

vi.mock('../../services/gamification/GamificationPointsService.mjs', () => ({
  default: mocks.GamificationPointsService,
}));

const {
  awardOlympicEventPoints,
  awardRecoveryDayPoints,
  awardVideoMicroWinPoints,
} = await import('../../services/gamification/legacyRoutePointAwards.mjs');

describe('legacy route point awards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.GamificationPointsService.recordLedgerEntry.mockResolvedValue({
      success: true,
      duplicate: false,
      pointsAwarded: 25,
      newBalance: 100,
    });
  });

  it('records Virtual Olympics event XP with deterministic event idempotency', async () => {
    await awardOlympicEventPoints({
      userId: 103,
      points: 300,
      eventId: 321,
      eventType: 'pullups',
      rank: 1,
      isPersonalBest: true,
    });

    expect(mocks.GamificationPointsService.recordLedgerEntry).toHaveBeenCalledWith(expect.objectContaining({
      userId: 103,
      points: 300,
      transactionType: 'bonus',
      source: 'challenge_completion',
      sourceId: 321,
      description: 'Virtual Olympics performance XP',
      idempotencyKey: 'olympics:event:321',
      metadata: expect.objectContaining({
        reason: 'virtual_olympics_event',
        eventId: 321,
        eventType: 'pullups',
        rank: 1,
        isPersonalBest: true,
      }),
    }));
  });

  it('records recovery-day XP with deterministic daily idempotency', async () => {
    await awardRecoveryDayPoints({
      userId: 103,
      points: 50,
      date: '2026-06-20',
    });

    expect(mocks.GamificationPointsService.recordLedgerEntry).toHaveBeenCalledWith(expect.objectContaining({
      userId: 103,
      points: 50,
      transactionType: 'bonus',
      source: 'streak_bonus',
      sourceId: null,
      description: 'Virtual Olympics recovery day XP',
      idempotencyKey: 'olympics:recovery:103:2026-06-20',
      metadata: expect.objectContaining({
        reason: 'recovery_day',
        date: '2026-06-20',
      }),
    }));
  });

  it('records video-session micro-wins with deterministic session-type idempotency', async () => {
    await awardVideoMicroWinPoints({
      userId: 104,
      points: 10,
      videoSessionId: 441,
      type: 'great_rep',
      awardedBy: 7,
    });

    const [entry] = mocks.GamificationPointsService.recordLedgerEntry.mock.calls[0];
    expect(entry).toEqual(expect.objectContaining({
      userId: 104,
      points: 10,
      transactionType: 'bonus',
      source: 'trainer_award',
      sourceId: 441,
      description: 'Video session micro-win XP',
      awardedBy: 7,
      idempotencyKey: 'video-session:micro-win:441:great_rep',
      metadata: expect.objectContaining({
        reason: 'video_micro_win',
        videoSessionId: 441,
        microWinType: 'great_rep',
      }),
    }));
  });
});
