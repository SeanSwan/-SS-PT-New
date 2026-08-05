/**
 * WidgetShell.styles — Crystalline Swan chrome for the shared
 * admin widget shell (SWA-138 S1). Tokens only; 44px targets;
 * reduced-motion safe (no keyframes of its own).
 */

import styled from 'styled-components';

export const ShellHeader = styled.div`
  align-items: center;
  display: flex;
  gap: 8px;
  justify-content: space-between;
  margin: 0 0 1rem;
`;

export const ShellTitle = styled.h3`
  align-items: center;
  color: var(--accent-primary, #60C0F0);
  display: flex;
  flex: 1;
  font-size: 1.25rem;
  font-weight: 600;
  gap: 8px;
  margin: 0;
  min-width: 0;
`;

export const ShellMeta = styled.span`
  color: var(--text-muted, #94A3B8);
  font-size: 0.72rem;
  white-space: nowrap;
`;

export const RefreshButton = styled.button`
  align-items: center;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  border-radius: 10px;
  color: var(--accent-primary, #60C0F0);
  cursor: pointer;
  display: inline-flex;
  flex-shrink: 0;
  justify-content: center;
  min-height: 44px;
  min-width: 44px;
  transition: background 0.15s ease;

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
  &:disabled {
    cursor: default;
    opacity: 0.55;
  }
`;

export const ErrorState = styled.div`
  align-items: center;
  border: 1px solid color-mix(in srgb, var(--error, #EF4444) 35%, transparent);
  background: color-mix(in srgb, var(--error, #EF4444) 8%, transparent);
  border-radius: 12px;
  color: var(--text-primary, #E0ECF4);
  display: flex;
  flex-direction: column;
  font-size: 0.875rem;
  gap: 12px;
  padding: 20px 16px;
  text-align: center;
`;

export const RetryButton = styled.button`
  background: color-mix(in srgb, var(--error, #EF4444) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--error, #EF4444) 45%, transparent);
  border-radius: 10px;
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 600;
  min-height: 44px;
  padding: 0 20px;

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const EmptyState = styled.div`
  color: var(--text-muted, #94A3B8);
  font-size: 0.875rem;
  padding: 24px 0;
  text-align: center;
`;

export const StaleNotice = styled.div`
  border: 1px solid color-mix(in srgb, var(--warning, #EAB308) 35%, transparent);
  background: color-mix(in srgb, var(--warning, #EAB308) 8%, transparent);
  border-radius: 8px;
  color: var(--warning, #EAB308);
  font-size: 0.75rem;
  margin-bottom: 12px;
  padding: 8px 12px;
`;
