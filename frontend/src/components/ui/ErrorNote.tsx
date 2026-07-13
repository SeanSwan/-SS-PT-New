/**
 * COMPONENT: ErrorNote (shared UI primitive)
 * PURPOSE: THE honest-state error banner — one danger-token contract
 * instead of per-surface clones (Rule 63). Renders a role=alert note with
 * an optional 44px retry action. Batch-2 consumers: schedule fetch
 * failures, Client Hub roster failures, membership cancel failures.
 * Legacy error-banner clones migrate here as they are touched (backlog).
 */
import React from 'react';
import styled from 'styled-components';

const Note = styled.div`
  margin: 12px 16px 0;
  padding: 10px 14px;
  border: 1px solid var(--danger, #ef4444);
  border-radius: 10px;
  color: var(--danger-text, #f87171);
  font-size: 0.85rem;

  button {
    min-height: 44px;
    margin-left: 8px;
    padding: 4px 14px;
    border: 1px solid var(--danger, #ef4444);
    border-radius: 8px;
    background: transparent;
    color: var(--danger-text, #f87171);
    cursor: pointer;
  }
  button:focus-visible { outline: 2px solid var(--danger, #ef4444); outline-offset: 2px; }
`;

interface ErrorNoteProps {
  children: React.ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

const ErrorNote: React.FC<ErrorNoteProps> = ({ children, onRetry, retryLabel = 'Try again', className }) => (
  <Note role="alert" className={className}>
    {children}
    {onRetry && <button type="button" onClick={onRetry}>{retryLabel}</button>}
  </Note>
);

export default ErrorNote;
