/**
 * FILE: HomeTabVisionHero.styles.ts
 * PURPOSE: Hero, avatar, stat, and lens styles for Creator Observatory.
 */

import styled, { css } from 'styled-components';

const focusRing = css`
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }
`;

export const HeroBanner = styled.section`
  position: relative;
  min-height: 286px;
  overflow: hidden;
  border-radius: 24px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 34%, transparent);
  background:
    radial-gradient(circle at 70% 14%, color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent), transparent 22rem),
    linear-gradient(180deg, color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent), color-mix(in srgb, var(--bg-base, #0A0A0F) 92%, transparent)),
    var(--bg-base, #0A0A0F);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent),
    0 22px 44px color-mix(in srgb, var(--bg-base, #0A0A0F) 62%, transparent),
    0 0 48px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent);
`;

export const HeroRangesLayer = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.96;
`;

export const HeroContent = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: clamp(1rem, 2vw, 2rem);
  align-items: start;
  padding: clamp(1.25rem, 2vw, 2rem) clamp(1rem, 2.4vw, 2.25rem) 1.4rem;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const AvatarFrame = styled.div`
  --avatar-size: clamp(104px, 10vw, 148px);
  position: relative;
  width: var(--avatar-size);
  height: var(--avatar-size);
  border-radius: 50%;
  padding: 4px;
  background: conic-gradient(from 90deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6), var(--accent-gold, #C6A84B), var(--accent-primary, #60C0F0));
  box-shadow:
    0 0 34px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 44%, transparent),
    0 0 56px color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
`;

export const AvatarInner = styled.div`
  width: 100%;
  height: 100%;
  border-radius: inherit;
  overflow: hidden;
  border: 2px solid color-mix(in srgb, var(--bg-base, #0A0A0F) 78%, transparent);
  background: var(--bg-elevated, #141419);

  img { width: 100%; height: 100%; object-fit: cover; display: block; }
`;

export const LevelBadgeAnchor = styled.div`
  position: absolute;
  right: -4px;
  bottom: -8px;
`;

export const LevelHexBox = styled.div<{ $size: number }>`
  width: ${({ $size }) => $size}px;
  aspect-ratio: 1 / 1.15;
  clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
  background: linear-gradient(160deg, var(--accent-gold, #C6A84B), color-mix(in srgb, var(--accent-gold, #C6A84B) 54%, var(--bg-base, #0A0A0F)));
  display: flex;
  align-items: center;
  justify-content: center;
  filter: drop-shadow(0 8px 16px color-mix(in srgb, var(--accent-gold, #C6A84B) 34%, transparent));

  &::before {
    content: '';
    position: absolute;
    inset: 2px;
    clip-path: inherit;
    background: linear-gradient(160deg, color-mix(in srgb, var(--accent-gold, #C6A84B) 12%, var(--bg-base, #0A0A0F)), var(--bg-base, #0A0A0F));
  }

  span {
    position: relative;
    color: var(--accent-gold, #C6A84B);
    font: 900 0.95rem/1 var(--font-data, 'Fira Code', monospace);
  }
`;

export const IdentityBlock = styled.div`
  min-width: 0;
  padding-top: 0.35rem;
`;

export const NameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
`;

export const HeroName = styled.h1`
  margin: 0;
  color: var(--text-heading, var(--text-primary, #E0ECF4));
  font: 800 clamp(2.05rem, 4.2vw, 3.25rem)/0.98 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
  letter-spacing: 0;
`;

export const VerifiedDot = styled.span`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent-primary, #60C0F0);
  color: var(--text-inverse, #0F172A);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 16px color-mix(in srgb, var(--accent-primary, #60C0F0) 60%, transparent);
`;

export const HeroMeta = styled.div`
  display: flex;
  gap: 0.55rem;
  flex-wrap: wrap;
  align-items: center;
  margin-top: 0.55rem;
  color: var(--vision-soft);
  font: 700 0.9rem/1.2 var(--font-ui, 'Sora', sans-serif);
`;

export const HeroTagline = styled.p`
  margin: 0.75rem 0 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 78%, transparent);
  font: italic 1rem/1.5 var(--font-drama, 'Cormorant Garamond', serif);
`;

export const StatsStrip = styled.div`
  grid-column: 2;
  display: flex;
  gap: clamp(0.9rem, 1.7vw, 1.75rem);
  align-items: flex-start;
  padding-top: 0.65rem;

  @media (max-width: 560px) {
    grid-column: 1 / -1;
    flex-wrap: wrap;
  }
`;

export const StatBlock = styled.div`
  min-width: 78px;
`;

export const StatLabel = styled.span`
  display: block;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 54%, transparent));
  font: 800 0.64rem/1 var(--font-data, 'Fira Code', monospace);
  text-transform: uppercase;
  letter-spacing: 0.12em;
`;

export const StatValue = styled.strong<{ $gold?: boolean }>`
  display: block;
  margin-top: 0.34rem;
  color: ${({ $gold }) => ($gold ? 'var(--accent-gold, #C6A84B)' : 'var(--text-primary, #E0ECF4)')};
  font: 800 1.35rem/1 var(--font-ui, 'Sora', sans-serif);
`;

export const HeroActionRow = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  flex-wrap: wrap;
  padding: 0 clamp(1rem, 2.4vw, 2.25rem) 1.5rem;
`;

export const LensStrip = styled.nav`
  display: flex;
  align-items: flex-start;
  gap: clamp(0.75rem, 1.4vw, 1.35rem);
  overflow-x: auto;
  padding: 1.1rem 0.2rem 0.2rem;
`;

export const LensButton = styled.button<{ $active?: boolean }>`
  min-width: 76px;
  border: 0;
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
  cursor: pointer;
  ${focusRing}

  span {
    font: 800 0.75rem/1 var(--font-ui, 'Sora', sans-serif);
    color: ${({ $active }) => ($active ? 'var(--text-primary, #E0ECF4)' : 'var(--vision-soft)')};
  }
`;

export const LensPuck = styled.div<{ $active?: boolean }>`
  width: 60px;
  height: 60px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $active }) => ($active
    ? 'linear-gradient(160deg, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 45%, transparent), var(--vision-panel-deep))'
    : 'linear-gradient(160deg, var(--vision-panel), var(--vision-panel-deep))')};
  border: 1px solid ${({ $active }) => ($active ? 'var(--accent-secondary, #8B5CF6)' : 'var(--vision-border)')};
  box-shadow: ${({ $active }) => ($active ? '0 0 26px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 42%, transparent)' : 'none')};

  svg { color: ${({ $active }) => ($active ? 'var(--text-primary, #E0ECF4)' : 'var(--accent-primary, #60C0F0)')}; }
`;
