/**
 * Runtime guards for rank-title fields returned by the gamification profile API.
 */
import type { GamificationProfile, ProgressionBeatOption, RankTitleOption } from './gamificationLegacyTypes';
import { firstNonNegativeNumber, isRecord, safeText } from './gamificationMapperGuards';

const mapRankTitleOption = (value: unknown): RankTitleOption | null => {
  if (!isRecord(value)) return null;

  const key = safeText(value.key);
  const name = safeText(value.name);
  const rankNumber = firstNonNegativeNumber(value.rankNumber);
  const minLevel = firstNonNegativeNumber(value.minLevel);
  const maxLevel = firstNonNegativeNumber(value.maxLevel);
  const levelRange = safeText(value.levelRange);
  const color = safeText(value.color);

  if (!key || !name || rankNumber <= 0 || minLevel <= 0 || maxLevel < minLevel || !levelRange) {
    return null;
  }

  const fallbackLabel = `Rank ${String(rankNumber).padStart(2, '0')} | ${name}`;

  return {
    key,
    name,
    rankNumber,
    label: safeText(value.label) ?? fallbackLabel,
    minLevel,
    maxLevel,
    levelRange,
    ...(color ? { color } : {}),
    ...(value.earned === true ? { earned: true } : value.earned === false ? { earned: false } : {}),
    ...(value.isCurrent === true ? { isCurrent: true } : value.isCurrent === false ? { isCurrent: false } : {}),
    ...(value.isSelected === true ? { isSelected: true } : value.isSelected === false ? { isSelected: false } : {}),
  };
};

const mapRankTitleList = (value: unknown): RankTitleOption[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const mapped = value
    .map(mapRankTitleOption)
    .filter((rank): rank is RankTitleOption => rank !== null);
  return mapped.length ? mapped : undefined;
};

const mapOptionalRankTitle = (value: unknown): RankTitleOption | undefined => (
  mapRankTitleOption(value) ?? undefined
);

const PROGRESSION_BEAT_TYPES = new Set(['rank_title', 'badge_showcase', 'skill_tree_surge', 'biome_chapter', 'momentum']);
const PROGRESSION_BEAT_INTENSITIES = new Set(['pulse', 'surge', 'chapter', 'title']);

const mapProgressionBeatOption = (value: unknown): ProgressionBeatOption | null => {
  if (!isRecord(value)) return null;

  const key = safeText(value.key);
  const type = safeText(value.type);
  const label = safeText(value.label);
  const reward = safeText(value.reward);
  const description = safeText(value.description);
  const intensity = safeText(value.intensity);
  const level = firstNonNegativeNumber(value.level);
  const pointsRequired = firstNonNegativeNumber(value.pointsRequired);
  const pointsRemaining = firstNonNegativeNumber(value.pointsRemaining);
  const levelsAway = firstNonNegativeNumber(value.levelsAway);
  const rankTitleKey = safeText(value.rankTitleKey);
  const rankTitleName = safeText(value.rankTitleName);

  if (
    !key
    || !type
    || !PROGRESSION_BEAT_TYPES.has(type)
    || !label
    || !reward
    || !description
    || !intensity
    || !PROGRESSION_BEAT_INTENSITIES.has(intensity)
    || level <= 0
    || pointsRequired <= 0
  ) {
    return null;
  }

  return {
    key,
    level,
    type: type as ProgressionBeatOption['type'],
    label,
    reward,
    description,
    intensity: intensity as ProgressionBeatOption['intensity'],
    pointsRequired,
    pointsRemaining,
    ...(levelsAway > 0 ? { levelsAway } : {}),
    ...(rankTitleKey ? { rankTitleKey } : {}),
    ...(rankTitleName ? { rankTitleName } : {}),
  };
};

const mapProgressionBeatList = (value: unknown): ProgressionBeatOption[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const mapped = value
    .map(mapProgressionBeatOption)
    .filter((beat): beat is ProgressionBeatOption => beat !== null);
  return mapped.length ? mapped : undefined;
};

const mapOptionalProgressionBeat = (value: unknown): ProgressionBeatOption | undefined => (
  mapProgressionBeatOption(value) ?? undefined
);

export function mapRankTitlePayloadFields(raw: Record<string, unknown>): Partial<GamificationProfile> {
  const rankTitles = mapRankTitleList(raw.rankTitles);
  const selectedRankTitleDisplay = mapOptionalRankTitle(raw.selectedRankTitleDisplay);
  const currentRankTitleDisplay = mapOptionalRankTitle(raw.currentRankTitleDisplay);
  const nextRankTitleDisplay = raw.nextRankTitleDisplay === null
    ? null
    : mapOptionalRankTitle(raw.nextRankTitleDisplay);
  const selectedRankTitleKey = safeText(raw.selectedRankTitleKey) ?? selectedRankTitleDisplay?.key;
  const earnedRankTitleCount = firstNonNegativeNumber(raw.earnedRankTitleCount);
  const upcomingProgressionBeats = mapProgressionBeatList(raw.upcomingProgressionBeats);
  const nextMajorProgressionBeat = raw.nextMajorProgressionBeat === null
    ? null
    : mapOptionalProgressionBeat(raw.nextMajorProgressionBeat);

  return {
    ...(selectedRankTitleKey ? { selectedRankTitleKey } : {}),
    ...(selectedRankTitleDisplay ? { selectedRankTitleDisplay } : {}),
    ...(currentRankTitleDisplay ? { currentRankTitleDisplay } : {}),
    ...(rankTitles ? { rankTitles } : {}),
    ...(earnedRankTitleCount > 0 ? { earnedRankTitleCount } : {}),
    ...(nextRankTitleDisplay !== undefined ? { nextRankTitleDisplay } : {}),
    ...(upcomingProgressionBeats ? { upcomingProgressionBeats } : {}),
    ...(nextMajorProgressionBeat !== undefined ? { nextMajorProgressionBeat } : {}),
  };
}
