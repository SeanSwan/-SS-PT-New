/**
 * ============================================================================
 * FILE: HomeTabActions.styles.ts
 * PURPOSE: HomeTab community, quick-action, and dock skeleton styles.
 * AUTHOR: Codex GPT-5 | CREATED: 2026-05-07
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Extracts the lower HomeTab presentation styles so the
 * canonical Home component stays focused on data flow and render order.
 *
 * HOW IT FITS IN THE APP: Imported only by HomeTab.tsx.
 *
 * KEY DECISIONS:
 * - Preserves existing responsive behavior and 44px touch targets.
 * - Keeps Framer-compatible button wrappers for existing hover/tap props.
 * - Uses Crystalline Swan token fallbacks for visible color decisions.
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

export const PulseSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
`;

export const SectionLabel = styled.p`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent-primary, #60C0F0);
  margin: 0;

  svg {
    flex-shrink: 0;
  }
`;

export const CTAGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;

  @media (max-width: 320px) {
    grid-template-columns: 1fr;
  }

  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(min(180px, 100%), 1fr));
  }
`;

export const CTACard = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.125rem;
  min-height: 56px;
  background: var(--bg-elevated, color-mix(in srgb, var(--surface-primary, #003080) 85%, transparent));
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--text-primary, #E0ECF4) 6%, transparent));
  border-radius: 14px;
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
    box-shadow: 0 4px 16px color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (max-width: 375px) {
    min-height: 52px;
    padding: 0.875rem 0.875rem;
  }
`;

export const CTAIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary, #60C0F0);
  flex-shrink: 0;
`;

export const CTALabel = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  flex: 1;
`;

export const CTAArrow = styled(ChevronRight)`
  color: var(--text-muted, #64748b);
  flex-shrink: 0;
`;

export const DockSkeleton = styled.div`
  height: 108px;
  background: var(--bg-elevated, color-mix(in srgb, var(--surface-primary, #003080) 85%, transparent));
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 5%, transparent);
  border-radius: 20px;
  animation: pulse 1.8s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50%       { opacity: 0.7; }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0.5;
  }

  @media (max-width: 414px) {
    border-radius: 16px;
    height: 96px;
  }
`;
