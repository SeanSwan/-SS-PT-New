import React from 'react';
import {
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Avatar,
  Typography,
  TextField,
} from '@mui/material';
import { Plus } from 'lucide-react';
import GlowButton from '../../../Button/glowButton';
import { StyledDialog } from './styled-admin-sessions';

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
    <StyledDialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Plus size={20} />
          <Typography variant="h6">Schedule New Session Slot</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
          Create a new available time slot. You can assign a client or trainer now, or leave it as generally available.
        </DialogContentText>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {/* Client Select */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel id="new-client-select-label">Assign Client (Optional)</InputLabel>
              <Select
                labelId="new-client-select-label"
                value={client}
                onChange={(e) => onClientChange(e.target.value as string)}
                label="Assign Client (Optional)"
                disabled={loadingClients || isProcessing}
              >
                <MenuItem value=""><em>Not Assigned</em></MenuItem>
                {clients.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar src={c.photo || undefined} sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>
                        {c.firstName?.[0]}{c.lastName?.[0]}
                      </Avatar>
                      <span>{c.firstName} {c.lastName}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {/* Trainer Select */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel id="new-trainer-select-label">Assign Trainer (Optional)</InputLabel>
              <Select
                labelId="new-trainer-select-label"
                value={trainer}
                onChange={(e) => onTrainerChange(e.target.value as string)}
                label="Assign Trainer (Optional)"
                disabled={loadingTrainers || isProcessing}
              >
                <MenuItem value=""><em>Not Assigned</em></MenuItem>
                {trainers.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar src={t.photo || undefined} sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>
                        {t.firstName?.[0]}{t.lastName?.[0]}
                      </Avatar>
                      <span>{t.firstName} {t.lastName}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {/* Date Input */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Date"
              type="date"
              size="small"
              fullWidth
              variant="outlined"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: new Date().toISOString().slice(0, 10) }}
              disabled={isProcessing}
            />
          </Grid>
          {/* Time Input */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Time"
              type="time"
              size="small"
              fullWidth
              variant="outlined"
              value={time}
              onChange={(e) => onTimeChange(e.target.value)}
              InputLabelProps={{ shrink: true }}
              disabled={isProcessing}
            />
          </Grid>
          {/* Duration Input */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Duration (min)"
              type="number"
              size="small"
              fullWidth
              variant="outlined"
              value={duration}
              onChange={(e) => onDurationChange(parseInt(e.target.value, 10) || 0)}
              InputProps={{ inputProps: { min: 15, max: 240, step: 15 } }}
              disabled={isProcessing}
            />
          </Grid>
          {/* Location Input */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Location"
              size="small"
              fullWidth
              variant="outlined"
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
              size="small"
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="e.g., Open slot for new clients, Focus on beginners"
              disabled={isProcessing}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
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
    </StyledDialog>
  );
};

export default CreateSessionModal;