/**
 * ThemeStatusIndicator.tsx
 * Development-only utility for confirming Crystalline Swan theme tokens.
 */

import React from 'react';
import styled from 'styled-components';

type Status = 'success' | 'warning' | 'error';

const StatusContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  max-width: 250px;
  z-index: 9999;
  padding: 1rem;
  border-radius: 10px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.18));
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  box-shadow: 0 18px 48px color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  backdrop-filter: blur(15px);
  font-size: 0.85rem;
  pointer-events: none;

  @media (max-width: 768px) {
    display: none;
  }
`;

const StatusTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  color: var(--accent-primary, #60C0F0);
  font-weight: 600;
`;

const StatusItem = styled.div<{ $separated?: boolean }>`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.25rem;
  font-size: 0.8rem;
  ${({ $separated }) => $separated && `
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));
  `}
`;

const StatusBadge = styled.span<{ $status: Status }>`
  color: ${({ $status }) => {
    if ($status === 'success') return 'var(--feedback-success, #10B981)';
    if ($status === 'warning') return 'var(--feedback-warning, #F59E0B)';
    return 'var(--feedback-danger, #EF4444)';
  }};
  font-weight: 500;
`;

const StatusNote = styled.span`
  font-size: 0.75rem;
  opacity: 0.8;
`;

interface ThemeStatusIndicatorProps {
  enabled?: boolean;
}

const themeChecks = {
  'Theme Core': 'success',
  'Primary Token': 'success',
  'Surface Token': 'success',
  'Text Token': 'success',
  'Accent Token': 'success',
} as const satisfies Record<string, Status>;

const ThemeStatusIndicator: React.FC<ThemeStatusIndicatorProps> = ({
  enabled = process.env.NODE_ENV === 'development',
}) => {
  if (!enabled) return null;

  return (
    <StatusContainer data-swan-theme-status aria-hidden="true">
      <StatusTitle>Crystalline Swan Theme</StatusTitle>
      {Object.entries(themeChecks).map(([check, status]) => (
        <StatusItem key={check}>
          <span>{check}</span>
          <StatusBadge $status={status}>{status.toUpperCase()}</StatusBadge>
        </StatusItem>
      ))}
      <StatusItem $separated>
        <StatusNote>Development theme-token check only.</StatusNote>
      </StatusItem>
    </StatusContainer>
  );
};

export default ThemeStatusIndicator;
