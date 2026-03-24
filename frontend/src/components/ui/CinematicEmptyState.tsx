/**
 * ============================================================================
 * FILE: CinematicEmptyState.tsx
 * PURPOSE: Reusable cinematic empty state with frost shimmer and Cosmic Nebula CTA
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * AI VILLAGE VALIDATED: 2026-03-24
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a dark-first empty state with Cormorant Garamond
 * italic messaging, optional icon, frost shimmer background animation, and a
 * Cosmic Nebula gradient CTA button. Supports 4 size variants.
 *
 * HOW IT FITS IN THE APP: Drop-in replacement for blank/empty views across
 * dashboards, charts, lists, and cards. Accessible with role="status".
 *
 * KEY DECISIONS: CSS custom properties with dark fallbacks for theme compatibility.
 * Frost shimmer uses transform+opacity only for GPU compositing.
 */
import React from 'react';
import styled, { keyframes } from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

export interface CinematicEmptyStateProps {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaAction?: () => void;
  icon?: React.ReactNode;
  variant?: 'chart' | 'list' | 'card' | 'full';
}

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────

const frostShimmer = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Variant sizing
// ─────────────────────────────────────────────────────────────

const VARIANT_STYLES: Record<string, { padding: string; minHeight: string }> = {
  chart: { padding: '2rem 1.5rem', minHeight: '200px' },
  list: { padding: '2.5rem 1.5rem', minHeight: '240px' },
  card: { padding: '2rem 1.5rem', minHeight: '180px' },
  full: { padding: '4rem 2rem', minHeight: '400px' },
};

// ─────────────────────────────────────────────────────────────
// SECTION: Styled components
// ─────────────────────────────────────────────────────────────

const Container = styled.div<{ $variant: string }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: ${({ $variant }) => VARIANT_STYLES[$variant]?.padding ?? '2.5rem 1.5rem'};
  min-height: ${({ $variant }) => VARIANT_STYLES[$variant]?.minHeight ?? '240px'};
  background: var(--bg-surface, #141419);
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent) 50%,
      transparent 100%
    );
    animation: ${frostShimmer} 3s ease-in-out infinite;
    pointer-events: none;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
      opacity: 0;
    }
  }
`;

const IconWrapper = styled.div`
  margin-bottom: 1rem;
  color: var(--accent-primary, #60C0F0);
  font-size: 2.5rem;
  line-height: 1;
  opacity: 0.8;
`;

const Title = styled.h3`
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-style: italic;
  font-weight: 500;
  font-size: 1.5rem;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 0.5rem;
  position: relative;
`;

const Subtitle = styled.p`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.875rem;
  color: color-mix(in srgb, var(--frost-white, #E0ECF4) 80%, transparent);
  margin: 0 0 1.5rem;
  max-width: 320px;
  line-height: 1.5;
  position: relative;
`;

const CtaButton = styled.button`
  position: relative;
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--frost-white, #E0ECF4);
  text-shadow: 0 2px 4px rgba(10, 10, 15, 0.4);
  background: linear-gradient(135deg, var(--wing-purple, #8B5CF6), var(--ice-wing, #60C0F0));
  border: none;
  border-radius: 12px;
  padding: 0.75rem 1.75rem;
  min-height: 44px;
  min-width: 44px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 0 20px color-mix(in srgb, var(--wing-purple, #8B5CF6) 40%, transparent);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 0 30px color-mix(in srgb, var(--ice-wing, #60C0F0) 60%, transparent);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 2px solid var(--frost-white, #E0ECF4);
    outline-offset: 4px;
    box-shadow: 0 0 20px var(--ice-wing, #60C0F0);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

export const CinematicEmptyState: React.FC<CinematicEmptyStateProps> = ({
  title = 'Your journey begins here',
  subtitle,
  ctaText,
  ctaAction,
  icon,
  variant = 'list',
}) => (
  <Container $variant={variant} role="status" aria-live="polite">
    {icon && <IconWrapper>{icon}</IconWrapper>}
    <Title>{title}</Title>
    {subtitle && <Subtitle>{subtitle}</Subtitle>}
    {ctaText && ctaAction && (
      <CtaButton type="button" onClick={ctaAction}>
        {ctaText}
      </CtaButton>
    )}
  </Container>
);

export default CinematicEmptyState;
