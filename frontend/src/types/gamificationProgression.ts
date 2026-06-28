/**
 * Client-side progression-beat helpers for dense SwanStudios leveling previews.
 * Mirrors backend/utils/gamificationProgression.mjs.
 */
import { MAX_LEVEL, getRankTitles, pointsForLevel } from './gamification';

export type ProgressionBeatType =
  | 'rank_title'
  | 'badge_showcase'
  | 'skill_tree_surge'
  | 'biome_chapter'
  | 'momentum';

export type ProgressionBeatIntensity = 'pulse' | 'surge' | 'chapter' | 'title';

export interface ProgressionBeat {
  key: string;
  level: number;
  type: ProgressionBeatType;
  label: string;
  reward: string;
  description: string;
  intensity: ProgressionBeatIntensity;
  priority: number;
  pointsRequired: number;
  pointsRemaining: number;
  levelsAway?: number;
  rankTitleKey?: string;
  rankTitleName?: string;
}

interface UpcomingProgressionBeatOptions {
  level?: number;
  points?: number;
  count?: number;
}

const RANK_BY_UNLOCK_LEVEL = new Map(getRankTitles().map((rank) => [rank.minLevel, rank]));

const PROGRESSION_RULES = [
  {
    interval: 100,
    type: 'biome_chapter' as const,
    label: 'Biome Chapter',
    reward: 'Open a major Swan biome arc',
    description: 'A lifetime checkpoint for training proof, profile identity, and team celebration.',
    intensity: 'chapter' as const,
    priority: 5,
  },
  {
    interval: 50,
    type: 'skill_tree_surge' as const,
    label: 'Skill Tree Surge',
    reward: 'Spotlight a training path push',
    description: 'A larger checkpoint for pushing one path such as Ironwood Flight or Vitality Grove.',
    intensity: 'surge' as const,
    priority: 4,
  },
  {
    interval: 25,
    type: 'badge_showcase' as const,
    label: 'Badge Showcase Charge',
    reward: 'Set a new badge showcase target',
    description: 'A profile-identity checkpoint that pairs naturally with earned badges.',
    intensity: 'surge' as const,
    priority: 3,
  },
  {
    interval: 5,
    type: 'momentum' as const,
    label: 'Momentum Checkpoint',
    reward: 'Mark the next training rhythm',
    description: 'A short-term checkpoint so progress feels active between major rank titles.',
    intensity: 'pulse' as const,
    priority: 1,
  },
];

function toFiniteNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeProgressionLevel(level: unknown): number {
  const numericLevel = Math.floor(toFiniteNumber(level, 1));
  if (numericLevel <= 1) return 1;
  return Math.min(MAX_LEVEL, numericLevel);
}

function clampCount(count: unknown): number {
  const numericCount = Math.floor(toFiniteNumber(count, 4));
  if (numericCount <= 0) return 4;
  return Math.min(8, numericCount);
}

function withPointFields<T extends Omit<ProgressionBeat, 'pointsRequired' | 'pointsRemaining'>>(
  beat: T,
  currentPoints: unknown,
): ProgressionBeat {
  const pointsRequired = pointsForLevel(beat.level);
  const pointsRemaining = Math.max(0, pointsRequired - Math.max(0, toFiniteNumber(currentPoints)));

  return {
    ...beat,
    pointsRequired,
    pointsRemaining,
  };
}

export function getProgressionBeatsForLevel(level: number, options: { points?: number } = {}): ProgressionBeat[] {
  const normalizedLevel = normalizeProgressionLevel(level);
  const beats: ProgressionBeat[] = [];
  const rank = RANK_BY_UNLOCK_LEVEL.get(normalizedLevel);

  if (rank && normalizedLevel > 1) {
    beats.push(withPointFields({
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
    }, options.points));
  }

  PROGRESSION_RULES.forEach((rule) => {
    if (normalizedLevel > 1 && normalizedLevel % rule.interval === 0) {
      beats.push(withPointFields({
        key: rule.type + '-' + normalizedLevel,
        level: normalizedLevel,
        type: rule.type,
        label: rule.label,
        reward: rule.reward,
        description: rule.description,
        intensity: rule.intensity,
        priority: rule.priority,
      }, options.points));
    }
  });

  return beats.sort((left, right) => right.priority - left.priority);
}

export function getUpcomingProgressionBeats({
  level = 1,
  points = 0,
  count = 4,
}: UpcomingProgressionBeatOptions = {}): ProgressionBeat[] {
  const currentLevel = normalizeProgressionLevel(level);
  const maxCount = clampCount(count);
  const upcoming: ProgressionBeat[] = [];

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