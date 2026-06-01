import React from 'react';
import { CheckSquare, Edit } from 'lucide-react';
import GlowButton from '../../../ui/buttons/GlowButton';
import type { Client, SessionStatus, Trainer } from './ViewSessionModal.types';
import { StyledDialog, DialogActionsBar, DialogContentArea, DialogPanel, DialogTitleBar } from './AdminSessionsDialog.styles';
import {
  DialogDescriptionText,
  FormField,
  FormGrid,
  FormInput,
  FormLabel,
  FormSelect,
  FormTextarea,
} from './AdminSessionsForm.styles';
import { FlexRow } from './AdminSessionsTable.styles';

interface AdminSessionsEditSessionDialogProps {
  open: boolean;
  clients: Client[];
  trainers: Trainer[];
  loadingClients: boolean;
  loadingTrainers: boolean;
  clientId: string;
  trainerId: string;
  sessionDate: string;
  sessionTime: string;
  duration: number;
  status: SessionStatus;
  location: string;
  notes: string;
  onClose: () => void;
  onClientChange: (clientId: string) => void;
  onTrainerChange: (trainerId: string) => void;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onDurationChange: (duration: number) => void;
  onStatusChange: (status: SessionStatus) => void;
  onLocationChange: (location: string) => void;
  onNotesChange: (notes: string) => void;
  onSubmit: () => void;
}

const EDITABLE_STATUSES: readonly SessionStatus[] = [
  'available',
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
];

const AdminSessionsEditSessionDialog: React.FC<AdminSessionsEditSessionDialogProps> = ({
  open,
  clients,
  trainers,
  loadingClients,
  loadingTrainers,
  clientId,
  trainerId,
  sessionDate,
  sessionTime,
  duration,
  status,
  location,
  notes,
  onClose,
  onClientChange,
  onTrainerChange,
  onDateChange,
  onTimeChange,
  onDurationChange,
  onStatusChange,
  onLocationChange,
  onNotesChange,
  onSubmit,
}) => (
  <StyledDialog $open={open} onClick={onClose}>
    <DialogPanel onClick={(event: React.MouseEvent) => event.stopPropagation()}>
      <DialogTitleBar>
        <FlexRow $gap="0.75rem">
          <Edit size={22} />
          <span>Edit Session</span>
        </FlexRow>
      </DialogTitleBar>
      <DialogContentArea>
        <DialogDescriptionText>Update the details for this session.</DialogDescriptionText>
        <FormGrid $columns={2}>
          <FormField>
            <FormLabel htmlFor="edit-client-select">Client</FormLabel>
            <FormSelect
              id="edit-client-select"
              value={clientId}
              onChange={(event) => onClientChange(event.target.value)}
              disabled={loadingClients}
            >
              <option value="">Not Assigned</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.firstName} {client.lastName}
                </option>
              ))}
            </FormSelect>
          </FormField>
          <FormField>
            <FormLabel htmlFor="edit-trainer-select">Trainer</FormLabel>
            <FormSelect
              id="edit-trainer-select"
              value={trainerId}
              onChange={(event) => onTrainerChange(event.target.value)}
              disabled={loadingTrainers}
            >
              <option value="">Not Assigned</option>
              {trainers.map((trainer) => (
                <option key={trainer.id} value={trainer.id}>
                  {trainer.firstName} {trainer.lastName}
                </option>
              ))}
            </FormSelect>
          </FormField>
          <FormField>
            <FormLabel htmlFor="edit-date">Date</FormLabel>
            <FormInput
              id="edit-date"
              type="date"
              value={sessionDate}
              onChange={(event) => onDateChange(event.target.value)}
              min={new Date().toISOString().slice(0, 10)}
            />
          </FormField>
          <FormField>
            <FormLabel htmlFor="edit-time">Time</FormLabel>
            <FormInput
              id="edit-time"
              type="time"
              value={sessionTime}
              onChange={(event) => onTimeChange(event.target.value)}
            />
          </FormField>
          <FormField>
            <FormLabel htmlFor="edit-duration">Duration (min)</FormLabel>
            <FormInput
              id="edit-duration"
              type="number"
              value={duration}
              onChange={(event) => onDurationChange(parseInt(event.target.value, 10) || 0)}
              min={15}
              max={240}
              step={15}
            />
          </FormField>
          <FormField>
            <FormLabel htmlFor="edit-status-select">Status</FormLabel>
            <FormSelect
              id="edit-status-select"
              value={status}
              onChange={(event) => onStatusChange(event.target.value as SessionStatus)}
            >
              {EDITABLE_STATUSES.map((statusOption) => (
                <option key={statusOption} value={statusOption}>
                  {statusOption.charAt(0).toUpperCase() + statusOption.slice(1)}
                </option>
              ))}
            </FormSelect>
          </FormField>
          <FormField $fullWidth>
            <FormLabel htmlFor="edit-location">Location</FormLabel>
            <FormInput
              id="edit-location"
              value={location}
              onChange={(event) => onLocationChange(event.target.value)}
              placeholder="e.g., Main Studio, Park, Online"
            />
          </FormField>
          <FormField $fullWidth>
            <FormLabel htmlFor="edit-notes">Session Notes</FormLabel>
            <FormTextarea
              id="edit-notes"
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              placeholder="Add any relevant notes for this session..."
              rows={3}
            />
          </FormField>
        </FormGrid>
      </DialogContentArea>
      <DialogActionsBar>
        <GlowButton text="Cancel" theme="cosmic" size="small" onClick={onClose} />
        <GlowButton
          text="Save Changes"
          theme="emerald"
          size="small"
          leftIcon={<CheckSquare size={16} />}
          onClick={onSubmit}
        />
      </DialogActionsBar>
    </DialogPanel>
  </StyledDialog>
);

export default AdminSessionsEditSessionDialog;
