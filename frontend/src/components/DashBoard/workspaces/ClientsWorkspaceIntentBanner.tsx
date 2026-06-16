/**
 * Visible command-mode banner for Client Hub route intents.
 */

import React from 'react';
import styled from 'styled-components';
import { ClipboardCheck, MousePointerClick } from 'lucide-react';
import type { ClientHubIntent } from './ClientsWorkspace.logic';

interface ClientsWorkspaceIntentBannerProps {
  intent: ClientHubIntent;
  selectedClientId: string | number | null;
}

const IntentBanner = styled.section`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  margin: 0 20px 12px;
  padding: 14px 16px;
  border: 1px solid var(--border-accent-soft, rgba(96, 192, 240, 0.22));
  border-radius: 14px;
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--accent-primary, #60C0F0) 13%, transparent),
      color-mix(in srgb, var(--accent-secondary, #8B5CF6) 11%, transparent)),
    color-mix(in srgb, var(--surface-elevated, #003080) 68%, transparent);
  box-shadow: 0 18px 50px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent);
  color: var(--text-primary, #E0ECF4);

  .mode-icon {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--accent-primary, #60C0F0);
    background: color-mix(in srgb, var(--bg-base, #0A0A0F) 50%, transparent);
  }

  h2 {
    margin: 0;
    font: 800 1rem/1.15 'Plus Jakarta Sans', sans-serif;
  }
  p {
    margin: 4px 0 0;
    color: var(--text-secondary, rgba(224, 236, 244, 0.76));
    font: 500 0.9rem/1.45 'Sora', sans-serif;
  }
  .mode-step {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 44px;
    padding: 0 12px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--bg-base, #0A0A0F) 48%, transparent);
    color: var(--text-primary, #E0ECF4);
    font: 800 0.82rem/1.2 'Sora', sans-serif;
    text-align: center;
  }
  @media (max-width: 680px) {
    grid-template-columns: auto minmax(0, 1fr);
    margin: 0 12px 10px;

    .mode-step {
      grid-column: 1 / -1;
      justify-content: center;
      width: 100%;
    }
  }
`;
const ClientsWorkspaceIntentBanner: React.FC<ClientsWorkspaceIntentBannerProps> = ({
  intent,
  selectedClientId,
}) => {
  if (intent !== 'log_workout' || selectedClientId !== null) return null;
  return (
    <IntentBanner role="region" aria-label="Log workout mode">
      <span className="mode-icon" aria-hidden="true">
        <ClipboardCheck size={22} />
      </span>
      <div>
        <h2>Log workout mode</h2>
        <p>Pick the client; the logger opens next with today's plan ready to review.</p>
      </div>
      <span className="mode-step">
        <MousePointerClick size={16} aria-hidden="true" />
        One client click
      </span>
    </IntentBanner>
  );
};
export default ClientsWorkspaceIntentBanner;
