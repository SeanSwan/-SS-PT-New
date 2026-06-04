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
  background: var(--bg-elevated, rgba(15, 23, 42, 0.95));
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  backdrop-filter: blur(12px);
`;

const StateTitle = styled.h2`
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 8px 0;
`;

const StateText = styled.p`
  font-size: 1rem;
  color: var(--text-secondary, #A9B7C8);
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
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  color: var(--accent-primary, #60C0F0);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
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
