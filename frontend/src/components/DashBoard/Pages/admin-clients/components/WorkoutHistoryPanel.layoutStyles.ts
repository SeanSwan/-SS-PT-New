/**
 * WorkoutHistoryPanel layout styles
 *
 * Top-level chrome for the canonical workout history surface. Runtime data,
 * edit state, and save handlers stay in WorkoutHistoryPanel.tsx.
 */
import styled from 'styled-components';

export const SummaryBar = styled.div`
  display: flex;
  gap: 16px;
  padding: 12px 24px;
  background: rgba(96, 192, 240, 0.05);
  border-bottom: 1px solid rgba(139, 92, 246, 0.1);
  flex-wrap: wrap;
`;

export const StatChip = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8125rem;
  font-family: 'Sora', sans-serif;
  color: var(--text-primary, #E0ECF4);

  strong {
    color: var(--accent-primary, #60C0F0);
    font-weight: 600;
    font-family: 'Fira Code', monospace;
    font-size: 0.9em;
  }
`;

export const TabBar = styled.div`
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0 24px;
`;

export const Tab = styled.button<{ $active: boolean }>`
  padding: 12px 20px;
  min-height: 44px;
  border: none;
  background: transparent;
  color: ${p => p.$active
    ? 'var(--accent-primary, #60C0F0)'
    : 'var(--text-primary, #E0ECF4)'};
  font-size: 0.875rem;
  font-family: 'Sora', sans-serif;
  font-weight: ${p => p.$active ? 600 : 400};
  cursor: pointer;
  border-bottom: 2px solid ${p => p.$active
    ? 'var(--accent-primary, #60C0F0)'
    : 'transparent'};
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;

  &:hover { color: var(--accent-primary, #60C0F0); }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: -2px;
  }
`;

export const LoadingText = styled.p`
  color: var(--text-secondary, rgba(255, 255, 255, 0.6));
  margin: 0.5rem 0 0;
`;

export const ErrorPanel = styled.div`
  padding: 1rem;
  background: rgba(201, 42, 84, 0.1);
  border: 1px solid rgba(201, 42, 84, 0.3);
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
`;

export const RetryButton = styled.button`
  background: transparent;
  border: 1px solid rgba(201, 42, 84, 0.4);
  color: var(--text-primary, #E0ECF4);
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  min-height: 44px;
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: var(--text-secondary, #94a3b8);

  svg { opacity: 0.4; margin-bottom: 12px; }
`;

export const EmbeddedHeader = styled.div`
  padding: 14px 24px 0;
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  color: var(--text-secondary, #8BA8C8);
  display: flex;
  align-items: center;
  gap: 8px;

  strong {
    color: var(--text-primary, #E0ECF4);
    font-weight: 600;
  }
`;
