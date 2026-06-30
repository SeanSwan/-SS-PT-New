/**
 * ============================================================================
 * FILE: tierCatalog.mjs
 * PURPOSE: Single source of truth for subscription tier definitions
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-04-08
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Central mapping between internal tier IDs (free/pro/elite) and
 * user-facing display names (Swan Starter/Swan Guardian/Crystalline Swan).
 * All tier metadata — features, pricing, gating rules, billing mode —
 * lives here. Every other file imports from this catalog.
 *
 * INTERNAL IDS (database, JWT, API): free | pro | elite
 * DISPLAY NAMES (UI, copy): Swan Starter | Swan Guardian | Crystalline Swan
 * SLUGS (URLs, CSS variants): starter | guardian | crystalline
 *
 * BILLING MODES:
 *   Guardian (pro)  = Stripe mode:payment (one-time donation)
 *   Crystalline (elite) = Stripe mode:subscription (recurring $24.99/mo)
 */

// ─────────────────────────────────────────────────────────────
// SECTION: Tier Hierarchy (for comparison logic)
// ─────────────────────────────────────────────────────────────
export const TIER_RANK = { free: 0, pro: 1, elite: 2 };

/**
 * Check if a user's tier meets or exceeds a minimum tier requirement.
 * @param {string} userTier - The user's current tier ID
 * @param {string} requiredTier - The minimum tier required
 * @returns {boolean}
 */
export function meetsMinimumTier(userTier, requiredTier) {
  return (TIER_RANK[userTier] ?? 0) >= (TIER_RANK[requiredTier] ?? 0);
}

// ─────────────────────────────────────────────────────────────
// SECTION: Display Name Mapping
// ─────────────────────────────────────────────────────────────
export const TIER_DISPLAY = {
  free:  { name: 'Swan Starter',     slug: 'starter' },
  pro:   { name: 'Swan Guardian',    slug: 'guardian' },
  elite: { name: 'Crystalline Swan', slug: 'crystalline' },
};

/** Map a slug (starter/guardian/crystalline) back to internal ID */
export function slugToTierId(slug) {
  for (const [id, meta] of Object.entries(TIER_DISPLAY)) {
    if (meta.slug === slug) return id;
  }
  return null;
}

/** Map an internal ID to its display name */
export function tierDisplayName(tierId) {
  return TIER_DISPLAY[tierId]?.name ?? 'Unknown';
}

// ─────────────────────────────────────────────────────────────
// SECTION: Full Tier Definitions
// ─────────────────────────────────────────────────────────────
export const TIER_DEFINITIONS = {
  free: {
    id: 'free',
    name: 'Swan Starter',
    slug: 'starter',
    tagline: 'Swan Coach, workout logging, nutrition — free forever',
    price: 0,
    priceDisplay: 'Free',
    billingMode: null,
    features: [
      'Swan Coach conversations (unlimited)',
      'Coach-designed workout plans (unlimited, with review flow)',
      'Workout logging (unlimited)',
      'Nutrition & macro counter',
      'Exercise library (840+ exercises)',
      'Social feed & community',
      'Gamification (XP, levels, badges, streaks)',
      'Basic progress summaries and workout stats',
      'BMI calculator',
      'Pain & injury body map',
      'Session booking',
      '30-day trial of premium Swan Guardian and Crystalline features',
    ],
    limits: {
      aiMessagesPerMonth: Infinity,
      aiGenerationsPerMonth: Infinity,
    },
  },
  pro: {
    id: 'pro',
    name: 'Swan Guardian',
    slug: 'guardian',
    tagline: 'Support the mission — unlock advanced tools & analytics',
    price: 5,
    priceDisplay: 'Pay what you can (suggested $5)',
    billingMode: 'payment',
    donationBased: true,
    minimumPrice: 1,
    maximumPrice: 50.00,
    suggestedPrice: 5,
    features: [
      'Everything in Swan Starter',
      'All 4 NASM calculators (1RM, TDEE, Body Fat %, BMI)',
      'Canonical 12-chart progress analytics cockpit',
      'Detailed NASM analytics dashboard',
      'AI Nutrition coaching (meal planning, food intelligence)',
      'Advanced progress analytics & insights',
      'Swan Guardian badge (Rare — Gilded Fern)',
      'Priority in community challenges',
      'Support keeps SwanStudios free for everyone',
    ],
    donationTiers: [
      { minAmount: 1,    maxAmount: 4.99,  label: 'Supporter' },
      { minAmount: 5,    maxAmount: 9.99,  label: 'Champion' },
      { minAmount: 10,   maxAmount: 24.99, label: 'Hero' },
      { minAmount: 25,   maxAmount: 50,    label: 'Legendary Patron' },
    ],
    limits: {
      aiMessagesPerMonth: Infinity,
      aiGenerationsPerMonth: Infinity,
    },
  },
  elite: {
    id: 'elite',
    name: 'Crystalline Swan',
    slug: 'crystalline',
    tagline: 'Human trainer access — your personal coach in your pocket',
    price: 24.99,
    priceDisplay: '$24.99/mo',
    annualPrice: 249.99,
    annualPriceDisplay: '$249.99/yr (save $50)',
    billingMode: 'subscription',
    stripePriceId: null,
    features: [
      'Everything in Swan Guardian',
      'Direct trainer messaging (async chat with your trainer)',
      'Video form check submissions (48h feedback)',
      'Monthly custom workout plan review',
      'Content Studio access',
      'Creator Economy access',
      'Live streaming (create broadcasts)',
      'Crystalline Swan badge (Epic — Wing Purple)',
      'Priority scheduling for sessions',
      'Exclusive trainer Q&A sessions',
    ],
    limits: {
      aiMessagesPerMonth: Infinity,
      aiGenerationsPerMonth: Infinity,
    },
  },
};

// ─────────────────────────────────────────────────────────────
// SECTION: Feature Gating Map
// Maps feature keys to minimum required tier
// ─────────────────────────────────────────────────────────────
export const FEATURE_GATES = {
  // Free tier (available to all)
  'coach.chat':           'free',
  'workout.log':          'free',
  'nutrition.basic':      'free',
  'social.feed':          'free',
  'gamification.basic':   'free',
  'charts.basic':         'free',
  'calculator.bmi':       'free',
  'pain.bodymap':         'free',
  'booking.sessions':     'free',

  // Guardian tier (pro)
  'calculator.all':       'pro',
  'charts.full':          'pro',
  'analytics.advanced':   'pro',
  'nutrition.coaching':   'pro',
  'badge.generation':     'pro',

  // Crystalline tier (elite)
  'trainer.messaging':    'elite',
  'video.formcheck':      'elite',
  'content.studio':       'elite',
  'creator.economy':      'elite',
  'live.streaming':       'elite',
  'workout.planreview':   'elite',
};

/**
 * Check if a tier has access to a specific feature.
 * @param {string} userTier - The user's current tier ID
 * @param {string} featureKey - The feature key from FEATURE_GATES
 * @returns {boolean}
 */
export function hasFeatureAccess(userTier, featureKey) {
  const requiredTier = FEATURE_GATES[featureKey];
  if (!requiredTier) return true;
  return meetsMinimumTier(userTier, requiredTier);
}

// ─────────────────────────────────────────────────────────────
// SECTION: Feature Display Labels (human-readable names)
// Maps feature keys to user-facing strings for paywall UI
// ─────────────────────────────────────────────────────────────
export const FEATURE_LABELS = {
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
  'charts.full':          'Advanced Analytics Gallery',
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

/**
 * Get a human-readable label for a feature key.
 * Falls back to a title-cased version of the key if not mapped.
 */
export function featureLabel(featureKey) {
  return FEATURE_LABELS[featureKey] ?? 'Premium Feature';
}

// ─────────────────────────────────────────────────────────────
// SECTION: Convenience Exports
// ─────────────────────────────────────────────────────────────
export const TIER_IDS = /** @type {const} */ (['free', 'pro', 'elite']);
export const TIER_SLUGS = /** @type {const} */ (['starter', 'guardian', 'crystalline']);
