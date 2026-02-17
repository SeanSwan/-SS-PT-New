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
import { Zap } from 'lucide-react';
import GlowButton from '../../../Button/glowButton';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  photo?: string;
  availableSessions: number;
}

interface PurchaseCreditsModalProps {
  open: boolean;
  onClose: () => void;
  clients: Client[];
  selectedClient: string;
  onClientChange: (clientId: string) => void;
  sessionsToAdd: number;
  onSessionsChange: (sessions: number) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  onSubmit: () => void;
  loadingClients?: boolean;
  isProcessing?: boolean;
}

const DIALOG_PAPER_STYLE = {
  background: 'linear-gradient(135deg, #1e3a8a, #0a0a0f)',
  border: '1px solid rgba(59, 130, 246, 0.2)',
  borderRadius: '12px'
};

const PurchaseCreditsModal: React.FC<PurchaseCreditsModalProps> = ({
  open,
  onClose,
  clients,
  selectedClient,
  onClientChange,
  sessionsToAdd,
  onSessionsChange,
  notes,
  onNotesChange,
  onSubmit,
  loadingClients = false,
  isProcessing = false
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ style: DIALOG_PAPER_STYLE }}
    >
      <DialogTitle style={{ background: 'rgba(30, 58, 138, 0.3)', borderBottom: '1px solid rgba(59, 130, 246, 0.15)' }}>
        <Box style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Zap size={20} />
          <Typography variant="h6">Add Sessions to Client</Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: 20 }}>
          Manually add purchased or complimentary sessions to a client's account.
        </Typography>
        <Grid container spacing={2}>
          {/* Client Select */}
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Select Client</InputLabel>
              <Select
                value={selectedClient}
                onChange={(e) => onClientChange(e.target.value)}
                disabled={loadingClients || isProcessing}
                fullWidth
              >
                <option value="">-- Select a Client --</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.firstName} {client.lastName} ({client.availableSessions || 0} sessions)
                  </option>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {/* Number of Sessions */}
          <Grid item xs={12}>
            <TextField
              label="Number of Sessions to Add"
              type="number"
              style={{ width: '100%' }}
              value={sessionsToAdd}
              onChange={(e) => onSessionsChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
              disabled={isProcessing}
            />
          </Grid>
          {/* Admin Notes */}
          <Grid item xs={12}>
            <TextField
              label="Admin Notes (Optional)"
              style={{ width: '100%' }}
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Reason for adding sessions (e.g., purchased package, referral bonus)"
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
          text="Add Sessions"
          theme="emerald"
          size="small"
          leftIcon={<Zap size={16} />}
          onClick={onSubmit}
          disabled={!selectedClient || sessionsToAdd <= 0 || isProcessing}
          isLoading={isProcessing}
        />
      </DialogActions>
    </Dialog>
  );
};

export default PurchaseCreditsModal;
