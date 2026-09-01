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

/** The four worlds shipping in v1. The lineup built 33; the rest stay in the artifact. */
export type SheenWorld = 'chrome' | 'gold' | 'neon' | 'sky';

const SCENIC: ReadonlySet<SheenWorld> = new Set<SheenWorld>(['sky']);

export const SheenFrame: React.FC<{ world: SheenWorld }> = ({ world }) => (
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

export default SheenFrame;
