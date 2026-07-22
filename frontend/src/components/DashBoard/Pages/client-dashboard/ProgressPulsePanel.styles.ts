/**
 * COMPONENT: ProgressPulsePanel.styles
 * OWNER: Client Dashboard / Progress (Slice 8 — Progress Intelligence)
 * PURPOSE: Crystalline Swan styling for the coach-compass pulse panel.
 * MOTION: single entrance beat + breathing accent, both disabled under
 *         prefers-reduced-motion. Dual-Button Glow: blue bg -> purple glow.
 */

import styled, { keyframes } from 'styled-components';

const rise = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const PulseWrap = styled.section`
  position: relative;
  margin-bottom: 1.25rem;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--surface-primary, #002060) 88%, transparent) 0%,
      color-mix(in srgb, var(--bg-elevated, #141419) 92%, transparent) 55%,
      var(--bg-elevated, #141419) 100%);
  padding: clamp(1rem, 2vw, 1.25rem);
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: clamp(1rem, 2.5vw, 1.75rem);
  overflow: hidden;
  /* DRIFT entrance beat — design.md §8 two-speed law (no "medium" 0.45s).
     Tokens fall back to canon values until --speed-drift/--ease-drift land. */
  animation: ${rise} var(--speed-drift, 600ms) var(--ease-drift, cubic-bezier(0.4, 0, 0.2, 1)) both;

  &::before {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: 3px;
    background: linear-gradient(180deg,
      var(--accent-primary, #60C0F0),
      var(--accent-secondary, #8B5CF6));
    opacity: 0.9;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const CompassZone = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  min-width: 0;
`;

export const CompassKicker = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

export const CompassTitle = styled.h3`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(1.05rem, 1.8vw, 1.3rem);
  font-weight: 700;
  line-height: 1.25;
`;

export const CompassMessage = styled.p`
  margin: 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 78%, transparent);
  font-size: 0.9rem;
  line-height: 1.55;
  max-width: 52ch;
`;

export const CompassCta = styled.button`
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0 1.15rem;
  margin-top: 0.25rem;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  background: linear-gradient(135deg,
    var(--surface-primary, #002060),
    color-mix(in srgb, var(--surface-primary, #002060) 60%, var(--accent-primary, #60C0F0)));
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  /* SNAP response — design.md §8 (no "medium" 0.25s). transform+opacity/shadow only. */
  transition: box-shadow var(--speed-snap, 160ms) var(--ease-snap, cubic-bezier(0.16, 1, 0.3, 1)),
    transform var(--speed-snap, 160ms) var(--ease-snap, cubic-bezier(0.16, 1, 0.3, 1));

  &:hover {
    box-shadow: 0 0 18px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 55%, transparent);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover { transform: none; }
  }
`;

export const SecondaryRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.35rem;
`;

export const SecondaryChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 25%, transparent);
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 70%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
`;

export const MetricRail = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  align-content: center;

  @media (max-width: 414px) {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
`;

export const MetricTile = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.75rem;
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 55%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  min-width: 0;
`;

export const MetricLabel = styled.span`
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 45%, transparent));
  font-family: 'Sora', sans-serif;
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const MetricValue = styled.span<{ $color?: string }>`
  color: ${({ $color }) => $color || 'var(--text-primary, #E0ECF4)'};
  font-family: 'Fira Code', monospace;
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.1;
`;

export const MetricHint = styled.span`
  /* 62% keeps WCAG 4.5:1 with margin on the near-black tile background */
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 62%, transparent);
  font-size: 0.68rem;
  line-height: 1.35;
`;

export const BalanceTrack = styled.div`
  position: relative;
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
`;

export const BalancePush = styled.div<{ $pct: number }>`
  position: absolute;
  inset: 0 auto 0 0;
  width: ${({ $pct }) => Math.max(0, Math.min(100, $pct))}%;
  background: linear-gradient(90deg,
    var(--accent-primary, #60C0F0),
    color-mix(in srgb, var(--accent-primary, #60C0F0) 55%, var(--accent-secondary, #8B5CF6)));
`;

export const BalanceMidline = styled.div`
  position: absolute;
  top: -2px;
  bottom: -2px;
  left: 50%;
  width: 2px;
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 80%, transparent);
`;

export const PatternDots = styled.div`
  display: flex;
  gap: 0.3rem;
`;

export const PatternDot = styled.span<{ $on: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $on }) => ($on
    ? 'var(--accent-primary, #60C0F0)'
    : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 14%, transparent)')};
`;

export const PulseSkeleton = styled.div`
  height: 132px;
  margin-bottom: 1.25rem;
  border-radius: 14px;
  background: color-mix(in srgb, var(--bg-elevated, #141419) 80%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
`;
