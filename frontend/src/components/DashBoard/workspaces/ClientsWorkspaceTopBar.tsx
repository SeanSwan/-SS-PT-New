/**
 * Client Hub top action bar for selected-client admin workflows.
 */

import React from 'react';
import { ClipboardCheck, ClipboardList, Download, Eye, KeyRound, MessageCircle, RotateCcw, UserCheck, UserPlus, UserX } from 'lucide-react';
import { ActionBtn, TopBar, TopBarActions } from './ClientsWorkspace.styles';
import ClientSelectorDropdown, { type ClientOption } from './clients-team/ClientSelectorDropdown';
import { getClientDisplayName } from './clients-team/clientIdentity';

interface ClientsWorkspaceTopBarProps {
  clients: ClientOption[];
  selectedClient: ClientOption | null;
  loading: boolean;
  exportingClients: boolean;
  onSelectClient: (client: ClientOption) => void;
  onExportClients: () => void;
  onNewClient: () => void;
  onOpenAI: () => void;
  onOpenOnboardingWorkbench: () => void;
  onViewAsClient: () => void;
  onDeactivateClient: () => void;
  onReactivateClient: () => void;
  onSendPasswordReset: () => void;
  onManageAssignments: () => void;
  onManualCreateClient: () => void;
}

const ClientsWorkspaceTopBar: React.FC<ClientsWorkspaceTopBarProps> = ({
  clients,
  selectedClient,
  loading,
  exportingClients,
  onSelectClient,
  onExportClients,
  onNewClient,
  onOpenAI,
  onOpenOnboardingWorkbench,
  onViewAsClient,
  onDeactivateClient,
  onReactivateClient,
  onSendPasswordReset,
  onManageAssignments,
  onManualCreateClient,
}) => {
  const selectedClientName = selectedClient ? getClientDisplayName(selectedClient) : '';

  return (
    <TopBar data-swan-client-workspace-topbar>
      <ClientSelectorDropdown
        clients={clients}
        selectedId={selectedClient?.id ?? null}
        onSelect={onSelectClient}
        onNewClient={onNewClient}
        loading={loading}
      />
      <TopBarActions data-swan-client-workspace-actions>
        <ActionBtn
          type="button"
          onClick={onExportClients}
          disabled={exportingClients}
          aria-busy={exportingClients}
          aria-label={exportingClients ? 'Exporting client directory as CSV' : 'Export client directory as CSV'}
          title="Download the complete client directory as a CSV file"
        >
          <Download size={16} />
          <span>{exportingClients ? 'Exporting...' : 'Export CSV'}</span>
        </ActionBtn>
          {!selectedClient && (
            <>
              <ActionBtn
                type="button"
                onClick={onNewClient}
                aria-label="New Client"
                title="Onboard a new client via Swan Coach"
              >
                <UserPlus size={16} />
                <span>New Client</span>
              </ActionBtn>
              <ActionBtn
                type="button"
                onClick={onManualCreateClient}
                aria-label="Manual Add"
                title="Add a client manually with the form"
              >
                <ClipboardList size={16} />
                <span>Manual Add</span>
              </ActionBtn>
              <ActionBtn
                type="button"
                onClick={onOpenAI}
                $variant="primary"
                aria-label="Open Swan Coach"
                title="Open Swan Coach"
              >
                <MessageCircle size={16} />
                <span>Swan Coach</span>
              </ActionBtn>
              <ActionBtn
                type="button"
                onClick={onOpenOnboardingWorkbench}
                aria-label="Open onboarding workbench"
                title="Open onboarding workbench"
              >
                <ClipboardCheck size={16} />
                <span>Workbench</span>
              </ActionBtn>
              <ActionBtn
                type="button"
                onClick={onManageAssignments}
                aria-label="Trainer assignments"
                title="Manage trainer/client assignments"
              >
                <UserCheck size={16} />
                <span>Trainer Assignments</span>
              </ActionBtn>
            </>
          )}
          {selectedClient && (
            <ActionBtn
              type="button"
              onClick={onOpenOnboardingWorkbench}
              aria-label={`Open onboarding workbench for ${selectedClientName}`}
              title={`Open ${selectedClientName}'s onboarding workbench`}
            >
              <ClipboardCheck size={16} />
              <span>Workbench</span>
            </ActionBtn>
          )}
          {selectedClient && (
            <ActionBtn
              type="button"
              onClick={onViewAsClient}
              aria-label={`View ${selectedClientName} as admin`}
              title={`View ${selectedClientName}'s dashboard as admin (read-only)`}
            >
              <Eye size={16} />
              <span>View As</span>
            </ActionBtn>
          )}
          {selectedClient && selectedClient.isActive !== false && (
            <ActionBtn
              type="button"
              onClick={onDeactivateClient}
              $variant="danger"
              aria-label={`Deactivate ${selectedClientName}`}
              title={`Soft deactivate ${selectedClientName}'s account`}
            >
              <UserX size={16} />
              <span>Deactivate</span>
            </ActionBtn>
          )}
          {selectedClient && (
            <ActionBtn
              type="button"
              onClick={onSendPasswordReset}
              aria-label={`Send password reset link to ${selectedClientName}`}
              title={`Send ${selectedClientName} a secure password reset link`}
            >
              <KeyRound size={16} />
              <span>Reset Link</span>
            </ActionBtn>
          )}
          {selectedClient && selectedClient.isActive === false && (
            <ActionBtn
              type="button"
              onClick={onReactivateClient}
              $variant="primary"
              aria-label={`Reactivate ${selectedClientName}`}
              title={`Reactivate ${selectedClientName}'s account`}
            >
              <RotateCcw size={16} />
              <span>Reactivate</span>
            </ActionBtn>
          )}
          {selectedClient && (
            <ActionBtn
              type="button"
              onClick={onManageAssignments}
              aria-label="Trainer assignments"
              title="Manage trainer/client assignments"
            >
              <UserCheck size={16} />
              <span>Trainer Assignments</span>
            </ActionBtn>
          )}
          {selectedClient && (
            <>
              <ActionBtn
                type="button"
                onClick={onManualCreateClient}
                aria-label="Manual Add"
                title="Add a client manually with the form"
              >
                <ClipboardList size={16} />
                <span>Manual Add</span>
              </ActionBtn>
              <ActionBtn
                type="button"
                onClick={onNewClient}
                aria-label="New Client"
                title="Onboard a new client via Swan Coach"
              >
                <UserPlus size={16} />
                <span>New Client</span>
              </ActionBtn>
            </>
          )}
      </TopBarActions>
    </TopBar>
  );
};

export default ClientsWorkspaceTopBar;
