/**
 * ============================================================================
 * FILE: tierCatalog.ts
 * PURPOSE: Frontend mirror of backend tier catalog — single source of truth
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-04-08
 * ============================================================================
 *
 * INTERNAL IDS (API contract): free | pro | elite
 * DISPLAY NAMES (UI copy):    Swan Starter | Swan Guardian | Crystalline Swan
 * SLUGS (CSS variants, URLs):  starter | guardian | crystalline
 */

// ─── Types ─────────────────────────────────────────────────────

export type TierId = 'free' | 'pro' | 'elite';
export type TierSlug = 'starter' | 'guardian' | 'crystalline';

export interface TierDisplay {
  id: TierId;
  name: string;
  slug: TierSlug;
}

// ─── Tier Rank (for comparison) ────────────────────────────────

export const TIER_RANK: Record<TierId, number> = {
  free: 0,
  pro: 1,
  elite: 2,
};

export function meetsMinimumTier(userTier: TierId, requiredTier: TierId): boolean {
  return (TIER_RANK[userTier] ?? 0) >= (TIER_RANK[requiredTier] ?? 0);
}

// ─── Display Mapping ───────────────────────────────────────────

export const TIER_DISPLAY: Record<TierId, TierDisplay> = {
  free:  { id: 'free',  name: 'Swan Starter',     slug: 'starter' },
  pro:   { id: 'pro',   name: 'Swan Guardian',    slug: 'guardian' },
  elite: { id: 'elite', name: 'Crystalline Swan', slug: 'crystalline' },
};

export function tierDisplayName(tierId: TierId): string {
  return TIER_DISPLAY[tierId]?.name ?? 'Unknown';
}

export function tierIdFromSlug(slug: TierSlug): TierId | null {
  for (const [id, meta] of Object.entries(TIER_DISPLAY)) {
    if (meta.slug === slug) return id as TierId;
  }
  return null;
}

export function tierSlug(tierId: TierId): TierSlug {
  return TIER_DISPLAY[tierId]?.slug ?? 'starter';
}

// ─── Feature Gates (mirrors backend FEATURE_GATES) ─────────────

export const FEATURE_GATES: Record<string, TierId> = {
  'coach.chat':           'free',
  'workout.log':          'free',
  'nutrition.basic':      'free',
  'social.feed':          'free',
  'gamification.basic':   'free',
  'charts.basic':         'free',
  'calculator.bmi':       'free',
  'pain.bodymap':         'free',
  'booking.sessions':     'free',

  'calculator.all':       'pro',
  'charts.full':          'pro',
  'analytics.advanced':   'pro',
  'nutrition.coaching':   'pro',
  'badge.generation':     'pro',

  'trainer.messaging':    'elite',
  'video.formcheck':      'elite',
  'content.studio':       'elite',
  'creator.economy':      'elite',
  'live.streaming':       'elite',
  'workout.planreview':   'elite',
};

export function hasFeatureAccess(userTier: TierId, featureKey: string): boolean {
  const requiredTier = FEATURE_GATES[featureKey] as TierId | undefined;
  if (!requiredTier) return true;
  return meetsMinimumTier(userTier, requiredTier);
}

// ─── Feature Display Labels ─────────────────────────────────

export const FEATURE_LABELS: Record<string, string> = {
  'coach.chat':           'Swan Coach',
  'workout.log':          'Workout Logging',
  'nutrition.basic':      'Nutrition Tracker',
  'social.feed':          'Social Feed',
  'gamification.basic':   'Gamification',
  'charts.basic':         'Progress Charts',
  'calculator.bmi':       'BMI Calculator',
  'pain.bodymap':         'Pain & Injury Map',
  'booking.sessions':     'Session Booking',
  'calculator.all':       'NASM Calculators',
  'charts.full':          'Canonical Progress Analytics',
  'analytics.advanced':   'Advanced Progress Analytics',
  'nutrition.coaching':   'AI Nutrition Coaching',
  'badge.generation':     'Badge Generation',
  'trainer.messaging':    'Trainer Messaging',
  'video.formcheck':      'Video Form Check',
  'content.studio':       'Content Studio',
  'creator.economy':      'Creator Economy',
  'live.streaming':       'Live Streaming',
  'workout.planreview':   'Workout Plan Review',
};

export function featureLabel(featureKey: string): string {
  return FEATURE_LABELS[featureKey] ?? 'Premium Feature';
}
