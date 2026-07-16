/**
 * BookSessionDialog - P0 Admin Session Booking
 * =============================================
 *
 * Dialog for admins to book sessions on behalf of clients
 * Deducts session credits and creates scheduled session
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
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
  Alert,
  CircularProgress
} from '../../../../ui/primitives/components';
import { CalendarCheck, X } from 'lucide-react';

import { useBookSessionForClient } from '../../../../../hooks/useClientBillingOverview';

const BookSessionDialogSurface = styled(Dialog)`
  background: linear-gradient(
    135deg,
    var(--surface-strong, #1e293b),
    var(--bg-base, #0f172a)
  );
  border: 1px solid var(--accent-border, rgba(139, 92, 246, 0.2));
`;

const StyledDialogTitle = styled(DialogTitle)`
  color: var(--text-primary, #ffffff);
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TitleIcon = styled(CalendarCheck)`
  color: var(--accent-primary, #60c0f0);
`;

const ErrorAlert = styled(Alert)`
  margin-bottom: 16px;
`;

const FormStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 8px;
`;

const HintText = styled.p`
  margin: 0;
  color: var(--text-muted, rgba(255, 255, 255, 0.5));
  font-size: 0.75rem;
`;

const StyledDialogActions = styled(DialogActions)`
  padding: 16px 24px 24px;
`;

const CancelButton = styled(Button)`
  color: var(--text-secondary, rgba(255, 255, 255, 0.7));
`;

const SubmitButton = styled(Button)`
  min-height: 44px;
  background: linear-gradient(
    135deg,
    var(--accent-primary, #3b82f6),
    var(--accent-secondary, #1d4ed8)
  );
`;

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
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(`${baseUrl}/api/admin/users?role=trainer`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success && data.data) {
        const list = Array.isArray(data.data) ? data.data : data.data?.users || [];
        setTrainers(list);
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
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : 'Failed to book session');
    }
  };

  // Get tomorrow's date as minimum selectable date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <BookSessionDialogSurface
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <StyledDialogTitle>
        <TitleIcon size={20} />
        Book Session for {clientName || 'Client'}
      </StyledDialogTitle>

      <DialogContent>
        {error && (
          <ErrorAlert severity="error">
            {error}
          </ErrorAlert>
        )}

        <FormStack>
          {/* Date */}
          <TextField
            fullWidth
            label="Session Date"
            type="date"
            value={sessionDate}
            min={minDate}
            onChange={(e) => setSessionDate(e.target.value)}
          />

          {/* Time */}
          <TextField
            fullWidth
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
            fullWidth
            label="Notes (Optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special instructions or notes for this session..."
          />

          <HintText>
            This will deduct 1 session credit from the client&apos;s account.
          </HintText>
        </FormStack>
      </DialogContent>

      <StyledDialogActions>
        <CancelButton
          onClick={onClose}
          startIcon={<X size={16} />}
        >
          Cancel
        </CancelButton>
        <SubmitButton
          variant="contained"
          onClick={handleSubmit}
          disabled={bookSessionMutation.isPending}
          startIcon={bookSessionMutation.isPending ? <CircularProgress size={20} /> : <CalendarCheck size={16} />}
        >
          {bookSessionMutation.isPending ? 'Booking...' : 'Book Session'}
        </SubmitButton>
      </StyledDialogActions>
    </BookSessionDialogSurface>
  );
};

export default BookSessionDialog;
