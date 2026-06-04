/**
 * ClientActivationQueuePanel.tsx
 * ==============================
 * Admin-facing paid-client intake queue for the canonical ClientsWorkspace.
 * Shows the next activation bottleneck without changing the backend status
 * contract or duplicating payment/waiver/onboarding truth in React.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, RefreshCw } from 'lucide-react';
import type { ClientOption } from './clients-team/ClientSelectorDropdown';
import {
  fetchClientActivationQueue,
  getAdminActivationCta,
  type ClientActivationQueueResponse,
} from './clientActivationQueue';
import { getClientDisplayName } from './clients-team/clientIdentity';
import { rowToClientOption } from './ClientActivationQueuePanel.logic';
import {
  ActionButton,
  ActionRow,
  ClientName,
  IconButton,
  PanelHeader,
  PanelMeta,
  PanelShell,
  PanelTitle,
  QueueCard,
  QueueList,
  QueueMeta,
  StateText,
  SummaryGrid,
  SummaryPill,
  TitleGroup,
} from './ClientActivationQueuePanel.styles';

interface ClientActivationQueuePanelProps {
  authAxios: {
    get: (path: string, config?: { params?: Record<string, string | number> }) => Promise<any>;
  };
  onSelectClient: (client: ClientOption) => void;
  onNavigate: (route: string) => void;
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
