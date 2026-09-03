/**
 * ErrorCard — the ONE way a Swan surface says "we failed to load this".
 *
 * Blueprint v2 D2: an error must never render as emptiness. A failed fetch that
 * shows "No data yet" (or a bare em-dash, or nothing at all) tells a paying
 * member their week was empty when in fact the request died — and offers them
 * no way back. Every surface that can fail uses this card, with a retry.
 *
 * Ported from the user-tree pattern (UserDashboard/components/WorkoutsTabStyles.ts
 * ErrorCard + RetryButton) but self-contained: a shared component may not import
 * chrome mixins out of one dashboard's private tree.
 *
 * @module components/ui/ErrorCard
 */
import React from 'react';
import styled from 'styled-components';

export interface ErrorCardProps {
  /** What failed, in the member's language. Never a stack, never an error code. */
  message: string;
  /** Retry handler. Omit only when the surface genuinely cannot re-fetch. */
  onRetry?: () => void;
  retryLabel?: string;
  /** data-testid for the surface's contract test. */
  testId?: string;
  className?: string;
}

const Card = styled.div`
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  border-left: 4px solid var(--error, #C92A54);
  border-radius: 18px;
  background:
    linear-gradient(150deg,
      color-mix(in srgb, var(--bg-elevated, #141419) 72%, transparent),
      color-mix(in srgb, var(--bg-base, #0A0A0F) 86%, transparent)),
    var(--bg-elevated, #141419);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 6%, transparent);
  padding: 16px 20px;
  color: var(--text-primary, #E0ECF4);
  font-family: var(--font-ui, 'Sora', sans-serif);

  p {
    margin: 0 0 12px;
  }
`;

const RetryButton = styled.button`
  min-height: 44px;
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 32%, transparent);
  background: color-mix(in srgb, var(--bg-elevated, #141419) 70%, transparent);
  color: var(--text-primary, #E0ECF4);
  font: 800 0.78rem/1 var(--font-ui, 'Sora', sans-serif);
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;

  &:hover {
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 56%, transparent);
    background: color-mix(in srgb, var(--bg-elevated, #141419) 88%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

const ErrorCard: React.FC<ErrorCardProps> = ({
  message,
  onRetry,
  retryLabel = 'Retry',
  testId,
  className,
}) => (
  <Card role="alert" data-testid={testId} className={className}>
    <p>{message}</p>
    {onRetry ? (
      <RetryButton type="button" onClick={onRetry}>
        {retryLabel}
      </RetryButton>
    ) : null}
  </Card>
);

export default ErrorCard;
