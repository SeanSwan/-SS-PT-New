/**
 * Deterministic SwanStudios progression-beat helpers.
 *
 * These beats do not grant rewards by themselves. They describe the dense
 * checkpoint cadence the UI, APIs, and AI context can reference without
 * pretending an admin-created badge or reward exists.
 */
import { MAX_LEVEL, getRankTitles, pointsForLevel } from './levelingAlgorithm.mjs';

const RANK_BY_UNLOCK_LEVEL = new Map(getRankTitles().map((rank) => [rank.minLevel, rank]));

const PROGRESSION_RULES = [
  {
    interval: 100,
    type: 'biome_chapter',
    label: 'Biome Chapter',
    reward: 'Open a major Swan biome arc',
    description: 'A lifetime checkpoint for training proof, profile identity, and team celebration.',
    intensity: 'chapter',
    priority: 5,
  },
  {
    interval: 50,
    type: 'skill_tree_surge',
    label: 'Skill Tree Surge',
    reward: 'Spotlight a training path push',
    description: 'A larger checkpoint for pushing one path such as Ironwood Flight or Vitality Grove.',
    intensity: 'surge',
    priority: 4,
  },
  {
    interval: 25,
    type: 'badge_showcase',
    label: 'Badge Showcase Charge',
    reward: 'Set a new badge showcase target',
    description: 'A profile-identity checkpoint that pairs naturally with earned badges.',
    intensity: 'surge',
    priority: 3,
  },
  {
    interval: 5,
    type: 'momentum',
    label: 'Momentum Checkpoint',
    reward: 'Mark the next training rhythm',
    description: 'A short-term checkpoint so progress feels active between major rank titles.',
    intensity: 'pulse',
    priority: 1,
  },
];

function toFiniteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeLevel(level) {
  const numericLevel = Math.floor(toFiniteNumber(level, 1));
  if (numericLevel <= 1) return 1;
  return Math.min(MAX_LEVEL, numericLevel);
}

function clampCount(count) {
  const numericCount = Math.floor(toFiniteNumber(count, 4));
  if (numericCount <= 0) return 4;
  return Math.min(8, numericCount);
}

function withPointFields(beat, currentPoints) {
  const pointsRequired = pointsForLevel(beat.level);
  const pointsRemaining = Math.max(0, pointsRequired - Math.max(0, toFiniteNumber(currentPoints)));

  return {
    ...beat,
    pointsRequired,
    pointsRemaining,
  };
}

function buildRankBeat(rank, points) {
  return withPointFields({
    key: 'rank-title-' + rank.key,
    level: rank.minLevel,
    type: 'rank_title',
    label: 'Rank Title Unlock',
    reward: 'Equip ' + rank.name,
    description: 'A new public Swan title becomes available for the profile tag.',
    intensity: 'title',
    priority: 2,
    rankTitleKey: rank.key,
    rankTitleName: rank.name,
  }, points);
}

function buildRuleBeat(rule, level, points) {
  return withPointFields({
    key: rule.type + '-' + level,
    level,
    type: rule.type,
    label: rule.label,
    reward: rule.reward,
    description: rule.description,
    intensity: rule.intensity,
    priority: rule.priority,
  }, points);
}

export function getProgressionBeatsForLevel(level, { points = 0 } = {}) {
  const normalizedLevel = normalizeLevel(level);
  const beats = [];
  const rank = RANK_BY_UNLOCK_LEVEL.get(normalizedLevel);

  if (rank && normalizedLevel > 1) {
    beats.push(buildRankBeat(rank, points));
  }

  for (const rule of PROGRESSION_RULES) {
    if (normalizedLevel > 1 && normalizedLevel % rule.interval === 0) {
      beats.push(buildRuleBeat(rule, normalizedLevel, points));
    }
  }

  return beats.sort((left, right) => right.priority - left.priority);
}

export function getUpcomingProgressionBeats({ level = 1, points = 0, count = 4 } = {}) {
  const currentLevel = normalizeLevel(level);
  const maxCount = clampCount(count);
  const upcoming = [];

  for (let nextLevel = currentLevel + 1; nextLevel <= MAX_LEVEL && upcoming.length < maxCount; nextLevel += 1) {
    const [primaryBeat] = getProgressionBeatsForLevel(nextLevel, { points });
    if (primaryBeat) {
      upcoming.push({
        ...primaryBeat,
        levelsAway: nextLevel - currentLevel,
      });
    }
  }

  return upcoming;
}