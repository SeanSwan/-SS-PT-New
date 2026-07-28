/**
 * ============================================================================
 * FILE: ObservatoryCoverHero.styles.ts
 * PURPOSE: Styles for the full-width top cover on all /user-dashboard tabs.
 *          Edge-to-edge cover strip carrying the user's
 *          REAL cover composition (photo / collage / carousel / crossfade),
 *          a compact identity strip, and the Edit Cover / Edit Profile /
 *          Share action cluster.
 * KEY DECISIONS:
 * - True full-bleed: the hero mounts OUTSIDE ContentWrapper, so no negative
 *   viewport-margin tricks and no rail clearance offsets are needed.
 * - Tight bottom edge: a single hairline + small gap replaces the old
 *   3rem banner margin + rail clearance the retired ProfileHeader needed.
 * - Tokens with Crystalline fallbacks (rule 6); 44px touch targets (rule 2);
 *   reduced-motion respected by the media layer + GlowSweep it hosts.
 * ============================================================================
 */
import styled from 'styled-components';

export const CoverHeroSection = styled.section`
  position: relative;
  width: 100%;
  height: clamp(220px, var(--cover-hero-height, 320px), 620px);
  overflow: hidden;
  background:
    radial-gradient(ellipse 80% 60% at 30% 20%, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent) 0%, transparent 60%),
    radial-gradient(ellipse 70% 55% at 75% 35%, color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent) 0%, transparent 65%),
    linear-gradient(180deg, var(--bg-base, #0A0A0F) 0%, color-mix(in srgb, var(--bg-elevated, #141419) 92%, var(--accent-secondary, #8B5CF6) 8%) 60%, var(--bg-base, #0A0A0F) 100%);
  border-bottom: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);

  @media (max-width: 768px) {
    height: clamp(180px, calc(var(--cover-hero-height, 320px) * 0.72), 440px);
  }

  @media (max-width: 430px) {
    height: clamp(170px, calc(var(--cover-hero-height, 320px) * 0.66), 400px);
  }

  @media (min-width: 2560px) {
    height: clamp(300px, var(--cover-hero-height, 420px), 720px);
  }

  @media (min-width: 3840px) {
    height: clamp(360px, var(--cover-hero-height, 500px), 860px);
  }
`;

/* Hosts the same UserDashboardBannerMediaLayer Home/feed covers use. The
   media layer's children are absolutely positioned against this box. */
export const CoverMediaHost = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;
`;

export const CoverFallbackLayer = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.96;

  svg {
    width: 100%;
    height: 100%;
    display: block;
  }
`;

/* Legibility scrim — deepens toward the bottom where identity + actions sit. */
export const CoverScrim = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--bg-base, #0A0A0F) 14%, transparent) 0%,
    transparent 38%,
    color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, transparent) 100%
  );
`;

export const CoverForeground = styled.div`
  position: absolute;
  inset: auto 0 0 0;
  z-index: 2;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  /* Wrap on narrow phones so the 44px action row never crushes the name. */
  flex-wrap: wrap;
  gap: 0.5rem 0.85rem;
  padding: 0 clamp(0.85rem, 2.4vw, 2.25rem) clamp(0.75rem, 1.4vw, 1.15rem);
`;

export const CoverIdentity = styled.div`
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
`;

export const CoverAvatarButton = styled.button`
  position: relative;
  flex: 0 0 auto;
  width: clamp(112px, 8vw, 152px);
  height: clamp(112px, 8vw, 152px);
  border-radius: 50%;
  padding: 4px;
  border: 0;
  cursor: pointer;
  background: conic-gradient(from 90deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6), var(--accent-gold, #C6A84B), var(--accent-primary, #60C0F0));
  box-shadow: 0 0 34px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 42%, transparent);

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }

  @media (max-width: 768px) {
    width: clamp(58px, 17vw, 78px);
    height: clamp(58px, 17vw, 78px);
    padding: 3px;
    box-shadow: 0 0 26px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 38%, transparent);
  }

  @media (min-width: 2560px) {
    width: clamp(148px, 5.2vw, 176px);
    height: clamp(148px, 5.2vw, 176px);
  }

  @media (min-width: 3840px) {
    width: clamp(160px, 4.6vw, 192px);
    height: clamp(160px, 4.6vw, 192px);
  }
`;

export const CoverAvatarInner = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  overflow: hidden;
  border: 2px solid color-mix(in srgb, var(--bg-base, #0A0A0F) 78%, transparent);
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  font: 800 1.1rem/1 var(--font-ui, 'Sora', sans-serif);

  img { width: 100%; height: 100%; object-fit: cover; display: block; }
`;

export const CoverAvatarCameraBadge = styled.span`
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: clamp(24px, 2.2vw, 32px);
  height: clamp(24px, 2.2vw, 32px);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-primary, #60C0F0);
  color: var(--text-inverse, #0F172A);
  border: 2px solid var(--bg-base, #0A0A0F);
`;

export const CoverNameBlock = styled.div`
  min-width: 0;
`;

export const CoverName = styled.h1`
  margin: 0;
  color: var(--text-heading, var(--text-primary, #E0ECF4));
  font: 800 clamp(1.25rem, 2.4vw, 1.9rem)/1.05 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 2px 14px color-mix(in srgb, var(--bg-base, #0A0A0F) 70%, transparent);
`;

export const CoverMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.3rem;
  min-width: 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent);
  font: 700 0.82rem/1.2 var(--font-ui, 'Sora', sans-serif);

  > span:first-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

export const CoverRankTag = styled.span`
  display: inline-flex;
  align-items: center;
  width: fit-content;
  max-width: min(100%, 34rem);
  min-height: 30px;
  margin-top: 0.38rem;
  padding: 0.32rem 0.68rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 46%, transparent);
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 16%, transparent);
  color: var(--text-primary, #E0ECF4);
  font: 800 0.68rem/1.15 var(--font-data, 'Fira Code', monospace);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: normal;
  overflow-wrap: anywhere;
`;

export const CoverActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 0 0 auto;
`;

/* 44px always-visible icon circles (no hover-only actions). $gold marks the
   Edit Cover entry — same gilded language as the Home hero's cover button. */
export const CoverActionButton = styled.button<{ $gold?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  border-radius: 999px;
  cursor: pointer;
  border: 1px solid ${({ $gold }) => ($gold
    ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 55%, transparent)'
    : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 32%, transparent)')};
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 58%, transparent);
  color: ${({ $gold }) => ($gold ? 'var(--accent-gold, #C6A84B)' : 'var(--text-primary, #E0ECF4)')};
  transition: background 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    background: ${({ $gold }) => ($gold
    ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 16%, var(--bg-base, #0A0A0F))'
    : 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, var(--bg-base, #0A0A0F))')};
    box-shadow: 0 0 18px ${({ $gold }) => ($gold
    ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 30%, transparent)'
    : 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent)')};
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/* Embedded SocialCoverEditor lands below the strip, aligned to content width. */
export const CoverEditorDock = styled.div`
  max-width: 1100px;
  margin: 0.85rem auto 0;
  padding: 0 clamp(0.75rem, 2vw, 2rem);
`;
