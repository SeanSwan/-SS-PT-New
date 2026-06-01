import styled, { css } from 'styled-components';

const borderHot = 'color-mix(in srgb, var(--error, #EF4444) 32%, transparent)';
const borderSoft = 'color-mix(in srgb, var(--accent-primary, #60C0F0) 13%, transparent)';
const textMuted = 'var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 54%, transparent))';
const textFaint = 'color-mix(in srgb, var(--text-primary, #E0ECF4) 38%, transparent)';
const dangerSoft = 'color-mix(in srgb, var(--error, #EF4444) 13%, transparent)';

const focusRing = css`&:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }`;

const touchButton = css`
  min-height: 44px;
  min-width: 44px;
  cursor: pointer;
  transition: background 180ms ease, border-color 180ms ease, color 180ms ease, transform 180ms ease;
  ${focusRing}
  &:disabled { cursor: not-allowed; opacity: 0.55; }
`;

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const ChargeActions = ActionRow;
export const ChargeOptionRow = ActionRow;
export const CustomAmountSection = styled(ActionRow)`align-items: center;`;
export const NoChargeRow = ActionRow;

export const ChargeButton = styled.button<{ $variant?: 'fee' | 'full' }>`
  ${touchButton}
  align-items: center;
  background: ${({ $variant = 'full' }) => ($variant === 'fee' ? 'linear-gradient(135deg, var(--warning, #FBBF24), var(--accent-gold, #C6A84B))' : 'linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6))')};
  border: 0;
  border-radius: 10px;
  color: ${({ $variant = 'full' }) => ($variant === 'fee' ? 'var(--bg-base, #030712)' : 'var(--text-primary, #E0ECF4)')};
  display: inline-flex;
  flex: 1 1 132px;
  font-size: 0.8rem;
  font-weight: 900;
  gap: 6px;
  justify-content: center;
  padding: 0 12px;
  &:hover:not(:disabled) { transform: translateY(-1px); }
`;

export const ExpandButton = styled(ChargeButton).attrs({ $variant: 'full' as const })`
  background: transparent;
  border: 1px solid ${borderSoft};
  color: ${textMuted};
`;

export const ExpandedChargeSection = styled.div`
  background: color-mix(in srgb, var(--bg-base, #030712) 24%, transparent);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
`;

const FieldLabel = styled.span`
  color: ${textMuted};
  font-size: 0.8rem;
  font-weight: 700;
`;

export const CustomAmountLabel = FieldLabel;
export const WaiveReasonLabel = FieldLabel;

const fieldStyles = css`
  background: color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent);
  border: 1px solid ${borderSoft};
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  flex: 1 1 118px;
  font-size: 0.86rem;
  min-height: 44px;
  min-width: 44px;
  padding: 0 12px;
  ${focusRing}
  &::placeholder { color: ${textFaint}; }
`;

export const CustomAmountInput = styled.input`${fieldStyles}`;
export const WaiveReasonInput = styled.textarea`
  ${fieldStyles}
  min-height: 72px;
  resize: vertical;
`;

export const WaiveSection = styled.div`
  border-bottom: 1px solid ${borderSoft};
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 10px;
`;

export const NoChargeButton = styled(ChargeButton).attrs({ $variant: 'fee' as const })`
  background: ${dangerSoft};
  border: 1px solid ${borderHot};
  color: var(--error, #EF4444);
`;

export const CancelButton = styled(ExpandButton)``;
