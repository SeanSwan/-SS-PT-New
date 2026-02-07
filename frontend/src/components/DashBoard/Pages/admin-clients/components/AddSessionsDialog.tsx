/**
 * AddSessionsDialog - P0 Admin Session Credit Grant
 * ==================================================
 *
 * Dialog for admins to add session credits to a client's account
 * Creates audit trail with reason/note for compliance
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import { Add, Close, CardGiftcard } from '@mui/icons-material';

import { useAddSessionCredits } from '../../../../../hooks/useClientBillingOverview';

interface AddSessionsDialogProps {
  open: boolean;
  onClose: () => void;
  clientId: number | string;
  clientName?: string;
  onSuccess?: () => void;
}

const PRESET_AMOUNTS = [1, 5, 10, 20];

const AddSessionsDialog: React.FC<AddSessionsDialogProps> = ({
  open,
  onClose,
  clientId,
  clientName,
  onSuccess
}) => {
  const addCreditsMutation = useAddSessionCredits();

  // Form state
  const [sessions, setSessions] = useState<number>(1);
  const [reason, setReason] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSessions(1);
      setReason('');
      setAdminNote('');
      setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    setError(null);

    if (sessions < 1) {
      setError('Please enter a valid number of sessions');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for adding sessions');
      return;
    }

    try {
      await addCreditsMutation.mutateAsync({
        clientId,
        data: {
          sessions,
          reason: reason.trim(),
          adminNote: adminNote.trim() || undefined
        }
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add sessions');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          border: '1px solid rgba(139, 92, 246, 0.3)'
        }
      }}
    >
      <DialogTitle sx={{ color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
        <CardGiftcard sx={{ color: '#8b5cf6' }} />
        Add Sessions for {clientName || 'Client'}
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          {/* Preset Amount Buttons */}
          <Box>
            <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
              Quick Select
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {PRESET_AMOUNTS.map((amount) => (
                <Chip
                  key={amount}
                  label={`+${amount}`}
                  onClick={() => setSessions(amount)}
                  sx={{
                    minHeight: 44,
                    minWidth: 60,
                    fontSize: '1rem',
                    background: sessions === amount
                      ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
                      : 'rgba(139, 92, 246, 0.2)',
                    color: 'white',
                    cursor: 'pointer',
                    '&:hover': {
                      background: sessions === amount
                        ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
                        : 'rgba(139, 92, 246, 0.3)'
                    }
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* Custom Amount */}
          <TextField
            fullWidth
            label="Number of Sessions"
            type="number"
            value={sessions}
            onChange={(e) => setSessions(Math.max(1, parseInt(e.target.value) || 1))}
            inputProps={{ min: 1, max: 100 }}
            sx={{
              '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(139, 92, 246, 0.5)' },
                '&.Mui-focused fieldset': { borderColor: '#8b5cf6' }
              }
            }}
          />

          {/* Reason (Required for audit) */}
          <TextField
            fullWidth
            label="Reason (Required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Complimentary session, Compensation, Package upgrade..."
            sx={{
              '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(139, 92, 246, 0.5)' },
                '&.Mui-focused fieldset': { borderColor: '#8b5cf6' }
              }
            }}
          />

          {/* Admin Note (Optional) */}
          <TextField
            fullWidth
            label="Admin Note (Optional)"
            multiline
            rows={2}
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder="Internal notes for record keeping..."
            sx={{
              '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(139, 92, 246, 0.5)' },
                '&.Mui-focused fieldset': { borderColor: '#8b5cf6' }
              }
            }}
          />

          {/* Summary */}
          <Box
            sx={{
              background: 'rgba(139, 92, 246, 0.1)',
              borderRadius: 2,
              p: 2,
              border: '1px solid rgba(139, 92, 246, 0.3)'
            }}
          >
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
              This action will:
            </Typography>
            <Typography variant="body2" sx={{ color: '#8b5cf6', fontWeight: 500, mt: 1 }}>
              Add {sessions} session{sessions !== 1 ? 's' : ''} to {clientName || 'client'}'s account
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
              This action will be logged for audit purposes.
            </Typography>
          </Box>
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
          disabled={addCreditsMutation.isPending || sessions < 1 || !reason.trim()}
          startIcon={addCreditsMutation.isPending ? <CircularProgress size={20} /> : <Add />}
          sx={{
            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            minHeight: 44
          }}
        >
          {addCreditsMutation.isPending ? 'Adding...' : `Add ${sessions} Session${sessions !== 1 ? 's' : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddSessionsDialog;
