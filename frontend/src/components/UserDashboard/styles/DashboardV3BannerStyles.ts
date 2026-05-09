/**
 * Banner and cover-image styles for the canonical UserDashboard V3 surface.
 * Extracted from DashboardV3Styles.ts without CSS behavior changes.
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';

export const ProfileHeader = styled(motion.div)`
  position: relative;
  overflow: visible;
  margin-bottom: 3rem;
  /* Full-width: break out of ContentWrapper max-width */
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
  width: 100vw;

  @media (max-width: 768px) {
    margin-bottom: 2rem;
  }

  @media (max-width: 320px) {
    margin-bottom: 1.5rem;
  }

  @media (min-width: 2560px) {
    margin-bottom: 4rem;
  }

  @media (min-width: 3840px) {
    margin-bottom: 5rem;
  }
`;

export const BackgroundSection = styled.div<{ $backgroundImage?: string }>`
  height: 320px;
  position: relative;
  /* Phase 20: when bannerPhoto is unset, render a token-driven cinematic
     aurora layer instead of a flat gradient. Real banner photos take
     precedence (the url() branch is unchanged).
     Phase 20.1 B3: flat-color background declared FIRST as the
     iOS <= 16.1 fallback. color-mix() is Safari 16.2+; on older
     devices the entire background rule would be invalid without this.
     CSS cascade picks the last-supported declaration; on capable
     browsers the gradient stack wins, on iOS 16.1 the flat color holds.
     Phase 20.1 H4 doc: the --accent-secondary fallback (Wing Purple)
     replaces the prior Swan Lavender to match the project-wide
     fallback convention; verified vs OnboardClientCard / BadgeCreator
     / BodyMap / VaultDecryption in the rule-54 sweep. */
  background: ${({ $backgroundImage }) =>
    $backgroundImage
      ? `url(${$backgroundImage}) center / cover no-repeat`
      : `var(--bg-elevated, #141419)`
  };
  background:
    ${({ $backgroundImage }) =>
      $backgroundImage
        ? `url(${$backgroundImage}) center / cover no-repeat`
        : `
        radial-gradient(
          ellipse 80% 60% at 30% 20%,
          color-mix(in srgb, var(--accent-secondary, #8B5CF6) 35%, transparent) 0%,
          transparent 60%
        ),
        radial-gradient(
          ellipse 70% 55% at 75% 35%,
          color-mix(in srgb, var(--accent-primary, #60C0F0) 32%, transparent) 0%,
          transparent 65%
        ),
        radial-gradient(
          ellipse 100% 80% at 50% 100%,
          color-mix(in srgb, var(--accent-gold, #C6A84B) 18%, transparent) 0%,
          transparent 70%
        ),
        linear-gradient(
          180deg,
          var(--bg-base, #0A0A0F) 0%,
          color-mix(in srgb, var(--bg-elevated, #141419) 92%, var(--accent-secondary, #8B5CF6) 8%) 60%,
          var(--bg-base, #0A0A0F) 100%
        )
      `
  };
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  overflow: hidden;
  contain: paint;

  /* Phase 20: aurora streak overlay - static SVG path approximating the
     mountain ridge / aurora sweep from the mockup. Hidden on touch /
     low-power devices and when prefers-reduced-motion is active.
     Pure CSS - no per-frame animation, no GPU compositing cost beyond
     the static painted layer. */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      radial-gradient(
        circle at 20% 10%,
        color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent) 0%,
        transparent 25%
      ),
      radial-gradient(
        circle at 85% 25%,
        color-mix(in srgb, var(--accent-gold, #C6A84B) 10%, transparent) 0%,
        transparent 22%
      );
    opacity: ${({ $backgroundImage }) => ($backgroundImage ? 0 : 0.85)};
    pointer-events: none;
    z-index: 0;
  }

  /* Bottom gradient fade into page background */
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 120px;
    background: linear-gradient(transparent, var(--bg-base, #0A0A0F));
    z-index: 1;
    pointer-events: none;
  }

  /* Hide the old overlay - replaced by BannerUploadButton */
  .upload-overlay {
    display: none;
  }

  /* Performance: simplify aurora on touch / low-power devices.
     iPhone XR class + Android mid-tier benefit. The radial layers
     stay on the base background, only the secondary ::before
     overlay is dropped. */
  @media (hover: none) and (pointer: coarse) {
    &::before { display: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    &::before { opacity: ${({ $backgroundImage }) => ($backgroundImage ? 0 : 0.5)}; }
  }

  @media (max-width: 768px) {
    height: 220px;
  }

  @media (max-width: 430px) {
    height: 200px;
  }

  @media (max-width: 340px) {
    height: 160px;
  }

  @media (min-width: 2560px) {
    height: 420px;
  }

  @media (min-width: 3840px) {
    height: 520px;
  }
`;

// Small themed button to change cover photo (replaces full-overlay darkening)

export const BannerActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  width: min(100% - 2rem, 1440px);
  margin: 0.875rem auto 0;
  padding: 0 0.25rem;

  @media (max-width: 768px) {
    width: calc(100% - 1.5rem);
    margin-top: 0.625rem;
  }

  @media (min-width: 1920px) {
    width: min(100% - 4rem, 1760px);
  }

  @media (min-width: 2560px) {
    width: min(100% - 6rem, 2360px);
  }

  @media (min-width: 3840px) {
    width: min(100% - 8rem, 3440px);
  }
`;

export const BannerUploadButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  min-height: 44px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 30%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-base, #002060) 65%, transparent);
  backdrop-filter: blur(16px);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 3;
  letter-spacing: 0.02em;

  &:hover {
    opacity: 1;
    background: color-mix(in srgb, var(--bg-surface, #003080) 85%, transparent);
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 16px color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
    transform: translateY(-1px);
  }

  &:active {
    transform: scale(0.97);
  }

  svg {
    opacity: 0.9;
  }

  @media (max-width: 768px) {
    padding: 6px 10px;
    font-size: 0;
    gap: 0;
    border-radius: 50%;
    width: 44px;
    height: 44px;
    justify-content: center;
  }

  @media (max-width: 340px) {
    width: 44px;
    height: 44px;
  }
`;

// Top 3 badge showcase below banner
