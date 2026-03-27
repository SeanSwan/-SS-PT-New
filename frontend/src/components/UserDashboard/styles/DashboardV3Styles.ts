/**
 * ============================================================================
 * FILE: DashboardV3Styles.ts
 * PURPOSE: All styled-components and keyframe animations for UserDashboard.V3.tsx
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Contains every styled-component, keyframe animation,
 * and the ErrorBoundary class extracted from UserDashboard.V3.tsx to keep
 * the main component file under 300 lines of logic.
 *
 * HOW IT FITS IN THE APP: Imported by UserDashboard.V3.tsx for all visual
 * presentation. The main file retains only hooks, state, handlers, and JSX.
 *
 * KEY DECISIONS: Pure extraction — no style changes, no prop changes, no
 * behavioral changes. Large file size is acceptable per CLAUDE.md exceptions
 * for style/type definition files.
 */

import styled, { keyframes, css } from 'styled-components';
import { motion } from 'framer-motion';

// ─────────────────────────────────────────────────────────────
// SECTION: Keyframe Animations
// PURPOSE: All reusable CSS animations for the V3 dashboard
// ─────────────────────────────────────────────────────────────

export const slideInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const slideInLeft = keyframes`
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

export const slideInRight = keyframes`
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

export const subtleGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.1), 0 8px 32px rgba(0, 0, 0, 0.12);
  }
  50% {
    box-shadow: 0 0 30px rgba(59, 130, 246, 0.2), 0 12px 40px rgba(0, 0, 0, 0.15);
  }
`;

export const pulseScale = keyframes`
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
`;

export const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: V3 Enhancement Overlays
// PURPOSE: Cinematic noise overlay and z-index wrapper
// ─────────────────────────────────────────────────────────────

export const NoiseOverlay = styled.div`
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  opacity: 0.04;
  pointer-events: none;
  z-index: 1;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 256px 256px;
`;

export const MainContentZWrapper = styled.div`
  position: relative;
  z-index: 2;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Layout Components
// PURPOSE: Primary containers, grids, and structural wrappers
// ─────────────────────────────────────────────────────────────

export const ProfileContainer = styled(motion.div)`
  min-height: 100vh;
  background: var(--bg-base);
  color: var(--text-primary);
  position: relative;
  overflow: hidden;

  /* Subtle background pattern for premium feel */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.05) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.05) 0%, transparent 50%),
                radial-gradient(circle at 40% 80%, rgba(59, 130, 246, 0.05) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }
`;

export const ContentWrapper = styled.div`
  position: relative;
  z-index: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 3rem 2rem;

  @media (max-width: 1024px) {
    max-width: 100%;
    padding: 2rem 1.5rem;
  }

  @media (max-width: 768px) {
    padding: 1.5rem 1rem;
  }

  @media (max-width: 480px) {
    padding: 1rem 0.75rem;
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    padding: 0.75rem 0.5rem;
  }

  @media (min-width: 2560px) {
    max-width: 1600px;
    padding: 4rem 3rem;
  }

  @media (min-width: 3840px) {
    max-width: 2200px;
    padding: 5rem 4rem;
  }
`;

export const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 2rem;
  margin-top: 2rem;
  overflow: hidden;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    gap: 1rem;
    margin-top: 1rem;
  }

  @media (min-width: 2560px) {
    grid-template-columns: 380px 1fr;
    gap: 2.5rem;
    margin-top: 3rem;
  }

  @media (min-width: 3840px) {
    grid-template-columns: 460px 1fr;
    gap: 3rem;
    margin-top: 4rem;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Profile Header Components
// PURPOSE: Cover photo, profile image, and header info area
// ─────────────────────────────────────────────────────────────

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
  background: ${({ $backgroundImage, theme }) =>
    $backgroundImage
      ? `url(${$backgroundImage})`
      : theme.gradients?.hero || 'linear-gradient(135deg, #002060 0%, #003080 40%, #4070C0 100%)'
  };
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  overflow: hidden;

  /* Bottom gradient fade into page background */
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 120px;
    background: linear-gradient(transparent, var(--bg-base, #002060));
    z-index: 1;
    pointer-events: none;
  }

  /* Hide the old overlay — replaced by BannerUploadButton */
  .upload-overlay {
    display: none;
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
export const BannerUploadButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  min-height: 44px;
  border: 1px solid rgba(198, 168, 75, 0.3);
  border-radius: 12px;
  background: rgba(0, 32, 96, 0.65);
  backdrop-filter: blur(16px);
  color: #E0ECF4;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 3;
  opacity: 0.75;
  letter-spacing: 0.02em;

  &:hover {
    opacity: 1;
    background: rgba(0, 48, 128, 0.85);
    border-color: #60C0F0;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.3);
    transform: translateY(-1px);
  }

  &:active {
    transform: scale(0.97);
  }

  svg {
    opacity: 0.9;
  }

  @media (max-width: 768px) {
    top: 12px;
    right: 12px;
    padding: 6px 10px;
    font-size: 0;
    gap: 0;
    border-radius: 50%;
    width: 44px;
    height: 44px;
    justify-content: center;
  }

  @media (max-width: 340px) {
    top: 8px;
    right: 8px;
    width: 44px;
    height: 44px;
  }
`;

// Top 3 badge showcase below banner
export const BadgeShowcase = styled.div`
  display: flex;
  justify-content: center;
  gap: 1.25rem;
  margin-top: 0.75rem;
  padding: 0 1rem;

  @media (max-width: 430px) {
    gap: 0.75rem;
  }
`;

export const BadgeShowcaseItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 60px;
`;

export const BadgeIcon = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  background: rgba(0, 32, 96, 0.6);
  border: 2px solid rgba(96, 192, 240, 0.3);
  box-shadow: 0 0 12px rgba(96, 192, 240, 0.15);
  transition: all 0.3s ease;

  &:hover {
    border-color: #60C0F0;
    box-shadow: 0 0 20px rgba(96, 192, 240, 0.35);
    transform: translateY(-2px);
  }

  @media (max-width: 430px) {
    width: 44px;
    height: 44px;
    font-size: 1.25rem;
  }
`;

export const BadgeName = styled.span`
  font-size: 0.7rem;
  color: var(--text-secondary, #94a3b8);
  text-align: center;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'Sora', sans-serif;
`;

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

  ${({ $image, theme }) => $image
    ? css`
      background: url(${$image});
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
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.3),
    0 2px 6px rgba(0, 0, 0, 0.2),
    inset 0 1px 2px rgba(255, 255, 255, 0.2);
  z-index: 3;

  /* Professional hover effects */
  &:hover {
    transform: scale(1.15) translateY(-2px);
    box-shadow:
      0 8px 20px rgba(0, 0, 0, 0.4),
      0 4px 12px rgba(0, 0, 0, 0.3),
      inset 0 1px 2px rgba(255, 255, 255, 0.3);
    background: linear-gradient(135deg,
      ${({ theme }) => theme.colors?.accent || '#F59E0B'} 0%,
      ${({ theme }) => theme.colors?.primary || '#3B82F6'} 100%
    );
  }

  &:active {
    transform: scale(1.05);
  }

  /* Icon styling */
  svg {
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  }

  @media (max-width: 768px) {
    width: 44px;
    height: 44px;
    bottom: 6px;
    right: 6px;
    border-width: 2px;

    &:hover {
      transform: scale(1.1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &:hover {
      transform: none;
    }
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Profile Info Components
// PURPOSE: Name, username, role badge, bio, and action buttons
// ─────────────────────────────────────────────────────────────

export const ProfileInfo = styled(motion.div)`
  text-align: center;
  padding: 90px 2rem 3rem;
  position: relative;

  /* Subtle backdrop for better text readability */
  &::before {
    content: '';
    position: absolute;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    width: 120%;
    height: calc(100% - 60px);
    background: linear-gradient(
      180deg,
      transparent 0%,
      rgba(0, 0, 0, 0.1) 20%,
      rgba(0, 0, 0, 0.05) 80%,
      transparent 100%
    );
    border-radius: 0 0 24px 24px;
    pointer-events: none;
    z-index: 0;
  }

  > * {
    position: relative;
    z-index: 1;
  }

  @media (max-width: 768px) {
    padding: 80px 1rem 2rem;

    &::before {
      top: 50px;
      width: 110%;
      height: calc(100% - 50px);
    }
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    padding: 70px 0.75rem 1.5rem;
  }

  @media (min-width: 2560px) {
    padding: 110px 3rem 4rem;
  }

  @media (min-width: 3840px) {
    padding: 130px 4rem 5rem;
  }
`;

export const DisplayName = styled.h1`
  font-size: 3rem;
  font-weight: 800;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.colors?.primary || '#3B82F6'} 0%,
    ${({ theme }) => theme.colors?.secondary || '#8B5CF6'} 35%,
    ${({ theme }) => theme.colors?.accent || '#F59E0B'} 70%,
    ${({ theme }) => theme.colors?.primary || '#3B82F6'} 100%
  );
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.75rem;
  animation: ${slideInUp} 0.8s ease-out;
  letter-spacing: -0.02em;
  line-height: 1.1;
  text-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);

  /* Premium text effect */
  position: relative;

  &::after {
    content: attr(data-text);
    position: absolute;
    top: 0;
    left: 0;
    background: linear-gradient(
      135deg,
      rgba(59, 130, 246, 0.1) 0%,
      rgba(139, 92, 246, 0.1) 35%,
      rgba(245, 158, 11, 0.1) 70%,
      rgba(59, 130, 246, 0.1) 100%
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    filter: blur(2px);
    z-index: -1;
    opacity: 0.6;
  }

  @media (max-width: 768px) {
    font-size: 2.25rem;
    letter-spacing: -0.01em;
  }

  @media (max-width: 480px) {
    font-size: 1.875rem;
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    font-size: 1.5rem;
  }

  @media (min-width: 2560px) {
    font-size: 3.75rem;
  }

  @media (min-width: 3840px) {
    font-size: 4.5rem;
  }
`;

export const Username = styled.p`
  color: var(--text-secondary);
  font-size: 1.25rem;
  font-weight: 500;
  margin-bottom: 1rem;
  letter-spacing: 0.02em;
  animation: ${slideInUp} 0.8s ease-out 0.1s both;

  /* Subtle text enhancement */
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  @media (max-width: 768px) {
    font-size: 1.125rem;
  }

  @media (max-width: 480px) {
    font-size: 1rem;
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    font-size: 0.875rem;
  }

  @media (min-width: 2560px) {
    font-size: 1.5rem;
  }

  @media (min-width: 3840px) {
    font-size: 1.75rem;
  }
`;

export const UserRole = styled(motion.span)`
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.colors?.primary || '#3B82F6'} 0%,
    ${({ theme }) => theme.colors?.secondary || '#8B5CF6'} 100%
  );
  color: white;
  border-radius: 30px;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.025em;
  text-transform: uppercase;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.25),
    0 4px 12px rgba(0, 0, 0, 0.15),
    inset 0 1px 2px rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  animation: ${slideInUp} 0.8s ease-out 0.2s both;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  /* Premium glow effect */
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
    transition: left 0.6s ease;
  }

  &:hover {
    transform: translateY(-2px) scale(1.05);
    box-shadow:
      0 12px 32px rgba(0, 0, 0, 0.3),
      0 6px 16px rgba(0, 0, 0, 0.2),
      inset 0 1px 2px rgba(255, 255, 255, 0.3);

    &::before {
      left: 100%;
    }
  }

  /* Icon styling */
  svg {
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  }

  @media (max-width: 768px) {
    padding: 0.6rem 1.25rem;
    font-size: 0.875rem;

    &:hover {
      transform: translateY(-1px) scale(1.02);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;

    &:hover {
      transform: none;
    }

    &::before {
      display: none;
    }
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    padding: 0.5rem 1rem;
    font-size: 0.75rem;
    gap: 0.4rem;
  }

  @media (min-width: 2560px) {
    padding: 0.9rem 1.75rem;
    font-size: 1.125rem;
  }

  @media (min-width: 3840px) {
    padding: 1rem 2rem;
    font-size: 1.25rem;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Stats Components
// PURPOSE: Follower/post/following count display
// ─────────────────────────────────────────────────────────────

export const StatsContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 3rem;
  margin: 2.5rem 0;

  @media (max-width: 768px) {
    gap: 1.5rem;
    margin: 2rem 0;
  }

  @media (max-width: 480px) {
    gap: 1rem;
    margin: 1.5rem 0;
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    gap: 0.5rem;
    margin: 1rem 0;
  }

  @media (min-width: 2560px) {
    gap: 4rem;
    margin: 3rem 0;
  }

  @media (min-width: 3840px) {
    gap: 5rem;
    margin: 3.5rem 0;
  }
`;

export const StatItem = styled(motion.div)`
  text-align: center;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 1rem;
  border-radius: 16px;
  background: var(--bg-elevated);
  border: 1px solid transparent;
  position: relative;
  overflow: hidden;

  /* Premium hover effects */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.1),
      transparent
    );
    transition: left 0.6s ease;
  }

  &:hover {
    transform: translateY(-8px) scale(1.05);
    background: var(--bg-elevated);
    border-color: color-mix(in srgb, var(--accent-primary) 40%, transparent);
    box-shadow:
      0 12px 32px rgba(0, 0, 0, 0.2),
      0 6px 16px rgba(0, 0, 0, 0.15),
      inset 0 1px 2px rgba(255, 255, 255, 0.1),
      0 0 20px rgba(139, 92, 246, 0.05);
    /* V3: Cyan glow on hover */
    border-color: rgba(139, 92, 246, 0.15);

    &::before {
      left: 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }

    &::before {
      display: none;
    }
  }

  @media (max-width: 768px) {
    padding: 0.75rem;

    &:hover {
      transform: translateY(-4px) scale(1.02);
    }
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    padding: 0.5rem;
    border-radius: 12px;
  }

  @media (min-width: 2560px) {
    padding: 1.5rem;
    border-radius: 20px;
  }

  @media (min-width: 3840px) {
    padding: 2rem;
    border-radius: 24px;
  }
`;

export const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 800;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.colors?.primary || '#3B82F6'} 0%,
    ${({ theme }) => theme.colors?.secondary || '#8B5CF6'} 50%,
    ${({ theme }) => theme.colors?.accent || '#F59E0B'} 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
  letter-spacing: -0.02em;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  animation: ${subtleGlow} 4s ease-in-out infinite;
  position: relative;

  /* Fallback for browsers that don't support background-clip */
  @supports not (-webkit-background-clip: text) {
    color: ${({ theme }) => theme.colors?.primary || '#3B82F6'};
    background: none;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  @media (max-width: 768px) {
    font-size: 1.75rem;
  }

  @media (max-width: 480px) {
    font-size: 1.5rem;
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    font-size: 1.25rem;
  }

  @media (min-width: 2560px) {
    font-size: 2.5rem;
  }

  @media (min-width: 3840px) {
    font-size: 3rem;
  }
`;

export const StatLabel = styled.div`
  color: var(--text-secondary);
  font-size: 0.95rem;
  font-weight: 600;
  margin-top: 0.25rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  opacity: 0.9;
  transition: all 0.3s ease;

  ${StatItem}:hover & {
    color: var(--accent-primary);
    opacity: 1;
  }

  @media (max-width: 768px) {
    font-size: 0.875rem;
  }

  @media (max-width: 480px) {
    font-size: 0.8rem;
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    font-size: 0.7rem;
  }

  @media (min-width: 2560px) {
    font-size: 1.1rem;
  }

  @media (min-width: 3840px) {
    font-size: 1.25rem;
  }
`;

export const Bio = styled.p`
  color: var(--text-secondary);
  font-size: 1rem;
  line-height: 1.6;
  max-width: 600px;
  margin: 0 auto 2rem;

  @media (max-width: 768px) {
    font-size: 0.9rem;
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    font-size: 0.8rem;
    margin: 0 auto 1.25rem;
  }

  @media (min-width: 2560px) {
    font-size: 1.15rem;
    max-width: 800px;
  }

  @media (min-width: 3840px) {
    font-size: 1.3rem;
    max-width: 1000px;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Action Buttons
// PURPOSE: Edit profile, settings, and share buttons
// ─────────────────────────────────────────────────────────────

export const ActionButtons = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    gap: 0.5rem;
  }

  @media (min-width: 2560px) {
    gap: 1.25rem;
  }

  @media (min-width: 3840px) {
    gap: 1.5rem;
  }
`;

export const PrimaryButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: ${({ theme }) => theme.gradients?.primary || 'linear-gradient(135deg, #60C0F0, #8B5CF6)'};
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  }

  @media (max-width: 768px) {
    padding: 0.6rem 1.2rem;
    font-size: 0.9rem;
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
    border-radius: 10px;
  }

  @media (min-width: 2560px) {
    padding: 0.9rem 1.75rem;
    font-size: 1.1rem;
  }

  @media (min-width: 3840px) {
    padding: 1rem 2rem;
    font-size: 1.25rem;
  }
`;

export const SecondaryButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: var(--bg-elevated);
  color: var(--text-primary);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: var(--bg-surface, var(--bg-elevated));
    transform: translateY(-2px);
    /* V3: Cyan glow on hover */
    border-color: rgba(139, 92, 246, 0.15);
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.05);
  }

  @media (max-width: 768px) {
    width: 44px;
    height: 44px;
  }

  /* V3: Extended breakpoints — maintain 44px minimum */
  @media (max-width: 320px) {
    width: 44px;
    height: 44px;
    border-radius: 10px;
  }

  @media (min-width: 2560px) {
    width: 52px;
    height: 52px;
  }

  @media (min-width: 3840px) {
    width: 56px;
    height: 56px;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Sidebar Components
// PURPOSE: Quick stats sidebar cards and titles
// ─────────────────────────────────────────────────────────────

export const Sidebar = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    gap: 1rem;
  }

  @media (min-width: 2560px) {
    gap: 2rem;
  }

  @media (min-width: 3840px) {
    gap: 2.5rem;
  }
`;

export const SidebarCard = styled(motion.div)`
  background: var(--bg-elevated);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-soft);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  transition: all 0.3s ease;

  /* V3: Enhanced glassmorphism */
  backdrop-filter: blur(24px);

  &:hover {
    border-color: rgba(139, 92, 246, 0.15);
    box-shadow: 0 4px 12px rgba(0,0,0,0.2), 0 0 20px rgba(139, 92, 246, 0.05);
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    padding: 1rem;
    border-radius: 12px;
  }

  @media (min-width: 2560px) {
    padding: 2rem;
    border-radius: 20px;
  }

  @media (min-width: 3840px) {
    padding: 2.5rem;
    border-radius: 24px;
  }
`;

export const SidebarTitle = styled.h3`
  color: var(--text-primary);
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    font-size: 1rem;
  }

  @media (min-width: 2560px) {
    font-size: 1.4rem;
  }

  @media (min-width: 3840px) {
    font-size: 1.6rem;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Main Content & Tab Components
// PURPOSE: Tab navigation and content area
// ─────────────────────────────────────────────────────────────

export const MainContent = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-width: 0;
  overflow: hidden;

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    gap: 1rem;
  }

  @media (min-width: 2560px) {
    gap: 2rem;
  }

  @media (min-width: 3840px) {
    gap: 2.5rem;
  }
`;

export const TabNavigation = styled.div`
  display: flex;
  background: var(--bg-elevated);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-soft);
  border-radius: 16px;
  padding: 0.5rem;
  overflow-x: auto;

  /* V3: Enhanced glassmorphism */
  backdrop-filter: blur(24px);

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    border-radius: 12px;
    padding: 0.375rem;
  }

  @media (min-width: 2560px) {
    border-radius: 20px;
    padding: 0.625rem;
  }

  @media (min-width: 3840px) {
    border-radius: 24px;
    padding: 0.75rem;
  }
`;

export const Tab = styled(motion.button)<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 12px;
  background: ${({ $active }) =>
    $active ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary, #8B5CF6))' : 'transparent'
  };
  color: ${({ $active }) =>
    $active ? 'white' : 'var(--text-secondary)'
  };
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  font-weight: ${({ $active }) => $active ? '600' : '500'};

  &:hover {
    background: ${({ $active }) =>
      $active ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary, #8B5CF6))' : 'var(--bg-surface, var(--bg-elevated))'
    };
    color: ${({ $active }) =>
      $active ? 'white' : 'var(--text-primary)'
    };
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    padding: 0.5rem 0.75rem;
    font-size: 0.8rem;
    gap: 0.3rem;
  }

  @media (min-width: 2560px) {
    padding: 0.9rem 1.25rem;
    font-size: 1.1rem;
  }

  @media (min-width: 3840px) {
    padding: 1rem 1.5rem;
    font-size: 1.25rem;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Utility Components
// PURPOSE: Hidden inputs, loading states, error boundary
// ─────────────────────────────────────────────────────────────

export const HiddenInput = styled.input`
  display: none;
`;

export const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  color: ${({ theme }) => theme.colors?.primary || '#60C0F0'};
`;

export const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid transparent;
  border-top: 3px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

