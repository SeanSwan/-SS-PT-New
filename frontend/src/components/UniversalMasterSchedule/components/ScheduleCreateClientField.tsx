import React from 'react';
import {
  FormField,
  HelperText,
  Label,
  StyledInput,
} from '../ui';
import SearchableSelect from '../ui/SearchableSelect';
import { normalizeScheduleOptionalId } from '../UniversalMasterSchedule.logic';
import { getClientSessionSignal } from '../../DashBoard/workspaces/clients-team/clientSessionSignal';
import { ManualEntryLink } from './ScheduleModals.styles';

interface ScheduleCreateClientFieldProps {
  formData: any;
  setFormData: (data: any) => void;
  dbClients: any[];
  useManualClient: boolean;
  setUseManualClient: (use: boolean) => void;
}

const ScheduleCreateClientField: React.FC<ScheduleCreateClientFieldProps> = ({
  formData,
  setFormData,
  dbClients,
  useManualClient,
  setUseManualClient,
}) => (
  <FormField>
    <Label>Client</Label>
    {!useManualClient ? (
      <>
        <SearchableSelect
          label="Client"
          placeholder="Search clients by name..."
          value={formData.clientId?.toString() || ''}
          onChange={(value) => {
            const nextClientId = normalizeScheduleOptionalId(value);
            setFormData({ ...formData, clientId: nextClientId ?? undefined, manualClientName: '' });
          }}
          options={(dbClients || []).map((client: any) => {
            const sessionSignal = getClientSessionSignal(client);
            return {
              value: (client.id || client.userId || client._id)?.toString(),
              label: `${client.firstName || client.first_name || ''} ${client.lastName || client.last_name || ''}`.trim() || client.email || 'Unknown Client',
              subLabel: `${sessionSignal.label} - ${sessionSignal.note}`,
            };
          })}
        />
        {dbClients.length === 0 && <HelperText>No clients found in system.</HelperText>}
        <ManualEntryLink
          type="button"
          onClick={() => {
            setUseManualClient(true);
            setFormData({ ...formData, clientId: undefined });
          }}
        >
          or enter client name manually
        </ManualEntryLink>
      </>
    ) : (
      <>
        <StyledInput
          id="manualClientName"
          type="text"
          value={formData.manualClientName || ''}
          onChange={(e) => setFormData({ ...formData, manualClientName: e.target.value, clientId: undefined })}
          placeholder="Enter client name..."
        />
        <ManualEntryLink
          type="button"
          onClick={() => {
            setUseManualClient(false);
            setFormData({ ...formData, manualClientName: '' });
          }}
        >
          or select from client list
        </ManualEntryLink>
      </>
    )}
  </FormField>
);

export default ScheduleCreateClientField;
