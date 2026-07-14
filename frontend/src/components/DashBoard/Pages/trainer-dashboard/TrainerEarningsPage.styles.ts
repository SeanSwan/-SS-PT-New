/**
 * ============================================================================
 * FILE: TrainerEarningsPage.styles.ts (Dashboard batch 2026-07-13, P1-1)
 * PURPOSE: Styled-components for the trainer "My Earnings" page. Client/data
 *          card discipline: sapphire gradient surfaces, chrome-subtle borders,
 *          low motion, 44px targets, token-with-fallback colors.
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const TotalCard = styled.section<{ $tone?: 'unpaid' | 'paid' }>`
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
  font-size: 26px;
  font-weight: 700;
  color: var(--text-primary, #e0ecf4);
`;

export const LedgerCard = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border-radius: 14px;
  background: var(--surface-dark, #1a1a24);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 20%, transparent);
`;

export const LedgerTitle = styled.h2`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary, #e0ecf4);
`;

export const CommissionRow = styled.article`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--card-dark, #141419);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));
`;

export const RowMain = styled.div`
  min-width: 0;
  flex: 1 1 180px;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

export const RowClient = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #e0ecf4);
`;

export const RowMeta = styled.span`
  font-size: 12px;
  color: var(--text-secondary, #9fb6c8);
`;

export const RowMoney = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  margin-left: auto;
`;

export const RowCut = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary, #e0ecf4);
`;

export const RowGross = styled.span`
  font-size: 11px;
  color: var(--text-secondary, #9fb6c8);
`;

export const Pill = styled.span<{ $tone: 'paid' | 'unpaid' | 'source' }>`
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 999px;
  color: var(--text-primary, #e0ecf4);
  background: ${({ $tone }) =>
    $tone === 'paid'
      ? 'color-mix(in srgb, #3fae6a 30%, transparent)'
      : $tone === 'unpaid'
        ? 'color-mix(in srgb, var(--luxury-accent, #c6a84b) 30%, transparent)'
        : 'color-mix(in srgb, var(--accent-glow, #8b5cf6) 28%, transparent)'};
`;

export const StateNote = styled.p`
  margin: 0;
  padding: 14px 4px;
  font-size: 13px;
  color: var(--text-secondary, #9fb6c8);
`;

export const RetryButton = styled.button`
  align-self: flex-start;
  min-height: 44px;
  padding: 0 18px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: var(--text-primary, #e0ecf4);
  background: var(--primary, #002060);
  border: 1px solid color-mix(in srgb, var(--accent-glow, #8b5cf6) 45%, transparent);

  &:focus-visible {
    outline: 2px solid var(--accent-glow, #8b5cf6);
    outline-offset: 2px;
  }
`;

export const Disclosure = styled.p`
  margin: 0;
  font-size: 11px;
  color: var(--text-secondary, rgba(159, 182, 200, 0.75));
`;
