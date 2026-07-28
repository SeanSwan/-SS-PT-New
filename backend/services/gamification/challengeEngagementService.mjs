/**
 * Challenge engagement counters.
 *
 * Records low-risk aggregate challenge engagement signals without storing viewer
 * identity, IP address, or user-agent data. The read path stays available even
 * when analytics persistence fails.
 */

const VIEW_TRACKING_LOG_MESSAGE = '[ChallengeEngagement] Failed to record challenge view';

const toNonNegativeInteger = (value) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) return 0;

  return Math.floor(numberValue);
};

const normalizeChallengeId = (value) => String(value ?? '').trim();
const getCurrentViewCount = (challenge) => toNonNegativeInteger(challenge?.viewCount);

const makeResult = ({ recorded = false, reason = 'not_viewable', viewCount = 0 } = {}) => ({
  recorded,
  reason,
  viewCount,
});

const makeLookupResult = ({ found = false, recorded = false, reason = 'not_viewable', viewCount = 0 } = {}) => ({
  found,
  recorded,
  reason,
  viewCount,
});

const isPublicViewableChallenge = (challenge) => (
  Boolean(challenge?.id)
    && challenge.status !== 'draft'
    && challenge.isPublic === true
);

export const recordChallengeView = async ({ Challenge, challenge, logger = console } = {}) => {
  const currentViewCount = getCurrentViewCount(challenge);

  if (!isPublicViewableChallenge(challenge)) {
    return makeResult({ viewCount: currentViewCount });
  }

  if (typeof Challenge?.increment !== 'function') {
    return makeResult({ reason: 'increment_unavailable', viewCount: currentViewCount });
  }

  try {
    await Challenge.increment('viewCount', {
      by: 1,
      where: { id: challenge.id, isPublic: true, status: challenge.status },
    });

    return makeResult({ recorded: true, reason: null, viewCount: currentViewCount + 1 });
  } catch (error) {
    logger?.warn?.(VIEW_TRACKING_LOG_MESSAGE, {
      challengeId: challenge.id,
      errorName: error?.name || 'Error',
    });

    return makeResult({ reason: 'write_failed', viewCount: currentViewCount });
  }
};

export const recordPublicChallengeViewById = async ({ Challenge, challengeId, logger = console } = {}) => {
  const id = normalizeChallengeId(challengeId);
  if (!id) return makeLookupResult({ reason: 'invalid_id' });
  if (typeof Challenge?.findByPk !== 'function') return makeLookupResult({ reason: 'model_unavailable' });

  const challenge = await Challenge.findByPk(id);
  const currentViewCount = getCurrentViewCount(challenge);
  if (!isPublicViewableChallenge(challenge)) {
    return makeLookupResult({ reason: 'not_viewable', viewCount: currentViewCount });
  }

  const result = await recordChallengeView({ Challenge, challenge, logger });
  return makeLookupResult({ found: true, ...result });
};
