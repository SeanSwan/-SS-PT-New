type RecordValue = Record<string, unknown>;

const DISPLAY_TEXT_MAX = 83;
const CONTROL_CHARS = /\p{Cc}/gu;
const WHITESPACE = /\s+/g;

const asRecord = (value: unknown): RecordValue =>
  value && typeof value === 'object' ? (value as RecordValue) : {};

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const DECIMAL_NUMBER_PATTERN = /^-?\d+(?:\.\d+)?$/;

const parseDisplayNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!DECIMAL_NUMBER_PATTERN.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const toFiniteNumber = (value: unknown, fallback = 0) => {
  const parsed = parseDisplayNumber(value);
  return parsed === null ? fallback : parsed;
};

const toRoundedNumber = (value: unknown): number => {
  const parsed = parseDisplayNumber(value);
  return parsed === null ? 0 : Math.round(parsed);
};

const toNonNegativeRoundedNumber = (value: unknown): number | null => {
  const parsed = parseDisplayNumber(value);
  if (parsed === null || parsed < 0) return null;
  return Math.round(parsed);
};

export const formatGamificationNumber = (value?: unknown) =>
  Math.max(0, Math.round(toFiniteNumber(value, 0))).toLocaleString();

export const formatGamificationLevel = (value?: unknown) =>
  Math.max(1, Math.round(toFiniteNumber(value, 1))).toLocaleString();

export const clampGamificationPercent = (value?: unknown) =>
  Math.max(0, Math.min(100, Math.round(toFiniteNumber(value, 0))));

export const formatGamificationRank = (rank?: unknown) => {
  const safeRank = Math.round(toFiniteNumber(rank, 0));
  if (safeRank < 1) return 'Not ranked';
  const mod10 = safeRank % 10;
  const mod100 = safeRank % 100;
  const suffix = mod10 === 1 && mod100 !== 11 ? 'st' : mod10 === 2 && mod100 !== 12 ? 'nd' : mod10 === 3 && mod100 !== 13 ? 'rd' : 'th';
  return `${safeRank}${suffix}`;
};

export const cleanGamificationText = (
  value: unknown,
  fallback: string,
  maxLength = DISPLAY_TEXT_MAX,
) => {
  const cleaned = asString(value).replace(CONTROL_CHARS, ' ').replace(WHITESPACE, ' ').trim();
  const safeText = cleaned || fallback;

  if (safeText.length <= maxLength) return safeText;

  return `${safeText.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
};

const cleanKeyPart = (value: unknown): string =>
  cleanGamificationText(value, '', 64)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const stableHash = (parts: unknown[]): string => {
  const source = parts.map((part) => cleanKeyPart(part)).filter(Boolean).join('|') || 'leaderboard-row';
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
};

export const getAchievementName = (item: unknown) => {
  const record = asRecord(item);
  const achievement = asRecord(record.achievement);
  return cleanGamificationText(
    achievement.name || achievement.title || record.name || record.title,
    'Achievement'
  );
};

export const getAchievementDescription = (item: unknown) => {
  const record = asRecord(item);
  const achievement = asRecord(record.achievement);
  const fallback = `${formatGamificationNumber(record.pointsAwarded)} XP awarded`;
  return cleanGamificationText(achievement.description || record.description, fallback);
};

export const getRewardName = (item: unknown) => {
  const record = asRecord(item);
  const reward = asRecord(record.reward);
  return cleanGamificationText(reward.name || record.name, 'Reward');
};

export const getRewardPointCost = (item: unknown) => {
  const record = asRecord(item);
  return (
    toNonNegativeRoundedNumber(record.pointsCost)
    ?? toNonNegativeRoundedNumber(record.pointCost)
    ?? 0
  );
};

export const getTransactionDescription = (item: unknown) => {
  const record = asRecord(item);
  return cleanGamificationText(record.description || record.source, 'XP activity');
};

export const getTransactionPointLabel = (item: unknown) => {
  const record = asRecord(item);
  const amount = toRoundedNumber(record.points);
  if (amount === 0) return '0 XP';

  const transactionType = asString(record.transactionType).toLowerCase();
  const isDebit = amount < 0 || transactionType === 'spend' || transactionType === 'expire';
  const prefix = isDebit ? '-' : '+';
  return `${prefix}${Math.abs(amount).toLocaleString()} XP`;
};

export const getLeaderboardClientName = (entry: unknown) => {
  const record = asRecord(entry);
  const client = asRecord(record.client);
  const firstName = cleanGamificationText(client.firstName || record.firstName, '', 40);
  const lastName = cleanGamificationText(client.lastName || record.lastName, '', 40);
  const directName = cleanGamificationText(record.name || record.fullName || record.username, '', 83);
  return cleanGamificationText(`${firstName} ${lastName}`.trim() || directName, 'Client');
};

export const getLeaderboardLevel = (entry: unknown) => {
  const record = asRecord(entry);
  return Math.max(1, Math.round(toFiniteNumber(record.overallLevel ?? record.level, 1)));
};

export const getLeaderboardRowKey = (entry: unknown, rankIndex: number) => {
  const record = asRecord(entry);
  const client = asRecord(record.client);
  const explicitId = record.userId ?? record.id ?? client.id;
  const cleanId = cleanKeyPart(explicitId);

  if (cleanId) return `leaderboard-${cleanId}`;

  return `leaderboard-${stableHash([
    getLeaderboardClientName(entry),
    record.overallLevel,
    record.points,
    rankIndex,
  ])}`;
};
