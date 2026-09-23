/**
 * SheenFrame — the layer stack inside a Forge sheen frame (SWA-224)
 * ==================================================================
 * Renders the `<i>` elements `@swan/forge/css/sheen.css` paints. Pure decoration:
 * the frame is marked aria-hidden, so none of it reaches the accessibility tree.
 *
 * The layer SET is keyed on world KIND, not on a world id. A metal world gets a
 * rotating ring plus specular banding; a scenic world gets parallax bands. Adding
 * a world is then one pack token, one CSS rule, and one entry here — and the
 * branch stays correct because it asks what kind of world it is rather than
 * naming one.
 *
 * Why a component and not a pseudo-element: `.sw-btn::before` is the loading
 * spinner and `::after` is the existing sheen sweep, so the layers need real DOM.
 *
 * @see packages/swan-forge/css/sheen.css · catalog §10.3a-amended
 */

import React from 'react';

/**
 * Per-page budget. Measured 2026-09-02 on a desktop GPU: 12 sheened controls run
 * at 4.17ms mean frame time; 48 at 6.71ms; 96 at 8.08ms with 2 frames over 16.7ms
 * out of ~400. Cost scales with LAYER COUNT, not with the positioning property —
 * see docs/ai-workflow/AI-HANDOFF/SHEEN-PERF-MEASUREMENT-2026-09-02.md. Six is a deliberately conservative
 * design ceiling, not the measured limit: the sheen is a hierarchy signal, and a
 * page with seven of them has stopped signalling anything.
 */
const SHEEN_BUDGET = 6;
let mounted = 0;

/**
 * Dev-only budget warning. Flash's review noted that "exactly 1 sheen frame" was
 * OBSERVED on the homepage, never ENFORCED — nothing in code, docs or tests
 * expressed a limit. This makes the ceiling visible at the moment it is crossed,
 * in development only; it never runs in production and never throws.
 */
function useSheenFrameBudget() {
  React.useEffect(() => {
    if (!import.meta.env?.DEV) return undefined;
    mounted += 1;
    if (mounted > SHEEN_BUDGET) {
      // eslint-disable-next-line no-console
      console.warn(
        `[sheen] ${mounted} sheen frames mounted (budget ${SHEEN_BUDGET}). Each frame ` +
          'runs a spinning conic layer, a shimmer layer and a blurred orb. The sheen is a ' +
          'hierarchy signal — if everything wears it, nothing is signalled. Measured cost: ' +
          '~4.2ms/frame at 12 surfaces, ~8.1ms at 96 (desktop GPU; low-end mobile untested).',
      );
    }
    return () => {
      mounted -= 1;
    };
  }, []);
}

/** The four worlds shipping in v1. The lineup built 33; the rest stay in the artifact. */
export type SheenWorld = 'chrome' | 'gold' | 'neon' | 'sky';

const SCENIC: ReadonlySet<SheenWorld> = new Set<SheenWorld>(['sky']);

export const SheenFrame: React.FC<{ world: SheenWorld }> = ({ world }) => {
  useSheenFrameBudget();
  return (
  <span className={`sw-sheen sw-sheen--${world}`} aria-hidden="true" data-sheen-world={world}>
    {SCENIC.has(world) ? (
      <>
        <i className="sw-sheen__scene" />
        <i className="sw-sheen__drift" />
        <i className="sw-sheen__drift-far" />
      </>
    ) : (
      <>
        <i className="sw-sheen__spin" />
        <i className="sw-sheen__band" />
      </>
    )}
    <i className="sw-sheen__shim" />
    <i className="sw-sheen__rim" />
    <i className="sw-sheen__orb" />
  </span>
  );
};

export default SheenFrame;
