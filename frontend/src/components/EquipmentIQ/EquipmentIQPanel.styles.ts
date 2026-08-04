/**
 * Equipment IQ Panel styles — Crystalline Swan chrome (Slice S8)
 * ==============================================================
 * BLUEPRINT: docs/ai-workflow/AI-HANDOFF/EQUIPMENT-INTELLIGENCE-OVERHAUL-BLUEPRINT-2026-08-04.md §10a #4
 *
 * Obsidian panel, Ice Wing gradient spokes, Gilded Fern weakest-gap accent,
 * ONE rotating insight strip (Gilded Fern unlock text, Ice Wing CTA), hairline
 * loading (no spinners — §10a #12 ban), radial->arc collapse at <768px.
 * All motion collapses under prefers-reduced-motion.
 */
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

/** Single arc/spoke draw-in on mount (SVG stroke-dash technique). */
const drawIn = keyframes`
  from { stroke-dashoffset: 1; }
  to { stroke-dashoffset: 0; }
`;

const slideBar = keyframes`
  from { transform: translateX(-100%); }
  to { transform: translateX(340%); }
`;

export const PanelRoot = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  border-radius: 16px;
  background: var(--bg-base, #0a0a0f);
  border: 1px solid rgba(96, 192, 240, 0.18);
  color: var(--text-primary, #e0ecf4);
`;

export const PanelHeader = styled.header`
  display: flex;
  align-items: center;
  gap: 10px;

  h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary, #e0ecf4);
  }

  > svg {
    color: var(--accent-primary, #60c0f0);
  }
`;

/** Desktop pattern web; hidden on mobile where the arc gauge takes over. */
export const WebWrap = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;

  @media (max-width: 767.98px) {
    display: none;
  }
`;

/** Mobile horizontal segmented arc gauge (<768px only). */
export const ArcWrap = styled.div`
  display: none;
  width: 100%;

  @media (max-width: 767.98px) {
    display: flex;
    justify-content: center;
  }
`;

/** Coverage spoke / arc fill — draw-in on mount, off under reduced motion. */
export const DrawInStroke = styled.path`
  stroke-dasharray: 1;
  stroke-dashoffset: 0;
  animation: ${drawIn} 700ms ease-out;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const DrawInLine = styled.line`
  stroke-dasharray: 1;
  stroke-dashoffset: 0;
  animation: ${drawIn} 700ms ease-out;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const InsightStrip = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 8px 14px;
  border-radius: 12px;
  border: 1px solid rgba(96, 192, 240, 0.15);
  background: color-mix(in srgb, var(--surface-elevated, #003080) 32%, transparent);
  color: var(--text-primary, #e0ecf4);

  > svg {
    flex-shrink: 0;
    color: var(--accent-gold, #c6a84b);
  }
`;

export const StripText = styled.span`
  flex: 1;
  font-size: 0.88rem;
  line-height: 1.35;
  animation: ${fadeIn} 400ms ease;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const UnlockText = styled.strong`
  color: var(--accent-gold, #c6a84b);
  font-weight: 600;
`;

export const AskButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  min-width: 44px;
  padding: 0 14px;
  border-radius: 22px;
  border: 1px solid rgba(96, 192, 240, 0.4);
  background: transparent;
  color: var(--accent-primary, #60c0f0);
  font-size: 0.85rem;
  cursor: pointer;
  transition: box-shadow 160ms ease;

  &:hover,
  &:focus-visible {
    box-shadow: 0 0 10px rgba(96, 192, 240, 0.35);
    outline: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/** Shared centered wrapper for idle / loading / error / empty states. */
export const StateWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 28px 16px;
  color: rgba(224, 236, 244, 0.72);
  font-size: 0.9rem;
  text-align: center;
`;

export const HairlineTrack = styled.div`
  width: min(240px, 80%);
  height: 2px;
  overflow: hidden;
  border-radius: 1px;
  background: rgba(96, 192, 240, 0.15);
`;

export const HairlineFill = styled.div`
  width: 30%;
  height: 100%;
  background: var(--accent-primary, #60c0f0);
  animation: ${slideBar} 1.2s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    width: 100%;
    opacity: 0.4;
  }
`;

/** Blue bg -> Wing Purple glow (Dual-Button Glow rule). */
export const RetryButton = styled.button`
  min-height: 44px;
  padding: 0 18px;
  border-radius: 22px;
  border: 1px solid rgba(96, 192, 240, 0.4);
  background: var(--color-primary, #002060);
  color: var(--text-primary, #e0ecf4);
  font-size: 0.9rem;
  cursor: pointer;
  transition: box-shadow 160ms ease;

  &:hover,
  &:focus-visible {
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.45);
    outline: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
