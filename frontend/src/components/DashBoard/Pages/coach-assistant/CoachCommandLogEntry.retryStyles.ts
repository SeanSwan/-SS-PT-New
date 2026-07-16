/**
 * FILE: CoachCommandLogEntry.retryStyles.ts
 * PURPOSE: Retry affordance for failed Swan Coach sends (Sprint A §8: retry
 * guidance shown when execution fails). Split from CoachCommandLogEntry.styles
 * to honor the 300-line file cap.
 */
import styled from 'styled-components';

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
