/**
 * Banner and cover-image styles for the canonical UserDashboard V3 surface.
 * Profile action controls live in DashboardV3BannerActionsStyles.ts.
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';

export const ProfileHeader = styled(motion.div)`
  position: relative;
  overflow: visible;
  margin-bottom: 3rem;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
  width: 100vw;
  pointer-events: none;

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

export const BackgroundSection = styled.div<{ $backgroundImage?: string | null }>`
  height: 320px;
  position: relative;
  background: var(--bg-elevated, #141419);
  background:
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
    );
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  overflow: hidden;
  contain: paint;

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

  .upload-overlay {
    display: none;
  }

  @media (hover: none) and (pointer: coarse) {
    &::before {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &::before {
      opacity: ${({ $backgroundImage }) => ($backgroundImage ? 0 : 0.5)};
    }
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

export const BannerImage = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
  z-index: 0;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
`;
