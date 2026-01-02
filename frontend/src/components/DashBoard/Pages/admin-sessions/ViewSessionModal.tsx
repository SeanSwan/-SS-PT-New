import React from 'react';
import {
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Typography,
  Stack,
  Avatar,
  Box as MuiBox,
  Chip
} from '@mui/material';
import { Calendar, Edit } from 'lucide-react';
import GlowButton from '../../../Button/glowButton';
import { StyledDialog, ChipContainer } from './styled-admin-sessions';

// Interfaces (duplicated to avoid circular deps or complex exports for now)
interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photo?: string;
  availableSessions: number;
}

interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photo?: string;
}

interface Session {
  id: string;
  sessionDate: string;
  duration: number;
  location?: string;
  notes?: string;
  status: 'available' | 'requested' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  client?: Client | null;
  trainer?: Trainer | null;
}

interface ViewSessionModalProps {
  open: boolean;
  onClose: () => void;
  session: Session | null;
  onEdit: (session: Session) => void;
}

const ViewSessionModal: React.FC<ViewSessionModalProps> = ({
  open,
  onClose,
  session,
  onEdit
}) => {
  // Helper functions for formatting
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      };
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (e) {
      return "Invalid Date";
    }
  };

  const formatTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return "Invalid Time";
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
          <Calendar />
          <Typography variant="h6">Session Details</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        {session ? (
          <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Typography variant="overline" color="rgba(255, 255, 255, 0.7)">Session ID</Typography>
              <Typography variant="body1" fontWeight="500">
                {session.id || 'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="overline" color="rgba(255, 255, 255, 0.7)">Status</Typography>
              <ChipContainer chipstatus={session.status}>
                {session.status ? session.status.charAt(0).toUpperCase() + session.status.slice(1) : 'Unknown'}
              </ChipContainer>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="overline" color="rgba(255, 255, 255, 0.7)">Date & Time</Typography>
              <Typography variant="body1" fontWeight="500">
                {formatDate(session.sessionDate)} at {formatTime(session.sessionDate)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="overline" color="rgba(255, 255, 255, 0.7)">Duration</Typography>
              <Typography variant="body1" fontWeight="500">
                {session.duration || 'N/A'} minutes
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="overline" color="rgba(255, 255, 255, 0.7)">Location</Typography>
              <Typography variant="body1" fontWeight="500">
                {session.location || 'N/A'}
              </Typography>
            </Grid>

            {/* Client Details */}
            <Grid item xs={12}> <Typography variant="overline" color="rgba(255, 255, 255, 0.7)">Client</Typography> </Grid>
            <Grid item xs={12}>
              {session.client ? (
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar src={session.client.photo || undefined} alt={`${session.client.firstName} ${session.client.lastName}`}>
                    {session.client.firstName?.[0]}{session.client.lastName?.[0]}
                  </Avatar>
                  <MuiBox>
                    <Typography variant="body1" fontWeight="500">{session.client.firstName} {session.client.lastName}</Typography>
                    <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">{session.client.email}</Typography>
                  </MuiBox>
                  <Chip label={`${session.client.availableSessions ?? 0} sessions`} size="small" variant="outlined" sx={{ ml: 'auto', borderColor: 'rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.7)' }} />
                </Stack>
              ) : (
                <Typography variant="body1" color="rgba(255, 255, 255, 0.5)" fontStyle="italic">No Client Assigned</Typography>
              )}
            </Grid>

            {/* Trainer Details */}
            <Grid item xs={12}> <Typography variant="overline" color="rgba(255, 255, 255, 0.7)">Trainer</Typography> </Grid>
            <Grid item xs={12}>
              {session.trainer ? (
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar src={session.trainer.photo || undefined} alt={`${session.trainer.firstName} ${session.trainer.lastName}`}>
                    {session.trainer.firstName?.[0]}{session.trainer.lastName?.[0]}
                  </Avatar>
                  <MuiBox>
                    <Typography variant="body1" fontWeight="500">{session.trainer.firstName} {session.trainer.lastName}</Typography>
                    <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">{session.trainer.email}</Typography>
                  </MuiBox>
                </Stack>
              ) : (
                <Typography variant="body1" color="rgba(255, 255, 255, 0.5)" fontStyle="italic">No Trainer Assigned</Typography>
              )}
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <Typography variant="overline" color="rgba(255, 255, 255, 0.7)">Notes</Typography>
              <Typography variant="body2" sx={{ p: 1.5, mt: 0.5, borderRadius: '8px', minHeight: '60px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', whiteSpace: 'pre-wrap' }}>
                {session.notes || <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontStyle: 'italic' }}>No notes for this session.</span>}
              </Typography>
            </Grid>
          </Grid>
        ) : (
          <Typography>Loading session details...</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <GlowButton text="Close" theme="cosmic" size="small" onClick={onClose} />
        <GlowButton text="Edit Session" theme="purple" size="small" leftIcon={<Edit size={16} />} onClick={() => session && onEdit(session)} disabled={!session} />
      </DialogActions>
    </StyledDialog>
  );
};

export default ViewSessionModal;