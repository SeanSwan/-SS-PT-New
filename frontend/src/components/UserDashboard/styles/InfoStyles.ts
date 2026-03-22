/**
 * ============================================================================
 * FILE: InfoStyles.ts
 * PURPOSE: Styled-components for profile info section (name, role, stats, bio, buttons)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Defines styled-components for the profile info area below
 * the avatar — display name, username, role badge, stat counters, bio, action buttons.
 * HOW IT FITS IN THE APP: Imported by ProfileHeaderInfo sub-component
 * KEY DECISIONS: Separated from ProfileStyles to keep under 300 lines
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';
import { slideInUp, subtleGlow } from './animations';

// ─────────────────────────────────────────────────────────────
// SECTION: Profile Info Container
// PURPOSE: Wrapper below avatar with text content
// ─────────────────────────────────────────────────────────────

export const ProfileInfo = styled(motion.div)`
  text-align: center;
  padding: 90px 2rem 3rem;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 60px; left: 50%;
    transform: translateX(-50%);
    width: 120%;
    height: calc(100% - 60px);
    background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.1) 20%, rgba(0, 0, 0, 0.05) 80%, transparent 100%);
    border-radius: 0 0 24px 24px;
    pointer-events: none;
    z-index: 0;
  }

  > * { position: relative; z-index: 1; }

  @media (max-width: 768px) { padding: 80px 1rem 2rem;
    &::before { top: 50px; width: 110%; height: calc(100% - 50px); }
  }
  @media (max-width: 320px) { padding: 70px 0.75rem 1.5rem; }
  @media (min-width: 2560px) { padding: 110px 3rem 4rem; }
  @media (min-width: 3840px) { padding: 130px 4rem 5rem; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Name & Username
// PURPOSE: Display name with gradient text, username below
// ─────────────────────────────────────────────────────────────

export const DisplayName = styled.h1`
  font-size: 3rem;
  font-weight: 800;
  background: linear-gradient(135deg,
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

  @media (max-width: 768px) { font-size: 2.25rem; }
  @media (max-width: 480px) { font-size: 1.875rem; }
  @media (max-width: 320px) { font-size: 1.5rem; }
  @media (min-width: 2560px) { font-size: 3.75rem; }
  @media (min-width: 3840px) { font-size: 4.5rem; }
`;

export const Username = styled.p`
  color: var(--text-secondary);
  font-size: 1.25rem;
  font-weight: 500;
  margin-bottom: 1rem;
  letter-spacing: 0.02em;
  animation: ${slideInUp} 0.8s ease-out 0.1s both;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  @media (max-width: 768px) { font-size: 1.125rem; }
  @media (max-width: 480px) { font-size: 1rem; }
  @media (max-width: 320px) { font-size: 0.875rem; }
  @media (min-width: 2560px) { font-size: 1.5rem; }
  @media (min-width: 3840px) { font-size: 1.75rem; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Role Badge
// PURPOSE: Pill badge showing user role with shimmer effect
// ─────────────────────────────────────────────────────────────

export const UserRole = styled(motion.span)`
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg,
    ${({ theme }) => theme.colors?.primary || '#3B82F6'} 0%,
    ${({ theme }) => theme.colors?.secondary || '#8B5CF6'} 100%
  );
  color: white;
  border-radius: 30px;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.025em;
  text-transform: uppercase;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25), 0 4px 12px rgba(0, 0, 0, 0.15),
    inset 0 1px 2px rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  animation: ${slideInUp} 0.8s ease-out 0.2s both;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0; left: -100%;
    width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.6s ease;
  }
  &:hover { transform: translateY(-2px) scale(1.05);
    &::before { left: 100%; }
  }
  svg { filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3)); }

  @media (max-width: 768px) { padding: 0.6rem 1.25rem; font-size: 0.875rem;
    &:hover { transform: translateY(-1px) scale(1.02); }
  }
  @media (prefers-reduced-motion: reduce) { animation: none; &:hover { transform: none; } &::before { display: none; } }
  @media (max-width: 320px) { padding: 0.5rem 1rem; font-size: 0.75rem; gap: 0.4rem; }
  @media (min-width: 2560px) { padding: 0.9rem 1.75rem; font-size: 1.125rem; }
  @media (min-width: 3840px) { padding: 1rem 2rem; font-size: 1.25rem; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Stats
// PURPOSE: Follower/post/following counters
// ─────────────────────────────────────────────────────────────

export const StatsContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 3rem;
  margin: 2.5rem 0;

  @media (max-width: 768px) { gap: 1.5rem; margin: 2rem 0; }
  @media (max-width: 480px) { gap: 1rem; margin: 1.5rem 0; }
  @media (max-width: 320px) { gap: 0.5rem; margin: 1rem 0; }
  @media (min-width: 2560px) { gap: 4rem; margin: 3rem 0; }
  @media (min-width: 3840px) { gap: 5rem; margin: 3.5rem 0; }
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
  min-width: 44px;
  min-height: 44px;

  &::before {
    content: '';
    position: absolute;
    top: 0; left: -100%;
    width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    transition: left 0.6s ease;
  }

  &:hover {
    transform: translateY(-8px) scale(1.05);
    border-color: rgba(139, 92, 246, 0.15);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2), 0 0 20px rgba(139, 92, 246, 0.05);
    &::before { left: 100%; }
  }

  @media (prefers-reduced-motion: reduce) { transition: none; &:hover { transform: none; } &::before { display: none; } }
  @media (max-width: 768px) { padding: 0.75rem; &:hover { transform: translateY(-4px) scale(1.02); } }
  @media (max-width: 320px) { padding: 0.5rem; border-radius: 12px; }
  @media (min-width: 2560px) { padding: 1.5rem; border-radius: 20px; }
  @media (min-width: 3840px) { padding: 2rem; border-radius: 24px; }
`;

export const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 800;
  background: linear-gradient(135deg,
    ${({ theme }) => theme.colors?.primary || '#3B82F6'} 0%,
    ${({ theme }) => theme.colors?.secondary || '#8B5CF6'} 50%,
    ${({ theme }) => theme.colors?.accent || '#F59E0B'} 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;

  @supports not (-webkit-background-clip: text) {
    color: ${({ theme }) => theme.colors?.primary || '#3B82F6'};
    background: none;
  }

  @media (max-width: 768px) { font-size: 1.75rem; }
  @media (max-width: 480px) { font-size: 1.5rem; }
  @media (max-width: 320px) { font-size: 1.25rem; }
  @media (min-width: 2560px) { font-size: 2.5rem; }
  @media (min-width: 3840px) { font-size: 3rem; }
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

  ${StatItem}:hover & { color: var(--accent-primary); opacity: 1; }

  @media (max-width: 768px) { font-size: 0.875rem; }
  @media (max-width: 480px) { font-size: 0.8rem; }
  @media (max-width: 320px) { font-size: 0.7rem; }
  @media (min-width: 2560px) { font-size: 1.1rem; }
  @media (min-width: 3840px) { font-size: 1.25rem; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Bio & Actions
// PURPOSE: Bio text and edit/settings/share buttons
// ─────────────────────────────────────────────────────────────

export const Bio = styled.p`
  color: var(--text-secondary);
  font-size: 1rem;
  line-height: 1.6;
  max-width: 600px;
  margin: 0 auto 2rem;

  @media (max-width: 768px) { font-size: 0.9rem; }
  @media (max-width: 320px) { font-size: 0.8rem; margin: 0 auto 1.25rem; }
  @media (min-width: 2560px) { font-size: 1.15rem; max-width: 800px; }
  @media (min-width: 3840px) { font-size: 1.3rem; max-width: 1000px; }
`;

export const ActionButtons = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;

  @media (max-width: 320px) { gap: 0.5rem; }
  @media (min-width: 2560px) { gap: 1.25rem; }
  @media (min-width: 3840px) { gap: 1.5rem; }
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
  min-height: 44px;

  &:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }

  @media (max-width: 768px) { padding: 0.6rem 1.2rem; font-size: 0.9rem; }
  @media (max-width: 320px) { padding: 0.5rem 1rem; font-size: 0.8rem; border-radius: 10px; }
  @media (min-width: 2560px) { padding: 0.9rem 1.75rem; font-size: 1.1rem; }
  @media (min-width: 3840px) { padding: 1rem 2rem; font-size: 1.25rem; }
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
  min-height: 44px;

  &:hover {
    background: var(--bg-surface, var(--bg-elevated));
    transform: translateY(-2px);
    border-color: rgba(139, 92, 246, 0.15);
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.05);
  }

  @media (max-width: 768px) { width: 44px; height: 44px; }
  @media (max-width: 320px) { width: 44px; height: 44px; border-radius: 10px; }
  @media (min-width: 2560px) { width: 52px; height: 52px; }
  @media (min-width: 3840px) { width: 56px; height: 56px; }
`;
