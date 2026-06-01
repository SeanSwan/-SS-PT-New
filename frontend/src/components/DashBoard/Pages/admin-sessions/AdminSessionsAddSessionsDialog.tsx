import React from 'react';
import { Zap } from 'lucide-react';
import GlowButton from '../../../ui/buttons/GlowButton';
import { getClientSessionSignal } from '../../workspaces/clients-team/clientSessionSignal';
import type { Client } from './ViewSessionModal.types';
import { StyledDialog, DialogActionsBar, DialogContentArea, DialogTitleBar } from './AdminSessionsDialog.styles';
import {
  DialogDescriptionText,
  FormField,
  FormGrid,
  FormInput,
  FormLabel,
  FormSelect,
  FormTextarea,
} from './AdminSessionsForm.styles';
import { DialogPanelNarrow, FlexRow } from './AdminSessionsTable.styles';

interface AdminSessionsAddSessionsDialogProps {
  open: boolean;
  clients: Client[];
  loadingClients: boolean;
  selectedClient: string;
  sessionsToAdd: number;
  addSessionsNote: string;
  onClose: () => void;
  onSelectedClientChange: (clientId: string) => void;
  onSessionsToAddChange: (count: number) => void;
  onNoteChange: (note: string) => void;
  onSubmit: () => void;
}

const AdminSessionsAddSessionsDialog: React.FC<AdminSessionsAddSessionsDialogProps> = ({
  open,
  clients,
  loadingClients,
  selectedClient,
  sessionsToAdd,
  addSessionsNote,
  onClose,
  onSelectedClientChange,
  onSessionsToAddChange,
  onNoteChange,
  onSubmit,
}) => (
  <StyledDialog $open={open} onClick={onClose}>
    <DialogPanelNarrow onClick={(event: React.MouseEvent) => event.stopPropagation()} $maxWidth="480px">
      <DialogTitleBar>
        <FlexRow $gap="0.75rem">
          <Zap size={22} />
          <span>Add Sessions to Client</span>
        </FlexRow>
      </DialogTitleBar>
      <DialogContentArea>
        <DialogDescriptionText>
          Manually add purchased or complimentary sessions to a client&apos;s account.
        </DialogDescriptionText>
        <FormGrid $columns={1}>
          <FormField>
            <FormLabel htmlFor="add-client-select">Select Client</FormLabel>
            <FormSelect
              id="add-client-select"
              value={selectedClient}
              onChange={(event) => onSelectedClientChange(event.target.value)}
              disabled={loadingClients}
            >
              <option value="">-- Select a Client --</option>
              {clients.map((client) => {
                const addSessionClientSignal = getClientSessionSignal(client);

                return (
                  <option key={client.id} value={client.id}>
                    {client.firstName} {client.lastName} ({addSessionClientSignal.label})
                  </option>
                );
              })}
            </FormSelect>
          </FormField>
          <FormField>
            <FormLabel htmlFor="add-sessions-count">Number of Sessions to Add</FormLabel>
            <FormInput
              id="add-sessions-count"
              type="number"
              value={sessionsToAdd}
              onChange={(event) => onSessionsToAddChange(Math.max(1, parseInt(event.target.value, 10) || 1))}
              min={1}
              max={100}
            />
          </FormField>
          <FormField>
            <FormLabel htmlFor="add-sessions-notes">Admin Notes (Optional)</FormLabel>
            <FormTextarea
              id="add-sessions-notes"
              value={addSessionsNote}
              onChange={(event) => onNoteChange(event.target.value)}
              placeholder="Reason for adding sessions (e.g., purchased package, referral bonus)"
              rows={3}
            />
          </FormField>
        </FormGrid>
      </DialogContentArea>
      <DialogActionsBar>
        <GlowButton text="Cancel" theme="cosmic" size="small" onClick={onClose} />
        <GlowButton
          text="Add Sessions"
          theme="emerald"
          size="small"
          leftIcon={<Zap size={16} />}
          onClick={onSubmit}
          disabled={!selectedClient || sessionsToAdd <= 0}
        />
      </DialogActionsBar>
    </DialogPanelNarrow>
  </StyledDialog>
);

export default AdminSessionsAddSessionsDialog;
