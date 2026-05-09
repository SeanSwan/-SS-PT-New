/**
 * Profile identity text styles for the canonical UserDashboard V3 surface.
 * Extracted from DashboardV3Styles.ts without CSS behavior changes.
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';
import { slideInUp } from './DashboardV3Animations';

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
    var(--accent-primary, #60C0F0) 0%,
    var(--accent-secondary, #8B5CF6) 35%,
    var(--accent-gold, #C6A84B) 70%,
    var(--accent-primary, #60C0F0) 100%
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
      color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent) 0%,
      color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent) 35%,
      color-mix(in srgb, var(--accent-gold, #C6A84B) 10%, transparent) 70%,
      color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent) 100%
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
    var(--accent-primary, #60C0F0) 0%,
    var(--accent-secondary, #8B5CF6) 100%
  );
  color: var(--color-white, #E0ECF4);
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

// SECTION: Stats Components
// PURPOSE: Follower/post/following count display
