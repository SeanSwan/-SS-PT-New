/**
 * Sheen pointer constants (SWA-224)
 * ==================================
 * What remains of the standalone Sheen pack after the Forge port.
 *
 * The VISUAL tokens — frame weight, shimmer strength, the four world ramps —
 * moved to where taste belongs: `packages/swan-forge/tokens/packs/crystalline-swan.css`
 * as component-tier `--sw-sheen-*` names, consumed by `@swan/forge/css/sheen.css`.
 * They are not duplicated here; a token defined twice is a token that will
 * disagree with itself.
 *
 * What could NOT move is below. `@swan/forge` is zero-runtime by contract and
 * ships no JS behaviour of this kind, so the pointer engine and its tuning live
 * in the host app. `useSheenPointer` imports these; nothing else should.
 *
 * @see packages/swan-forge/css/sheen.css · catalog §10.3a-amended
 */

export const SHEEN = {
  /**
   * Pointer interpolation. `catchUp` is the fraction of the remaining distance
   * moved per frame; 0.22 lands in ~3 frames (~50ms).
   *
   * 0.22 is a TASTE value, not a performance one: the trailing eased orb is the
   * mechanism Sean selected out of candidate B, and raising the rate erases the
   * trail — i.e. undoes the thing that was chosen. `opacityCatchUp` is
   * deliberately slower so the orb fades in more gently than it tracks.
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
} as const;
