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
  Box
} from '@mui/material';
import { Zap } from 'lucide-react';
import GlowButton from '../../../Button/glowButton';
import { StyledDialog } from './styled-admin-sessions';

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
    <StyledDialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Zap size={20} />
          <Typography variant="h6">Add Sessions to Client</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2.5 }}>
          Manually add purchased or complimentary sessions to a client's account.
        </DialogContentText>
        <Grid container spacing={2}>
          {/* Client Select */}
          <Grid item xs={12}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel id="add-client-select-label">Select Client</InputLabel>
              <Select
                labelId="add-client-select-label"
                value={selectedClient}
                onChange={(e) => onClientChange(e.target.value as string)}
                label="Select Client"
                disabled={loadingClients || isProcessing}
              >
                <MenuItem value=""><em>-- Select a Client --</em></MenuItem>
                {clients.map(client => (
                  <MenuItem key={client.id} value={client.id}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar src={client.photo || undefined} sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>
                        {client.firstName?.[0]}{client.lastName?.[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2">{client.firstName} {client.lastName}</Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                          ({client.availableSessions || 0} current sessions)
                        </Typography>
                      </Box>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {/* Number of Sessions */}
          <Grid item xs={12}>
            <TextField
              label="Number of Sessions to Add"
              type="number"
              size="small"
              fullWidth
              variant="outlined"
              value={sessionsToAdd}
              onChange={(e) => onSessionsChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
              InputProps={{ inputProps: { min: 1, max: 100 } }}
              disabled={isProcessing}
            />
          </Grid>
          {/* Admin Notes */}
          <Grid item xs={12}>
            <TextField
              label="Admin Notes (Optional)"
              size="small"
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Reason for adding sessions (e.g., purchased package, referral bonus)"
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
          text="Add Sessions"
          theme="emerald"
          size="small"
          leftIcon={<Zap size={16} />}
          onClick={onSubmit}
          disabled={!selectedClient || sessionsToAdd <= 0 || isProcessing}
          isLoading={isProcessing}
        />
      </DialogActions>
    </StyledDialog>
  );
};

export default PurchaseCreditsModal;