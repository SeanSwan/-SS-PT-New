/**
 * SheenWorldLayers — the decorative layer stack inside a sheen frame (SWA-224)
 * =============================================================================
 * Extracted because SheenButton and SheenCard had identical copies. Duplicated
 * layer stacks drift: one surface gains a layer, the other silently does not,
 * and the two worlds stop matching for reasons nobody can find later.
 *
 * These <i> elements are pure paint. The parent marks the whole frame
 * aria-hidden, so nothing here reaches the accessibility tree.
 */

import React from 'react';
import type { SheenWorldId } from '../../../styles/sheenPackTokens';
import { SHEEN_WORLDS } from '../../../styles/sheenPackTokens';

export const SheenWorldLayers: React.FC<{ world: SheenWorldId }> = ({ world }) =>
  SHEEN_WORLDS[world].kind === 'scenic' ? (
    <>
      <i className="sky" />
      <i className="cl" />
      <i className="cl2" />
      <i className="shim" />
      <i className="rim" />
    </>
  ) : (
    <>
      <i className="spin" />
      <i className="hz" />
      <i className="shim" />
      <i className="rim" />
    </>
  );

export default SheenWorldLayers;
