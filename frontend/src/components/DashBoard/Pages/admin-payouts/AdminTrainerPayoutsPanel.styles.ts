/**
 * ============================================================================
 * FILE: AdminTrainerPayoutsPanel.styles.ts (Dashboard batch 2026-07-13, P1-2)
 * PURPOSE: Styled-components for the admin Trainer Payouts console. Data-card
 *          discipline: low motion, token-with-fallback colors, 44px targets.
 * ============================================================================
 */
import styled from 'styled-components';

export const PageWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  max-width: 1080px;
  margin: 0 auto;
  width: 100%;
`;

export const PageTitle = styled.h1`
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary, #e0ecf4);
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const PageSubtitle = styled.p`
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary, #9fb6c8);
`;

export const TotalsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

export const TotalCard = styled.section<{ $tone?: 'unpaid' }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  border-radius: 14px;
  background: linear-gradient(160deg, var(--surface-elevated, #003080) 0%, var(--surface-dark, #1a1a24) 85%);
  border: 1px solid ${({ $tone }) =>
    $tone === 'unpaid'
      ? 'color-mix(in srgb, var(--luxury-accent, #c6a84b) 45%, transparent)'
      : 'color-mix(in srgb, var(--accent-primary, #60c0f0) 25%, transparent)'};
`;

export const TotalLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary, #9fb6c8);
`;

export const TotalValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary, #e0ecf4);
`;

export const TrainerCard = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border-radius: 14px;
  background: var(--surface-dark, #1a1a24);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 20%, transparent);
`;

export const TrainerHeaderRow = styled.button`
  min-height: 44px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  text-align: left;
  cursor: pointer;
  background: var(--card-dark, #141419);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));
  width: 100%;

  &:focus-visible {
    outline: 2px solid var(--accent-glow, #8b5cf6);
    outline-offset: 2px;
  }
`;

export const TrainerName = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary, #e0ecf4);
`;

export const TrainerMeta = styled.span`
  font-size: 12px;
  color: var(--text-secondary, #9fb6c8);
`;

export const MoneyRight = styled.span`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  color: var(--text-primary, #e0ecf4);
`;

export const UnpaidChip = styled.span`
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  color: var(--text-primary, #e0ecf4);
  background: color-mix(in srgb, var(--luxury-accent, #c6a84b) 30%, transparent);
`;

export const LedgerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 2px 0;
`;

export const LedgerRow = styled.label`
  min-height: 44px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  cursor: pointer;
  background: var(--card-dark, #141419);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));

  input[type='checkbox'] {
    width: 18px;
    height: 18px;
    accent-color: var(--accent-glow, #8b5cf6);
  }
`;

export const LedgerText = styled.span`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: var(--text-secondary, #9fb6c8);

  strong {
    font-size: 13px;
    color: var(--text-primary, #e0ecf4);
  }
`;

export const LedgerMoney = styled.span`
  margin-left: auto;
  font-family: 'Fira Code', monospace;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary, #e0ecf4);
`;

export const PayoutForm = styled.form`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding-top: 6px;
`;

export const PayoutSelect = styled.select`
  min-height: 44px;
  padding: 0 12px;
  border-radius: 10px;
  font-size: 13px;
  color: var(--text-primary, #e0ecf4);
  background: var(--card-dark, #141419);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.2));
`;

export const PayoutInput = styled.input`
  min-height: 44px;
  padding: 0 12px;
  border-radius: 10px;
  font-size: 13px;
  flex: 1 1 160px;
  color: var(--text-primary, #e0ecf4);
  background: var(--card-dark, #141419);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.2));

  &::placeholder {
    color: var(--text-secondary, rgba(159, 182, 200, 0.6));
  }
`;

export const PrimaryButton = styled.button`
  min-height: 44px;
  padding: 0 18px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  color: var(--text-primary, #e0ecf4);
  background: var(--primary, #002060);
  border: 1px solid color-mix(in srgb, var(--accent-glow, #8b5cf6) 45%, transparent);

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  &:focus-visible {
    outline: 2px solid var(--accent-glow, #8b5cf6);
    outline-offset: 2px;
  }
`;

export const StateNote = styled.p`
  margin: 0;
  padding: 12px 4px;
  font-size: 13px;
  color: var(--text-secondary, #9fb6c8);
`;

export const Disclosure = styled.p`
  margin: 0;
  font-size: 11px;
  color: var(--text-secondary, rgba(159, 182, 200, 0.75));
`;
