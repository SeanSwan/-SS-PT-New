/**
 * FILE: MessagingStates.tsx
 * PURPOSE: The non-working states of the messaging surface — loading, error,
 *          and the relationship/tier wall — plus the compose-failure bar.
 * EXTRACTED: 2026-08-25 from MessagingView.tsx, which had grown to 448 lines
 *            against the 300-line cap (ox-alpha, GLM 5.3). These are the only
 *            thing a user sees when messaging is unavailable, so they carry the
 *            same weight as the working surface: say what is true, offer the
 *            next step rather than stating a rule and stopping.
 */
import React from 'react';
import styled from 'styled-components';

/* ── Empty / error states ───────────────────────────────────────────────────
   These are the only thing a user sees when messaging is unavailable, so they
   carry the same weight as the working surface: say what is true, and offer the
   next step rather than stating a rule and stopping. */
const StateBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100%;
  padding: 32px 24px;
  text-align: center;
  max-width: 46ch;
  margin: 0 auto;
`;

const StateTitle = styled.h2`
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

const StateBody = styled.p`
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--text-secondary, #A2B3C6);
`;

const StateActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-top: 8px;
`;

const StateAction = styled.button`
  min-height: 44px;
  padding: 0 20px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: var(--accent-primary, #60C0F0);
  color: var(--bg-base, #0A0A0F);
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: box-shadow 160ms ease, transform 160ms ease;

  &:hover { box-shadow: 0 0 0 3px var(--accent-glow, rgba(139, 92, 246, 0.35)); }
  &:focus-visible { outline: 2px solid var(--accent-glow, #8B5CF6); outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) { transition: none; }
`;

const StateActionSecondary = styled(StateAction)`
  background: transparent;
  border-color: var(--border-soft, rgba(224, 236, 244, 0.22));
  color: var(--text-primary, #E0ECF4);
`;

const ComposeErrorBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 12px;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid var(--warning-border, rgba(198, 168, 75, 0.4));
  background: var(--warning-surface, rgba(198, 168, 75, 0.1));
  color: var(--text-primary, #E0ECF4);
  font-size: 0.9375rem;
`;

const ComposeErrorDismiss = styled.button`
  min-height: 44px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.22));
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.875rem;
  cursor: pointer;

  &:focus-visible { outline: 2px solid var(--accent-glow, #8B5CF6); outline-offset: 2px; }
`;


export const MessagingErrorState: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <StateBlock role="alert">
    <StateTitle>We couldn&apos;t load your messages</StateTitle>
    <StateBody>This is on our side, not yours. Your conversations are safe.</StateBody>
    <StateAction type="button" onClick={onRetry}>Try again</StateAction>
  </StateBlock>
);

export const MessagingWall: React.FC<{ onFindTrainer: () => void; onSeeTier: () => void }> = ({ onFindTrainer, onSeeTier }) => (
  <StateBlock>
    <StateTitle>Messaging opens up with a trainer</StateTitle>
    <StateBody>
      Message your trainer directly about workouts, form, pain or scheduling —
      included with training, at any tier. Member-to-member chat comes with
      Crystalline Swan.
    </StateBody>
    <StateActions>
      <StateAction type="button" onClick={onFindTrainer}>Find a trainer</StateAction>
      <StateActionSecondary type="button" onClick={onSeeTier}>See Crystalline Swan</StateActionSecondary>
    </StateActions>
  </StateBlock>
);

export const ComposeError: React.FC<{ message: string; onDismiss: () => void }> = ({ message, onDismiss }) => (
  <ComposeErrorBar role="alert">
    <span>{message}</span>
    <ComposeErrorDismiss type="button" onClick={onDismiss}>Dismiss</ComposeErrorDismiss>
  </ComposeErrorBar>
);
