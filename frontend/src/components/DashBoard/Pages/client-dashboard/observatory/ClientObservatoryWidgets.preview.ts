import {
  type ChallengePreview,
  compactNumber,
  iconLabel,
  type LeaderboardPreview,
  clampPercent,
} from './ClientObservatoryData';

export interface AchievementPreview {
  id?: string | number;
  progress?: number;
  isCompleted?: boolean;
  achievement?: {
    name?: string;
    title?: string;
    icon?: string;
    iconEmoji?: string;
    pointValue?: number;
    xpReward?: number;
  };
}

export interface ObservatoryWidgetRow {
  key: string;
  label: string;
  value: string;
}

export const CONTROL_TEXT_PATTERN = /\p{Cc}/gu;

const MAX_LABEL_LENGTH = 64;
const DEFAULT_CHALLENGE_TITLE = 'No active challenge yet';
const DEFAULT_CHALLENGE_DESCRIPTION = 'Join a community challenge when you are ready to compete.';
const SAFE_TAG_PATTERN = /^#[a-z0-9_]{1,32}$/i;

export function cleanWidgetText(value: unknown, fallback: string, maxLength = MAX_LABEL_LENGTH): string {
  if (typeof value !== 'string' && typeof value !== 'number') return fallback;
  const clean = String(value)
    .replace(CONTROL_TEXT_PATTERN, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return fallback;
  return clean.length > maxLength ? `${clean.slice(0, maxLength - 3)}...` : clean;
}

function hashText(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

function uniqueKey(base: string, seen: Map<string, number>): string {
  const next = (seen.get(base) || 0) + 1;
  seen.set(base, next);
  return next === 1 ? base : `${base}-${next}`;
}

export function stableWidgetKey(
  scope: string,
  preferredId: unknown,
  parts: unknown[],
  seen: Map<string, number>,
): string {
  const id = cleanWidgetText(preferredId, '', 48);
  if (id) return uniqueKey(`${scope}-${id}`, seen);
  const fingerprint = parts.map((part) => cleanWidgetText(part, '', 48)).join('|') || scope;
  return uniqueKey(`${scope}-${hashText(fingerprint)}`, seen);
}

export function normalizeAchievementRows(achievements: AchievementPreview[]): ObservatoryWidgetRow[] {
  const rows: ObservatoryWidgetRow[] = [];
  const seen = new Map<string, number>();

  for (const item of achievements) {
    if (rows.length >= 3) break;
    const achievement = item.achievement || {};
    const label = cleanWidgetText(achievement.name || achievement.title, 'Achievement');
    const icon = cleanWidgetText(achievement.icon || achievement.iconEmoji, '', 12);
    const value = iconLabel(icon || undefined);
    rows.push({
      key: stableWidgetKey('achievement', item.id, [
        label,
        value,
        item.progress,
        item.isCompleted,
        achievement.pointValue,
        achievement.xpReward,
      ], seen),
      label,
      value,
    });
  }

  return rows;
}

function challengeProgress(challenge?: ChallengePreview): number {
  if (!challenge) return 0;
  if (typeof challenge.progress === 'number') return clampPercent(challenge.progress);
  if (typeof challenge.currentProgress === 'number' && typeof challenge.target === 'number' && challenge.target > 0) {
    return clampPercent((challenge.currentProgress / challenge.target) * 100);
  }
  return 0;
}

export function normalizeChallengeWidget(challenge?: ChallengePreview): {
  title: string;
  description: string;
  progress: number;
} {
  return {
    title: cleanWidgetText(challenge?.title || challenge?.name, DEFAULT_CHALLENGE_TITLE),
    description: cleanWidgetText(challenge?.description, DEFAULT_CHALLENGE_DESCRIPTION, 140),
    progress: challengeProgress(challenge),
  };
}

function leaderName(entry: LeaderboardPreview): string {
  const first = cleanWidgetText(entry.client?.firstName, '', 40);
  const last = cleanWidgetText(entry.client?.lastName, '', 40);
  const username = cleanWidgetText(entry.client?.username, '', 48);
  return [first, last].filter(Boolean).join(' ') || username || 'Athlete';
}

function leaderMetric(entry: LeaderboardPreview): number {
  const value = [entry.points, entry.overallLevel, entry.level].find((metric) => Number.isFinite(metric)) || 0;
  return Math.max(0, Math.round(value));
}

export function normalizeLeaderboardRows(leaderboard: LeaderboardPreview[]): ObservatoryWidgetRow[] {
  const rows: ObservatoryWidgetRow[] = [];
  const seen = new Map<string, number>();

  for (const entry of leaderboard) {
    if (rows.length >= 3) break;
    const name = leaderName(entry);
    const metric = leaderMetric(entry);
    rows.push({
      key: stableWidgetKey('leader', entry.userId, [name, metric, entry.overallLevel, entry.level], seen),
      label: `${rows.length + 1}. ${name}`,
      value: compactNumber(metric),
    });
  }

  return rows;
}

export function normalizeTagRows(tags: string[]): ObservatoryWidgetRow[] {
  const rows: ObservatoryWidgetRow[] = [];
  const seen = new Map<string, number>();
  const seenLabels = new Set<string>();

  for (const tag of tags) {
    if (rows.length >= 5) break;
    const clean = cleanWidgetText(tag, '', 40).toLowerCase();
    const label = clean.startsWith('#') ? clean : `#${clean}`;
    if (!SAFE_TAG_PATTERN.test(label) || seenLabels.has(label)) continue;
    seenLabels.add(label);
    rows.push({
      key: stableWidgetKey('tag', undefined, [label], seen),
      label,
      value: 'tag',
    });
  }

  return rows.length > 0 ? rows : [{
    key: 'tags-empty',
    label: 'No tags yet',
    value: '--',
  }];
}
