import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  Avatar,
  TextField,
  Typography,
  Box
} from '../../../ui/primitives/components';
import { Edit, CheckSquare } from 'lucide-react';
import GlowButton from '../../../Button/glowButton';
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

const DIALOG_PAPER_STYLE = {
  background: 'linear-gradient(135deg, #1e3a8a, #0a0a0f)',
  border: '1px solid rgba(59, 130, 246, 0.2)',
  borderRadius: '12px'
};

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
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ style: DIALOG_PAPER_STYLE }}
    >
      <DialogTitle style={{ background: 'rgba(30, 58, 138, 0.3)', borderBottom: '1px solid rgba(59, 130, 246, 0.15)' }}>
        <Box style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Edit size={20} />
          <Typography variant="h6">Edit Session</Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: 16 }}>
          Update the details for this session.
        </Typography>
        <Grid container spacing={2} style={{ marginTop: 4 }}>
          {/* Client Select */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Client</InputLabel>
              <Select value={clientId} onChange={(e) => setClientId(e.target.value)} disabled={loadingClients} fullWidth>
                <option value="">Not Assigned</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {/* Trainer Select */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Trainer</InputLabel>
              <Select value={trainerId} onChange={(e) => setTrainerId(e.target.value)} disabled={loadingTrainers} fullWidth>
                <option value="">Not Assigned</option>
                {trainers.map(t => (
                  <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {/* Date & Time */}
          <Grid item xs={12} sm={6}>
            <TextField label="Date" type="date" style={{ width: '100%' }} value={date} onChange={(e) => setDate(e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Time" type="time" style={{ width: '100%' }} value={time} onChange={(e) => setTime(e.target.value)} />
          </Grid>
          {/* Duration & Status */}
          <Grid item xs={12} sm={6}>
            <TextField label="Duration (min)" type="number" style={{ width: '100%' }} value={duration} onChange={(e) => setDuration(parseInt(e.target.value, 10) || 0)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={status} onChange={(e) => setStatus(e.target.value as Session['status'])} fullWidth>
                {(['available', 'scheduled', 'confirmed', 'completed', 'cancelled'] as const).map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {/* Location & Notes */}
          <Grid item xs={12}>
            <TextField label="Location" style={{ width: '100%' }} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Main Studio, Park, Online" />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Session Notes" style={{ width: '100%' }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any relevant notes..." />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <GlowButton text="Cancel" theme="cosmic" size="small" onClick={onClose} disabled={isSaving} />
        <GlowButton text="Save Changes" theme="emerald" size="small" leftIcon={<CheckSquare size={16} />} onClick={handleSave} isLoading={isSaving} />
      </DialogActions>
    </Dialog>
  );
};

export default EditSessionModal;
