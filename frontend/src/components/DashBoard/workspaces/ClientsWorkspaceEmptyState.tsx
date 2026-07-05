/**
 * Empty state for the canonical Client Hub when no clients are loaded yet.
 */

import React from 'react';
import { ClipboardList, UserPlus } from 'lucide-react';
import { ActionBtn, EmptyHub, EmptyHubActions } from './ClientsWorkspace.styles';

interface ClientsWorkspaceEmptyStateProps {
  onNewClient: () => void;
  onManualCreate: () => void;
  /** Audience-specific empty copy; defaults to the admin creation prompt. */
  copy?: string;
  /** false hides the admin create CTAs (trainer audience). */
  showCreateActions?: boolean;
}

const ClientsWorkspaceEmptyState: React.FC<ClientsWorkspaceEmptyStateProps> = ({
  onNewClient,
  onManualCreate,
  copy = 'Start with Swan Coach dictation or add a client manually.',
  showCreateActions = true,
}) => (
  <EmptyHub>
    <UserPlus size={48} />
    <div data-empty-title="true">{showCreateActions ? 'No clients yet' : 'No assigned clients yet'}</div>
    <div data-empty-copy="true">{copy}</div>
    {showCreateActions && (
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
    )}
  </EmptyHub>
);

export default ClientsWorkspaceEmptyState;
