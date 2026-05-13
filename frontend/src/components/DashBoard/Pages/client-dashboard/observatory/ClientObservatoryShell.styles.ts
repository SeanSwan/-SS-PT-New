/**
 * FILE: ClientObservatoryShell.styles.ts
 * PURPOSE: Theme-connected layout primitives for the client observatory.
 */

import styled, { css, keyframes } from 'styled-components';

const riseIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const focusRing = css`
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }
`;

export const PageShell = styled.section`
  position: relative;
  isolation: isolate;
  width: 100%;
  max-width: 1720px;
  margin: 0 auto;
  padding: clamp(1rem, 2vw, 2rem);
  color: var(--text-primary, #E0ECF4);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background:
      radial-gradient(circle at 18% 8%, color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent), transparent 26rem),
      radial-gradient(circle at 78% 0%, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 14%, transparent), transparent 24rem),
      linear-gradient(180deg, color-mix(in srgb, var(--bg-base, #0A0A0F) 82%, transparent), var(--bg-base, #0A0A0F));
  }

  @media (max-width: 520px) {
    padding: 0.875rem;
  }
`;

export const MainGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.7fr);
  gap: clamp(1rem, 1.8vw, 1.5rem);
  align-items: start;
  margin-top: 1.25rem;

  @media (max-width: 1180px) {
    grid-template-columns: 1fr;
  }
`;

export const PrimaryColumn = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const SideColumn = styled.aside`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
`;

export const ObservatoryCard = styled.div`
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--bg-elevated, #141419) 92%, transparent), color-mix(in srgb, var(--bg-base, #0A0A0F) 78%, transparent)),
    var(--bg-elevated, #141419);
  box-shadow: 0 18px 42px color-mix(in srgb, var(--bg-base, #0A0A0F) 74%, transparent);
  animation: ${riseIn} 420ms ease both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const CardInner = styled.div`
  position: relative;
  z-index: 1;
  padding: clamp(1rem, 1.6vw, 1.35rem);
`;

export const SectionKicker = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 24px;
  color: var(--accent-primary, #60C0F0);
  font: 700 0.72rem/1 'Sora', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0;
`;

export const SectionTitle = styled.h2`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font: 800 clamp(1.05rem, 1.2vw, 1.35rem)/1.15 'Plus Jakarta Sans', sans-serif;
  letter-spacing: 0;
`;

export const MutedText = styled.p`
  margin: 0;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 68%, transparent));
  font: 500 0.9rem/1.55 'Sora', sans-serif;
`;

export const ButtonBase = styled.button`
  min-height: 44px;
  border-radius: 999px;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.65rem 1rem;
  font: 800 0.85rem/1 'Sora', sans-serif;
  letter-spacing: 0;
  cursor: pointer;
  transition: transform 180ms ease, border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
  ${focusRing}

  &:hover {
    transform: translateY(-1px);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
    transform: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover { transform: none; }
  }
`;

export const PrimaryButton = styled(ButtonBase)`
  color: var(--bg-base, #0A0A0F);
  background: linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6));
  box-shadow: 0 0 22px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 25%, transparent);
`;

export const GhostButton = styled(ButtonBase)`
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--bg-elevated, #141419) 74%, transparent);
  border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
`;

export const IconButton = styled(ButtonBase)`
  width: 44px;
  padding: 0;
  color: var(--accent-primary, #60C0F0);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
`;

export const ProgressTrack = styled.div`
  position: relative;
  overflow: hidden;
  height: 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
`;

export const ProgressFill = styled.div<{ $pct: number }>`
  width: ${({ $pct }) => Math.min(Math.max($pct, 0), 100)}%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0), var(--accent-gold, #C6A84B));
  box-shadow: 0 0 18px color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
`;

export const MobileDock = styled.nav`
  display: none;

  @media (max-width: 760px) {
    position: sticky;
    bottom: 0.75rem;
    z-index: 5;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.5rem;
    margin-top: 1rem;
    padding: 0.5rem;
    border-radius: 18px;
    border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
    background: color-mix(in srgb, var(--bg-base, #0A0A0F) 90%, transparent);
    box-shadow: 0 16px 32px color-mix(in srgb, var(--bg-base, #0A0A0F) 70%, transparent);
    backdrop-filter: blur(18px);
  }
`;
