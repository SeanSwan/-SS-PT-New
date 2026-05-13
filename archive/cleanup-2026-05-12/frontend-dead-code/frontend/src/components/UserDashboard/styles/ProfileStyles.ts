/**
 * ============================================================================
 * FILE: ProfileStyles.ts
 * PURPOSE: Profile header styled-components (banner, avatar, info, stats, buttons)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Defines all styled-components for the profile header area
 * including the banner image, profile picture with ring animation, user info,
 * stat counters, bio, and action buttons.
 * HOW IT FITS IN THE APP: Imported by ProfileBanner and ProfileHeaderInfo components
 * KEY DECISIONS: Separated from layout styles to stay under 300 lines
 */

import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';
import { slideInUp, subtleGlow, pulseScale } from './animations';
import { sanitizeImageUrl, cssUrlValue } from '../../../utils/imageUrl';

// ─────────────────────────────────────────────────────────────
// SECTION: Profile Header Container
// PURPOSE: Glassmorphic card wrapping the entire header area
// ─────────────────────────────────────────────────────────────

export const ProfileHeaderCard = styled(motion.div)`
  position: relative;
  border-radius: 24px;
  overflow: visible;
  margin-bottom: 3rem;
  background: ${({ theme }) => theme.gradients?.card || 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))'};
  backdrop-filter: blur(24px);
  border: 1px solid ${({ theme }) => theme.borders?.elegant || 'rgba(255,255,255,0.12)'};
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 0 8px 16px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.35), 0 12px 24px rgba(0, 0, 0, 0.25),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
    border-color: rgba(139, 92, 246, 0.15);
  }

  @media (max-width: 768px) { border-radius: 20px; margin-bottom: 2rem; &:hover { transform: none; } }
  @media (max-width: 320px) { border-radius: 16px; margin-bottom: 1.5rem; }
  @media (min-width: 2560px) { border-radius: 28px; margin-bottom: 4rem; }
  @media (min-width: 3840px) { border-radius: 32px; margin-bottom: 5rem; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Banner / Background
// PURPOSE: Full-width cover photo with upload overlay
// ─────────────────────────────────────────────────────────────

export const BackgroundSection = styled.div<{ $backgroundImage?: string }>`
  height: 320px;
  position: relative;
  border-radius: 24px 24px 0 0;
  background: ${({ $backgroundImage, theme }) => {
    const safe = $backgroundImage ? sanitizeImageUrl($backgroundImage) : null;
    return safe
      ? `linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.1) 100%), url(${cssUrlValue(safe)})`
      : theme.gradients?.hero || 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)';
  }};
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, transparent 50%, rgba(139, 69, 19, 0.05) 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  &:hover::before { opacity: 1; }

  &::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 120px;
    background: linear-gradient(transparent, var(--bg-base));
    z-index: 1;
  }

  .upload-overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s ease;
    z-index: 2;

    .upload-text {
      color: white;
      font-size: 1.2rem;
      font-weight: 600;
      margin-top: 0.75rem;
      text-align: center;
      letter-spacing: 0.025em;
    }
    .upload-icon {
      color: rgba(255, 255, 255, 0.9);
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
    }
  }
  &:hover .upload-overlay { opacity: 1; }

  @media (max-width: 768px) { height: 220px; background-attachment: scroll; }
  @media (max-width: 320px) { height: 180px; border-radius: 16px 16px 0 0; }
  @media (min-width: 2560px) { height: 420px; }
  @media (min-width: 3840px) { height: 520px; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Profile Image
// PURPOSE: Circular avatar with animated gradient ring
// ─────────────────────────────────────────────────────────────

export const ProfileImageSection = styled.div`
  position: absolute;
  top: 230px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;

  @media (max-width: 768px) { top: 150px; }
  @media (max-width: 320px) { top: 120px; }
  @media (min-width: 2560px) { top: 330px; }
  @media (min-width: 3840px) { top: 430px; }
`;

export const ProfileImageContainer = styled(motion.div)`
  position: relative;
  width: 180px;
  height: 180px;
  margin: 0 auto;

  &::before {
    content: '';
    position: absolute;
    top: -8px; left: -8px; right: -8px; bottom: -8px;
    border-radius: 50%;
    background: conic-gradient(
      from 0deg,
      ${({ theme }) => theme.colors?.primary || '#3B82F6'} 0deg,
      ${({ theme }) => theme.colors?.secondary || '#8B5CF6'} 120deg,
      ${({ theme }) => theme.colors?.accent || '#F59E0B'} 240deg,
      ${({ theme }) => theme.colors?.primary || '#3B82F6'} 360deg
    );
    animation: ${pulseScale} 4s ease-in-out infinite;
    opacity: 0.8;
  }

  &::after {
    content: '';
    position: absolute;
    top: -4px; left: -4px; right: -4px; bottom: -4px;
    border-radius: 50%;
    background: var(--bg-base);
    z-index: 1;
  }

  @media (max-width: 768px) { width: 140px; height: 140px;
    &::before { top: -6px; left: -6px; right: -6px; bottom: -6px; }
    &::after { top: -3px; left: -3px; right: -3px; bottom: -3px; }
  }
  @media (prefers-reduced-motion: reduce) { &::before { animation: none; } }
  @media (max-width: 320px) { width: 120px; height: 120px;
    &::before { top: -5px; left: -5px; right: -5px; bottom: -5px; }
    &::after { top: -2px; left: -2px; right: -2px; bottom: -2px; }
  }
  @media (min-width: 2560px) { width: 220px; height: 220px; }
  @media (min-width: 3840px) { width: 260px; height: 260px; }
`;

export const ProfileImage = styled.div<{ $image?: string }>`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  position: relative;
  overflow: hidden;
  z-index: 2;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1), 0 8px 32px rgba(0, 0, 0, 0.4),
    0 4px 16px rgba(0, 0, 0, 0.2), inset 0 2px 4px rgba(255, 255, 255, 0.1);
  animation: ${subtleGlow} 6s ease-in-out infinite;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  ${({ $image, theme }) => {
    const safe = $image ? sanitizeImageUrl($image) : null;
    return safe
      ? css`
        background: url(${cssUrlValue(safe)});
        background-size: cover;
        background-position: center;
        border: 4px solid var(--bg-base, #002060);
      `
      : css`
        background: linear-gradient(135deg, ${theme.colors?.primary || '#3B82F6'}, ${theme.colors?.secondary || '#8B5CF6'});
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 3.5rem;
        font-weight: 700;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
        letter-spacing: 0.05em;
        border: 5px solid transparent;
      `;
  }}

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2), 0 12px 40px rgba(0, 0, 0, 0.5),
      0 6px 20px rgba(0, 0, 0, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.2);
  }

  @media (prefers-reduced-motion: reduce) { animation: none; &:hover { transform: none; } }
  @media (max-width: 768px) { font-size: 2.5rem; border-width: 3px; &:hover { transform: none; } }
  @media (max-width: 320px) { font-size: 2rem; border-width: 2px; }
  @media (min-width: 2560px) { font-size: 4.5rem; }
  @media (min-width: 3840px) { font-size: 5.5rem; }
`;

export const ImageUploadButton = styled(motion.button)`
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg,
    ${({ theme }) => theme.colors?.primary || '#3B82F6'} 0%,
    ${({ theme }) => theme.colors?.secondary || '#8B5CF6'} 100%
  );
  border: 3px solid var(--bg-base, #002060);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 6px rgba(0, 0, 0, 0.2),
    inset 0 1px 2px rgba(255, 255, 255, 0.2);
  z-index: 3;

  &:hover {
    transform: scale(1.15) translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3),
      inset 0 1px 2px rgba(255, 255, 255, 0.3);
    background: linear-gradient(135deg,
      ${({ theme }) => theme.colors?.accent || '#F59E0B'} 0%,
      ${({ theme }) => theme.colors?.primary || '#3B82F6'} 100%
    );
  }
  &:active { transform: scale(1.05); }
  svg { filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3)); }

  @media (max-width: 768px) { width: 44px; height: 44px; bottom: 6px; right: 6px; border-width: 2px;
    &:hover { transform: scale(1.1); }
  }
  @media (prefers-reduced-motion: reduce) { &:hover { transform: none; } }
`;
