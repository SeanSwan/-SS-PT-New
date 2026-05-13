/**
 * FILE: ClientObservatoryHero.styles.ts
 * PURPOSE: Profile hero and lens-tab styling for the client overview.
 */

import styled, { keyframes } from 'styled-components';
import { focusRing, ObservatoryCard } from './ClientObservatoryShell.styles';

const lensGlow = keyframes`
  0%, 100% { opacity: 0.54; transform: scale(1); }
  50% { opacity: 0.9; transform: scale(1.04); }
`;

export const HeroCard = styled(ObservatoryCard)`
  min-height: 430px;
  border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  background:
    linear-gradient(115deg, color-mix(in srgb, var(--bg-base, #0A0A0F) 88%, transparent), color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, transparent)),
    var(--bg-base, #0A0A0F);

  &::after {
    content: '';
    position: absolute;
    inset: auto -10% -34% 28%;
    height: 62%;
    background: radial-gradient(circle, color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent), transparent 68%);
    filter: blur(22px);
    animation: ${lensGlow} 7s ease-in-out infinite;
  }

  @media (max-width: 820px) {
    min-height: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    &::after { animation: none; }
  }
`;

export const HeroGrid = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 0.88fr) minmax(260px, 0.55fr);
  gap: clamp(1rem, 2vw, 2rem);
  padding: clamp(1.15rem, 2vw, 2rem);

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

export const HeroCopy = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1.2rem;
  min-width: 0;
`;

export const ProfileRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

export const AvatarShell = styled.div`
  width: clamp(74px, 8vw, 108px);
  aspect-ratio: 1;
  border-radius: 50%;
  padding: 3px;
  background: conic-gradient(from 210deg, var(--accent-primary, #60C0F0), var(--accent-gold, #C6A84B), var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0));
  box-shadow: 0 0 30px color-mix(in srgb, var(--accent-primary, #60C0F0) 32%, transparent);
`;

export const AvatarImage = styled.img`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
  background: var(--bg-elevated, #141419);
`;

export const ProfileText = styled.div`
  min-width: 0;
`;

export const HeroKicker = styled.span`
  display: inline-flex;
  color: var(--accent-gold, #C6A84B);
  font: 800 0.75rem/1 'Sora', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0;
`;

export const HeroTitle = styled.h1`
  margin: 0.25rem 0 0;
  color: var(--text-primary, #E0ECF4);
  font: 900 clamp(2.15rem, 5vw, 5.1rem)/0.92 'Plus Jakarta Sans', sans-serif;
  letter-spacing: 0;
`;

export const HeroHandle = styled.span`
  display: block;
  margin-top: 0.55rem;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 68%, transparent));
  font: 700 0.95rem/1 'Sora', sans-serif;
`;

export const HeroSubline = styled.p`
  max-width: 48rem;
  margin: 0;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent));
  font: 600 clamp(0.94rem, 1.2vw, 1.05rem)/1.65 'Sora', sans-serif;
`;

export const HeroStats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

export const HeroStat = styled.div`
  min-height: 78px;
  padding: 0.85rem;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  background: color-mix(in srgb, var(--bg-elevated, #141419) 76%, transparent);
`;

export const StatValue = styled.strong`
  display: block;
  color: var(--text-primary, #E0ECF4);
  font: 900 clamp(1.25rem, 2vw, 1.75rem)/1 'Fira Code', monospace;
`;

export const StatLabel = styled.span`
  display: block;
  margin-top: 0.35rem;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 64%, transparent));
  font: 700 0.72rem/1.2 'Sora', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0;
`;

export const HeroActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

export const ArtworkPanel = styled.div`
  position: relative;
  min-height: 320px;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 22%, transparent);
  background: var(--bg-elevated, #141419);

  @media (max-width: 820px) {
    min-height: 260px;
  }
`;

export const ArtworkImage = styled.img`
  width: 100%;
  height: 100%;
  min-height: inherit;
  object-fit: cover;
  display: block;
  filter: saturate(1.08) contrast(1.04);
`;

export const ArtworkOverlay = styled.div`
  position: absolute;
  inset: auto 0 0;
  padding: 1rem;
  background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--bg-base, #0A0A0F) 88%, transparent));
`;

export const TierBadge = styled.span<{ $tone: string }>`
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0.45rem 0.8rem;
  border-radius: 999px;
  color: ${({ $tone }) => {
    if ($tone === 'crystal') return 'var(--accent-primary, #60C0F0)';
    if ($tone === 'gold') return 'var(--accent-gold, #C6A84B)';
    if ($tone === 'platinum') return 'var(--accent-secondary, #8B5CF6)';
    return 'var(--text-primary, #E0ECF4)';
  }};
  border: 1px solid currentColor;
  background: color-mix(in srgb, currentColor 10%, transparent);
  font: 800 0.78rem/1 'Sora', sans-serif;
`;

export const LensRail = styled.nav`
  display: grid;
  grid-template-columns: repeat(6, minmax(96px, 1fr));
  gap: 0.75rem;
  box-sizing: border-box;
  padding: 0 clamp(1.15rem, 2vw, 2rem) clamp(1.15rem, 2vw, 2rem);

  @media (max-width: 900px) {
    display: flex;
    overflow-x: auto;
    padding-bottom: 0.25rem;
    scroll-snap-type: x proximity;
  }
`;

export const LensButton = styled.button<{ $active: boolean }>`
  min-height: 92px;
  border: 1px solid ${({ $active }) => (
    $active
      ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 54%, transparent)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent)'
  )};
  border-radius: 18px;
  padding: 0.8rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  color: ${({ $active }) => ($active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-primary, #E0ECF4)')};
  background: ${({ $active }) => (
    $active
      ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 13%, var(--bg-elevated, #141419))'
      : 'color-mix(in srgb, var(--bg-elevated, #141419) 84%, transparent)'
  )};
  box-shadow: ${({ $active }) => (
    $active ? '0 0 24px color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent)' : 'none'
  )};
  cursor: pointer;
  scroll-snap-align: start;
  transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
  ${focusRing}

  span {
    font: 800 0.75rem/1 'Sora', sans-serif;
    letter-spacing: 0;
  }

  &:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 42%, transparent);
  }

  @media (max-width: 900px) {
    min-width: 104px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover { transform: none; }
  }
`;
