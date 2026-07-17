/**
 * FILE: CoachCommandLogEntry.retryStyles.ts
 * PURPOSE: Per-entry affordances — failed-send retry (Sprint A §8) and
 * coach-reply message actions (copy / read aloud, v2 P2.1). Split from
 * CoachCommandLogEntry.styles to honor the 300-line file cap.
 */
import styled from 'styled-components';

export const MessageActionsRow = styled.div`
  display: flex;
  gap: 6px;
  justify-content: flex-end;

  button {
    align-items: center;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 10px;
    color: var(--coach-muted, #9eb0c7);
    cursor: pointer;
    display: inline-flex;
    font-size: 12px;
    font-weight: 740;
    gap: 6px;
    min-height: 44px;
    padding: 0 10px;
  }

  button:hover,
  button:focus-visible {
    border-color: var(--coach-line, rgba(188, 220, 255, 0.18));
    color: var(--coach-text, #e0ecf4);
  }
`;

export const RetryRow = styled.div`
  display: flex;
  justify-content: flex-start;

  button {
    align-items: center;
    background: color-mix(in srgb, var(--coach-cyan, #60c0f0) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--coach-cyan, #60c0f0) 30%, transparent);
    border-radius: 999px;
    color: var(--coach-text, #e0ecf4);
    cursor: pointer;
    display: inline-flex;
    font-size: 13px;
    font-weight: 780;
    gap: 8px;
    min-height: 44px;
    padding: 0 16px;
  }

  button:hover,
  button:focus-visible {
    background: color-mix(in srgb, var(--coach-cyan, #60c0f0) 18%, transparent);
    border-color: color-mix(in srgb, var(--coach-cyan, #60c0f0) 48%, transparent);
  }
`;
