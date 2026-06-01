import React from 'react';
import { Plus } from 'lucide-react';
import GlowButton from '../../../ui/buttons/GlowButton';
import type { Client, Trainer } from './ViewSessionModal.types';
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

interface AdminSessionsNewSessionDialogProps {
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
  location: string;
  notes: string;
  onClose: () => void;
  onClientChange: (clientId: string) => void;
  onTrainerChange: (trainerId: string) => void;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onDurationChange: (duration: number) => void;
  onLocationChange: (location: string) => void;
  onNotesChange: (notes: string) => void;
  onSubmit: () => void;
}

const AdminSessionsNewSessionDialog: React.FC<AdminSessionsNewSessionDialogProps> = ({
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
  location,
  notes,
  onClose,
  onClientChange,
  onTrainerChange,
  onDateChange,
  onTimeChange,
  onDurationChange,
  onLocationChange,
  onNotesChange,
  onSubmit,
}) => (
  <StyledDialog $open={open} onClick={onClose}>
    <DialogPanel onClick={(event: React.MouseEvent) => event.stopPropagation()}>
      <DialogTitleBar>
        <FlexRow $gap="0.75rem">
          <Plus size={22} />
          <span>Schedule New Session Slot</span>
        </FlexRow>
      </DialogTitleBar>
      <DialogContentArea>
        <DialogDescriptionText>
          Create a new available time slot. You can assign a client or trainer now, or leave it as generally available.
        </DialogDescriptionText>
        <FormGrid $columns={2}>
          <FormField>
            <FormLabel htmlFor="new-client-select">Assign Client (Optional)</FormLabel>
            <FormSelect
              id="new-client-select"
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
            <FormLabel htmlFor="new-trainer-select">Assign Trainer (Optional)</FormLabel>
            <FormSelect
              id="new-trainer-select"
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
            <FormLabel htmlFor="new-date">Date</FormLabel>
            <FormInput
              id="new-date"
              type="date"
              value={sessionDate}
              onChange={(event) => onDateChange(event.target.value)}
              min={new Date().toISOString().slice(0, 10)}
            />
          </FormField>
          <FormField>
            <FormLabel htmlFor="new-time">Time</FormLabel>
            <FormInput
              id="new-time"
              type="time"
              value={sessionTime}
              onChange={(event) => onTimeChange(event.target.value)}
            />
          </FormField>
          <FormField>
            <FormLabel htmlFor="new-duration">Duration (min)</FormLabel>
            <FormInput
              id="new-duration"
              type="number"
              value={duration}
              onChange={(event) => onDurationChange(parseInt(event.target.value, 10) || 0)}
              min={15}
              max={240}
              step={15}
            />
          </FormField>
          <FormField>
            <FormLabel htmlFor="new-location">Location</FormLabel>
            <FormInput
              id="new-location"
              value={location}
              onChange={(event) => onLocationChange(event.target.value)}
              placeholder="e.g., Main Studio"
            />
          </FormField>
          <FormField $fullWidth>
            <FormLabel htmlFor="new-notes">Notes (Optional)</FormLabel>
            <FormTextarea
              id="new-notes"
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              placeholder="e.g., Open slot for new clients, Focus on beginners"
              rows={3}
            />
          </FormField>
        </FormGrid>
      </DialogContentArea>
      <DialogActionsBar>
        <GlowButton text="Cancel" theme="cosmic" size="small" onClick={onClose} />
        <GlowButton
          text="Create Session Slot"
          theme="emerald"
          size="small"
          leftIcon={<Plus size={16} />}
          onClick={onSubmit}
        />
      </DialogActionsBar>
    </DialogPanel>
  </StyledDialog>
);

export default AdminSessionsNewSessionDialog;
