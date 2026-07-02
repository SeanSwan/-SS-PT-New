import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSocialPost = { findByPk: vi.fn() };
const mockAwardUnityWeaverProsocialXP = vi.fn();
const mockLogger = { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() };

vi.mock('../../models/social/index.mjs', () => ({
  SocialPost: mockSocialPost,
}));
vi.mock('../../services/unityWeaver/prosocialXPService.mjs', () => ({
  awardUnityWeaverProsocialXP: mockAwardUnityWeaverProsocialXP,
}));
vi.mock('../../utils/logger.mjs', () => ({ default: mockLogger }));

const { unityWeaverSocialActionXPResponseMiddleware } = await import('../../services/unityWeaver/socialActionProsocialMiddleware.mjs');

const awardedResult = (eventId, pointsAwarded = 8, swanCoinsAwarded = 2) => ({
  success: true,
  awarded: true,
  duplicate: false,
  status: 'awarded',
  event: { id: eventId, label: `Event ${eventId}` },
  pointsAwarded,
  newBalance: 100 + pointsAwarded,
  newLevel: 2,
  newTier: 'bronze_forge',
  badgesEarned: [],
  swanCoinsAwarded,
  swanCoinBalance: 50 + swanCoinsAwarded,
  currencyName: 'SwanCoins',
  legacyField: 'crystalBalance',
});

async function flushMiddleware() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

async function runMiddleware({ req, body, statusCode = 200 }) {
  const originalJson = vi.fn(function json(payload) {
    return payload;
  });
  const res = { statusCode, json: originalJson };
  const next = vi.fn();

  unityWeaverSocialActionXPResponseMiddleware(req, res, next);
  expect(next).toHaveBeenCalledTimes(1);
  const returned = res.json(body);
  expect(returned).toBe(res);
  await flushMiddleware();

  return originalJson.mock.calls[0]?.[0];
}

describe('Unity Weaver social action XP response middleware', () => {
  beforeEach(() => {
    mockSocialPost.findByPk.mockReset();
    mockAwardUnityWeaverProsocialXP.mockReset();
    mockLogger.warn.mockReset();
    mockLogger.info.mockReset();
    mockLogger.error.mockReset();
    mockLogger.debug.mockReset();

    mockSocialPost.findByPk.mockResolvedValue({ id: 99, userId: 22, type: 'workout' });
    mockAwardUnityWeaverProsocialXP.mockResolvedValue(awardedResult('encourage_friend'));
  });

  it('adds positive_progress_post XP summary after a successful workout post', async () => {
    mockAwardUnityWeaverProsocialXP.mockResolvedValueOnce(awardedResult('positive_progress_post', 12, 4));

    const payload = await runMiddleware({
      req: { user: { id: 7 }, method: 'POST', path: '/', body: { type: 'workout' } },
      body: { success: true, post: { id: 123, type: 'workout' } },
    });

    expect(mockAwardUnityWeaverProsocialXP).toHaveBeenCalledWith({
      actorUserId: 7,
      eventId: 'positive_progress_post',
      contextType: 'post',
      contextId: 123,
    });
    expect(payload).toEqual(expect.objectContaining({
      unityWeaverXP: expect.objectContaining({
        awarded: true,
        eventId: 'positive_progress_post',
        pointsAwarded: 12,
        swanCoinsAwarded: 4,
        swanCoinBalance: 54,
        currencyName: 'SwanCoins',
        legacyField: 'crystalBalance',
      }),
    }));
  });

  it('does not award Unity Weaver XP for general posts', async () => {
    const body = { success: true, post: { id: 123, type: 'general' } };
    const payload = await runMiddleware({
      req: { user: { id: 7 }, method: 'POST', path: '/', body: { type: 'general' } },
      body,
    });

    expect(mockAwardUnityWeaverProsocialXP).not.toHaveBeenCalled();
    expect(payload).toEqual(body);
  });

  it('awards encourage_friend after a swan reaction on another user post', async () => {
    const payload = await runMiddleware({
      req: { user: { id: 7 }, method: 'POST', path: '/99/like', body: { reactionType: 'swan' } },
      body: { success: true, reactionType: 'swan' },
    });

    expect(mockSocialPost.findByPk).toHaveBeenCalledWith(99, { attributes: ['id', 'userId', 'type'] });
    expect(mockAwardUnityWeaverProsocialXP).toHaveBeenCalledWith({
      actorUserId: 7,
      eventId: 'encourage_friend',
      targetUserId: 22,
      contextType: 'post',
      contextId: 99,
    });
    expect(payload.unityWeaverXP).toEqual(expect.objectContaining({ eventId: 'encourage_friend', swanCoinsAwarded: 2 }));
  });

  it('does not award Unity Weaver XP for thumbs_up reactions', async () => {
    const body = { success: true, reactionType: 'thumbs_up' };
    const payload = await runMiddleware({
      req: { user: { id: 7 }, method: 'POST', path: '/99/like', body: { reactionType: 'thumbs_up' } },
      body,
    });

    expect(mockSocialPost.findByPk).not.toHaveBeenCalled();
    expect(mockAwardUnityWeaverProsocialXP).not.toHaveBeenCalled();
    expect(payload).toEqual(body);
  });

  it('does not award recipient XP for reactions on the actor own post', async () => {
    mockSocialPost.findByPk.mockResolvedValueOnce({ id: 99, userId: 7, type: 'workout' });
    const body = { success: true, reactionType: 'heart' };

    const payload = await runMiddleware({
      req: { user: { id: 7 }, method: 'POST', path: '/99/like', body: { reactionType: 'heart' } },
      body,
    });

    expect(mockAwardUnityWeaverProsocialXP).not.toHaveBeenCalled();
    expect(payload).toEqual(body);
  });

  it('awards gratitude_given for grateful comments on another user post', async () => {
    mockAwardUnityWeaverProsocialXP.mockResolvedValueOnce(awardedResult('gratitude_given', 6, 2));

    const payload = await runMiddleware({
      req: { user: { id: 7 }, method: 'POST', path: '/99/comments', body: { content: 'Thank you for sharing this progress.' } },
      body: { success: true, comment: { id: 333, content: 'Thank you for sharing this progress.' } },
    });

    expect(mockAwardUnityWeaverProsocialXP).toHaveBeenCalledWith({
      actorUserId: 7,
      eventId: 'gratitude_given',
      targetUserId: 22,
      contextType: 'comment',
      contextId: 333,
    });
    expect(payload.unityWeaverXP).toEqual(expect.objectContaining({ eventId: 'gratitude_given', pointsAwarded: 6, swanCoinsAwarded: 2 }));
  });

  it('awards encourage_friend for supportive comments on another user post', async () => {
    const payload = await runMiddleware({
      req: { user: { id: 7 }, method: 'POST', path: '/99/comments', body: { content: 'Great job, keep going!' } },
      body: { success: true, comment: { id: 334, content: 'Great job, keep going!' } },
    });

    expect(mockAwardUnityWeaverProsocialXP).toHaveBeenCalledWith(expect.objectContaining({
      eventId: 'encourage_friend',
      targetUserId: 22,
      contextType: 'comment',
      contextId: 334,
    }));
    expect(payload.unityWeaverXP).toEqual(expect.objectContaining({ eventId: 'encourage_friend' }));
  });

  it('does not award Unity Weaver XP for neutral comments', async () => {
    const body = { success: true, comment: { id: 335, content: 'I logged a workout today.' } };
    const payload = await runMiddleware({
      req: { user: { id: 7 }, method: 'POST', path: '/99/comments', body: { content: 'I logged a workout today.' } },
      body,
    });

    expect(mockAwardUnityWeaverProsocialXP).not.toHaveBeenCalled();
    expect(payload).toEqual(body);
  });

  it('does not award Unity Weaver XP for failed social responses', async () => {
    const body = { success: false, message: 'Nope' };
    const payload = await runMiddleware({
      req: { user: { id: 7 }, method: 'POST', path: '/99/comments', body: { content: 'Great job!' } },
      body,
      statusCode: 400,
    });

    expect(mockAwardUnityWeaverProsocialXP).not.toHaveBeenCalled();
    expect(payload).toEqual(body);
  });

  it('preserves the original social response if the optional XP side effect throws', async () => {
    mockAwardUnityWeaverProsocialXP.mockRejectedValueOnce(new Error('ledger down'));
    const body = { success: true, post: { id: 123, type: 'workout' } };

    const payload = await runMiddleware({
      req: { user: { id: 7 }, method: 'POST', path: '/', body: { type: 'workout' } },
      body,
    });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      '[UnityWeaver] Prosocial XP orchestration skipped',
      expect.objectContaining({ userId: 7, method: 'POST', path: '/', error: 'ledger down' }),
    );
    expect(payload).toEqual(body);
  });
});
