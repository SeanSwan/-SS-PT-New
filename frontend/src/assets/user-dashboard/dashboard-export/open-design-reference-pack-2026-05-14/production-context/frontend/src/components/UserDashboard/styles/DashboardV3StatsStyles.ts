/**
 * Stats and biography styles for UserDashboard V3.
 * Extracted without CSS behavior changes.
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';
import { subtleGlow } from './DashboardV3Animations';

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
  /* 2026-05-10 SLICE 1 (rule 22 + Phase-2C UX consensus): StatItems are
     non-interactive read-only stats. cursor: default + subtle hover
     reveal instead of cursor: pointer + scale(1.05). The fake-button
     gesture baited users into clicks that did nothing. The border/shadow
     hover still gives the surface life without implying clickability. */
  cursor: default;
  pointer-events: auto;
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
      0 0 20px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 5%, transparent);
    /* V3: Cyan glow on hover */
    border-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent);

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
    var(--accent-primary, #60C0F0) 0%,
    var(--accent-secondary, #8B5CF6) 50%,
    var(--accent-gold, #C6A84B) 100%
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
    color: var(--accent-primary, #60C0F0);
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

// SECTION: Action Buttons
// PURPOSE: Edit profile, settings, and share buttons
