/**
 * COMPONENT: LiveRegion (shared UI primitive)
 * PURPOSE: THE visually-hidden announcer for async state changes — one correct
 * implementation instead of a per-surface clone, in the same spirit as ErrorNote.
 *
 * WHY THIS IS FUSSIER THAN A `<div role="status">`
 * Two failure modes make naive live regions silently useless, and both were live
 * defects on the client hub before this existed (GLM-5.3 hostile review, 2026-08-24):
 *
 *   1. MOUNT-AND-ANNOUNCE. A region that appears already containing its text is
 *      unreliably announced — several screen readers only announce a region whose
 *      content CHANGES while it is already in the accessibility tree. So this
 *      component is meant to be rendered unconditionally, with `message` swapping
 *      between text and ''. Do not conditionally mount it.
 *
 *   2. THE aria-busy TRAP. ARIA 1.2 permits assistive tech to DEFER changes inside
 *      an `aria-busy` subtree until busy clears. A loading announcement nested
 *      inside the very container marked busy-while-loading can therefore be
 *      deferred, and then lost when the loading node unmounts. Render this OUTSIDE
 *      any `aria-busy` ancestor — that is the whole point of it being a separate,
 *      hoistable element rather than an attribute on the spinner.
 *
 * USAGE
 *   <LiveRegion message={loading ? 'Loading clients...' : ''} />
 *   ...somewhere ABOVE and OUTSIDE the aria-busy container.
 */
import React from 'react';
import styled from 'styled-components';

/**
 * Standard visually-hidden box: removed from view, kept in the accessibility tree.
 * `clip` is retained alongside `clip-path` for older assistive tech.
 */
const HiddenRegion = styled.div`
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
`;

interface LiveRegionProps {
  /** Current announcement. Pass '' to clear — do not unmount the component. */
  message: string;
  /**
   * 'polite' waits for a pause (correct for loading/progress).
   * 'assertive' interrupts — reserve it for errors the user must act on.
   */
  politeness?: 'polite' | 'assertive';
  className?: string;
}

const LiveRegion: React.FC<LiveRegionProps> = ({ message, politeness = 'polite', className }) => (
  <HiddenRegion
    role={politeness === 'assertive' ? 'alert' : 'status'}
    aria-live={politeness}
    className={className}
  >
    {message}
  </HiddenRegion>
);

export default LiveRegion;
