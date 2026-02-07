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
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import { EventAvailable, Close } from '@mui/icons-material';

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
        sx: {
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          border: '1px solid rgba(0, 255, 255, 0.2)'
        }
      }}
    >
      <DialogTitle sx={{ color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
        <EventAvailable sx={{ color: '#00ffff' }} />
        Book Session for {clientName || 'Client'}
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* Date */}
          <TextField
            fullWidth
            label="Session Date"
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: minDate }}
            sx={{
              '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(0, 255, 255, 0.5)' },
                '&.Mui-focused fieldset': { borderColor: '#00ffff' }
              }
            }}
          />

          {/* Time */}
          <TextField
            fullWidth
            label="Session Time"
            type="time"
            value={sessionTime}
            onChange={(e) => setSessionTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{
              '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(0, 255, 255, 0.5)' },
                '&.Mui-focused fieldset': { borderColor: '#00ffff' }
              }
            }}
          />

          {/* Trainer Select */}
          <FormControl fullWidth>
            <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Trainer</InputLabel>
            <Select
              value={trainerId}
              onChange={(e) => setTrainerId(e.target.value as number)}
              label="Trainer"
              disabled={loadingTrainers}
              sx={{
                color: 'white',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0, 255, 255, 0.5)' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00ffff' }
              }}
            >
              {loadingTrainers ? (
                <MenuItem disabled>
                  <CircularProgress size={20} />
                  <Typography sx={{ ml: 1 }}>Loading trainers...</Typography>
                </MenuItem>
              ) : trainers.length === 0 ? (
                <MenuItem disabled>No trainers available</MenuItem>
              ) : (
                trainers.map((trainer) => (
                  <MenuItem key={trainer.id} value={trainer.id}>
                    {trainer.firstName} {trainer.lastName}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          {/* Duration Select */}
          <FormControl fullWidth>
            <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Duration</InputLabel>
            <Select
              value={duration}
              onChange={(e) => setDuration(e.target.value as number)}
              label="Duration"
              sx={{
                color: 'white',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0, 255, 255, 0.5)' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00ffff' }
              }}
            >
              <MenuItem value={30}>30 minutes</MenuItem>
              <MenuItem value={45}>45 minutes</MenuItem>
              <MenuItem value={60}>60 minutes</MenuItem>
              <MenuItem value={90}>90 minutes</MenuItem>
            </Select>
          </FormControl>

          {/* Notes */}
          <TextField
            fullWidth
            label="Notes (Optional)"
            multiline
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special instructions or notes for this session..."
            sx={{
              '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(0, 255, 255, 0.5)' },
                '&.Mui-focused fieldset': { borderColor: '#00ffff' }
              }
            }}
          />

          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
            This will deduct 1 session credit from the client's account.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={onClose}
          startIcon={<Close />}
          sx={{ color: 'rgba(255,255,255,0.7)' }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={bookSessionMutation.isPending}
          startIcon={bookSessionMutation.isPending ? <CircularProgress size={20} /> : <EventAvailable />}
          sx={{
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
