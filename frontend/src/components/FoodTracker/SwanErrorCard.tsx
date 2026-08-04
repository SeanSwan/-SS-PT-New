/**
 * FILE: SwanErrorCard.tsx
 * PURPOSE: Phase 4C — branded error state with a Retry action (HY3 §c).
 *          Fills the one genuine gap in the existing state components:
 *          CosmicSuspenseLoader covers loading, CrystallineEmptyState covers
 *          empty/skeleton, but no branded error card offered retry.
 * HOW IT FITS: NutritionWorkspace macro-summary failure branches; reusable
 *          by any nutrition surface that can refetch.
 * KEY DECISIONS: Never renders a raw error object — callers pass pre-safe
 *          copy (the macro hook already returns a friendly constant). Retry
 *          button is 44px on a Royal Depth surface per spec.
 */
import React from 'react';
import styled from 'styled-components';
import { RefreshCw } from 'lucide-react';

const Card = styled.section`
  display: grid;
  place-items: center;
  gap: 0.75rem;
  min-height: 220px;
  padding: clamp(1.25rem, 2vw, 1.8rem);
  text-align: center;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  border-radius: 8px;
  background:
    radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent), transparent 42%),
    color-mix(in srgb, var(--bg-elevated, #141419) 80%, transparent);
`;

const Title = styled.h2`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font: 900 1.05rem/1.2 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
`;

const Copy = styled.p`
  max-width: 480px;
  margin: 0;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.9rem;
  line-height: 1.55;
`;

const RetryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0 1.25rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);
  background: var(--royal-depth, #003080);
  color: var(--text-primary, #E0ECF4);
  font: 700 0.85rem/1 var(--font-ui, 'Sora', sans-serif);
  cursor: pointer;
  transition: box-shadow 0.2s ease;

  &:hover {
    box-shadow: 0 0 18px color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) { transition: none; }
`;

interface SwanErrorCardProps {
  title?: string;
  /** Pre-sanitized, user-safe copy — never pass a raw error message. */
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  ariaLabel?: string;
}

const SwanErrorCard: React.FC<SwanErrorCardProps> = ({
  title = 'The swan lost its way',
  message = 'This panel could not load. Your saved diary is untouched — try again.',
  onRetry,
  retryLabel = 'Retry',
  ariaLabel,
}) => (
  <Card role="alert" aria-label={ariaLabel || title}>
    <Title>{title}</Title>
    <Copy>{message}</Copy>
    {onRetry && (
      <RetryButton type="button" onClick={onRetry}>
        <RefreshCw size={16} aria-hidden="true" /> {retryLabel}
      </RetryButton>
    )}
  </Card>
);

export default SwanErrorCard;
