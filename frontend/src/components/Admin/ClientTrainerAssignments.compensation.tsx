/**
 * ClientTrainerAssignments.compensation.tsx
 * =========================================
 * Per-assignment compensation control for the admin assignment board
 * (trainer revenue model mode b, 2026-07-14).
 *
 * Collapsed: a pill stating the pay lane — "Rev-share" (default, pay is
 * created at purchase) or "$50/session" (employed, accrues per completed
 * session). Tap to expand an inline editor: mode toggle + rate input +
 * save. 44px touch targets, tokens with Crystalline fallbacks, no modal.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { BadgeDollarSign, Check, X } from 'lucide-react';
import type { CompensationMode } from './ClientTrainerAssignments.types';

const Wrap = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 6px;
`;

const Pill = styled.button<{ $flat: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid
    ${({ $flat }) => ($flat ? 'var(--accent-gold, #C6A84B)' : 'var(--border-subtle, rgba(96, 192, 240, 0.25))')};
  background: var(--surface-dark, #1a1a24);
  color: ${({ $flat }) => ($flat ? 'var(--accent-gold, #C6A84B)' : 'var(--text-primary, #e0ecf4)')};
  font-size: 0.75rem;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-glow, #8b5cf6);
    outline-offset: 2px;
  }
`;

const ModeButton = styled.button<{ $active: boolean }>`
  min-height: 44px;
  padding: 0 10px;
  border-radius: 8px;
  font-size: 0.72rem;
  cursor: pointer;
  border: 1px solid
    ${({ $active }) => ($active ? 'var(--accent-primary, #60c0f0)' : 'var(--border-subtle, rgba(96, 192, 240, 0.25))')};
  background: ${({ $active }) => ($active ? 'var(--surface-elevated, #003080)' : 'var(--surface-dark, #1a1a24)')};
  color: var(--text-primary, #e0ecf4);

  &:focus-visible {
    outline: 2px solid var(--accent-glow, #8b5cf6);
    outline-offset: 2px;
  }
`;

const RateInput = styled.input`
  width: 84px;
  min-height: 44px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.25));
  background: var(--bg-base, #0a0a0f);
  color: var(--text-primary, #e0ecf4);
  font-size: 0.78rem;

  &:focus-visible {
    outline: 2px solid var(--accent-glow, #8b5cf6);
    outline-offset: 2px;
  }
`;

const InlineIconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.25));
  background: var(--surface-dark, #1a1a24);
  color: var(--text-primary, #e0ecf4);
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-glow, #8b5cf6);
    outline-offset: 2px;
  }
`;

const ErrorNote = styled.span`
  font-size: 0.7rem;
  color: var(--danger, #f87171);
`;

export interface CompensationValue {
  compensationMode: CompensationMode;
  flatSessionRate: number | null;
}

export interface CompensationControlProps {
  /** Unique id for testids: assignment id or `trainer-default-<id>` */
  controlId: string | number;
  value: CompensationValue;
  /** Optional label prefix, e.g. "Default: " for trainer-level defaults */
  labelPrefix?: string;
  title?: string;
  disabled?: boolean;
  onSave: (changes: { compensationMode: CompensationMode; flatSessionRate?: number }) => Promise<void>;
}

export const compensationLabel = (value: CompensationValue) =>
  value.compensationMode === 'per_session_flat'
    ? `$${(value.flatSessionRate ?? 0).toFixed(2)}/session`
    : 'Rev-share';

export const CompensationControl = ({ controlId, value, labelPrefix = '', title, disabled, onSave }: CompensationControlProps) => {
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<CompensationMode>(value.compensationMode);
  const [rate, setRate] = useState(
    value.flatSessionRate != null ? String(value.flatSessionRate) : '50'
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const openEditor = () => {
    setMode(value.compensationMode);
    setRate(value.flatSessionRate != null ? String(value.flatSessionRate) : '50');
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    const parsedRate = Number(rate);
    if (mode === 'per_session_flat' && (!Number.isFinite(parsedRate) || parsedRate <= 0 || parsedRate > 10000)) {
      setError('Enter a per-session rate between $0.01 and $10,000');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        compensationMode: mode,
        ...(mode === 'per_session_flat' ? { flatSessionRate: Math.round(parsedRate * 100) / 100 } : {}),
      });
      setEditing(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update compensation');
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <Wrap>
        <Pill
          type="button"
          $flat={value.compensationMode === 'per_session_flat'}
          onClick={openEditor}
          disabled={disabled}
          data-testid={`compensation-pill-${controlId}`}
          title={title || 'Change how this trainer is paid'}
        >
          <BadgeDollarSign size={13} aria-hidden />
          {labelPrefix}
          {compensationLabel(value)}
        </Pill>
      </Wrap>
    );
  }

  return (
    <Wrap data-testid={`compensation-editor-${controlId}`}>
      <ModeButton type="button" $active={mode === 'revenue_share'} onClick={() => setMode('revenue_share')}>
        Rev-share
      </ModeButton>
      <ModeButton type="button" $active={mode === 'per_session_flat'} onClick={() => setMode('per_session_flat')}>
        Flat $/session
      </ModeButton>
      {mode === 'per_session_flat' && (
        <RateInput
          type="number"
          inputMode="decimal"
          min="0.01"
          max="10000"
          step="0.01"
          value={rate}
          onChange={(event) => setRate(event.target.value)}
          aria-label="Flat dollar rate per completed session"
        />
      )}
      <InlineIconButton
        type="button"
        onClick={save}
        disabled={saving}
        aria-label="Save compensation"
        data-testid={`compensation-save-${controlId}`}
      >
        <Check size={15} />
      </InlineIconButton>
      <InlineIconButton type="button" onClick={() => setEditing(false)} disabled={saving} aria-label="Cancel">
        <X size={15} />
      </InlineIconButton>
      {error && <ErrorNote role="alert">{error}</ErrorNote>}
    </Wrap>
  );
};

export default CompensationControl;
