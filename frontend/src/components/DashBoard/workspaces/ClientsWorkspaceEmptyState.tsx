/**
 * Empty state for the canonical Client Hub when no clients are loaded yet.
 */

import React from 'react';
import { ClipboardList, UserPlus } from 'lucide-react';
import { ActionBtn, EmptyHub, EmptyHubActions } from './ClientsWorkspace.styles';

interface ClientsWorkspaceEmptyStateProps {
  onNewClient: () => void;
  onManualCreate: () => void;
}

const ClientsWorkspaceEmptyState: React.FC<ClientsWorkspaceEmptyStateProps> = ({
  onNewClient,
  onManualCreate,
}) => (
  <EmptyHub>
    <UserPlus size={48} />
    <div data-empty-title="true">No clients yet</div>
    <div data-empty-copy="true">Start with Swan Coach dictation or add a client manually.</div>
    <EmptyHubActions data-testid="client-hub-empty-actions">
      <ActionBtn
        type="button"
        onClick={onNewClient}
        $variant="primary"
        aria-label="Onboard with Swan Coach"
      >
        <UserPlus size={16} />
        <span>Onboard with Swan Coach</span>
      </ActionBtn>
      <ActionBtn type="button" onClick={onManualCreate} aria-label="Manual Add">
        <ClipboardList size={16} />
        <span>Manual Add</span>
      </ActionBtn>
    </EmptyHubActions>
  </EmptyHub>
);

export default ClientsWorkspaceEmptyState;
