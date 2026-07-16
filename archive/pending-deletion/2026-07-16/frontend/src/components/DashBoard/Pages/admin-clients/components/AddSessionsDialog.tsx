/**
 * AddSessionsDialog - P0 Admin Session Credit Grant
 * ==================================================
 *
 * Dialog for admins to add session credits to a client's account
 * Creates audit trail with reason/note for compliance
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
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip
} from '../../../../ui/primitives/components';
import { Plus, X, Gift } from 'lucide-react';

import { useAddSessionCredits } from '../../../../../hooks/useClientBillingOverview';

interface AddSessionsDialogProps {
  open: boolean;
  onClose: () => void;
  clientId: number | string;
  clientName?: string;
  onSuccess?: () => void;
}

const PRESET_AMOUNTS = [1, 5, 10, 20];

const PresetChip = styled.button<{ $active: boolean }>`
  min-height: 44px;
  min-width: 60px;
  font-size: 1rem;
  padding: 8px 16px;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  color: white;
  font-weight: 500;
  background: ${({ $active }) =>
    $active
      ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
      : 'rgba(139, 92, 246, 0.2)'};
  transition: background 0.2s;

  &:hover {
    background: ${({ $active }) =>
      $active
        ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
        : 'rgba(139, 92, 246, 0.3)'};
  }
`;

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
        style: {
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          border: '1px solid rgba(139, 92, 246, 0.3)'
        }
      }}
    >
      <DialogTitle style={{ color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Gift size={20} style={{ color: '#8b5cf6' }} />
        Add Sessions for {clientName || 'Client'}
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" style={{ marginBottom: 16 }}>
            {error}
          </Alert>
        )}

        <Box style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 8 }}>
          {/* Preset Amount Buttons */}
          <Box>
            <Typography variant="subtitle2" style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
              Quick Select
            </Typography>
            <Box style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PRESET_AMOUNTS.map((amount) => (
                <PresetChip
                  key={amount}
                  $active={sessions === amount}
                  onClick={() => setSessions(amount)}
                >
                  +{amount}
                </PresetChip>
              ))}
            </Box>
          </Box>

          {/* Custom Amount */}
          <TextField
            style={{ width: '100%' }}
            label="Number of Sessions"
            type="number"
            value={sessions}
            onChange={(e) => setSessions(Math.max(1, parseInt(e.target.value) || 1))}
          />

          {/* Reason (Required for audit) */}
          <TextField
            style={{ width: '100%' }}
            label="Reason (Required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Complimentary session, Compensation, Package upgrade..."
          />

          {/* Admin Note (Optional) */}
          <TextField
            style={{ width: '100%' }}
            label="Admin Note (Optional)"
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder="Internal notes for record keeping..."
          />

          {/* Summary */}
          <Box
            style={{
              background: 'rgba(139, 92, 246, 0.1)',
              borderRadius: 8,
              padding: 16,
              border: '1px solid rgba(139, 92, 246, 0.3)'
            }}
          >
            <Typography variant="body2" style={{ color: 'rgba(255,255,255,0.8)' }}>
              This action will:
            </Typography>
            <Typography variant="body2" style={{ color: '#8b5cf6', fontWeight: 500, marginTop: 8 }}>
              Add {sessions} session{sessions !== 1 ? 's' : ''} to {clientName || 'client'}'s account
            </Typography>
            <Typography variant="caption" style={{ color: 'rgba(255,255,255,0.5)' }}>
              This action will be logged for audit purposes.
            </Typography>
          </Box>
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
          disabled={addCreditsMutation.isPending || sessions < 1 || !reason.trim()}
          startIcon={addCreditsMutation.isPending ? <CircularProgress size={20} /> : <Plus size={16} />}
          style={{
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
