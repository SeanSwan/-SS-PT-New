/**
 * FILE: AdminBroadcastComposer.styles.ts
 * PURPOSE: Styled-components primitives for the admin broadcast composer.
 * DATA FLOW: AdminBroadcastComposer.tsx owns state/submission; this file owns layout, tokens, and touch targets only.
 */

import styled from 'styled-components';

export const Panel = styled.section`
  display: grid;
  gap: 18px;
  padding: 20px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.22));
  border-radius: 12px;
  background:
    linear-gradient(145deg, var(--surface-elevated, #0b1730), var(--surface-card, #141419));
  box-shadow: 0 16px 36px var(--shadow-soft, rgba(0, 0, 0, 0.28));
`;

export const Header = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;

  svg {
    flex: 0 0 auto;
    color: var(--accent-primary, #60c0f0);
  }
`;

export const TitleBlock = styled.div`
  display: grid;
  gap: 4px;
`;

export const Title = styled.h3`
  margin: 0;
  color: var(--text-primary, #e0ecf4);
  font-size: 1.05rem;
  font-weight: 700;
`;

export const Subtitle = styled.p`
  margin: 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.76));
  font-size: 0.9rem;
  line-height: 1.45;
`;

export const Form = styled.form`
  display: grid;
  gap: 14px;
`;

export const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

export const Field = styled.label`
  display: grid;
  gap: 7px;
  color: var(--text-primary, #e0ecf4);
  font-size: 0.82rem;
  font-weight: 700;
`;

export const InputBase = styled.input`
  min-height: 44px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.22));
  border-radius: 10px;
  background: var(--surface-input, rgba(10, 10, 15, 0.64));
  color: var(--text-primary, #e0ecf4);
  padding: 10px 12px;
  font: inherit;

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8b5cf6);
    outline-offset: 2px;
  }
`;

export const SelectBase = styled.select`
  min-height: 44px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.22));
  border-radius: 10px;
  background: var(--surface-input, rgba(10, 10, 15, 0.64));
  color: var(--text-primary, #e0ecf4);
  padding: 10px 12px;
  font: inherit;

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8b5cf6);
    outline-offset: 2px;
  }
`;

export const TextArea = styled.textarea`
  min-height: 112px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.22));
  border-radius: 10px;
  background: var(--surface-input, rgba(10, 10, 15, 0.64));
  color: var(--text-primary, #e0ecf4);
  padding: 10px 12px;
  resize: vertical;
  font: inherit;

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8b5cf6);
    outline-offset: 2px;
  }
`;

export const ConfirmLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  color: var(--text-primary, #e0ecf4);
  font-size: 0.88rem;
  font-weight: 700;

  input {
    width: 18px;
    height: 18px;
    accent-color: var(--accent-primary, #60c0f0);
  }
`;

export const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

export const SendButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  min-width: 148px;
  border: 1px solid var(--accent-primary, #60c0f0);
  border-radius: 999px;
  background: var(--button-primary-bg, #002060);
  color: var(--button-primary-text, #e0ecf4);
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease, opacity 0.16s ease;

  &:not(:disabled):hover {
    transform: translateY(-1px);
    box-shadow: 0 0 20px var(--glow-secondary, rgba(139, 92, 246, 0.36));
  }

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8b5cf6);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:not(:disabled):hover {
      transform: none;
    }
  }
`;

export const InlineStatus = styled.div<{ $tone: 'success' | 'error' }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid ${({ $tone }) => (
    $tone === 'success'
      ? 'var(--success-border, rgba(34, 197, 94, 0.45))'
      : 'var(--danger-border, rgba(248, 113, 113, 0.45))'
  )};
  color: ${({ $tone }) => (
    $tone === 'success'
      ? 'var(--success-text, #bbf7d0)'
      : 'var(--danger-text, #fecaca)'
  )};
  background: ${({ $tone }) => (
    $tone === 'success'
      ? 'var(--success-surface, rgba(22, 101, 52, 0.18))'
      : 'var(--danger-surface, rgba(127, 29, 29, 0.18))'
  )};
  font-size: 0.88rem;
  font-weight: 700;
`;