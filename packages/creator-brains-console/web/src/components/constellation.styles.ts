/*
 * constellation.styles.ts — the presentation shell of BrainConstellation.
 *
 * WHY THIS FILE EXISTS. `BrainConstellation.tsx` had grown to 380 lines against
 * this package's Rule 4 cap of 300 (ban 14, `06-bans.md`). The component's *logic*
 * — the three gates, the load trigger, the scene lifecycle, the keyboard walk —
 * is ~180 lines and cannot be trimmed without losing reasoning that the package
 * requires be stated. The presentational layer below it is ~200 lines that the
 * logic never reads again.
 *
 * The seam is therefore "what the component renders" vs "what the component
 * does", which is a real boundary and not a line-count cut. Nothing here has
 * behaviour: every export is a styled component or a constant record, so moving
 * it cannot change a timing, an ordering, or a gate.
 *
 * The state swatch map lives here rather than in the component because it is
 * the one non-styled presentation constant, and splitting the two would mean a
 * reader of the stylesheet had to cross files to learn what `on` looks like.
 */

import styled from 'styled-components';
import type { BrainNode } from './constellation-layout';

export const Frame = styled.div`
  position: relative;
  border: 1px solid var(--border-electric, rgba(96, 192, 240, 0.2));
  border-radius: var(--radius-card, 20px);
  background: var(--carbon, #141419);
  min-height: 380px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

export const Canvas = styled.canvas`
  display: block;
  width: 100%;
  flex: 1;
  min-height: 380px;
  cursor: default;
`;

export const Caption = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3, 12px);
  padding: var(--space-5, 24px);
  text-align: center;
  font-family: var(--font-drama, Georgia, serif);
  font-style: italic;
  color: var(--text-faint, rgba(224, 236, 244, 0.38));
  pointer-events: none;
`;

export const NodeList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
  max-height: 100%;
  overflow: auto;
  pointer-events: auto;
  text-align: left;
  font-family: var(--font-ui, system-ui, sans-serif);
  font-style: normal;
`;

export const NodeButton = styled.button<{ $focused: boolean }>`
  display: block;
  width: 100%;
  text-align: left;
  padding: var(--space-2, 8px) var(--space-3, 12px);
  background: ${(p) => (p.$focused ? 'rgba(139, 92, 246, 0.18)' : 'transparent')};
  color: var(--text-primary, #e0ecf4);
  border: 1px solid ${(p) => (p.$focused ? 'var(--wing-purple, #8B5CF6)' : 'transparent')};
  border-radius: var(--radius-control, 12px);
  font: inherit;
  font-size: 13px;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--wing-purple, #8B5CF6);
    outline-offset: 1px;
  }
`;

export const NodeMeta = styled.span`
  font-family: var(--font-data, monospace);
  font-size: 11px;
  color: var(--text-muted, rgba(224, 236, 244, 0.62));
  margin-left: var(--space-2, 8px);
`;

export const Swatch = styled.span<{ $color: string }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: var(--space-2, 8px);
  background: ${(p) => p.$color};
`;

export const STATE_SWATCH: Record<BrainNode['state'], string> = {
  on: '#60C0F0',
  off: '#4070C0',
  throttle: '#C6A84B',
  stale: '#E5484D',
};
