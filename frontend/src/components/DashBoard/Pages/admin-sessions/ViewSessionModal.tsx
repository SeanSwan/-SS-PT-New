import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Typography,
  Avatar,
  Box,
  Chip
} from '../../../ui/primitives/components';
import { Calendar, Edit } from 'lucide-react';
import GlowButton from '../../../Button/glowButton';
import { ChipContainer } from './styled-admin-sessions';

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

const DIALOG_PAPER_STYLE = {
  background: 'linear-gradient(135deg, #1e3a8a, #0a0a0f)',
  border: '1px solid rgba(59, 130, 246, 0.2)',
  borderRadius: '12px'
};

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
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ style: DIALOG_PAPER_STYLE }}
    >
      <DialogTitle style={{ background: 'rgba(30, 58, 138, 0.3)', borderBottom: '1px solid rgba(59, 130, 246, 0.15)' }}>
        <Box style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Calendar size={20} />
          <Typography variant="h6">Session Details</Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {session ? (
          <Grid container spacing={2} style={{ marginTop: 4 }}>
            <Grid item xs={12}>
              <Typography variant="overline" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Session ID</Typography>
              <Typography variant="body1" style={{ fontWeight: 500 }}>
                {session.id || 'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="overline" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Status</Typography>
              <ChipContainer chipstatus={session.status}>
                {session.status ? session.status.charAt(0).toUpperCase() + session.status.slice(1) : 'Unknown'}
              </ChipContainer>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="overline" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Date & Time</Typography>
              <Typography variant="body1" style={{ fontWeight: 500 }}>
                {formatDate(session.sessionDate)} at {formatTime(session.sessionDate)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="overline" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Duration</Typography>
              <Typography variant="body1" style={{ fontWeight: 500 }}>
                {session.duration || 'N/A'} minutes
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="overline" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Location</Typography>
              <Typography variant="body1" style={{ fontWeight: 500 }}>
                {session.location || 'N/A'}
              </Typography>
            </Grid>

            {/* Client Details */}
            <Grid item xs={12}>
              <Typography variant="overline" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Client</Typography>
            </Grid>
            <Grid item xs={12}>
              {session.client ? (
                <Box style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar src={session.client.photo || undefined} alt={`${session.client.firstName} ${session.client.lastName}`} size={40}>
                    {session.client.firstName?.[0]}{session.client.lastName?.[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="body1" style={{ fontWeight: 500 }}>{session.client.firstName} {session.client.lastName}</Typography>
                    <Typography variant="body2" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>{session.client.email}</Typography>
                  </Box>
                  <Chip
                    label={`${session.client.availableSessions ?? 0} sessions`}
                    size="small"
                    style={{ marginLeft: 'auto', border: '1px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.7)' }}
                  />
                </Box>
              ) : (
                <Typography variant="body1" style={{ color: 'rgba(255, 255, 255, 0.5)', fontStyle: 'italic' }}>No Client Assigned</Typography>
              )}
            </Grid>

            {/* Trainer Details */}
            <Grid item xs={12}>
              <Typography variant="overline" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Trainer</Typography>
            </Grid>
            <Grid item xs={12}>
              {session.trainer ? (
                <Box style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar src={session.trainer.photo || undefined} alt={`${session.trainer.firstName} ${session.trainer.lastName}`} size={40}>
                    {session.trainer.firstName?.[0]}{session.trainer.lastName?.[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="body1" style={{ fontWeight: 500 }}>{session.trainer.firstName} {session.trainer.lastName}</Typography>
                    <Typography variant="body2" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>{session.trainer.email}</Typography>
                  </Box>
                </Box>
              ) : (
                <Typography variant="body1" style={{ color: 'rgba(255, 255, 255, 0.5)', fontStyle: 'italic' }}>No Trainer Assigned</Typography>
              )}
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <Typography variant="overline" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Notes</Typography>
              <Typography variant="body2" style={{ padding: 12, marginTop: 4, borderRadius: '8px', minHeight: '60px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', whiteSpace: 'pre-wrap' }}>
                {session.notes || <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontStyle: 'italic' }}>No notes for this session.</span>}
              </Typography>
            </Grid>
          </Grid>
        ) : (
          <Typography>Loading session details...</Typography>
        )}
      </DialogContent>
      <DialogActions style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <GlowButton text="Close" theme="cosmic" size="small" onClick={onClose} />
        <GlowButton text="Edit Session" theme="purple" size="small" leftIcon={<Edit size={16} />} onClick={() => session && onEdit(session)} disabled={!session} />
      </DialogActions>
    </Dialog>
  );
};

export default ViewSessionModal;
