/**
 * ClientActivationQueuePanel.tsx
 * ==============================
 * Admin-facing paid-client intake queue for the canonical ClientsWorkspace.
 * Shows the next activation bottleneck without changing the backend status
 * contract or duplicating payment/waiver/onboarding truth in React.
 */
import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, RefreshCw } from 'lucide-react';
import type { ClientOption } from './clients-team/ClientSelectorDropdown';
import {
  fetchClientActivationQueue,
  getAdminActivationCta,
  type ClientActivationQueueResponse,
  type ClientActivationQueueRow,
} from './clientActivationQueue';
import { getClientDisplayName } from './clients-team/clientIdentity';
import { normalizeClientOptionId } from './clients-team/clientOptionMappers';

interface ClientActivationQueuePanelProps {
  authAxios: {
    get: (path: string, config?: { params?: Record<string, string | number> }) => Promise<any>;
  };
  onSelectClient: (client: ClientOption) => void;
  onNavigate: (route: string) => void;
}

const PanelShell = styled.section`
  margin: 0 20px 12px;
  padding: 14px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 92%, transparent);

  @media (max-width: 768px) {
    margin: 0 12px 10px;
  }
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: space-between;
  flex-wrap: wrap;
`;

const TitleGroup = styled.div`
  display: grid;
  gap: 2px;
`;

const PanelTitle = styled.h3`
  margin: 0;
  font: 700 15px 'Plus Jakarta Sans', sans-serif;
  color: var(--text-heading, #E0ECF4);
`;

const PanelMeta = styled.div`
  font: 500 12px 'Fira Code', monospace;
  color: var(--text-muted, rgba(224, 236, 244, 0.78));
`;

const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  min-width: 44px;
  height: 44px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 8px;
  background: var(--bg-elevated, #141419);
  color: var(--accent-primary, #60C0F0);
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.58;
    transform: none;
    border-color: var(--border-soft, rgba(96, 192, 240, 0.12));
  }
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const SummaryPill = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  font: 600 12px 'Sora', sans-serif;
`;

const QueueList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 10px;
  margin-top: 12px;
`;

const QueueCard = styled.article`
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 8px;
  background: var(--bg-elevated, #141419);
`;

const ClientName = styled.div`
  font: 700 14px 'Sora', sans-serif;
  color: var(--text-heading, #E0ECF4);
`;

const QueueMeta = styled.div`
  font: 500 12px 'Fira Code', monospace;
  color: var(--text-muted, rgba(224, 236, 244, 0.78));
`;

const ActionRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const ActionButton = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid ${({ $primary }) =>
    $primary ? 'var(--accent-primary, #60C0F0)' : 'var(--border-soft, rgba(96, 192, 240, 0.12))'};
  background: ${({ $primary }) =>
    $primary ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent)' : 'transparent'};
  color: ${({ $primary }) =>
    $primary ? 'var(--accent-primary, #60C0F0)' : 'var(--text-primary, #E0ECF4)'};
  font: 700 12px 'Sora', sans-serif;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

const StateText = styled.div`
  margin-top: 10px;
  color: var(--text-muted, rgba(224, 236, 244, 0.78));
  font: 500 13px 'Sora', sans-serif;
`;

function rowToClientOption(row: ClientActivationQueueRow): ClientOption | null {
  const id = normalizeClientOptionId(row.client.id);
  if (!id) return null;

  return {
    id,
    firstName: row.client.firstName,
    lastName: row.client.lastName,
    email: row.client.email,
    clientSource: 'swanstudios',
    isActive: row.client.isActive,
    availableSessions: row.client.availableSessions,
  };
}

const ClientActivationQueuePanel: React.FC<ClientActivationQueuePanelProps> = ({
  authAxios,
  onSelectClient,
  onNavigate,
}) => {
  const [queueData, setQueueData] = useState<ClientActivationQueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setQueueData(await fetchClientActivationQueue(authAxios, { limit: 25 }));
    } catch (err: any) {
      setError(err?.message || 'Activation queue unavailable');
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const rows = queueData?.queue || [];
  const summary = queueData?.summary;

  return (
    <PanelShell aria-label="Paid client activation queue" aria-busy={loading}>
      <PanelHeader>
        <TitleGroup>
          <PanelTitle>Paid Activation Queue</PanelTitle>
          <PanelMeta>{summary?.total || 0} paid clients needing activation review</PanelMeta>
        </TitleGroup>
        <IconButton
          type="button"
          onClick={loadQueue}
          aria-label="Refresh activation queue"
          title="Refresh activation queue"
          disabled={loading}
        >
          <RefreshCw size={18} />
        </IconButton>
      </PanelHeader>

      <SummaryGrid>
        <SummaryPill><AlertCircle size={15} /> {summary?.needsWaiver || 0} waiver</SummaryPill>
        <SummaryPill><Clock3 size={15} /> {summary?.needsOnboarding || 0} onboarding</SummaryPill>
        <SummaryPill><AlertCircle size={15} /> {summary?.awaitingSessionAllocation || 0} allocation</SummaryPill>
        <SummaryPill><CheckCircle2 size={15} /> {summary?.readyToSchedule || 0} schedule</SummaryPill>
      </SummaryGrid>

      {loading ? (
        <StateText>Loading activation queue...</StateText>
      ) : error ? (
        <StateText role="alert">{error}</StateText>
      ) : rows.length === 0 ? (
        <StateText>No paid clients are waiting in the activation queue.</StateText>
      ) : (
        <QueueList>
          {rows.slice(0, 6).map((row) => {
            const cta = getAdminActivationCta(row);
            const clientOption = rowToClientOption(row);
            const clientName = getClientDisplayName(row.client);
            return (
              <QueueCard key={`${row.cartId}-${row.sessionId}`}>
                <div>
                  <ClientName>{clientName}</ClientName>
                  <QueueMeta>{row.activation.nextStep} | {row.activation.sessionsAvailable} sessions</QueueMeta>
                </div>
                <ActionRow>
                  <ActionButton
                    type="button"
                    onClick={() => {
                      if (clientOption) onSelectClient(clientOption);
                    }}
                    aria-label={`Focus ${clientName}`}
                    disabled={!clientOption}
                  >
                    Focus Client
                  </ActionButton>
                  <ActionButton
                    type="button"
                    $primary
                    onClick={() => {
                      if (cta) onNavigate(cta.route);
                    }}
                    aria-label={cta ? `${cta.label} for ${clientName}` : `Activation route unavailable for ${clientName}`}
                    disabled={!cta}
                  >
                    {cta?.label || 'Unavailable'}
                    {cta && <ArrowRight size={14} />}
                  </ActionButton>
                </ActionRow>
              </QueueCard>
            );
          })}
        </QueueList>
      )}
    </PanelShell>
  );
};

export default ClientActivationQueuePanel;
