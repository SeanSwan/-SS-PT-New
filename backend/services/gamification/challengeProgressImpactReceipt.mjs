/**
 * Sanitized workout challenge-impact receipt builder.
 * Keeps completion feedback user-facing and strips participant/internal skip data.
 */

const MAX_VISIBLE_UPDATES = 3;

const toNonNegativeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const toNonNegativeCount = (value) => Math.floor(toNonNegativeNumber(value));
const round2 = (value) => Math.round(toNonNegativeNumber(value) * 100) / 100;
const clampPercent = (value) => Math.min(100, round2(value));

const compactText = (value, fallback = null) => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed ? trimmed.slice(0, 90) : fallback;
};

const headlineFor = (updatedCount) => {
  if (updatedCount <= 0) return null;
  return `${updatedCount} challenge${updatedCount === 1 ? '' : 's'} moved from this workout`;
};

const sanitizeUpdate = (entry = {}) => {
  const sanitized = {
    challengeId: compactText(entry.challengeId, null),
    title: compactText(entry.title, 'Challenge'),
    delta: round2(entry.delta),
    progressUnit: compactText(entry.progressUnit, 'progress'),
    currentProgress: round2(entry.currentProgress),
    progressPercentage: clampPercent(entry.progressPercentage),
    completed: entry.completed === true,
    xpEarned: entry.completed === true
      ? toNonNegativeCount(entry.xpReward) + toNonNegativeCount(entry.bonusXpReward)
      : 0,
  };

  if (entry.assignedSessionOnly === true) sanitized.assignedSessionOnly = true;
  if (entry.assignedSession === true) sanitized.assignedSession = true;

  return sanitized;
};

export const buildChallengeProgressImpactReceipt = (result, status = 'processed') => {
  if (status === 'failed') {
    return {
      status: 'failed',
      updatedCount: 0,
      skippedCount: 0,
      headline: null,
      updates: [],
    };
  }

  const updates = Array.isArray(result?.updated)
    ? result.updated.map(sanitizeUpdate).slice(0, MAX_VISIBLE_UPDATES)
    : [];
  const updatedCount = toNonNegativeCount(result?.updatedCount ?? updates.length);
  const skippedCount = toNonNegativeCount(result?.skippedCount);

  return {
    status: 'processed',
    updatedCount,
    skippedCount,
    headline: headlineFor(updatedCount),
    updates,
  };
};
