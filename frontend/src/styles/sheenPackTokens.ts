/**
 * Swan Sheen Pack — Forge Sheen-tier design tokens (SWA-224)
 * ==========================================================
 * The token layer every Forge Sheen-tier component inherits. This is NOT a new
 * component library: it is the small set of constants that make the "border as a
 * window onto a world" treatment consistent across the ~20 catalog components.
 *
 * Taste anchor (Sean, 2026-08-31): the anchor is the FUSION demoed in the Swan
 * Sheen Forge artifact — candidate B's motion (trailing eased glow orb +
 * continuous chroma blend) x candidate C's look (always-visible rotating metal
 * ring, pill radius, SheenCard kept as-is) x the rotating multi-colour "Vegas"
 * neon edge. It is explicitly NOT origin/main's `ui/buttons/GlowButton.tsx`,
 * which the Forge Phase-0 inventory had only PRESUMED to be the original.
 *
 * Four decisions ratified by Sean 2026-09-01 (recorded on SWA-224):
 *   1. v1 ships FOUR worlds — chrome, sky, gold, neon. The other 29 built in the
 *      artifact stay there as a proven catalog; each is ~10 lines of pure CSS to
 *      promote later. Four proves the architecture at ~1/8 the maintenance,
 *      test and a11y surface.
 *   2. Frame weight is a TOKEN, not a constant: 4.5px on buttons, 6px on cards.
 *      Builder QA recorded worlds are not legible below 6px, but on a 44px-min
 *      button a 6px frame is 27% of the height and crowds the label.
 *   3. Shimmer strength is a TOKEN: 0.6 over scenic worlds, 0.85 over pure metal.
 *      At 0.9 the shimmer erased the scenery (Rain rendered as plain chrome);
 *      metal worlds have no scenery to erase and can carry more.
 *   4. Cursor catch-up stays 0.22 (~3 frames, ~50ms). The trailing orb IS the
 *      mechanism selected out of candidate B — raising it erases the trail.
 *
 * Palette discipline: brand-bearing colours resolve to the Crystalline Swan
 * tokens in `crystallineSwanTheme.ts`. The retired Galaxy-Swan palette is not
 * used anywhere in this pack — and is deliberately not quoted here either, since
 * the pre-commit guard treats those literals as a hard failure with no allowlist.
 *
 * The remaining raw hex below are SCENE ramps — the banded specular of chrome,
 * the bullion ramp of gold, the sky gradient — not brand colours. They have no
 * token equivalent because they are the picture inside the frame, not the frame.
 * Each such line is tagged for the Rule 6 guard with its reason.
 *
 * Usage:
 *   import { SHEEN, SHEEN_WORLDS } from '../../styles/sheenPackTokens';
 *   padding: ${SHEEN.frameWidth.button};
 *   opacity: ${SHEEN.shimmer.scenic};
 *
 * @see docs SWA-224 · related SWA-205 (Swan Component Forge catalog)
 */

import { CS } from './crystallineSwanTheme';

/** Surfaces a sheen frame can be applied to. Frame weight is chosen per surface. */
export type SheenSurface = 'button' | 'card';

/** Worlds shipping in v1. The artifact holds 29 more, deliberately not shipped. */
export type SheenWorldId = 'chrome' | 'sky' | 'gold' | 'neon';

/** A world is either pure metal (no scenery) or scenic (has a scene to protect). */
export type SheenWorldKind = 'metal' | 'scenic';

export const SHEEN = {
  /**
   * Decision 2 — frame weight per surface, never one global number.
   * Buttons keep the label comfortable inside a 44px minimum target;
   * cards have the room to let the world read as an actual scene.
   */
  frameWidth: {
    button: '4.5px',
    card: '6px',
  },

  /**
   * Decision 3 — shimmer opacity by world kind.
   * `scenic` is deliberately low: the documented failure mode is the shimmer
   * washing the scene out, and it is directional, not symmetric.
   */
  shimmer: {
    scenic: 0.6,
    metal: 0.85,
  },

  /**
   * Decision 4 — pointer interpolation.
   * `catchUp` is the per-frame fraction moved toward the live cursor; 0.22 lands
   * in ~3 frames. `opacityCatchUp` is deliberately slower so the orb fades in
   * more gently than it tracks.
   */
  pointer: {
    catchUp: 0.22,
    opacityCatchUp: 0.18,
    /** Distance in px over which the orb tapers out past the edge (no hard cutoff). */
    proximityFalloffPx: 40,
    /** Below this, a surface is treated as fully at rest and skipped entirely. */
    restEpsilon: 0.001,
    /** Opacity below which a surface is considered invisible and skipped. */
    invisibleEpsilon: 0.004,
  },

  /** Shared geometry lifted from candidate C. */
  radius: {
    button: '26px',
    card: '24px',
  },

  /** Rotation periods for the frame contents, in seconds. */
  spin: {
    neon: 3.5,
    chrome: 6,
    gold: 5.5,
    shimmer: 4.5,
  },
} as const;

/**
 * The four v1 worlds.
 *
 * `kind` selects the shimmer token, so a consumer never has to remember which
 * strength a world wants — that was the whole point of making it a token.
 * `edge` is the conic-gradient stop list for worlds built from a rotating ring.
 */
export const SHEEN_WORLDS: Record<
  SheenWorldId,
  { id: SheenWorldId; label: string; kind: SheenWorldKind; spinSeconds: number; edge: readonly string[] }
> = {
  chrome: {
    id: 'chrome',
    label: 'Liquid Chrome',
    kind: 'metal',
    spinSeconds: SHEEN.spin.chrome,
    // Banded specular rather than hue — this is what reads as true metal.
    edge: ['#05070C', '#7E93A8', '#FFFFFF', '#C3D4E2', '#1B2430', '#46586B', '#EEF5FB', '#05070C'], // swan-guard-allow-hex scene ramp, not brand: banded chrome specular
  },
  gold: {
    id: 'gold',
    label: 'Gold Bullion',
    kind: 'metal',
    spinSeconds: SHEEN.spin.gold,
    edge: ['#2A1F05', '#8A6E22', '#F6E4A6', CS.gildedFern, '#4A380C', '#B08F35', '#FFF6D8', '#2A1F05'], // swan-guard-allow-hex scene ramp, not brand: bullion steps around CS.gildedFern
  },
  neon: {
    id: 'neon',
    label: 'Swan Neon',
    kind: 'metal',
    spinSeconds: SHEEN.spin.neon,
    // Palette-pure by default. The full Vegas spectrum stays a showcase-only opt-in.
    edge: [CS.iceWing, CS.swanLavender, CS.wingPurple, CS.gildedFern, CS.arcticCyan, CS.iceWing],
  },
  sky: {
    id: 'sky',
    label: 'Blue Sky',
    kind: 'scenic',
    spinSeconds: 0, // parallax cloud bands, not a rotating ring
    edge: ['#1C6FD6', '#3FA0EE', '#8FD0F7', '#D8EFFB'], // swan-guard-allow-hex scene ramp, not brand: daylight sky gradient
  },
} as const;

/** Showcase-only edge set. Not a default: it leaves the Crystalline palette. */
// Deliberately outside the brand palette — which is exactly why it is opt-in, never a default.
export const SHEEN_VEGAS_SHOWCASE_EDGE = ['#38D6FF', '#7C4DFF', '#FF4FD8', '#FFC94B', '#45F0A0'] as const; // swan-guard-allow-hex showcase-only spectrum, opt-in never default

/** Frame weight for a surface. Keeps decision 2 in one place. */
export const sheenFrameWidth = (surface: SheenSurface): string => SHEEN.frameWidth[surface];

/** Shimmer opacity for a world. Keeps decision 3 in one place. */
export const sheenShimmerFor = (world: SheenWorldId): number =>
  SHEEN.shimmer[SHEEN_WORLDS[world].kind];
