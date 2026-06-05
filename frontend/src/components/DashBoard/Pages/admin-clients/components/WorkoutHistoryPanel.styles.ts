/**
 * WorkoutHistoryPanel style helpers
 *
 * Keeps edit and notes chrome out of the canonical workout history runtime
 * component so the live Clients & Team history surface stays easier to audit.
 */
import styled, { css } from 'styled-components';

type EditButtonVariant = 'save' | 'cancel' | 'edit' | 'danger' | 'addSet';

const editButtonVariantStyles = {
  save: css`
    background: var(--accent-primary-bg-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent));
    border-color: var(--border-accent-strong, color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent));
    color: var(--accent-primary, #60C0F0);

    &:hover {
      background: var(--accent-primary-bg-hover, color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent));
    }
  `,
  cancel: css`
    background: var(--surface-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 6%, transparent));
    border-color: var(--border-subtle, color-mix(in srgb, var(--text-primary, #E0ECF4) 15%, transparent));
    color: var(--text-primary, #E0ECF4);

    &:hover {
      background: var(--surface-muted-hover, color-mix(in srgb, var(--text-primary, #E0ECF4) 12%, transparent));
    }
  `,
  danger: css`
    background: var(--danger-bg-soft, color-mix(in srgb, var(--danger, #C92A54) 12%, transparent));
    border-color: var(--border-danger-soft, color-mix(in srgb, var(--danger, #C92A54) 30%, transparent));
    color: var(--status-danger, #ff8fa3);
    min-height: 32px;
    padding: 4px 8px;

    &:hover {
      background: var(--danger-bg-hover, color-mix(in srgb, var(--danger, #C92A54) 20%, transparent));
    }
  `,
  addSet: css`
    background: var(--accent-secondary-bg-soft, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent));
    border-color: var(--border-secondary-soft, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent));
    color: var(--accent-secondary, #C9B8FF);
    min-height: 32px;
    padding: 6px 10px;
    font-size: 11px;

    &:hover {
      background: var(--accent-secondary-bg-hover, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent));
    }
  `,
  edit: css`
    background: var(--accent-secondary-bg-soft, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent));
    border-color: var(--border-secondary-soft, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent));
    color: var(--accent-secondary, #C9B8FF);

    &:hover {
      background: var(--accent-secondary-bg-hover, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent));
    }
  `,
};

export const EditActionBar = styled.div`
  display: flex;
  gap: 8px;
  padding: 10px 16px 14px;
  justify-content: flex-end;
  border-top: 1px solid var(--border-accent-subtle, color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent));
  flex-wrap: wrap;
`;

export const EditBtn = styled.button<{ $variant?: EditButtonVariant }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  min-height: 36px;
  border-radius: 6px;
  border: 1px solid transparent;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  ${({ $variant }) => editButtonVariantStyles[$variant ?? 'edit']}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const EditCellInput = styled.input`
  width: 100%;
  max-width: 72px;
  padding: 4px 6px;
  border-radius: 4px;
  border: 1px solid var(--border-accent-medium, color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent));
  background: var(--input-bg-subtle, color-mix(in srgb, var(--bg-base, #0A0A0F) 75%, transparent));
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  color-scheme: dark;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 1px;
  }
`;

export const EditErrorBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 16px 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--danger-bg-soft, color-mix(in srgb, var(--danger, #C92A54) 12%, transparent));
  border: 1px solid var(--border-danger-soft, color-mix(in srgb, var(--danger, #C92A54) 30%, transparent));
  color: var(--status-danger, #ff8fa3);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
`;

export const NotesBlock = styled.div`
  margin-top: 10px;
  padding: 10px 12px 10px 14px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 3%, var(--bg-base, #0A0A0F));
  border: 1px solid var(--border-accent-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent));
  border-left: 3px solid var(--accent-gold, #C6A84B);
  font-family: 'Sora', sans-serif;
  font-size: 0.8125rem;
  color: var(--text-primary, #E0ECF4);
`;

export const NotesLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--accent-gold, #C6A84B);
  font-weight: 700;
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 6px;
`;

export const NotesItem = styled.div<{ $muted?: boolean }>`
  color: ${p => p.$muted
    ? 'var(--text-secondary, #8BA8C8)'
    : 'var(--text-primary, #E0ECF4)'};
  font-style: ${p => p.$muted ? 'italic' : 'normal'};
  line-height: 1.5;
  padding: 2px 0;
  display: flex;
  gap: 8px;

  strong {
    color: var(--accent-primary, #60C0F0);
    font-weight: 600;
    flex-shrink: 0;
    min-width: 48px;
    font-family: 'Fira Code', monospace;
    font-size: 0.75rem;
  }
`;

export const NotesEditRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;

  strong {
    color: var(--accent-primary, #60C0F0);
    font-weight: 600;
    flex-shrink: 0;
    min-width: 48px;
    font-family: 'Fira Code', monospace;
  }

  input {
    flex: 1;
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid var(--border-accent-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent));
    background: var(--input-bg-subtle, color-mix(in srgb, var(--bg-base, #0A0A0F) 75%, transparent));
    color: var(--text-primary, #E0ECF4);
    font-family: 'Sora', sans-serif;
    font-size: 0.75rem;

    &:focus-visible {
      outline: 2px solid var(--accent-primary, #60C0F0);
      outline-offset: 1px;
    }
  }
`;

export const ExerciseNoteEditRow = styled(NotesEditRow)`
  strong {
    color: var(--accent-gold, #C6A84B);
    min-width: 72px;
  }
`;
