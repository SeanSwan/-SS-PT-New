/**
 * ============================================================================
 * FILE: CoachCommandCards.tsx
 * PURPOSE: Command-lane UI cards — confirmation prompt and execution result
 * AUTHOR: Claude Sonnet 4.6 | LAST MODIFIED: 2026-04-09
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders inline action cards injected by the command
 * lane into CoachMessage bubbles. ConfirmationCard handles both standard and
 * destructive operations. ExecutionResultCard shows structured success data.
 *
 * HOW IT FITS IN THE APP: Imported by CoachMessage.tsx. Cards appear as
 * metadata attachments beneath the assistant's natural-language response.
 *
 * DATA FLOW:
 * useCoachAssistant (confirm/cancel) → CoachMessage props → CoachCommandCards
 *
 * WIREFRAME (ConfirmationCard):
 * ┌──────────────────────────────────────────┐
 * │ ⚠ Confirm Destructive Action             │  ← red border if destructive
 * │ Command   delete_session                 │
 * │ Client    Alex Rivera                    │
 * │ sessionId 42                             │
 * │ [✓ Confirm] [✗ Cancel]                  │  ← 44px buttons
 * └──────────────────────────────────────────┘
 *
 * WIREFRAME (ExecutionResultCard):
 * ┌──────────────────────────────────────────┐
 * │ ✓ Command Executed                       │
 * │ Session created for 2026-04-15 at 10 AM  │
 * │ Command    create_session                 │
 * │ sessionId  99                             │
 * └──────────────────────────────────────────┘
 */

import React, { useState, useCallback, memo } from 'react';
import styled from 'styled-components';
import { CheckCircle, XCircle, AlertTriangle, Terminal } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// SECTION: Shared styled primitives
// ─────────────────────────────────────────────────────────────

const CardShell = styled.div<{ $destructive?: boolean }>`
  margin-top: 12px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid ${({ $destructive }) =>
    $destructive ? 'rgba(201, 42, 84, 0.35)' : 'rgba(96, 192, 240, 0.2)'};
  background: ${({ $destructive }) =>
    $destructive
      ? 'color-mix(in srgb, #C92A54 6%, var(--bg-surface, #1A1A24))'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, var(--bg-surface, #1A1A24))'};
`;

const CardTitle = styled.div<{ $destructive?: boolean }>`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: ${({ $destructive }) =>
    $destructive ? '#C92A54' : 'var(--accent-primary, #60C0F0)'};
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
`;

const CardBody = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 14px;
  line-height: 1.5;
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

const ButtonRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 14px;
`;

const NudgeText = styled.div`
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  font-style: italic;
`;

const ErrorText = styled.div`
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(201, 42, 84, 0.1);
  border: 1px solid rgba(201, 42, 84, 0.25);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: #C92A54;
`;

const ActionBtn = styled.button<{ $variant: 'confirm' | 'cancel' | 'destructive' }>`
  min-height: 44px;
  padding: 0 18px;
  border-radius: 8px;
  border: 1px solid ${({ $variant }) => {
    if ($variant === 'destructive') return 'rgba(201, 42, 84, 0.5)';
    if ($variant === 'confirm') return 'rgba(96, 192, 240, 0.4)';
    return 'rgba(224, 236, 244, 0.2)';
  }};
  background: ${({ $variant }) => {
    if ($variant === 'destructive') return 'rgba(201, 42, 84, 0.15)';
    if ($variant === 'confirm') return 'rgba(96, 192, 240, 0.12)';
    return 'transparent';
  }};
  color: ${({ $variant }) => {
    if ($variant === 'destructive') return '#C92A54';
    if ($variant === 'confirm') return 'var(--accent-primary, #60C0F0)';
    return 'var(--text-muted, rgba(224, 236, 244, 0.4))';
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
      if ($variant === 'destructive') return 'rgba(201, 42, 84, 0.25)';
      if ($variant === 'confirm') return 'rgba(96, 192, 240, 0.2)';
      return 'rgba(224, 236, 244, 0.08)';
    }};
    box-shadow: ${({ $variant }) =>
      $variant === 'confirm' ? '0 0 10px rgba(96, 192, 240, 0.2)' : 'none'};
  }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Helpers
// ─────────────────────────────────────────────────────────────

/** Format a command param value for display in ConfirmationCard.
 *  exercises arrays get a human-readable per-exercise summary.
 *  Other objects/arrays are JSON-stringified and truncated at 80 chars. */
function renderParamValue(key: string, value: unknown): string {
  if (key === 'exercises' && Array.isArray(value)) {
    if (value.length === 0) return '(none)';
    return value.map((ex: Record<string, unknown>) => {
      const name = String(ex.name ?? ex.exerciseName ?? 'Exercise');
      const parts: string[] = [name];
      if (ex.weight != null) parts.push(`${ex.weight}lb`);
      if (ex.sets != null && ex.reps != null) parts.push(`${ex.sets}×${ex.reps}`);
      else if (ex.sets != null) parts.push(`${ex.sets} sets`);
      else if (ex.reps != null) parts.push(`${ex.reps} reps`);
      return parts.join(' ');
    }).join(' · ');
  }
  if (typeof value === 'object' && value !== null) {
    const str = JSON.stringify(value);
    return str.length > 80 ? str.slice(0, 77) + '…' : str;
  }
  return String(value);
}

/** Next-action nudges shown after successful command execution (text only, no buttons). */
const NEXT_ACTION_MAP: Record<string, string> = {
  log_workout: 'Want me to generate a session recap?',
  log_meals: 'Log another meal?',
  create_client: 'Send the claim link to the client now?',
  save_workout_plan: 'Review the plan before saving?',
  create_hermes_task: 'Check task status? Say "show hermes tasks".',
};

// ─────────────────────────────────────────────────────────────
// SECTION: ConfirmationCard
// PURPOSE: Requires explicit user confirm/cancel before execution
// ─────────────────────────────────────────────────────────────

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
      setConfirmError(result.error ?? 'Confirmation failed. Please try again.');
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
        <CardTitle><CheckCircle size={16} /> Action resolved</CardTitle>
      </CardShell>
    );
  }

  const clientLabel = client?.firstName
    ? `${client.firstName}${client.lastName ? ' ' + client.lastName : ''}`
    : null;
  const paramEntries = Object.entries(params).slice(0, 5);

  return (
    <CardShell $destructive={isDestructive}>
      <CardTitle $destructive={isDestructive}>
        {isDestructive ? <AlertTriangle size={16} /> : <Terminal size={16} />}
        {isDestructive ? 'Confirm Destructive Action' : 'Confirm Action'}
      </CardTitle>
      <DataRow><DataLabel>Command</DataLabel><DataValue>{command}</DataValue></DataRow>
      {clientLabel && <DataRow><DataLabel>Client</DataLabel><DataValue>{clientLabel}</DataValue></DataRow>}
      {paramEntries.map(([k, v]) => (
        <DataRow key={k}>
          <DataLabel>{k}</DataLabel>
          <DataValue>{renderParamValue(k, v)}</DataValue>
        </DataRow>
      ))}
      <ButtonRow>
        <ActionBtn
          $variant={isDestructive ? 'destructive' : 'confirm'}
          onClick={handleConfirm}
          disabled={busy}
          aria-label="Confirm action"
        >
          <CheckCircle size={14} /> {busy ? 'Confirming…' : 'Confirm'}
        </ActionBtn>
        <ActionBtn
          $variant="cancel"
          onClick={handleCancel}
          disabled={busy}
          aria-label="Cancel action"
        >
          <XCircle size={14} /> Cancel
        </ActionBtn>
      </ButtonRow>
      {confirmError && <ErrorText>{confirmError}</ErrorText>}
    </CardShell>
  );
});

// ─────────────────────────────────────────────────────────────
// SECTION: ExecutionResultCard
// PURPOSE: Shows structured result data after successful execution
// ─────────────────────────────────────────────────────────────

export interface ExecutionResultCardProps {
  command: string;
  result: Record<string, unknown> | null;
  client: { id?: number; firstName?: string } | null;
  message?: string;
}

export const ExecutionResultCard = memo(function ExecutionResultCard({
  command,
  result,
  client,
  message,
}: ExecutionResultCardProps) {
  const clientLabel = client?.firstName ?? null;
  const resultEntries = result ? Object.entries(result).slice(0, 6) : [];

  return (
    <CardShell>
      <CardTitle><CheckCircle size={16} /> Command Executed</CardTitle>
      {message && <CardBody>{message}</CardBody>}
      <DataRow><DataLabel>Command</DataLabel><DataValue>{command}</DataValue></DataRow>
      {clientLabel && <DataRow><DataLabel>Client</DataLabel><DataValue>{clientLabel}</DataValue></DataRow>}
      {resultEntries.map(([k, v]) => (
        <DataRow key={k}>
          <DataLabel>{k}</DataLabel>
          <DataValue>{renderParamValue(k, v)}</DataValue>
        </DataRow>
      ))}
      {NEXT_ACTION_MAP[command] && (
        <NudgeText>{NEXT_ACTION_MAP[command]}</NudgeText>
      )}
    </CardShell>
  );
});
