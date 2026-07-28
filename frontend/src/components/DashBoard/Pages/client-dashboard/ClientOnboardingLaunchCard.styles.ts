/**
 * ============================================================================
 * FILE: ClientOnboardingLaunchCard.styles.ts
 * PURPOSE: Styled-components for the client onboarding entry card.
 * AUTHOR:  Claude (Opus 5) | CREATED: 2026-07-28
 * ============================================================================
 *
 * Extracted from ClientOnboardingLaunchCard.tsx during hostile review: that file
 * had reached 299 of the 300-line cap (rule 4), so the next edit would have
 * broken it. Co-located `.styles.ts` siblings are the established convention
 * here (360 of them in components/).
 *
 * Palette is Crystalline Swan via var(--token, #fallback) (rule 6). Translucent
 * brand tints use rgba() literals, matching the dominant convention in
 * components/DashBoard (1,452 occurrences, e.g. AiConsentScreen.tsx).
 * Dual-Button Glow: blue background earns a purple glow.
 * All motion has a prefers-reduced-motion fallback (rule 25).
 * ============================================================================
 */

import styled, { css, keyframes } from 'styled-components';

const auroraDrift = keyframes`
  0%   { transform: translate3d(-8%, -4%, 0) scale(1.05); opacity: 0.55; }
  50%  { transform: translate3d(6%, 3%, 0) scale(1.18);  opacity: 0.8; }
  100% { transform: translate3d(-8%, -4%, 0) scale(1.05); opacity: 0.55; }
`;

const sheen = keyframes`
  0%   { transform: translateX(-120%); }
  100% { transform: translateX(220%); }
`;

/* Shared style chunk that interpolates a keyframe — MUST use the css helper
   (rule 43): a plain template string would stringify the keyframe object and
   crash styled-components at mount. */
const auroraMotion = css`
  animation: ${auroraDrift} 14s ease-in-out infinite;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const Wrapper = styled.section`
  position: relative;
  isolation: isolate;
  border-radius: 20px;
  overflow: hidden;
  margin: 0 0 1.5rem;
  padding: clamp(1.25rem, 3vw, 2rem);
  background:
    linear-gradient(145deg,
      var(--surface-elevated, #003080) 0%,
      var(--bg-primary, #002060) 55%,
      var(--card-dark, #141419) 100%);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.28));
  box-shadow:
    0 18px 45px -22px rgba(0, 0, 0, 0.85),
    0 0 0 1px rgba(198, 168, 75, 0.14) inset;
`;

export const Aurora = styled.div`
  position: absolute;
  inset: -35%;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(38% 44% at 22% 34%, var(--accent-primary, #60C0F0) 0%, transparent 68%),
    radial-gradient(34% 40% at 76% 62%, var(--accent-glow, #8B5CF6) 0%, transparent 66%);
  filter: blur(46px);
  opacity: 0.6;
  ${auroraMotion}
`;

export const GildedRule = styled.span`
  display: block;
  width: 46px;
  height: 2px;
  margin-bottom: 0.85rem;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--accent-luxury, #C6A84B), transparent);
`;

export const Eyebrow = styled.p`
  margin: 0 0 0.35rem;
  font-family: 'Sora', 'Plus Jakarta Sans', system-ui, sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent-luxury, #C6A84B);
`;

export const Title = styled.h2`
  margin: 0 0 0.5rem;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-size: clamp(1.35rem, 3.2vw, 1.9rem);
  line-height: 1.2;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

export const Body = styled.p`
  margin: 0 0 1.1rem;
  max-width: 60ch;
  font-size: 0.97rem;
  line-height: 1.6;
  color: var(--text-secondary, rgba(224, 236, 244, 0.82));
`;

export const Facts = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0 0 1.35rem;
  padding: 0;
  list-style: none;
`;

export const Fact = styled.li`
  padding: 0.34rem 0.7rem;
  border-radius: 999px;
  font-family: 'Fira Code', ui-monospace, monospace;
  font-size: 0.74rem;
  color: var(--text-primary, #E0ECF4);
  background: rgba(96, 192, 240, 0.1);
  border: 1px solid rgba(96, 192, 240, 0.24);
`;

export const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
`;

/* Dual-Button Glow: blue background earns a purple glow. */
export const StartButton = styled.button`
  position: relative;
  overflow: hidden;
  min-height: 44px;
  padding: 0.75rem 1.5rem;
  border: 1px solid rgba(139, 92, 246, 0.5);
  border-radius: 12px;
  cursor: pointer;
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  background: linear-gradient(135deg, var(--bg-primary, #002060), var(--surface-elevated, #003080));
  box-shadow: 0 0 20px -4px var(--accent-glow, #8B5CF6);
  transition: transform 160ms ease, box-shadow 220ms ease;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 38%;
    height: 100%;
    background: linear-gradient(100deg, transparent, rgba(224, 236, 244, 0.26), transparent);
    animation: ${sheen} 3.6s ease-in-out infinite;
  }

  &:hover,
  &:focus-visible {
    transform: translateY(-1px);
    box-shadow: 0 0 30px -2px var(--accent-glow, #8B5CF6);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-glow, #8B5CF6);
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &::after { animation: none; }
    &:hover { transform: none; }
  }
`;

export const LaterButton = styled.button`
  min-height: 44px;
  padding: 0.75rem 1.1rem;
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.2));
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 0.9rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.75));

  &:hover { color: var(--text-primary, #E0ECF4); }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }
`;

