/**
 * EnhancedClientProgressViewStatePanels.tsx
 * -----------------------------------------
 * Route-state panels for the canonical trainer client-progress surface.
 */

import styled from 'styled-components';

const StatePageWrapper = styled.div`
  padding: 24px;
`;

const StatePanel = styled.div`
  background: var(--surface-elevated, rgba(15, 23, 42, 0.95));
  border: 1px solid var(--border-accent-soft, rgba(14, 165, 233, 0.2));
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  backdrop-filter: blur(12px);
`;

const StateTitle = styled.h2`
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary, #e2e8f0);
  margin: 0 0 8px 0;
`;

const StateText = styled.p`
  font-size: 1rem;
  color: var(--text-secondary, #94a3b8);
  margin: 0;
`;

const StateButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  min-width: 44px;
  margin-top: 16px;
  padding: 8px 14px;
  border: 1px solid var(--border-accent-soft, rgba(14, 165, 233, 0.25));
  border-radius: 8px;
  background: var(--surface-interactive, rgba(14, 165, 233, 0.08));
  color: var(--accent-primary, #7dd3fc);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;

  &:hover {
    background: var(--surface-interactive-hover, rgba(14, 165, 233, 0.15));
    border-color: var(--border-accent-strong, rgba(14, 165, 233, 0.4));
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #0ea5e9);
    outline-offset: 2px;
  }
`;

interface MissingClientProgressStateProps {
  onBackToClients: () => void;
}

export const MissingClientProgressState = ({
  onBackToClients,
}: MissingClientProgressStateProps) => (
  <StatePageWrapper>
    <StatePanel role="alert">
      <StateTitle>Select a client first</StateTitle>
      <StateText>
        Open this progress dashboard from My Clients so charts, goals, and risk signals stay tied to a real client record.
      </StateText>
      <StateButton type="button" onClick={onBackToClients}>
        Back to My Clients
      </StateButton>
    </StatePanel>
  </StatePageWrapper>
);

export const LoadingClientProgressState = () => (
  <StatePageWrapper>
    <StatePanel role="status" aria-live="polite">
      <StateTitle>Loading client progress</StateTitle>
      <StateText>
        Fetching workout logs, session history, goals, and risk signals before opening analytics.
      </StateText>
    </StatePanel>
  </StatePageWrapper>
);
