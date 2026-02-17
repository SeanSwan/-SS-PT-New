import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  Typography,
  TextField,
  Box
} from '../../../ui/primitives/components';
import { Plus } from 'lucide-react';
import GlowButton from '../../../Button/glowButton';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  photo?: string;
}

interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
  photo?: string;
}

interface CreateSessionModalProps {
  open: boolean;
  onClose: () => void;
  clients: Client[];
  trainers: Trainer[];
  loadingClients?: boolean;
  loadingTrainers?: boolean;
  client: string;
  onClientChange: (value: string) => void;
  trainer: string;
  onTrainerChange: (value: string) => void;
  date: string;
  onDateChange: (value: string) => void;
  time: string;
  onTimeChange: (value: string) => void;
  duration: number;
  onDurationChange: (value: number) => void;
  location: string;
  onLocationChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  onSubmit: () => void;
  isProcessing?: boolean;
}

const DIALOG_PAPER_STYLE = {
  background: 'linear-gradient(135deg, #1e3a8a, #0a0a0f)',
  border: '1px solid rgba(59, 130, 246, 0.2)',
  borderRadius: '12px'
};

const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  open,
  onClose,
  clients,
  trainers,
  loadingClients = false,
  loadingTrainers = false,
  client,
  onClientChange,
  trainer,
  onTrainerChange,
  date,
  onDateChange,
  time,
  onTimeChange,
  duration,
  onDurationChange,
  location,
  onLocationChange,
  notes,
  onNotesChange,
  onSubmit,
  isProcessing = false,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ style: DIALOG_PAPER_STYLE }}
    >
      <DialogTitle style={{ background: 'rgba(30, 58, 138, 0.3)', borderBottom: '1px solid rgba(59, 130, 246, 0.15)' }}>
        <Box style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Plus size={20} />
          <Typography variant="h6">Schedule New Session Slot</Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: 16 }}>
          Create a new available time slot. You can assign a client or trainer now, or leave it as generally available.
        </Typography>
        <Grid container spacing={2} style={{ marginTop: 4 }}>
          {/* Client Select */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Assign Client (Optional)</InputLabel>
              <Select
                value={client}
                onChange={(e) => onClientChange(e.target.value)}
                disabled={loadingClients || isProcessing}
                fullWidth
              >
                <option value="">Not Assigned</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {/* Trainer Select */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Assign Trainer (Optional)</InputLabel>
              <Select
                value={trainer}
                onChange={(e) => onTrainerChange(e.target.value)}
                disabled={loadingTrainers || isProcessing}
                fullWidth
              >
                <option value="">Not Assigned</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {/* Date Input */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Date"
              type="date"
              style={{ width: '100%' }}
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              disabled={isProcessing}
            />
          </Grid>
          {/* Time Input */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Time"
              type="time"
              style={{ width: '100%' }}
              value={time}
              onChange={(e) => onTimeChange(e.target.value)}
              disabled={isProcessing}
            />
          </Grid>
          {/* Duration Input */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Duration (min)"
              type="number"
              style={{ width: '100%' }}
              value={duration}
              onChange={(e) => onDurationChange(parseInt(e.target.value, 10) || 0)}
              disabled={isProcessing}
            />
          </Grid>
          {/* Location Input */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Location"
              style={{ width: '100%' }}
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              placeholder="e.g., Main Studio"
              disabled={isProcessing}
            />
          </Grid>
          {/* Notes Input */}
          <Grid item xs={12}>
            <TextField
              label="Notes (Optional)"
              style={{ width: '100%' }}
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="e.g., Open slot for new clients, Focus on beginners"
              disabled={isProcessing}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <GlowButton
          text="Cancel"
          theme="cosmic"
          size="small"
          onClick={onClose}
          disabled={isProcessing}
        />
        <GlowButton
          text="Create Session Slot"
          theme="emerald"
          size="small"
          leftIcon={<Plus size={16} />}
          onClick={onSubmit}
          isLoading={isProcessing}
        />
      </DialogActions>
    </Dialog>
  );
};

export default CreateSessionModal;
