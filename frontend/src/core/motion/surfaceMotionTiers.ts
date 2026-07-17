/**
 * surfaceMotionTiers.ts — the M0–M3 motion LICENCE map (policy layer).
 *
 * WHY THIS EXISTS
 * The design ratification (DESIGN-RATIFICATION-FINAL-2026-07-16.md) requires that data, money and
 * legal lanes are *guaranteed* calm — not calm by convention. A rule-26 receipt found FOUR
 * disconnected motion concepts already in the tree (useAnimationTier, PerformanceTierProvider,
 * UniversalThemeContext.motionEnabled, ScopedLensFrame.motionMode) and ZERO encoding of M0–M3
 * budgets. This file adds the missing POLICY, not a fifth detector.
 *
 * THE SPLIT (read this before adding anything here)
 *   - CAPABILITY = what the device/user can afford  → owned by useAnimationTier() ('essential' | 'balanced' | 'full')
 *   - LICENCE    = what the surface is ALLOWED      → owned by this map (M0..M3)
 *   - EFFECTIVE  = min(capability, licence)         → resolved by useSurfaceMotion()
 * A surface can never exceed its licence, however powerful the device. A device can never be pushed
 * past its capability, however generous the licence. Both directions matter.
 *
 * WHY A MAP AND NOT A PROP: a prop can be forgotten at one call-site and the calm-zone promise dies
 * silently. The map is the single place the answer lives, and unlisted surfaces fail SAFE (M0).
 */

/** Motion licence tiers. Higher = more motion permitted. Ordering is load-bearing (see clampToLicence). */
export const MOTION_TIERS = ['M0', 'M1', 'M2', 'M3'] as const;
export type MotionTier = (typeof MOTION_TIERS)[number];

/** Device/user capability, as already detected by useAnimationTier(). */
export type AnimationCapability = 'essential' | 'balanced' | 'full';

/**
 * Surface licences. Ratified per DESIGN-RATIFICATION-FINAL §1 (world layer on a dimmer):
 *   marketing = world at FULL · dashboards = world at WHISPER · store/showcase = LOW · legal/money = OFF
 *
 * M0 = no motion beyond instant state change (legal, money, anything a mistake is expensive on)
 * M1 = essential feedback only (focus, hover, disclosure) — data-dense command surfaces
 * M2 = M1 + restrained reveals/transitions — working surfaces that should feel alive but never busy
 * M3 = M2 + cinematic atmosphere/parallax/scroll beats — conversion surfaces only
 */
export const SURFACE_MOTION_TIERS = {
  // ── Marketing (conversion — the world sings here) ──
  'marketing.home': 'M3',
  'marketing.about': 'M3',
  'marketing.contact': 'M2', // a form is a task; keep the lane calm around it

  // ── Showcase (the world frames content; content stays the hero) ──
  'store.browse': 'M2',
  'gallery.photography': 'M2',
  'video.library': 'M2',

  // ── Product dashboards (the world whispers; the job reads first) ──
  'dashboard.user': 'M2',
  'dashboard.client': 'M2',
  'dashboard.trainer': 'M1', // coach command centre — density and speed outrank delight
  'dashboard.admin': 'M1', // intervention queues; authority over atmosphere

  // ── M0 lanes: motion here is a liability, not a feature ──
  'store.checkout': 'M0', // money path — behaviour frozen
  'legal.waiver': 'M0', // legal flow — zero added friction, zero distraction
  'admin.finance': 'M0', // business truth
  'coach.assistant': 'M0', // operator surface — calm zone forever (motion.md §4)
} as const satisfies Record<string, MotionTier>;

export type SurfaceId = keyof typeof SURFACE_MOTION_TIERS;

/** Unlisted surfaces fail SAFE. A forgotten registration must never buy motion. */
export const DEFAULT_SURFACE_TIER: MotionTier = 'M0';

export function licenceFor(surface: SurfaceId | (string & Record<never, never>)): MotionTier {
  return (SURFACE_MOTION_TIERS as Record<string, MotionTier>)[surface] ?? DEFAULT_SURFACE_TIER;
}

/** Device capability → the highest tier that capability can honour. */
export const CAPABILITY_CEILING: Record<AnimationCapability, MotionTier> = {
  essential: 'M0', // includes prefers-reduced-motion: the authored static story is the whole story
  balanced: 'M2',
  full: 'M3',
};

const rank = (t: MotionTier): number => MOTION_TIERS.indexOf(t);

/** The effective tier is the MINIMUM of licence and capability — neither side can be overridden. */
export function resolveMotionTier(
  surface: SurfaceId | (string & Record<never, never>),
  capability: AnimationCapability
): MotionTier {
  const licence = licenceFor(surface);
  const ceiling = CAPABILITY_CEILING[capability] ?? DEFAULT_SURFACE_TIER;
  return rank(licence) <= rank(ceiling) ? licence : ceiling;
}

/** Convenience predicates so call-sites read as intent, not arithmetic. */
export function tierAllows(tier: MotionTier, atLeast: MotionTier): boolean {
  return rank(tier) >= rank(atLeast);
}

export interface MotionAffordances {
  tier: MotionTier;
  /** Instant state changes only. */
  isFrozen: boolean;
  /** Focus/hover/disclosure feedback. */
  allowsFeedback: boolean;
  /** Entrance reveals, panel/section transitions. */
  allowsReveals: boolean;
  /** Parallax, ambient loops, scroll-scrubbed beats, world atmosphere. */
  allowsAtmosphere: boolean;
}

export function motionAffordances(tier: MotionTier): MotionAffordances {
  return {
    tier,
    isFrozen: tier === 'M0',
    allowsFeedback: tierAllows(tier, 'M1'),
    allowsReveals: tierAllows(tier, 'M2'),
    allowsAtmosphere: tierAllows(tier, 'M3'),
  };
}
