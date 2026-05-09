/**
 * Profile action button styles for UserDashboard V3.
 * Extracted without CSS behavior changes.
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';

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
  background: ${({ theme }) => theme.gradients?.primary || 'linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6))'};
  color: var(--color-white, #E0ECF4);
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
    border-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent);
    box-shadow: 0 0 20px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 5%, transparent);
  }

  @media (max-width: 768px) {
    width: 44px;
    height: 44px;
  }

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

// SECTION: Sidebar Components
// PURPOSE: Quick stats sidebar cards and titles
