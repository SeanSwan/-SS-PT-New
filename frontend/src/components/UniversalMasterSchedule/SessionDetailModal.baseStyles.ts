import styled from 'styled-components';
import { ErrorText, FormField, SmallText } from './ui';

export const SpacedErrorText = styled(ErrorText)`
  margin-bottom: 1rem;
`;

export const SpacedSmallText = styled(SmallText)`
  margin-bottom: 1rem;
`;

export const FlexibleFormField = styled(FormField)<{ $flex: number; $minWidth: string }>`
  flex: ${({ $flex }) => $flex};
  min-width: ${({ $minWidth }) => $minWidth};
`;

export const FormFieldTopSpaced = styled(FormField)`
  margin-top: 1rem;
`;

export const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

export const DetailItem = styled.div`
  background: var(
    --schedule-detail-item-bg,
    color-mix(in srgb, var(--bg-elevated, #1A1A24) 88%, var(--accent-primary, #60C0F0) 6%)
  );
  border: 1px solid var(
    --schedule-detail-item-border,
    color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent)
  );
  border-radius: 10px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  overflow-wrap: anywhere;
`;

export const ContactLink = styled.a`
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 44px;
  color: var(--accent-primary, #60C0F0);
  font-weight: 700;
  text-decoration: underline;
  text-decoration-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 45%, transparent);
  text-underline-offset: 0.18em;
  overflow-wrap: anywhere;

  &:hover {
    color: var(--text-primary, #E0ECF4);
    text-decoration-color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--focus-ring, var(--accent-secondary, #8B5CF6));
    outline-offset: 3px;
    border-radius: 4px;
  }
`;

export const StatusBadge = styled.span<{ $tone: string }>`
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  text-transform: uppercase;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  background: ${props => props.$tone};
  color: var(--text-on-accent, #0f172a);
`;

export const SeriesCallout = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: 10px;
  background: var(--schedule-series-bg, color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent));
  border: 1px solid var(--schedule-series-border, color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent));

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

export const EarlyCancelOption = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-top: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  background: var(--schedule-credit-restore-bg, rgba(16, 185, 129, 0.1));
  border: 1px solid var(--schedule-credit-restore-border, rgba(16, 185, 129, 0.3));

  input[type="checkbox"] {
    margin-top: 2px;
    width: 18px;
    height: 18px;
    accent-color: var(--schedule-status-scheduled, #10b981);
    cursor: pointer;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    cursor: pointer;
  }
`;

export const CancellationPanel = styled.div`
  background: var(--schedule-cancellation-bg, rgba(239, 68, 68, 0.05));
  border: 1px solid var(--schedule-cancellation-border, rgba(239, 68, 68, 0.2));
  border-radius: 12px;
  padding: 1.25rem;
  margin-top: 1rem;
`;

export const CancelPanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;

  h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--schedule-status-cancelled, #ef4444);
  }
`;

export const LateCancelWarning = styled.span`
  display: inline-flex;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  background: var(--schedule-late-cancel-bg, rgba(245, 158, 11, 0.15));
  border: 1px solid var(--schedule-late-cancel-border, rgba(245, 158, 11, 0.4));
  color: var(--schedule-status-blocked, #f59e0b);
  font-size: 0.75rem;
  font-weight: 500;
`;
