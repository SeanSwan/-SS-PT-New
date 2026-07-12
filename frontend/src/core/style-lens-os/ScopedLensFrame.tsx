/**
 * ScopedLensFrame — renders any Style Lens INSIDE a bounded container
 * without touching the global appearance commit.
 *
 * The lens CSS keys off attribute layers:
 *   [data-style-lens='x']            → defines the --lens-* variables
 *   ... [data-style-lens-shell]      → consumes them (canvas, gap, tones)
 *   ... [data-dashboard-scroll-root] → canvas surface, radius, edge
 *
 * This frame reproduces all three layers as nested nodes, so every
 * existing descendant rule in the lens stylesheet applies inside the
 * frame exactly as it would on the real dashboard — enabling instant
 * previews and true side-by-side comparison with zero global effects.
 *
 * Dependency-free on purpose (boundary-tested): the generic core has no
 * styling library — layout primitives here are inline styles only.
 * Preview-only by design: no state, no persistence, no coordinator.
 */
import React, { type CSSProperties, type ReactNode } from 'react';
import type { AppearanceProfile } from './types';

interface ScopedLensFrameProps {
  /** Lens to render inside the frame */
  styleLensId: string;
  /** Optional density/motion echoes of a full profile */
  density?: AppearanceProfile['density'];
  motionMode?: 'full' | 'reduced' | 'off';
  children: ReactNode;
  className?: string;
  /** Test hook / a11y label for compare panes */
  'aria-label'?: string;
}

const rootStyle: CSSProperties = {
  display: 'block',
  minWidth: 0,
  containerType: 'inline-size',
};

const shellStyle: CSSProperties = {
  display: 'block',
  minWidth: 0,
  minHeight: '100%',
};

const scrollStyle: CSSProperties = {
  display: 'block',
  minWidth: 0,
  minHeight: '100%',
  overflow: 'hidden',
};

export const ScopedLensFrame: React.FC<ScopedLensFrameProps> = ({
  styleLensId,
  density = 'comfortable',
  motionMode = 'full',
  children,
  className,
  'aria-label': ariaLabel,
}) => (
  <div
    className={className}
    aria-label={ariaLabel}
    style={rootStyle}
    data-style-lens={styleLensId}
    data-density={density}
    data-motion-mode={motionMode}
    data-scoped-lens-frame
  >
    {/* Nested exactly like the live dashboard: lens vars → shell → scroll
        root, so descendant rules (canvas, radius, edge) all land. */}
    <div style={shellStyle} data-style-lens-shell>
      <div style={scrollStyle} data-dashboard-scroll-root>
        {children}
      </div>
    </div>
  </div>
);

export default ScopedLensFrame;
