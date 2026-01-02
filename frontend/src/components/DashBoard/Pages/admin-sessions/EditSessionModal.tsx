import React, { useState, useEffect } from 'react';
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
  TextField
} from '@mui/material';
import { Edit, CheckSquare } from 'lucide-react';
import GlowButton from '../../../Button/glowButton';
import { StyledDialog } from './styled-admin-sessions';
import { useToast } from "../../../../hooks/use-toast";

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

interface Session {
  id: string;
  sessionDate: string;
  duration: number;
  userId: string | null;
  trainerId: string | null;
  location?: string;
  notes?: string;
  status: 'available' | 'requested' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
}

interface EditSessionModalProps {
  open: boolean;
  onClose: () => void;
  session: Session | null;
  clients: Client[];
  trainers: Trainer[];
  loadingClients: boolean;
  loadingTrainers: boolean;
  onSave: (data: any) => Promise<void>;
}

const EditSessionModal: React.FC<EditSessionModalProps> = ({
  open,
  onClose,
  session,
  clients,
  trainers,
  loadingClients,
  loadingTrainers,
  onSave
}) => {
  const { toast } = useToast();
  
  // Local state for form fields
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [duration, setDuration] = useState<number>(60);
  const [location, setLocation] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [status, setStatus] = useState<Session['status']>('scheduled');
  const [clientId, setClientId] = useState<string>('');
  const [trainerId, setTrainerId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form when session changes
  useEffect(() => {
    if (session && open) {
      try {
        const sessionDateObj = new Date(session.sessionDate);
        setDate(sessionDateObj.toISOString().split('T')[0]);
        setTime(sessionDateObj.toTimeString().slice(0, 5));
      } catch (e) {
        console.error("Error parsing session date:", session.sessionDate, e);
        setDate('');
        setTime('');
      }
      setDuration(session.duration || 60);
      setLocation(session.location || '');
      setNotes(session.notes || '');
      setStatus(session.status || 'scheduled');
      setClientId(session.userId || '');
      setTrainerId(session.trainerId || '');
    }
  }, [session, open]);

  const handleSave = async () => {
    if (!date || !time) {
      toast({ title: "Error", description: "Please provide a valid date and time.", variant: "destructive" });
      return;
    }
    
    const dateTimeString = `${date}T${time}`;
    const updatedSessionDateTime = new Date(dateTimeString);
    
    if (isNaN(updatedSessionDateTime.getTime())) {
      toast({ title: "Error", description: "Invalid date/time format.", variant: "destructive" });
      return;
    }

    const updatedData = {
      sessionDate: updatedSessionDateTime.toISOString(),
      duration,
      location,
      notes,
      status,
      userId: clientId || null,
      trainerId: trainerId || null
    };

    setIsSaving(true);
    try {
      await onSave(updatedData);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Edit />
          <Typography variant="h6">Edit Session</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
          Update the details for this session.
        </DialogContentText>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {/* Client Select */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>Client</InputLabel>
              <Select value={clientId} onChange={(e) => setClientId(e.target.value)} label="Client" disabled={loadingClients}>
                <MenuItem value=""><em>Not Assigned</em></MenuItem>
                {clients.map(c => (
                  <MenuItem key={c.id} value={c.id}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar src={c.photo} sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>{c.firstName?.[0]}{c.lastName?.[0]}</Avatar>
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
              <InputLabel>Trainer</InputLabel>
              <Select value={trainerId} onChange={(e) => setTrainerId(e.target.value)} label="Trainer" disabled={loadingTrainers}>
                <MenuItem value=""><em>Not Assigned</em></MenuItem>
                {trainers.map(t => (
                  <MenuItem key={t.id} value={t.id}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar src={t.photo} sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>{t.firstName?.[0]}{t.lastName?.[0]}</Avatar>
                      <span>{t.firstName} {t.lastName}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {/* Date & Time */}
          <Grid item xs={12} sm={6}>
            <TextField label="Date" type="date" size="small" fullWidth variant="outlined" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Time" type="time" size="small" fullWidth variant="outlined" value={time} onChange={(e) => setTime(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Grid>
          {/* Duration & Status */}
          <Grid item xs={12} sm={6}>
            <TextField label="Duration (min)" type="number" size="small" fullWidth variant="outlined" value={duration} onChange={(e) => setDuration(parseInt(e.target.value, 10) || 0)} InputProps={{ inputProps: { min: 15, max: 240, step: 15 } }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>Status</InputLabel>
              <Select value={status} onChange={(e) => setStatus(e.target.value as Session['status'])} label="Status">
                {(['available', 'scheduled', 'confirmed', 'completed', 'cancelled'] as const).map(s => (
                  <MenuItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {/* Location & Notes */}
          <Grid item xs={12}>
            <TextField label="Location" size="small" fullWidth variant="outlined" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Main Studio, Park, Online" />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Session Notes" size="small" fullWidth multiline rows={3} variant="outlined" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any relevant notes..." />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <GlowButton text="Cancel" theme="cosmic" size="small" onClick={onClose} disabled={isSaving} />
        <GlowButton text="Save Changes" theme="emerald" size="small" leftIcon={<CheckSquare size={16} />} onClick={handleSave} isLoading={isSaving} />
      </DialogActions>
    </StyledDialog>
  );
};

export default EditSessionModal;