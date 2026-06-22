import React, { useEffect, useMemo, useState } from 'react';
import apiService from '../../../../services/api.service';
import type { ClientOption } from './ClientSelectorDropdown';
import { getClientDisplayName } from './clientIdentity';
import { formatLocalCalendarDate } from './nutritionDate';
import {
  buildNutritionRosterRows,
  selectRosterClientIds,
  type NutritionRosterClient,
  type RosterTriageRecord,
} from './ClientNutritionRosterTriagePanel.logic';
import {
  RosterClientName,
  RosterTriageCard,
  RosterTriageFlag,
  RosterTriageFlags,
  RosterTriageGrid,
  RosterTriageHeader,
  RosterTriageMeta,
  RosterTriageShell,
  RosterTriageStat,
  RosterTriageStats,
  RosterTriageTitle,
} from './ClientNutritionRosterTriagePanel.styles';

interface ClientNutritionRosterTriagePanelProps {
  clients: ClientOption[];
  hidden?: boolean;
}

type LoadState = 'loading' | 'ready' | 'error';

const toRosterClients = (clients: ClientOption[]): NutritionRosterClient[] =>
  clients.map((client) => ({
    id: client.id,
    displayName: getClientDisplayName(client),
  }));

const ClientNutritionRosterTriagePanel: React.FC<ClientNutritionRosterTriagePanelProps> = ({ clients, hidden }) => {
  const rosterClients = useMemo(() => toRosterClients(clients), [clients]);
  const rosterClientIds = useMemo(() => selectRosterClientIds(rosterClients), [rosterClients]);
  const [state, setState] = useState<LoadState>('loading');
  const [records, setRecords] = useState<RosterTriageRecord[]>([]);

  useEffect(() => {
    if (hidden || rosterClientIds.length === 0) return undefined;

    let cancelled = false;
    const date = formatLocalCalendarDate();
    const params = new URLSearchParams({ date, userIds: rosterClientIds.join(',') });
    setState('loading');

    apiService.get(`/api/macros/roster-triage?${params.toString()}`)
      .then((response) => {
        if (cancelled) return;
        if (!response.data?.success || !Array.isArray(response.data.clients)) {
          throw new Error('Roster triage response was not successful');
        }
        const nextRecords = response.data.clients;
        setRecords(nextRecords);
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [hidden, rosterClientIds]);

  if (hidden || rosterClientIds.length === 0) return null;

  const rows = buildNutritionRosterRows(
    rosterClients.filter((client) => rosterClientIds.includes(client.id)),
    records
  ).slice(0, 4);

  return (
    <RosterTriageShell aria-labelledby="nutrition-roster-triage-title">
      <RosterTriageHeader>
        <RosterTriageTitle id="nutrition-roster-triage-title">Nutrition Roster Triage</RosterTriageTitle>
        <RosterTriageMeta>{state === 'loading' ? 'Loading...' : `${rosterClientIds.length} tracked`}</RosterTriageMeta>
      </RosterTriageHeader>

      {state === 'loading' ? (
        <RosterTriageMeta role="status">Loading roster nutrition...</RosterTriageMeta>
      ) : state === 'error' ? (
        <RosterTriageMeta role="alert">Nutrition roster triage unavailable</RosterTriageMeta>
      ) : (
        <RosterTriageGrid>
          {rows.map((row) => (
            <RosterTriageCard key={row.clientId} $attention={row.attentionScore > 0}>
              <RosterClientName>{row.clientName}</RosterClientName>
              <RosterTriageStats>
                <RosterTriageStat>{row.statusLabel}</RosterTriageStat>
                <RosterTriageStat>{row.weeklyLabel}</RosterTriageStat>
                <RosterTriageStat>{row.proteinLabel}</RosterTriageStat>
              </RosterTriageStats>
              <RosterTriageFlags aria-label={`${row.clientName} nutrition flags`}>
                {row.flags.map((flag) => (
                  <RosterTriageFlag
                    key={`${row.clientId}-${flag}`}
                    $attention={flag !== 'No attention flags'}
                  >
                    {flag}
                  </RosterTriageFlag>
                ))}
              </RosterTriageFlags>
            </RosterTriageCard>
          ))}
        </RosterTriageGrid>
      )}
    </RosterTriageShell>
  );
};

export default ClientNutritionRosterTriagePanel;
