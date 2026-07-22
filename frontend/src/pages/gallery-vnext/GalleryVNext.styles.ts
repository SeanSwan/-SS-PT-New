/**
 * Gallery vNext — shell styles. Extracted from GalleryVNext.tsx to hold the orchestrator under the
 * 300-line cap (Rule 4 / LAW 9). Every color reads `var(--gallery-*)` from the token bridge — this file
 * contains ZERO raw hex (CI-enforced by check-token-discipline).
 */
import styled from 'styled-components';

export const Shell = styled.main`
  position: relative;
  isolation: isolate;
  min-height: 100dvh;
  background: var(--gallery-bg);
  color: var(--gallery-ink);
  padding: 0 var(--gallery-pad, 16px) 96px;
`;

/**
 * Shell contract (Kimi gallery ideation 2026-07-20): a reserved z-0 background mount point for the future
 * music color-visualizer canvas. EMPTY today — zero cost. When the visualizer lands it mounts here with no
 * relayout (Content never moves), behind GalleryScrim so photo AA never degrades over a living background.
 */
export const VisualizerSlot = styled.div`
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
`;

export const GalleryScrim = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(180deg, transparent, var(--gallery-scrim) 30%);
  opacity: 0; /* wakes up only when the visualizer mounts into the slot */
`;

export const Content = styled.div`
  position: relative;
  z-index: 2;
  max-width: 1600px;
  margin: 0 auto;
`;

export const Title = styled.h1`
  margin: 0 0 8px;
  font-family: var(--gallery-font-display);
  font-size: clamp(1.7rem, 4vw, 2.6rem);
  line-height: 1.1;
`;

export const Sub = styled.p`
  margin: 0;
  color: var(--gallery-ink-2);
  max-width: 60ch;
`;

export const RetryBtn = styled.button`
  min-height: 44px;
  margin-left: 8px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid var(--gallery-line);
  background: var(--gallery-surface-2);
  color: var(--gallery-ink);
  cursor: pointer;
  font-size: 0.9rem;
`;

export const GateWrap = styled.div`
  display: flex;
  justify-content: center;
  padding: 32px 0 48px;
`;

export const State = styled.p`
  margin: 12vh auto;
  text-align: center;
  color: var(--gallery-ink-2);
`;

