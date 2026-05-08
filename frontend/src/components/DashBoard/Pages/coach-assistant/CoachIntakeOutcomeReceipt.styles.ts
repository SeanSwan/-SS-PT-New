/**
 * CoachIntakeOutcomeReceipt.styles.ts
 * ===================================
 * Compact post-action receipt styling for Swan Coach intake review flow.
 */
import styled from 'styled-components';

export const OutcomeReceiptWrap = styled.section`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 12px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent),
      color-mix(in srgb, var(--glow-accent, #8B5CF6) 8%, transparent)
    ),
    color-mix(in srgb, var(--bg-surface, #1A1A24) 88%, transparent);

  @media (max-width: 720px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

export const OutcomeText = styled.div`
  min-width: 0;

  strong {
    display: block;
    color: var(--text-primary, #E0ECF4);
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 13px;
    line-height: 1.3;
  }

  span {
    display: block;
    margin-top: 3px;
    color: color-mix(in srgb, var(--text-primary, #E0ECF4) 66%, transparent);
    font-family: 'Sora', sans-serif;
    font-size: 12px;
    line-height: 1.4;
  }
`;

export const OutcomeDismiss = styled.button`
  min-height: 44px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  background: color-mix(in srgb, var(--bg-base, #030712) 46%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
`;
