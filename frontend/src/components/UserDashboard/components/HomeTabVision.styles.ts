/**
 * FILE: HomeTabVision.styles.ts
 * PURPOSE: Theme-aware Creator Observatory layout primitives.
 */

import styled, { css, keyframes } from 'styled-components';

const shimmer = keyframes`
  0%, 100% { transform: translate3d(-12%, 0, 0); opacity: 0.32; }
  50% { transform: translate3d(12%, -2%, 0); opacity: 0.68; }
`;

const focusRing = css`
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }
`;

export const CreatorPage = styled.section`
  --vision-panel: color-mix(in srgb, var(--bg-elevated, #141419) 78%, transparent);
  --vision-panel-deep: color-mix(in srgb, var(--bg-base, #0A0A0F) 88%, transparent);
  --vision-border: color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  --vision-soft: color-mix(in srgb, var(--text-primary, #E0ECF4) 62%, transparent);
  position: relative;
  min-height: calc(100vh - 96px);
  margin: -1rem clamp(-2.5rem, -2vw, -0.75rem) 0;
  padding: clamp(1rem, 1.6vw, 1.5rem) clamp(0.85rem, 1.8vw, 1.75rem) 5.5rem;
  overflow: hidden;
  color: var(--text-primary, #E0ECF4);

  &::before {
    content: '';
    position: absolute;
    inset: -18% -10% auto;
    height: 70%;
    background:
      radial-gradient(circle at 15% 4%, color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent), transparent 28rem),
      radial-gradient(circle at 82% 8%, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 22%, transparent), transparent 31rem),
      radial-gradient(circle at 50% 65%, color-mix(in srgb, var(--accent-gold, #C6A84B) 10%, transparent), transparent 34rem);
    filter: blur(2px);
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image: linear-gradient(color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, transparent) 1px, transparent 1px),
      linear-gradient(90deg, color-mix(in srgb, var(--accent-primary, #60C0F0) 4%, transparent) 1px, transparent 1px);
    background-size: 72px 72px;
    mask-image: linear-gradient(180deg, rgba(0,0,0,0.58), transparent 62%);
  }
`;

export const CreatorShell = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(216px, 260px) minmax(0, 1fr) minmax(300px, 380px);
  gap: clamp(1rem, 1.6vw, 1.5rem);
  max-width: 1760px;
  margin: 0 auto;

  @media (max-width: 1500px) and (min-width: 1321px) {
    grid-template-columns: minmax(220px, 260px) minmax(0, 1fr) minmax(300px, 340px);
    gap: 16px;
  }

  @media (max-width: 1320px) {
    grid-template-columns: minmax(210px, 240px) minmax(0, 1fr);
  }

  @media (max-width: 1023px) {
    grid-template-columns: 1fr;
  }
`;

export const LeftRail = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;

  @media (max-width: 1023px) {
    display: none;
  }
`;

export const CenterColumn = styled.main`
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  min-width: 0;
`;

export const RightRail = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;

  @media (max-width: 1320px) {
    grid-column: 2;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 1023px) {
    grid-column: auto;
  }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

export const Panel = styled.div<{ $tone?: 'default' | 'gold' | 'violet' | 'cyan' }>`
  position: relative;
  overflow: hidden;
  border-radius: 22px;
  padding: clamp(0.9rem, 1.25vw, 1.15rem);
  background:
    linear-gradient(160deg, var(--vision-panel), var(--vision-panel-deep)),
    var(--bg-elevated, #141419);
  border: 1px solid ${({ $tone }) => {
    if ($tone === 'gold') return 'color-mix(in srgb, var(--accent-gold, #C6A84B) 42%, transparent)';
    if ($tone === 'violet') return 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 36%, transparent)';
    if ($tone === 'cyan') return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 38%, transparent)';
    return 'var(--vision-border)';
  }};
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--accent-primary, #60C0F0) 9%, transparent),
    0 16px 34px color-mix(in srgb, var(--bg-base, #0A0A0F) 62%, transparent);
`;

export const SupportShell = styled(CreatorShell)`
  margin-top: 1rem;

  @media (min-width: 1281px) {
    > ${CenterColumn} {
      grid-column: 2;
    }
  }
`;

export const BrandBlock = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.15rem 0.25rem 0;
`;

export const BrandMark = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 13px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 34%, transparent);
  box-shadow: 0 0 20px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 34%, transparent);

  img { width: 100%; height: 100%; object-fit: cover; display: block; }
`;

export const Eyebrow = styled.span<{ $tone?: 'gold' | 'cyan' | 'violet' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: ${({ $tone }) => {
    if ($tone === 'gold') return 'var(--accent-gold, #C6A84B)';
    if ($tone === 'violet') return 'var(--accent-secondary, #8B5CF6)';
    return 'var(--accent-primary, #60C0F0)';
  }};
  font: 800 0.68rem/1 var(--font-data, 'Fira Code', monospace);
  text-transform: uppercase;
  letter-spacing: 0.12em;
`;

export const TopBar = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.75rem;

  @media (max-width: 700px) {
    justify-content: space-between;
  }
`;

export const MobileBrandText = styled.div`
  flex: 1;
  min-width: 0;
  display: none;

  strong,
  span {
    display: block;
    white-space: nowrap;
  }

  strong {
    color: var(--text-heading, var(--text-primary, #E0ECF4));
    font: 900 1rem/1.05 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
  }

  span {
    color: var(--accent-primary, #60C0F0);
    font: 800 0.7rem/1.2 var(--font-ui, 'Sora', sans-serif);
  }

  @media (max-width: 1023px) {
    display: block;
  }
`;

export const IconButton = styled.button`
  min-width: 44px;
  height: 44px;
  border-radius: 14px;
  border: 1px solid var(--vision-border);
  background: linear-gradient(160deg, var(--vision-panel), var(--vision-panel-deep));
  color: var(--text-primary, #E0ECF4);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  ${focusRing}

  &:hover { border-color: var(--accent-primary, #60C0F0); }
`;

export const NotifyDot = styled.span`
  position: absolute;
  top: 7px;
  right: 7px;
  min-width: 16px;
  height: 16px;
  border-radius: 999px;
  padding: 0 4px;
  background: var(--accent-secondary, #8B5CF6);
  color: var(--text-inverse, #0F172A);
  font: 900 0.58rem/16px var(--font-ui, 'Sora', sans-serif);
`;

export const XpPill = styled.button`
  min-height: 44px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 52%, transparent);
  background: linear-gradient(180deg, color-mix(in srgb, var(--accent-gold, #C6A84B) 14%, transparent), var(--vision-panel-deep));
  color: var(--accent-gold, #C6A84B);
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0 0.85rem;
  font: 800 0.75rem/1 var(--font-data, 'Fira Code', monospace);
  cursor: pointer;
  ${focusRing}

  span {
    width: 24px;
    height: 24px;
    border-radius: 7px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--accent-gold, #C6A84B);
    color: var(--text-inverse, #0F172A);
  }
`;

export const GlowSweep = styled.div`
  position: absolute;
  inset: -20% -30%;
  pointer-events: none;
  background: linear-gradient(110deg, transparent, color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent), transparent);
  animation: ${shimmer} 8s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
