/**
 * COMPONENT: ClientHubGridSection
 * PURPOSE: Roster grid for the Client Hub — status filter chips (with live
 * counts) above the client card grid, plus an honest filtered-empty state.
 * Owns the transient filter state so ClientsWorkspace stays lean; the filter
 * resets when the grid unmounts (client selected), which matches intent.
 */

import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { CardGrid } from '../ClientsWorkspace.styles';
import ClientHubGridCard from './ClientHubGridCard';
import type { ClientHubQuickAction } from './ClientHubGridCardActions';
import ClientHubStatusFilterBar from './ClientHubStatusFilterBar';
import {
  filterClientsByStatus,
  getClientStatusCounts,
  type ClientHubStatusFilter,
} from './clientStatusFilter';
import type { ClientOption } from './ClientSelectorDropdown';

const RosterSection = styled.section`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const FilterEmptyNote = styled.p`
  margin: 0;
  padding: clamp(24px, 3vw, 48px) clamp(16px, 1.4vw, 32px);
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  font-family: 'Sora', sans-serif;
  font-size: 14px;
`;

interface ClientHubGridSectionProps {
  clients: ClientOption[];
  onSelectClient: (client: ClientOption) => void;
  onClientCardQuickAction: (client: ClientOption, action: ClientHubQuickAction) => void;
}

const ClientHubGridSection: React.FC<ClientHubGridSectionProps> = ({
  clients,
  onSelectClient,
  onClientCardQuickAction,
}) => {
  const [statusFilter, setStatusFilter] = useState<ClientHubStatusFilter>('all');
  const counts = useMemo(() => getClientStatusCounts(clients), [clients]);
  const visibleClients = useMemo(
    () => filterClientsByStatus(clients, statusFilter),
    [clients, statusFilter],
  );

  return (
    <RosterSection aria-label="Client roster">
      <ClientHubStatusFilterBar counts={counts} value={statusFilter} onChange={setStatusFilter} />
      {visibleClients.length === 0 ? (
        <FilterEmptyNote role="status">
          No clients match this filter right now.
        </FilterEmptyNote>
      ) : (
        <CardGrid>
          {visibleClients.map((client) => (
            <ClientHubGridCard
              key={client.id}
              client={client}
              onSelect={onSelectClient}
              onQuickAction={onClientCardQuickAction}
            />
          ))}
        </CardGrid>
      )}
    </RosterSection>
  );
};

export default ClientHubGridSection;
