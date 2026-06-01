import styled from 'styled-components';

export const ActionCard = styled.div`
  margin-top: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid var(--border-accent-soft, rgba(96, 192, 240, 0.15));
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 4%, var(--bg-surface, #1A1A24));
`;

export const CardTitle = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
`;

export const CardRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
`;

export const CardLabel = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  min-width: 100px;
`;

export const CardValue = styled.span`
  color: var(--text-primary, #E0ECF4);
  font-weight: 600;
  word-break: break-all;
`;

export const ErrorActionCard = styled(ActionCard)`
  border-color: var(--danger-border-soft, rgba(201, 42, 84, 0.3));
`;

export const CriticalActionCard = styled(ActionCard)`
  border-color: var(--danger-text, #C92A54);
`;

export const ErrorCardTitle = styled(CardTitle)`
  color: var(--danger-text, #C92A54);
`;

export const SoftErrorCardTitle = styled(CardTitle)`
  color: var(--danger-soft-text, #ff8fa3);
`;

export const SuccessCardValue = styled(CardValue)`
  color: var(--success-text, #10B981);
`;

export const FailureCardValue = styled(CardValue)`
  color: var(--danger-text, #C92A54);
`;

export const PainFlagsWrap = styled.div`
  margin-top: 8px;
`;

export const ProgressBar = styled.div<{ $pct: number }>`
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  overflow: hidden;
  max-width: 120px;

  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${({ $pct }) => $pct}%;
    background: var(--accent-secondary, #8B5CF6);
    border-radius: 3px;
  }
`;

export const TranscriptCard = styled(ActionCard)`
  border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
`;

export const TranscriptErrorCard = styled(TranscriptCard)`
  border-color: var(--danger-border-soft, rgba(201, 42, 84, 0.3));
`;

export const TranscriptDetails = styled.details`
  margin: 10px 0 6px;

  & > summary {
    cursor: pointer;
    font-family: 'Sora', sans-serif;
    font-size: 12px;
    color: var(--accent-primary, #60C0F0);
    padding: 4px 0;
    list-style: none;
    user-select: none;
  }

  & > summary::-webkit-details-marker {
    display: none;
  }

  & > pre {
    margin-top: 8px;
    padding: 10px 12px;
    border-radius: 8px;
    background: var(--bg-deep-scrim, rgba(0, 0, 0, 0.25));
    color: var(--text-secondary, rgba(224, 236, 244, 0.7));
    font-family: 'Fira Code', monospace;
    font-size: 11px;
    line-height: 1.5;
    white-space: pre-wrap;
    max-height: 240px;
    overflow-y: auto;
  }
`;

export const PainFlagBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  margin-right: 6px;
  margin-bottom: 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--danger-text, #C92A54) 15%, transparent);
  border: 1px solid var(--danger-border-soft, rgba(201, 42, 84, 0.3));
  color: var(--danger-soft-text, #ff8fa3);
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 600;
`;

export const ConfidenceBadge = styled.span<{ $level: 'high' | 'medium' | 'low' }>`
  display: inline-block;
  padding: 2px 8px;
  margin-left: 8px;
  border-radius: 999px;
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 600;
  background: ${({ $level }) =>
    $level === 'high'
      ? 'color-mix(in srgb, var(--success-text, #10B981) 18%, transparent)'
      : $level === 'medium'
        ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent)'
        : 'color-mix(in srgb, var(--danger-text, #C92A54) 18%, transparent)'};
  color: ${({ $level }) =>
    $level === 'high'
      ? 'var(--success-text, #10B981)'
      : $level === 'medium'
        ? 'var(--accent-primary, #60C0F0)'
        : 'var(--danger-soft-text, #ff8fa3)'};
`;

export const TranscriptActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
`;

export const TranscriptBtn = styled.button<{ $primary?: boolean; $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  min-height: 44px;
  border-radius: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  border: ${({ $primary, $danger }) =>
    $primary
      ? 'none'
      : $danger
        ? '1px solid var(--danger-border, rgba(201, 42, 84, 0.4))'
        : '1px solid var(--border-strong, rgba(255, 255, 255, 0.15))'};
  background: ${({ $primary, $danger }) =>
    $primary
      ? 'linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-data, #50A0F0))'
      : $danger
        ? 'color-mix(in srgb, var(--danger-text, #C92A54) 12%, transparent)'
        : 'var(--surface-subtle, rgba(255, 255, 255, 0.04))'};
  color: ${({ $primary, $danger }) =>
    $primary ? 'var(--bg-base, #0A0A0F)' : $danger ? 'var(--danger-soft-text, #ff8fa3)' : 'var(--text-primary, #e2e8f0)'};

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const ReceiptActionButton = styled.button`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--primary, #002060) 82%, transparent),
      color-mix(in srgb, var(--accent-secondary, #8B5CF6) 24%, var(--bg-surface, #1A1A24))
    );
  color: var(--text-primary, #E0ECF4);
  padding: 0 14px;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.72;
  }
`;

export const TranscriptError = styled.div<{ $kind?: 'duplicate_date' | 'future_date' | 'warning' | 'other' }>`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: ${({ $kind }) =>
    $kind === 'duplicate_date' || $kind === 'future_date' || $kind === 'warning'
      ? 'color-mix(in srgb, var(--warning-text, #F5D678) 12%, transparent)'
      : 'color-mix(in srgb, var(--danger-text, #C92A54) 12%, transparent)'};
  border: 1px solid
    ${({ $kind }) =>
      $kind === 'duplicate_date' || $kind === 'future_date' || $kind === 'warning'
        ? 'color-mix(in srgb, var(--warning-text, #F5D678) 40%, transparent)'
        : 'var(--danger-border-soft, rgba(201, 42, 84, 0.3))'};
  color: ${({ $kind }) =>
    $kind === 'duplicate_date' || $kind === 'future_date' || $kind === 'warning'
      ? 'var(--warning-text, #F5D678)'
      : 'var(--danger-soft-text, #ff8fa3)'};
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  line-height: 1.45;
`;

export const DateRow = styled(CardRow)`
  margin-top: 4px;
`;

export const DateInput = styled.input.attrs({ type: 'date' })`
  background: var(--bg-deep-scrim, rgba(0, 0, 0, 0.25));
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
  border-radius: 6px;
  padding: 6px 10px;
  min-height: 44px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  color-scheme: dark;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 1px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
