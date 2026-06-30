/**
 * CoachCommandCards.tsx
 * =====================
 * Confirmation-card surface for Swan Coach command-lane actions.
 *
 * Execution-result cards live in CoachExecutionResultCard and are re-exported
 * here so existing CoachMessage imports stay stable.
 */
import { useState, useCallback, memo } from 'react';
import styled from 'styled-components';
import { CheckCircle, XCircle, AlertTriangle, ClipboardCheck } from 'lucide-react';
import { isSafeCommandDisplayKey, renderCommandParamValue } from './coachCommandFormatters';
import { safeCommandConfirmationFailure } from './CoachIntakeOperationalText.logic';
export { ExecutionResultCard } from './CoachExecutionResultCard';

const CardShell = styled.div<{ $destructive?: boolean }>`
  margin-top: 12px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid ${({ $destructive }) =>
    $destructive
      ? 'color-mix(in srgb, var(--danger, #C92A54) 35%, transparent)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent)'};
  background: ${({ $destructive }) =>
    $destructive
      ? 'color-mix(in srgb, var(--danger, #C92A54) 6%, var(--bg-surface, #1A1A24))'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, var(--bg-surface, #1A1A24))'};
`;

const CardTitle = styled.div<{ $destructive?: boolean }>`
  font-family: 'Sora', sans-serif;
  font-size: 15px;
  font-weight: 800;
  color: ${({ $destructive }) =>
    $destructive ? 'var(--danger, #C92A54)' : 'var(--accent-primary, #60C0F0)'};
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`;

const SummaryText = styled.p`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  line-height: 1.45;
  margin: 0 0 10px;
`;

const DataRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 3px 0;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
`;

const DataLabel = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  min-width: 90px;
  flex-shrink: 0;
`;

const DataValue = styled.span`
  color: var(--text-primary, #E0ECF4);
  font-weight: 600;
  word-break: break-word;
`;

const TechnicalDetails = styled.details`
  margin-top: 10px;
  border-top: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 12%, transparent);
  padding-top: 10px;

  summary {
    color: var(--text-muted, rgba(224, 236, 244, 0.72));
    cursor: pointer;
    font-family: 'Sora', sans-serif;
    font-size: 12px;
    font-weight: 700;
    min-height: 44px;
    display: flex;
    align-items: center;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 14px;
  flex-wrap: wrap;
`;

const ErrorText = styled.div`
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--danger, #C92A54) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--danger, #C92A54) 25%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--danger, #C92A54);
`;

const ActionBtn = styled.button<{ $variant: 'confirm' | 'cancel' | 'destructive' }>`
  min-height: 44px;
  padding: 0 18px;
  border-radius: 8px;
  border: 1px solid ${({ $variant }) => {
    if ($variant === 'destructive') {
      return 'color-mix(in srgb, var(--danger, #C92A54) 50%, transparent)';
    }
    if ($variant === 'confirm') {
      return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent)';
    }
    return 'color-mix(in srgb, var(--text-primary, #E0ECF4) 20%, transparent)';
  }};
  background: ${({ $variant }) => {
    if ($variant === 'destructive') {
      return 'color-mix(in srgb, var(--danger, #C92A54) 15%, transparent)';
    }
    if ($variant === 'confirm') {
      return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)';
    }
    return 'transparent';
  }};
  color: ${({ $variant }) => {
    if ($variant === 'destructive') return 'var(--danger, #C92A54)';
    if ($variant === 'confirm') return 'var(--accent-primary, #60C0F0)';
    return 'var(--text-muted, rgba(224, 236, 244, 0.72))';
  }};
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.15s, box-shadow 0.15s;

  &:hover {
    background: ${({ $variant }) => {
      if ($variant === 'destructive') {
        return 'color-mix(in srgb, var(--danger, #C92A54) 25%, transparent)';
      }
      if ($variant === 'confirm') {
        return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent)';
      }
      return 'color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent)';
    }};
    box-shadow: ${({ $variant }) =>
      $variant === 'confirm'
        ? '0 0 10px color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent)'
        : 'none'};
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

export interface ConfirmationCardProps {
  operationId: string | null;
  command: string;
  params: Record<string, unknown>;
  client: { id?: number; firstName?: string; lastName?: string } | null;
  details: Record<string, unknown> | null;
  isDestructive: boolean;
  onConfirm: (operationId: string) => Promise<{ success: boolean; error?: string }>;
  onCancel: (operationId: string | null) => Promise<void>;
}

export const ConfirmationCard = memo(function ConfirmationCard({
  operationId,
  command,
  params,
  client,
  isDestructive,
  onConfirm,
  onCancel,
}: ConfirmationCardProps) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const handleConfirm = useCallback(async () => {
    if (!operationId || busy || done) return;
    setBusy(true);
    setConfirmError(null);
    const result = await onConfirm(operationId);
    if (result.success) {
      setDone(true);
    } else {
      setConfirmError(safeCommandConfirmationFailure());
    }
    setBusy(false);
  }, [operationId, busy, done, onConfirm]);

  const handleCancel = useCallback(async () => {
    if (busy || done) return;
    setBusy(true);
    await onCancel(operationId);
    setDone(true);
    setBusy(false);
  }, [operationId, busy, done, onCancel]);

  if (done) {
    return (
      <CardShell>
        <CardTitle><CheckCircle size={16} aria-hidden="true" /> Action resolved</CardTitle>
      </CardShell>
    );
  }

  const clientLabel = client?.firstName
    ? `${client.firstName}${client.lastName ? ` ${client.lastName}` : ''}`
    : null;
  const paramEntries = Object.entries(params)
    .filter(([key]) => isSafeCommandDisplayKey(key))
    .slice(0, 5);

  return (
    <CardShell $destructive={isDestructive}>
      <CardTitle $destructive={isDestructive}>
        {isDestructive
          ? <AlertTriangle size={16} aria-hidden="true" />
          : <ClipboardCheck size={16} aria-hidden="true" />}
        {isDestructive ? 'Confirm risky action' : 'Ready to save?'}
      </CardTitle>
      <SummaryText>
        {isDestructive
          ? 'Review this high-impact change before Swan Coach writes anything.'
          : 'Swan Coach prepared this action. Save it only after the target and details are right.'}
      </SummaryText>
      {clientLabel && <DataRow><DataLabel>Client</DataLabel><DataValue>{clientLabel}</DataValue></DataRow>}
      {paramEntries.slice(0, 2).map(([key, value]) => (
        <DataRow key={key}>
          <DataLabel>{key}</DataLabel>
          <DataValue>{renderCommandParamValue(key, value)}</DataValue>
        </DataRow>
      ))}
      <TechnicalDetails>
        <summary>Technical details</summary>
        <DataRow><DataLabel>Command</DataLabel><DataValue>{command}</DataValue></DataRow>
        {paramEntries.map(([key, value]) => (
          <DataRow key={key}>
            <DataLabel>{key}</DataLabel>
            <DataValue>{renderCommandParamValue(key, value)}</DataValue>
          </DataRow>
        ))}
      </TechnicalDetails>
      <ButtonRow>
        <ActionBtn
          type="button"
          $variant={isDestructive ? 'destructive' : 'confirm'}
          onClick={handleConfirm}
          disabled={busy}
          aria-label="Confirm action"
        >
          <CheckCircle size={14} aria-hidden="true" /> {busy ? 'Saving...' : isDestructive ? 'Confirm' : 'Save'}
        </ActionBtn>
        <ActionBtn
          type="button"
          $variant="cancel"
          onClick={handleCancel}
          disabled={busy}
          aria-label="Cancel action"
        >
          <XCircle size={14} aria-hidden="true" /> Cancel
        </ActionBtn>
      </ButtonRow>
      {confirmError && <ErrorText>{confirmError}</ErrorText>}
    </CardShell>
  );
});
