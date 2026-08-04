/**
 * myEquipmentPatterns — pure movement-pattern grouping + self-serve profile rules
 * ===============================================================================
 * Powers the client/user "My Equipment" surface (blueprint §4.3, §10a #7):
 * inventory is grouped by movement pattern ("Pulling — pull-up bar, loop bands")
 * so the surface teaches the Equipment IQ model implicitly. AI-provided
 * `aiScanData.movementPatterns` wins when present; otherwise a category
 * heuristic fills in. Also mirrors the S4 API rules for client/user profile
 * creation (home/park/custom only, max 3) so users never see a 400.
 */
import type { EquipmentItem, EquipmentProfile } from '../../hooks/useEquipmentAPI';

export const MOVEMENT_PATTERNS = ['push', 'pull', 'hinge', 'squat', 'lunge', 'carry', 'core'] as const;
export type MovementPattern = (typeof MOVEMENT_PATTERNS)[number];
export type PatternKey = MovementPattern | 'none';

export const PATTERN_LABELS: Record<PatternKey, string> = {
  push: 'Pushing',
  pull: 'Pulling',
  hinge: 'Hinging',
  squat: 'Squatting',
  lunge: 'Lunging',
  carry: 'Carrying',
  core: 'Core',
  none: 'Everything else',
};

/**
 * Category → pattern heuristic — used when the scan did not report movement
 * patterns. Categories not listed here map to none ('Everything else').
 */
export const CATEGORY_PATTERN_MAP: Record<string, MovementPattern[]> = {
  dumbbell: ['push', 'pull', 'hinge', 'squat', 'lunge', 'carry'],
  resistance_band: ['push', 'pull', 'core'],
  bench: ['push'],
  pull_up_bar: ['pull', 'core'],
  kettlebell: ['hinge', 'carry'],
  barbell: ['push', 'pull', 'hinge', 'squat'],
  cardio: [],
  other: [],
};

const normalizePattern = (value: string): MovementPattern | null => {
  const cleaned = value.toLowerCase().replace(/[^a-z]/g, '');
  return MOVEMENT_PATTERNS.find((pattern) => cleaned.startsWith(pattern)) ?? null;
};

/**
 * AI-provided patterns win when at least one normalizes to a known pattern
 * ("Pulling" → pull); otherwise fall back to the category heuristic.
 */
export function getItemPatterns(item: Pick<EquipmentItem, 'category' | 'aiScanData'>): MovementPattern[] {
  const aiPatterns = item.aiScanData?.movementPatterns;
  if (Array.isArray(aiPatterns) && aiPatterns.length > 0) {
    const normalized = aiPatterns
      .filter((value): value is string => typeof value === 'string')
      .map(normalizePattern)
      .filter((pattern): pattern is MovementPattern => pattern !== null);
    if (normalized.length > 0) return [...new Set(normalized)];
  }
  return CATEGORY_PATTERN_MAP[item.category] ?? [];
}

/** Items the surface shows: everything except rejected/archived rows. */
export function getVisibleItems(items: EquipmentItem[]): EquipmentItem[] {
  return items.filter((item) => item.approvalStatus !== 'rejected' && item.isActive !== false);
}

export interface PatternGroup {
  pattern: PatternKey;
  label: string;
  items: EquipmentItem[];
}

/**
 * Ordered groups (canonical 7-pattern order, 'none' last). An item appears
 * under every pattern it serves; patternless items land in 'none'. Empty
 * groups are omitted.
 */
export function groupItemsByPattern(items: EquipmentItem[]): PatternGroup[] {
  const buckets = new Map<PatternKey, EquipmentItem[]>();
  for (const item of items) {
    const patterns = getItemPatterns(item);
    const keys: PatternKey[] = patterns.length > 0 ? patterns : ['none'];
    for (const key of keys) {
      const bucket = buckets.get(key) ?? [];
      bucket.push(item);
      buckets.set(key, bucket);
    }
  }
  const order: PatternKey[] = [...MOVEMENT_PATTERNS, 'none'];
  return order
    .filter((key) => (buckets.get(key)?.length ?? 0) > 0)
    .map((key) => ({ pattern: key, label: PATTERN_LABELS[key], items: buckets.get(key) ?? [] }));
}

/** Which of the 7 patterns the visible inventory covers (coverage dots). */
export function getPatternCoverage(items: EquipmentItem[]): Record<MovementPattern, boolean> {
  const coverage = Object.fromEntries(
    MOVEMENT_PATTERNS.map((pattern) => [pattern, false]),
  ) as Record<MovementPattern, boolean>;
  for (const item of items) {
    for (const pattern of getItemPatterns(item)) coverage[pattern] = true;
  }
  return coverage;
}

// ── Self-serve profile rules (client-side mirror of the S4 backend policy) ──

export const USER_LOCATION_TYPES = ['home', 'park', 'custom'] as const;
export type UserLocationType = (typeof USER_LOCATION_TYPES)[number];
export const USER_PROFILE_CAP = 3;

export const USER_LOCATION_LABELS: Record<UserLocationType, string> = {
  home: 'Home',
  park: 'Park / Outdoor',
  custom: 'Somewhere else',
};

export function isUserLocationType(value: string): value is UserLocationType {
  return (USER_LOCATION_TYPES as readonly string[]).includes(value);
}

export interface ProfileCapState {
  atCap: boolean;
  remaining: number;
}

export function getProfileCapState(profiles: Pick<EquipmentProfile, 'id'>[]): ProfileCapState {
  const remaining = Math.max(0, USER_PROFILE_CAP - profiles.length);
  return { atCap: remaining === 0, remaining };
}
