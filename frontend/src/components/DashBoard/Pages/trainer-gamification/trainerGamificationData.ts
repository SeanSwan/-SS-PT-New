export type TrainerTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  photo?: string;
  points: number;
  level: number;
  tier: TrainerTier;
  streakDays: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  pointValue: number;
  requirementType: string;
  requirementValue: number;
  tier: TrainerTier;
  isActive: boolean;
}

export interface PointReason {
  id: string;
  name: string;
  description: string;
  pointValue: number;
  icon: string;
}

export const MAX_TRAINER_POINT_AWARD = 500;

export const POINT_REASONS: PointReason[] = [
  { id: 'workout_completion', name: 'Workout Completion', description: 'Completed a workout session', pointValue: 50, icon: 'CheckCircle' },
  { id: 'exercise_completion', name: 'Exercise Completion', description: 'Completed an exercise', pointValue: 10, icon: 'Dumbbell' },
  { id: 'streak_bonus', name: 'Streak Bonus', description: 'Maintained a workout streak', pointValue: 20, icon: 'Zap' },
  { id: 'assessment_completion', name: 'Assessment Completion', description: 'Completed a fitness assessment', pointValue: 100, icon: 'Target' },
  { id: 'referral_bonus', name: 'Referral Bonus', description: 'Referred a new client', pointValue: 200, icon: 'Users' },
  { id: 'special_achievement', name: 'Special Achievement', description: 'Earned a special achievement', pointValue: 150, icon: 'Award' },
  { id: 'custom', name: 'Custom Reason', description: 'Custom reason for points', pointValue: 0, icon: 'Edit' },
];

export const asArray = (payload: unknown): unknown[] => {
  const row = payload as Record<string, unknown> | null | undefined;
  const data = row?.data as Record<string, unknown> | unknown[] | undefined;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(row?.clients)) return row.clients;
  if (Array.isArray(row?.achievements)) return row.achievements;
  if (Array.isArray(data)) return data;
  if (data && !Array.isArray(data) && Array.isArray(data.clients)) return data.clients;
  if (data && !Array.isArray(data) && Array.isArray(data.achievements)) return data.achievements;
  return [];
};

const unwrapProfile = (payload: unknown): Record<string, unknown> => {
  const row = payload as Record<string, unknown> | null | undefined;
  const data = row?.data as Record<string, unknown> | undefined;
  const profile = row?.profile as Record<string, unknown> | undefined;
  const dataProfile = data?.profile as Record<string, unknown> | undefined;
  return profile ?? dataProfile ?? data ?? row ?? {};
};

const cleanText = (value: string, maxLength = 140): string => (
  value
    .replace(/\p{Cc}/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
);

export const valueAsString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === 'string') {
      const cleaned = cleanText(value);
      if (cleaned) return cleaned;
    }
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
};

const DECIMAL_NUMBER_PATTERN = /^-?\d+(?:\.\d+)?$/;

const parseTrainerNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.trim();
    return DECIMAL_NUMBER_PATTERN.test(cleaned) ? Number(cleaned) : Number.NaN;
  }
  return Number.NaN;
};

const firstFiniteNumber = (...values: unknown[]): number | null => {
  for (const value of values) {
    const parsed = parseTrainerNumber(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

export const safeTrainerOptionalWholeNumber = (
  values: unknown[],
  floor = 0,
): number | null => {
  const parsed = firstFiniteNumber(...values);
  if (parsed === null) return null;
  return Math.max(floor, Math.trunc(parsed));
};

export const safeTrainerWholeNumber = (
  values: unknown[],
  fallback = 0,
  floor = 0,
): number => {
  return safeTrainerOptionalWholeNumber(values, floor) ?? Math.max(floor, fallback);
};

export const normalizeTrainerPointInput = (value: unknown): number => {
  const parsed = firstFiniteNumber(value);
  if (parsed === null) return 0;
  return Math.min(MAX_TRAINER_POINT_AWARD, Math.max(0, Math.trunc(parsed)));
};

export const isTrainerPointAwardAllowed = (value: unknown): boolean => {
  return typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 1
    && value <= MAX_TRAINER_POINT_AWARD;
};

export const getTrainerPointBalanceFallback = (value: unknown): Pick<Client, 'points'> | undefined => {
  const points = safeTrainerOptionalWholeNumber([value], 0);
  return points === null ? undefined : { points };
};

const normalizeTier = (tier: unknown): TrainerTier => {
  const key = String(tier || '').toLowerCase();
  if (key.includes('platinum') || key.includes('obsidian') || key.includes('crystalline')) return 'platinum';
  if (key.includes('gold') || key.includes('titanium')) return 'gold';
  if (key.includes('silver')) return 'silver';
  return 'bronze';
};

const usernameFromClient = (
  raw: Record<string, unknown>,
  profile: Record<string, unknown>,
  id: string,
): string => {
  const explicit = valueAsString(profile.username, raw.username);
  if (explicit) return explicit;

  const email = valueAsString(raw.email, profile.email);
  if (email.includes('@')) return email.split('@')[0];

  return `client-${id || 'unknown'}`;
};

export const mapClient = (rawPayload: unknown, profilePayload?: unknown): Client => {
  const raw = (rawPayload ?? {}) as Record<string, unknown>;
  const profile = unwrapProfile(profilePayload);
  const id = valueAsString(profile.id, profile.userId, raw.id, raw.userId);
  const firstName = valueAsString(profile.firstName, raw.firstName, 'Client');
  const lastName = valueAsString(profile.lastName, raw.lastName, id || 'Member');

  return {
    id,
    firstName,
    lastName,
    username: usernameFromClient(raw, profile, id),
    photo: valueAsString(profile.photo, raw.photo) || undefined,
    points: safeTrainerWholeNumber([profile.points, raw.points], 0, 0),
    level: safeTrainerWholeNumber([profile.level, raw.level], 1, 1),
    tier: normalizeTier(profile.tier ?? raw.tier),
    streakDays: safeTrainerWholeNumber([profile.streakDays, raw.streakDays], 0, 0),
  };
};

export const mapAchievement = (rawPayload: unknown): Achievement => {
  const raw = (rawPayload ?? {}) as Record<string, unknown>;
  return {
    id: valueAsString(raw.id, raw.achievementId),
    name: valueAsString(raw.name, raw.title, 'Achievement'),
    description: valueAsString(raw.description, raw.summary),
    icon: valueAsString(raw.icon, raw.iconEmoji, 'Award'),
    pointValue: safeTrainerWholeNumber([raw.pointValue, raw.xpReward, raw.pointsAwarded], 0, 0),
    requirementType: valueAsString(raw.requirementType, raw.category, 'custom'),
    requirementValue: safeTrainerWholeNumber([raw.requirementValue, raw.requiredPoints, raw.maxProgress], 1, 1),
    tier: normalizeTier(raw.tier ?? raw.rarity),
    isActive: raw.isActive !== false,
  };
};
