/**
 * BookSessionDialog - P0 Admin Session Booking
 * =============================================
 *
 * Dialog for admins to book sessions on behalf of clients
 * Deducts session credits and creates scheduled session
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Box,
  Typography,
  Alert,
  CircularProgress
} from '../../../../ui/primitives/components';
import { CalendarCheck, X } from 'lucide-react';

import { useBookSessionForClient } from '../../../../../hooks/useClientBillingOverview';

interface BookSessionDialogProps {
  open: boolean;
  onClose: () => void;
  clientId: number | string;
  clientName?: string;
  onSuccess?: () => void;
}

interface Trainer {
  id: number;
  firstName: string;
  lastName: string;
}

const BookSessionDialog: React.FC<BookSessionDialogProps> = ({
  open,
  onClose,
  clientId,
  clientName,
  onSuccess
}) => {
  const bookSessionMutation = useBookSessionForClient();

  // Form state
  const [sessionDate, setSessionDate] = useState('');
  const [sessionTime, setSessionTime] = useState('');
  const [trainerId, setTrainerId] = useState<number | ''>('');
  const [duration, setDuration] = useState<number>(60);
  const [notes, setNotes] = useState('');
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loadingTrainers, setLoadingTrainers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch trainers on mount
  useEffect(() => {
    if (open) {
      fetchTrainers();
      // Reset form
      setSessionDate('');
      setSessionTime('');
      setTrainerId('');
      setDuration(60);
      setNotes('');
      setError(null);
    }
  }, [open]);

  const fetchTrainers = async () => {
    setLoadingTrainers(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users?role=trainer', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success && data.data) {
        setTrainers(data.data);
      }
    } catch (err) {
      console.error('Error fetching trainers:', err);
    } finally {
      setLoadingTrainers(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);

    // Validate required fields
    if (!sessionDate || !sessionTime || !trainerId) {
      setError('Please fill in all required fields');
      return;
    }

    // Combine date and time into ISO string
    const dateTime = new Date(`${sessionDate}T${sessionTime}`);
    if (isNaN(dateTime.getTime())) {
      setError('Invalid date/time format');
      return;
    }

    try {
      await bookSessionMutation.mutateAsync({
        clientId: Number(clientId),
        sessionDate: dateTime.toISOString(),
        trainerId: Number(trainerId),
        duration,
        notes: notes || undefined
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to book session');
    }
  };

  // Get tomorrow's date as minimum selectable date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        style: {
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          border: '1px solid rgba(0, 255, 255, 0.2)'
        }
      }}
    >
      <DialogTitle style={{ color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
        <CalendarCheck size={20} style={{ color: '#00ffff' }} />
        Book Session for {clientName || 'Client'}
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" style={{ marginBottom: 16 }}>
            {error}
          </Alert>
        )}

        <Box style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
          {/* Date */}
          <TextField
            style={{ width: '100%' }}
            label="Session Date"
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
          />

          {/* Time */}
          <TextField
            style={{ width: '100%' }}
            label="Session Time"
            type="time"
            value={sessionTime}
            onChange={(e) => setSessionTime(e.target.value)}
          />

          {/* Trainer Select */}
          <FormControl fullWidth>
            <InputLabel>Trainer</InputLabel>
            <Select
              value={trainerId}
              onChange={(e) => setTrainerId(Number(e.target.value))}
              disabled={loadingTrainers}
              fullWidth
            >
              <option value="">Select a trainer</option>
              {trainers.map((trainer) => (
                <option key={trainer.id} value={trainer.id}>
                  {trainer.firstName} {trainer.lastName}
                </option>
              ))}
            </Select>
          </FormControl>

          {/* Duration Select */}
          <FormControl fullWidth>
            <InputLabel>Duration</InputLabel>
            <Select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              fullWidth
            >
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
              <option value={90}>90 minutes</option>
            </Select>
          </FormControl>

          {/* Notes */}
          <TextField
            style={{ width: '100%' }}
            label="Notes (Optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special instructions or notes for this session..."
          />

          <Typography variant="caption" style={{ color: 'rgba(255,255,255,0.5)' }}>
            This will deduct 1 session credit from the client's account.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions style={{ padding: '16px 24px 24px' }}>
        <Button
          onClick={onClose}
          startIcon={<X size={16} />}
          style={{ color: 'rgba(255,255,255,0.7)' }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={bookSessionMutation.isPending}
          startIcon={bookSessionMutation.isPending ? <CircularProgress size={20} /> : <CalendarCheck size={16} />}
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            minHeight: 44
          }}
        >
          {bookSessionMutation.isPending ? 'Booking...' : 'Book Session'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BookSessionDialog;
