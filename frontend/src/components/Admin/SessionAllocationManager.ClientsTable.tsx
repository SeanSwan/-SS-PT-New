import React from 'react';
import { Eye, Plus } from 'lucide-react';
import { getClientSessionSignal, isNonDeductingClientSource } from '../DashBoard/workspaces/clients-team/clientSessionSignal';
import {
  getSessionBadgeLabel,
  getSessionBadgeType,
} from './SessionAllocationManager.logic';
import type { Client } from './SessionAllocationManager.types';
import {
  ActionButtons,
  ClientsTable,
  EmptyState,
  IconButton,
  SessionBadge,
  SessionSignalText,
  TableHeader,
  TableRow,
} from './SessionAllocationManager.tableStyles';

interface SessionAllocationClientsTableProps {
  clients: Client[];
  searchQuery: string;
  onAddSessions: (client: Client) => void;
  onViewClient: (client: Client) => void;
}

export const SessionAllocationClientsTable: React.FC<SessionAllocationClientsTableProps> = ({
  clients,
  searchQuery,
  onAddSessions,
  onViewClient,
}) => (
  <ClientsTable>
    <TableHeader>
      <div className="header-cell">Client</div>
      <div className="header-cell">Available</div>
      <div className="header-cell">Total Purchased</div>
      <div className="header-cell">Completed</div>
      <div className="header-cell">Status</div>
      <div className="header-cell">Actions</div>
    </TableHeader>

    {clients.map((client) => {
      const sessionSignal = getClientSessionSignal(client);
      const isFreeTrackingClient = isNonDeductingClientSource(client.clientSource);

      return (
        <TableRow
          key={client.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="cell client-info">
            <div className="name">{client.firstName} {client.lastName}</div>
            <div className="email">{client.email}</div>
          </div>
          <div className="cell" data-label="Available">
            <SessionSignalText>
              <span>{sessionSignal.label}</span>
              <small>{sessionSignal.note}</small>
            </SessionSignalText>
          </div>
          <div className="cell" data-label="Total Purchased">
            {client.totalSessionsPurchased}
          </div>
          <div className="cell" data-label="Completed">
            {client.sessionsUsed}
          </div>
          <div className="cell" data-label="Status">
            <SessionBadge type={getSessionBadgeType(client)}>
              {getSessionBadgeLabel(client)}
            </SessionBadge>
          </div>
          <div className="cell" data-label="Actions">
            <ActionButtons>
              <IconButton
                className="success"
                aria-label={
                  isFreeTrackingClient
                    ? `Paid sessions are disabled for ${client.firstName} ${client.lastName} because this is free tracking`
                    : `Add sessions to ${client.firstName} ${client.lastName}`
                }
                disabled={isFreeTrackingClient}
                onClick={() => onAddSessions(client)}
                title={isFreeTrackingClient ? 'Free tracking - no paid-session allocation' : 'Add Sessions'}
              >
                <Plus size={16} />
              </IconButton>
              <IconButton
                aria-label={`View details for ${client.firstName} ${client.lastName}`}
                onClick={() => onViewClient(client)}
                title="View Details"
              >
                <Eye size={16} />
              </IconButton>
            </ActionButtons>
          </div>
        </TableRow>
      );
    })}

    {clients.length === 0 && (
      <EmptyState>
        {searchQuery ? 'No clients match your search' : 'No clients found'}
      </EmptyState>
    )}
  </ClientsTable>
);
