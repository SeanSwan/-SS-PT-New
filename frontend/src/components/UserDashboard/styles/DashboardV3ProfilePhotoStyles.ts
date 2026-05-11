/**
 * Profile photo frame styles for UserDashboard V3.
 * Extracted without CSS behavior changes.
 */

import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';
import { pulseScale, subtleGlow } from './DashboardV3Animations';

export const ProfileImageSection = styled.div`
  position: absolute;
  top: 230px;  /* 320px cover height - 90px (half of 180px avatar) = center on cover boundary */
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;

  @media (max-width: 768px) {
    top: 150px;  /* 220px cover height - 70px (half of 140px avatar) = center on cover boundary */
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    top: 120px;
  }

  @media (min-width: 2560px) {
    top: 330px;
  }

  @media (min-width: 3840px) {
    top: 430px;
  }
`;

export const ProfileImageContainer = styled(motion.div)`
  position: relative;
  width: 180px;
  height: 180px;
  margin: 0 auto;

  /* Professional ring effect */
  &::before {
    content: '';
    position: absolute;
    top: -8px;
    left: -8px;
    right: -8px;
    bottom: -8px;
    border-radius: 50%;
    background: conic-gradient(
      from 0deg,
      var(--accent-primary, #60C0F0) 0deg,
      var(--accent-secondary, #8B5CF6) 120deg,
      var(--accent-gold, #C6A84B) 240deg,
      var(--accent-primary, #60C0F0) 360deg
    );
    animation: ${pulseScale} 4s ease-in-out infinite;
    opacity: 0.8;
  }

  &::after {
    content: '';
    position: absolute;
    top: -4px;
    left: -4px;
    right: -4px;
    bottom: -4px;
    border-radius: 50%;
    background: var(--bg-base);
    z-index: 1;
  }

  @media (max-width: 768px) {
    width: 140px;
    height: 140px;

    &::before {
      top: -6px;
      left: -6px;
      right: -6px;
      bottom: -6px;
    }

    &::after {
      top: -3px;
      left: -3px;
      right: -3px;
      bottom: -3px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &::before {
      animation: none;
    }
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    width: 120px;
    height: 120px;

    &::before {
      top: -5px;
      left: -5px;
      right: -5px;
      bottom: -5px;
    }

    &::after {
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
    }
  }

  @media (min-width: 2560px) {
    width: 220px;
    height: 220px;
  }

  @media (min-width: 3840px) {
    width: 260px;
    height: 260px;
  }
`;

export const ProfileImage = styled.div<{ $image?: string }>`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  position: relative;
  overflow: hidden;
  z-index: 2;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.1),
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 4px 16px rgba(0, 0, 0, 0.2),
    inset 0 2px 4px rgba(255, 255, 255, 0.1);
  animation: ${subtleGlow} 6s ease-in-out infinite;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  ${({ $image }) => $image
    ? css`
      /* 2026-05-10 SLICE 1 (Security CHAIN-1 + Codex round-2): the consumer
         pre-sanitises via sanitizeImageUrl(), but defense in depth: quote
         the URL and strip backslash/quote chars so a future caller that
         skips sanitation cannot break out of the url("...") wrapper. */
      background: url("${$image.replace(/[\\"]/g, '')}");
      background-size: cover;
      background-position: center;
      border: 4px solid var(--bg-base, #002060);
    `
    : css`
      background: linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6));
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-white, #E0ECF4);
      font-size: 3.5rem;
      font-weight: 700;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
      letter-spacing: 0.05em;
      border: 5px solid transparent;
    `
  }

  &:hover {
    transform: scale(1.05);
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.2),
      0 12px 40px rgba(0, 0, 0, 0.5),
      0 6px 20px rgba(0, 0, 0, 0.3),
      inset 0 2px 4px rgba(255, 255, 255, 0.2);
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    &:hover { transform: none; }
  }

  @media (max-width: 768px) {
    font-size: 2.5rem;
    border-width: 3px;
    &:hover { transform: none; }
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    font-size: 2rem;
    border-width: 2px;
  }

  @media (min-width: 2560px) {
    font-size: 4.5rem;
  }

  @media (min-width: 3840px) {
    font-size: 5.5rem;
  }
`;

/* Phase 20: Hex Level badge overlaid on the avatar's lower-left.
   Reads the real level value from useGamificationData; no hardcoded number.
   Pure CSS - clip-path hex + token gradient. No motion. GPU-cheap on
   iPhone XR class.
   Phase 20.1 B3: flat-color background declared first as iOS <= 16.1
   fallback (color-mix is Safari 16.2+). Capable browsers see the
   gold gradient; older iOS sees the solid Gilded Fern token color. */
