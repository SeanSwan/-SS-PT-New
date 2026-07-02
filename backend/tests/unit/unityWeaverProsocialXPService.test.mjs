import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUser = { findByPk: vi.fn() };
const mockDb = { query: vi.fn() };
const mockPointsService = { recordLedgerEntry: vi.fn() };
const mockCheckBadges = vi.fn();

vi.mock('../../models/User.mjs', () => ({ default: mockUser }));
vi.mock('../../database.mjs', () => ({ default: mockDb }));
vi.mock('../../services/gamification/GamificationPointsService.mjs', () => ({
  default: mockPointsService,
}));
vi.mock('../../services/badgeGamificationBridge.mjs', () => ({
  checkBadgesForGamificationEvent: mockCheckBadges,
}));

const {
  awardUnityWeaverProsocialXP,
  getUnityWeaverProsocialEvents,
} = await import('../../services/unityWeaver/prosocialXPService.mjs');

const makeTargetUser = (overrides = {}) => ({
  id: 22,
  createdAt: new Date().toISOString(),
  isActive: true,
  ...overrides,
});

function mockNoPriorAwards() {
  mockDb.query.mockResolvedValueOnce([{ count: 0, lastCreatedAt: null }]);
}

describe('Unity Weaver prosocial XP service', () => {
  beforeEach(() => {
    mockUser.findByPk.mockReset();
    mockDb.query.mockReset();
    mockPointsService.recordLedgerEntry.mockReset();
    mockCheckBadges.mockReset();

    mockUser.findByPk.mockResolvedValue(makeTargetUser());
    mockNoPriorAwards();
    mockPointsService.recordLedgerEntry.mockResolvedValue({
      success: true,
      duplicate: false,
      pointsAwarded: 8,
      newBalance: 108,
      newLevel: 2,
      newTier: 'bronze_forge',
    });
    mockCheckBadges.mockResolvedValue([]);
  });

  it('exposes a backend-owned event catalog with validation-sensitive events marked', () => {
    const events = getUnityWeaverProsocialEvents();
    expect(events.map(event => event.id)).toEqual(expect.arrayContaining([
      'encourage_friend',
      'welcome_new_member',
      'positive_progress_post',
      'safe_report_confirmed',
      'deescalation_assist',
    ]));
    expect(events.find(event => event.id === 'safe_report_confirmed'))
      .toEqual(expect.objectContaining({ requiresHumanOrSystemValidation: true }));
  });

  it('rejects unknown events before any database or ledger work', async () => {
    const result = await awardUnityWeaverProsocialXP({
      actorUserId: 7,
      eventId: 'fake_kindness_farm',
      contextType: 'post',
    });

    expect(result).toEqual({ error: { status: 400, message: 'Unknown prosocial event' } });
    expect(mockUser.findByPk).not.toHaveBeenCalled();
    expect(mockDb.query).not.toHaveBeenCalled();
    expect(mockPointsService.recordLedgerEntry).not.toHaveBeenCalled();
  });

  it('blocks recipient-based self-awards', async () => {
    const result = await awardUnityWeaverProsocialXP({
      actorUserId: 7,
      eventId: 'encourage_friend',
      targetUserId: 7,
      contextType: 'post',
      contextId: 99,
    });

    expect(result).toEqual({ error: { status: 400, message: 'You cannot award prosocial XP to yourself' } });
    expect(mockPointsService.recordLedgerEntry).not.toHaveBeenCalled();
  });

  it('requires a target user for recipient-based events', async () => {
    const result = await awardUnityWeaverProsocialXP({
      actorUserId: 7,
      eventId: 'gratitude_given',
      contextType: 'comment',
      contextId: 101,
    });

    expect(result).toEqual({ error: { status: 400, message: 'targetUserId is required for this prosocial event' } });
    expect(mockPointsService.recordLedgerEntry).not.toHaveBeenCalled();
  });

  it('does not self-award validation-sensitive safety events', async () => {
    const result = await awardUnityWeaverProsocialXP({
      actorUserId: 7,
      eventId: 'safe_report_confirmed',
      contextType: 'moderation_review',
      contextId: 'report-1',
    });

    expect(result).toEqual(expect.objectContaining({
      success: true,
      awarded: false,
      status: 'requires_validation',
    }));
    expect(mockPointsService.recordLedgerEntry).not.toHaveBeenCalled();
  });

  it('enforces exact event-specific daily limits before ledger writes', async () => {
    mockDb.query.mockReset();
    mockDb.query.mockResolvedValueOnce([{ count: 5, lastCreatedAt: null }]);

    const result = await awardUnityWeaverProsocialXP({
      actorUserId: 7,
      eventId: 'encourage_friend',
      targetUserId: 22,
      contextType: 'post',
      contextId: 99,
    });

    expect(result).toEqual(expect.objectContaining({
      success: true,
      awarded: false,
      status: 'daily_limit_reached',
      dailyLimit: 5,
    }));
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('metadata"->>\'unityWeaverEventId\''),
      expect.objectContaining({
        replacements: expect.objectContaining({
          actorUserId: 7,
          eventId: 'encourage_friend',
          source: 'social_engagement',
        }),
      }),
    );
    expect(mockPointsService.recordLedgerEntry).not.toHaveBeenCalled();
  });

  it('enforces cooldown windows before ledger writes', async () => {
    mockDb.query.mockReset();
    mockDb.query.mockResolvedValueOnce([{ count: 1, lastCreatedAt: new Date().toISOString() }]);

    const result = await awardUnityWeaverProsocialXP({
      actorUserId: 7,
      eventId: 'encourage_friend',
      targetUserId: 22,
      contextType: 'post',
      contextId: 99,
    });

    expect(result).toEqual(expect.objectContaining({
      success: true,
      awarded: false,
      status: 'cooldown_active',
    }));
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(mockPointsService.recordLedgerEntry).not.toHaveBeenCalled();
  });

  it('awards low-risk prosocial XP through the central ledger with safe metadata only', async () => {
    const result = await awardUnityWeaverProsocialXP({
      actorUserId: 7,
      eventId: 'encourage_friend',
      targetUserId: 22,
      contextType: 'post',
      contextId: 'post-99',
    });

    expect(result).toEqual(expect.objectContaining({
      success: true,
      awarded: true,
      status: 'awarded',
      pointsAwarded: 8,
      newBalance: 108,
    }));

    expect(mockPointsService.recordLedgerEntry).toHaveBeenCalledWith(expect.objectContaining({
      userId: 7,
      points: 8,
      transactionType: 'earn',
      source: 'social_engagement',
      sourceId: 22,
      description: 'Unity Weaver: Encourage a Friend',
      awardedBy: 7,
      idempotencyKey: expect.stringContaining('unity:encourage_friend:actor:7:target:22'),
      maxPoints: 50,
      metadata: {
        unityWeaverEventId: 'encourage_friend',
        unityWeaverCategory: 'encouragement',
        contextType: 'post',
        contextId: 'post-99',
        targetUserId: 22,
      },
    }));

    const ledgerPayload = mockPointsService.recordLedgerEntry.mock.calls[0][0];
    expect(JSON.stringify(ledgerPayload.metadata)).not.toMatch(/comment|content|draft|clientMetadata|rawText/i);
    expect(mockCheckBadges).toHaveBeenCalledWith(expect.objectContaining({
      userId: 7,
      type: 'social_action',
      activityData: expect.objectContaining({
        socialAction: 'encourage_friend',
        unityWeaverEventId: 'encourage_friend',
        targetUserId: 22,
      }),
    }));
  });

  it('does not run badge checks for duplicate ledger awards', async () => {
    mockPointsService.recordLedgerEntry.mockResolvedValueOnce({
      success: true,
      duplicate: true,
      pointsAwarded: 0,
      newBalance: 108,
    });

    const result = await awardUnityWeaverProsocialXP({
      actorUserId: 7,
      eventId: 'positive_progress_post',
      contextType: 'post',
      contextId: 'post-dup',
    });

    expect(result).toEqual(expect.objectContaining({
      success: true,
      awarded: false,
      duplicate: true,
      status: 'duplicate',
    }));
    expect(mockCheckBadges).not.toHaveBeenCalled();
  });
});
