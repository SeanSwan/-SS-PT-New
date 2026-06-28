/**
 * Backend helpers for Swan rank title selection.
 *
 * The public ladder lives in levelingAlgorithm.mjs. This file only adds the
 * earned/selected/current metadata needed by profile APIs and keeps controller
 * validation out of React-facing code.
 */
import { calculateLevel, getRankTitles, getTier } from './levelingAlgorithm.mjs';
import { getUpcomingProgressionBeats } from './gamificationProgression.mjs';

const RANK_TITLES = getRankTitles();
const RANK_BY_KEY = new Map(RANK_TITLES.map((rank, index) => [rank.key, { ...rank, rankNumber: index + 1 }]));

const toFiniteNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

export function normalizeRankTitleKey(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function getEffectiveGamificationLevel({ points } = {}) {
  return Math.max(1, calculateLevel(toFiniteNumber(points)));
}

export function buildRankTitleDisplay(rank) {
  if (!rank) return null;
  const enriched = RANK_BY_KEY.get(rank.key) || rank;
  const rankNumber = enriched.rankNumber || 1;

  return {
    key: rank.key,
    name: rank.name,
    rankNumber,
    label: `Rank ${String(rankNumber).padStart(2, '0')} | ${rank.name}`,
    minLevel: rank.minLevel,
    maxLevel: rank.maxLevel,
    levelRange: rank.levelRange,
    color: rank.color,
  };
}

export function getRankTitleByKey(key) {
  const normalizedKey = normalizeRankTitleKey(key);
  return RANK_BY_KEY.get(normalizedKey) || null;
}

export function buildRankTitleSelectionPayload({ points, level, selectedRankTitleKey } = {}) {
  const currentLevel = getEffectiveGamificationLevel({ points, level });
  const currentRankKey = getTier(currentLevel);
  const currentRank = getRankTitleByKey(currentRankKey) || RANK_TITLES[0];
  const requestedSelectedRank = getRankTitleByKey(selectedRankTitleKey);
  const selectedRank = requestedSelectedRank && currentLevel >= requestedSelectedRank.minLevel
    ? requestedSelectedRank
    : currentRank;

  const rankTitles = RANK_TITLES.map((rank) => {
    const display = buildRankTitleDisplay(rank);
    const earned = currentLevel >= rank.minLevel;
    return {
      ...display,
      earned,
      isCurrent: rank.key === currentRank.key,
      isSelected: rank.key === selectedRank.key,
    };
  });

  const nextRank = RANK_TITLES.find((rank) => rank.minLevel > currentLevel) || null;
  const upcomingProgressionBeats = getUpcomingProgressionBeats({
    level: currentLevel,
    points: toFiniteNumber(points),
    count: 4
  });
  const nextMajorProgressionBeat = upcomingProgressionBeats.find((beat) => beat.type !== 'momentum')
    || upcomingProgressionBeats[0]
    || null;

  return {
    selectedRankTitleKey: selectedRank.key,
    selectedRankTitleDisplay: buildRankTitleDisplay(selectedRank),
    currentRankTitleDisplay: buildRankTitleDisplay(currentRank),
    rankTitles,
    earnedRankTitleCount: rankTitles.filter((rank) => rank.earned).length,
    nextRankTitleDisplay: nextRank ? buildRankTitleDisplay(nextRank) : null,
    upcomingProgressionBeats,
    nextMajorProgressionBeat,
  };
}

export function validateSelectedRankTitleKey(rawKey, levelContext = {}) {
  const normalizedKey = normalizeRankTitleKey(rawKey);

  if (!normalizedKey) {
    return { ok: false, status: 400, message: 'Rank title key is required' };
  }

  const rank = getRankTitleByKey(normalizedKey);
  if (!rank) {
    return { ok: false, status: 400, message: 'Rank title does not exist' };
  }

  const currentLevel = getEffectiveGamificationLevel(levelContext);
  if (currentLevel < rank.minLevel) {
    return {
      ok: false,
      status: 403,
      message: 'Rank title has not been earned yet',
      rankTitleDisplay: buildRankTitleDisplay(rank),
    };
  }

  return { ok: true, rankTitleKey: rank.key, rankTitleDisplay: buildRankTitleDisplay(rank) };
}
