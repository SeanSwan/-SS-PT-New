/**
 * COMPONENT SET: PlannerSkeleton / PlannerEmpty / PlannerError (S17 §4.10)
 * PURPOSE: THE one skeleton, one empty-state, and one error component for
 * every Planner IA V2 surface. Legacy idioms in the V1 tree stay untouched
 * until the flag flips (they are pinned by the S13 golden snapshots); every
 * NEW planner surface must use these three — no bespoke variants.
 * Reduced-motion: the shimmer collapses to a static block.
 */

import React from 'react';
import styled, { css, keyframes } from 'styled-components';

const shimmer = keyframes`
  0% { opacity: 0.45; }
  50% { opacity: 0.8; }
  100% { opacity: 0.45; }
`;

const SkeletonBlock = styled.div<{ $h: number }>`
  border-radius: 10px;
  height: ${({ $h }) => $h}px;
  background: var(--world-surface-raised, var(--card-dark, #141419));
  ${css`animation: ${shimmer} 1.6s ease-in-out infinite;`}
  @media (prefers-reduced-motion: reduce) { animation: none; opacity: 0.6; }
`;

const Stack = styled.div`
  display: flex; flex-direction: column; gap: 10px; padding: 12px;
`;

const StateShell = styled.div`
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 28px 16px; text-align: center;
  color: var(--world-text-dim, var(--text-secondary, #9fb3c8));
  font-family: 'Sora', sans-serif;
`;

const StateTitle = styled.p`
  margin: 0; font-size: 0.9rem; font-weight: 800;
  color: var(--world-text, var(--text-primary, #E0ECF4));
`;

const StateBody = styled.p`
  margin: 0; font-size: 0.8rem; max-width: 42ch;
`;

const StateAction = styled.button`
  min-height: 44px; padding: 0 18px; border-radius: 10px; cursor: pointer;
  border: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  background: var(--btn-primary-bg, #002060);
  color: var(--world-text, var(--text-primary, #E0ECF4));
  font-family: 'Sora', sans-serif; font-size: 0.8rem; font-weight: 800;
  &:focus-visible { outline: 2px solid var(--accent-glow, #8B5CF6); outline-offset: 3px; }
`;

const VARIANT_ROWS: Record<'rows' | 'list' | 'panel', number[]> = {
  rows: [56, 56, 56],
  list: [44, 44, 44, 44, 44],
  panel: [160],
};

export const PlannerSkeleton: React.FC<{ variant?: 'rows' | 'list' | 'panel' }> = ({ variant = 'rows' }) => (
  <Stack role="status" aria-label="Loading" aria-live="polite">
    {VARIANT_ROWS[variant].map((h, i) => <SkeletonBlock key={i} $h={h} />)}
  </Stack>
);

export const PlannerEmpty: React.FC<{
  icon?: React.ReactNode; title: string; body?: string;
  actionLabel?: string; onAction?: () => void;
}> = ({ icon, title, body, actionLabel, onAction }) => (
  <StateShell>
    {icon}
    <StateTitle>{title}</StateTitle>
    {body && <StateBody>{body}</StateBody>}
    {actionLabel && onAction && (
      <StateAction type="button" onClick={onAction}>{actionLabel}</StateAction>
    )}
  </StateShell>
);

export const PlannerError: React.FC<{ message?: string; onRetry?: () => void }> = ({
  message = 'Something went wrong loading this panel.', onRetry,
}) => (
  <StateShell role="alert">
    <StateTitle>Couldn&rsquo;t load</StateTitle>
    <StateBody>{message}</StateBody>
    {onRetry && <StateAction type="button" onClick={onRetry}>Try again</StateAction>}
  </StateShell>
);
