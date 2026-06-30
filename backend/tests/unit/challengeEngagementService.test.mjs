import { describe, expect, it, vi } from 'vitest';
import {
  recordChallengeView,
  recordPublicChallengeViewById,
} from '../../services/gamification/challengeEngagementService.mjs';

describe('challengeEngagementService', () => {
  it('increments viewCount for public non-draft challenge detail views', async () => {
    const Challenge = { increment: vi.fn().mockResolvedValue([1]) };

    const result = await recordChallengeView({
      Challenge,
      challenge: {
        id: 'challenge-1',
        status: 'active',
        isPublic: true,
        viewCount: 4,
      },
    });

    expect(Challenge.increment).toHaveBeenCalledWith('viewCount', {
      by: 1,
      where: { id: 'challenge-1', isPublic: true, status: 'active' },
    });
    expect(result).toEqual({ recorded: true, reason: null, viewCount: 5 });
  });

  it.each([
    ['missing challenge', null, 0],
    ['missing id', { status: 'active', isPublic: true, viewCount: 3 }, 3],
    ['draft challenge', { id: 'challenge-1', status: 'draft', isPublic: true, viewCount: 6 }, 6],
    ['private challenge', { id: 'challenge-1', status: 'active', isPublic: false, viewCount: 8 }, 8],
  ])('does not record views for %s', async (_label, challenge, expectedViewCount) => {
    const Challenge = { increment: vi.fn() };

    const result = await recordChallengeView({ Challenge, challenge });

    expect(Challenge.increment).not.toHaveBeenCalled();
    expect(result).toEqual({ recorded: false, reason: 'not_viewable', viewCount: expectedViewCount });
  });

  it('looks up public challenges by id before recording aggregate view events', async () => {
    const challenge = { id: 'challenge-9', status: 'active', isPublic: true, viewCount: 11 };
    const Challenge = {
      findByPk: vi.fn().mockResolvedValue(challenge),
      increment: vi.fn().mockResolvedValue([1]),
    };

    const result = await recordPublicChallengeViewById({ Challenge, challengeId: ' challenge-9 ' });

    expect(Challenge.findByPk).toHaveBeenCalledWith('challenge-9');
    expect(Challenge.increment).toHaveBeenCalledWith('viewCount', {
      by: 1,
      where: { id: 'challenge-9', isPublic: true, status: 'active' },
    });
    expect(result).toEqual({ found: true, recorded: true, reason: null, viewCount: 12 });
  });

  it.each([
    ['blank id', '', null, 'invalid_id', 0],
    ['missing row', 'missing', null, 'not_viewable', 0],
    ['draft row', 'draft-1', { id: 'draft-1', status: 'draft', isPublic: true, viewCount: 4 }, 'not_viewable', 4],
    ['private row', 'private-1', { id: 'private-1', status: 'active', isPublic: false, viewCount: 5 }, 'not_viewable', 5],
  ])('does not expose or increment %s through the public view endpoint helper', async (_label, challengeId, challenge, reason, viewCount) => {
    const Challenge = {
      findByPk: vi.fn().mockResolvedValue(challenge),
      increment: vi.fn(),
    };

    const result = await recordPublicChallengeViewById({ Challenge, challengeId });

    if (challengeId) expect(Challenge.findByPk).toHaveBeenCalledWith(challengeId);
    else expect(Challenge.findByPk).not.toHaveBeenCalled();
    expect(Challenge.increment).not.toHaveBeenCalled();
    expect(result).toEqual({ found: false, recorded: false, reason, viewCount });
  });

  it('reports model unavailability without throwing from the endpoint helper', async () => {
    const result = await recordPublicChallengeViewById({ Challenge: {}, challengeId: 'challenge-1' });

    expect(result).toEqual({ found: false, recorded: false, reason: 'model_unavailable', viewCount: 0 });
  });

  it('fails soft and logs sanitized metadata when view tracking cannot be persisted', async () => {
    const Challenge = { increment: vi.fn().mockRejectedValue(new Error('postgres://private-db-host')) };
    const logger = { warn: vi.fn() };

    const result = await recordChallengeView({
      Challenge,
      challenge: {
        id: 'challenge-1',
        status: 'active',
        isPublic: true,
        viewCount: 7,
      },
      logger,
    });

    expect(result).toEqual({ recorded: false, reason: 'write_failed', viewCount: 7 });
    expect(logger.warn).toHaveBeenCalledWith('[ChallengeEngagement] Failed to record challenge view', {
      challengeId: 'challenge-1',
      errorName: 'Error',
    });
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('postgres://private-db-host');
  });
});
