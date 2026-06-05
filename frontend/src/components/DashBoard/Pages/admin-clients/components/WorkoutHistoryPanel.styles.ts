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
    background: rgba(96, 192, 240, 0.15);
    border-color: rgba(96, 192, 240, 0.4);
    color: var(--accent-primary, #60C0F0);

    &:hover { background: rgba(96, 192, 240, 0.25); }
  `,
  cancel: css`
    background: rgba(224, 236, 244, 0.06);
    border-color: rgba(224, 236, 244, 0.15);
    color: var(--text-primary, #E0ECF4);

    &:hover { background: rgba(224, 236, 244, 0.12); }
  `,
  danger: css`
    background: rgba(201, 42, 84, 0.12);
    border-color: rgba(201, 42, 84, 0.3);
    color: var(--status-danger, #ff8fa3);
    min-height: 32px;
    padding: 4px 8px;

    &:hover { background: rgba(201, 42, 84, 0.2); }
  `,
  addSet: css`
    background: rgba(139, 92, 246, 0.12);
    border-color: rgba(139, 92, 246, 0.3);
    color: var(--accent-secondary, #C9B8FF);
    min-height: 32px;
    padding: 6px 10px;
    font-size: 11px;

    &:hover { background: rgba(139, 92, 246, 0.2); }
  `,
  edit: css`
    background: rgba(139, 92, 246, 0.12);
    border-color: rgba(139, 92, 246, 0.3);
    color: var(--accent-secondary, #C9B8FF);

    &:hover { background: rgba(139, 92, 246, 0.2); }
  `,
};

export const EditActionBar = styled.div`
  display: flex;
  gap: 8px;
  padding: 10px 16px 14px;
  justify-content: flex-end;
  border-top: 1px solid rgba(96, 192, 240, 0.06);
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
  border: 1px solid rgba(96, 192, 240, 0.35);
  background: rgba(0, 0, 0, 0.25);
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
  background: rgba(201, 42, 84, 0.12);
  border: 1px solid rgba(201, 42, 84, 0.3);
  color: var(--status-danger, #ff8fa3);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
`;

export const NotesBlock = styled.div`
  margin-top: 10px;
  padding: 10px 12px 10px 14px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 3%, rgba(0, 0, 0, 0.2));
  border: 1px solid rgba(96, 192, 240, 0.14);
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
    ? 'var(--text-secondary, rgba(224, 236, 244, 0.55))'
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
    border: 1px solid rgba(96, 192, 240, 0.25);
    background: rgba(0, 0, 0, 0.25);
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
