/**
 * AdminSessionsDialogs.tsx
 * =========================
 * 
 * Dialog management component for Admin Sessions (View, Edit, New)
 * Part of the Admin Sessions optimization following proven Trainer Dashboard methodology
 * 
 * Features:
 * - View session details dialog with full information display
 * - Edit session dialog with form validation
 * - New session creation dialog
 * - Form state management with validation
 * - Responsive dialog layouts
 * - WCAG AA accessibility compliance
 * - Performance-optimized form handling
 */

import React, { memo, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
  Stack,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Avatar,
  Box as MuiBox
} from '@mui/material';
import { Calendar, Edit, Plus, CheckSquare, Eye } from 'lucide-react';
import {
  AdminSessionsDialogsProps,
  Session,
  validateSessionDateTime,
  DEFAULT_SESSION_DURATION,
  DEFAULT_LOCATION
} from './AdminSessionsTypes';
import {
  ClientDisplay,
  TrainerDisplay,
  StatusChip,
  formatSessionTime
} from './AdminSessionsSharedComponents';
import GlowButton from '../../../../ui/buttons/GlowButton';

// ===== STYLED COMPONENTS =====

const StyledDialog = styled(Dialog)`
  && {
    .MuiDialog-paper {
      background: linear-gradient(135deg, 
        rgba(30, 58, 138, 0.95) 0%, 
        rgba(14, 165, 233, 0.85) 50%, 
        rgba(8, 145, 178, 0.95) 100%
      );
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 16px;
      backdrop-filter: blur(20px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
      color: white;
      min-width: 400px;
      
      @media (max-width: 600px) {
        margin: 1rem;
        min-width: auto;
      }
    }
    
    .MuiDialogTitle-root {
      background: rgba(30, 58, 138, 0.3);
      border-bottom: 1px solid rgba(59, 130, 246, 0.2);
      padding: 1.5rem;
    }
    
    .MuiDialogContent-root {
      padding: 1.5rem;
      
      &.MuiDialogContent-dividers {
        border-color: rgba(59, 130, 246, 0.2);
      }
    }
    
    .MuiDialogActions-root {
      background: rgba(30, 58, 138, 0.3);
      border-top: 1px solid rgba(59, 130, 246, 0.2);
      padding: 1rem 1.5rem;
    }
  }
`;

const DetailGrid = styled(Grid)`
  && {
    .detail-label {
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }
    
    .detail-value {
      color: white;
      font-weight: 500;
      margin-bottom: 1rem;
    }
  }
`;

const StyledTextField = styled(TextField)`
  && {
    .MuiOutlinedInput-root {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: white;
      
      &:hover {
        background: rgba(255, 255, 255, 0.15);
      }
      
      &.Mui-focused {
        background: rgba(255, 255, 255, 0.2);
      }
      
      .MuiOutlinedInput-notchedOutline {
        border-color: rgba(255, 255, 255, 0.3);
      }
      
      &:hover .MuiOutlinedInput-notchedOutline {
        border-color: rgba(255, 255, 255, 0.5);
      }
      
      &.Mui-focused .MuiOutlinedInput-notchedOutline {
        border-color: #3b82f6;
      }
    }
    
    .MuiInputLabel-root {
      color: rgba(255, 255, 255, 0.7);
      
      &.Mui-focused {
        color: #3b82f6;
      }
    }
  }
`;

const StyledFormControl = styled(FormControl)`
  && {
    .MuiOutlinedInput-root {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: white;
      
      &:hover {
        background: rgba(255, 255, 255, 0.15);
      }
      
      &.Mui-focused {
        background: rgba(255, 255, 255, 0.2);
      }
      
      .MuiOutlinedInput-notchedOutline {
        border-color: rgba(255, 255, 255, 0.3);
      }
      
      &:hover .MuiOutlinedInput-notchedOutline {
        border-color: rgba(255, 255, 255, 0.5);
      }
      
      &.Mui-focused .MuiOutlinedInput-notchedOutline {
        border-color: #3b82f6;
      }
    }
    
    .MuiInputLabel-root {
      color: rgba(255, 255, 255, 0.7);
      
      &.Mui-focused {
        color: #3b82f6;
      }
    }
    
    .MuiSelect-select {
      color: white;
    }
    
    .MuiSelect-icon {
      color: rgba(255, 255, 255, 0.7);
    }
  }
`;

const NotesContainer = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1rem;
  min-height: 80px;
  margin-top: 0.5rem;
  white-space: pre-wrap;
  line-height: 1.5;
  
  &.empty {
    color: rgba(255, 255, 255, 0.5);
    font-style: italic;
  }
`;

const ClientTrainerDetails = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

// ===== MAIN COMPONENT =====

const AdminSessionsDialogs: React.FC<AdminSessionsDialogsProps> = ({
  dialogStates,
  editForm,
  newForm,
  clients,
  trainers,
  loadingClients,
  loadingTrainers,
  onDialogChange,
  onEditFormChange,
  onNewFormChange,
  onSaveEdit,
  onCreateNew
}) => {
  // Memoized validation for edit form
  const editFormValidation = useMemo(() => {
    return validateSessionDateTime(editForm.editSessionDate, editForm.editSessionTime);
  }, [editForm.editSessionDate, editForm.editSessionTime]);

  // Memoized validation for new form
  const newFormValidation = useMemo(() => {
    return validateSessionDateTime(newForm.newSessionDate, newForm.newSessionTime);
  }, [newForm.newSessionDate, newForm.newSessionTime]);

  // Handle form changes
  const handleEditFormChange = useCallback((field: keyof typeof editForm, value: string | number) => {
    onEditFormChange(field, value);
  }, [onEditFormChange]);

  const handleNewFormChange = useCallback((field: keyof typeof newForm, value: string | number) => {
    onNewFormChange(field, value);
  }, [onNewFormChange]);

  // Handle dialog close
  const handleDialogClose = useCallback((dialog: keyof typeof dialogStates) => {
    onDialogChange(dialog, false);
  }, [onDialogChange]);

  // Handle save actions
  const handleSaveEdit = useCallback(async () => {
    if (editFormValidation.isValid) {
      await onSaveEdit();
    }
  }, [editFormValidation.isValid, onSaveEdit]);

  const handleCreateNew = useCallback(async () => {
    if (newFormValidation.isValid) {
      await onCreateNew();
    }
  }, [newFormValidation.isValid, onCreateNew]);

  // Get formatted session details for view dialog
  const getSessionDetails = useCallback((session: Session | null) => {
    if (!session) return null;
    
    const { date, time } = formatSessionTime(session.sessionDate);
    return { ...session, formattedDate: date, formattedTime: time };
  }, []);

  const sessionDetails = getSessionDetails(dialogStates.selectedSession);

  return (
    <>
      {/* View Session Dialog */}
      <StyledDialog
        open={dialogStates.openViewDialog}
        onClose={() => handleDialogClose('openViewDialog')}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Eye />
            <Typography variant="h6">Session Details</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {sessionDetails && (
            <DetailGrid container spacing={3}>
              {/* Session ID and Status */}
              <Grid item xs={12}>
                <div className="detail-label">Session ID</div>
                <Typography className="detail-value">
                  {sessionDetails.id || 'N/A'}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <div className="detail-label">Status</div>
                <StatusChip status={sessionDetails.status} size="medium" />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <div className="detail-label">Duration</div>
                <Typography className="detail-value">
                  {sessionDetails.duration || 60} minutes
                </Typography>
              </Grid>

              {/* Date and Time */}
              <Grid item xs={12} sm={6}>
                <div className="detail-label">Date</div>
                <Typography className="detail-value">
                  {sessionDetails.formattedDate}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <div className="detail-label">Time</div>
                <Typography className="detail-value">
                  {sessionDetails.formattedTime}
                </Typography>
              </Grid>

              {/* Location */}
              <Grid item xs={12}>
                <div className="detail-label">Location</div>
                <Typography className="detail-value">
                  {sessionDetails.location || 'Not specified'}
                </Typography>
              </Grid>

              {/* Client Details */}
              <Grid item xs={12}>
                <div className="detail-label">Client</div>
                {sessionDetails.client ? (
                  <ClientTrainerDetails>
                    <ClientDisplay 
                      client={sessionDetails.client} 
                      showSessionCount={true}
                      compact={false}
                    />
                  </ClientTrainerDetails>
                ) : (
                  <Typography className="detail-value" sx={{ fontStyle: 'italic', opacity: 0.7 }}>
                    No client assigned
                  </Typography>
                )}
              </Grid>

              {/* Trainer Details */}
              <Grid item xs={12}>
                <div className="detail-label">Trainer</div>
                {sessionDetails.trainer ? (
                  <ClientTrainerDetails>
                    <TrainerDisplay 
                      trainer={sessionDetails.trainer}
                      compact={false}
                    />
                  </ClientTrainerDetails>
                ) : (
                  <Typography className="detail-value" sx={{ fontStyle: 'italic', opacity: 0.7 }}>
                    No trainer assigned
                  </Typography>
                )}
              </Grid>

              {/* Notes */}
              <Grid item xs={12}>
                <div className="detail-label">Notes</div>
                <NotesContainer className={!sessionDetails.notes ? 'empty' : ''}>
                  {sessionDetails.notes || 'No notes for this session.'}
                </NotesContainer>
              </Grid>
            </DetailGrid>
          )}
        </DialogContent>
        <DialogActions>
          <GlowButton
            text="Close"
            theme="cosmic"
            size="small"
            onClick={() => handleDialogClose('openViewDialog')}
          />
          <GlowButton
            text="Edit Session"
            theme="purple"
            size="small"
            leftIcon={<Edit size={16} />}
            onClick={() => {
              handleDialogClose('openViewDialog');
              onDialogChange('openEditDialog', true);
            }}
            disabled={!dialogStates.selectedSession}
          />
        </DialogActions>
      </StyledDialog>

      {/* Edit Session Dialog */}
      <StyledDialog
        open={dialogStates.openEditDialog}
        onClose={() => handleDialogClose('openEditDialog')}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Edit />
            <Typography variant="h6">Edit Session</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
            Update the details for this session.
          </DialogContentText>
          <Grid container spacing={2}>
            {/* Client Selection */}
            <Grid item xs={12} sm={6}>
              <StyledFormControl fullWidth size="small">
                <InputLabel>Client</InputLabel>
                <Select
                  value={editForm.editSessionClient}
                  onChange={(e) => handleEditFormChange('editSessionClient', e.target.value)}
                  label="Client"
                  disabled={loadingClients}
                >
                  <MenuItem value=""><em>Not Assigned</em></MenuItem>
                  {clients.map(client => (
                    <MenuItem key={client.id} value={client.id}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar 
                          src={client.photo || undefined} 
                          sx={{ width: 24, height: 24, fontSize: '0.7rem' }}
                        >
                          {client.firstName?.[0]}{client.lastName?.[0]}
                        </Avatar>
                        <span>{client.firstName} {client.lastName}</span>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </StyledFormControl>
            </Grid>

            {/* Trainer Selection */}
            <Grid item xs={12} sm={6}>
              <StyledFormControl fullWidth size="small">
                <InputLabel>Trainer</InputLabel>
                <Select
                  value={editForm.editSessionTrainer}
                  onChange={(e) => handleEditFormChange('editSessionTrainer', e.target.value)}
                  label="Trainer"
                  disabled={loadingTrainers}
                >
                  <MenuItem value=""><em>Not Assigned</em></MenuItem>
                  {trainers.map(trainer => (
                    <MenuItem key={trainer.id} value={trainer.id}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar 
                          src={trainer.photo || undefined} 
                          sx={{ width: 24, height: 24, fontSize: '0.7rem' }}
                        >
                          {trainer.firstName?.[0]}{trainer.lastName?.[0]}
                        </Avatar>
                        <span>{trainer.firstName} {trainer.lastName}</span>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </StyledFormControl>
            </Grid>

            {/* Date and Time */}
            <Grid item xs={12} sm={6}>
              <StyledTextField
                label="Date"
                type="date"
                size="small"
                fullWidth
                value={editForm.editSessionDate}
                onChange={(e) => handleEditFormChange('editSessionDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                error={!editFormValidation.isValid && !!editFormValidation.errors.date}
                helperText={editFormValidation.errors.date}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <StyledTextField
                label="Time"
                type="time"
                size="small"
                fullWidth
                value={editForm.editSessionTime}
                onChange={(e) => handleEditFormChange('editSessionTime', e.target.value)}
                InputLabelProps={{ shrink: true }}
                error={!editFormValidation.isValid && !!editFormValidation.errors.time}
                helperText={editFormValidation.errors.time}
              />
            </Grid>

            {/* Duration and Status */}
            <Grid item xs={12} sm={6}>
              <StyledTextField
                label="Duration (min)"
                type="number"
                size="small"
                fullWidth
                value={editForm.editSessionDuration}
                onChange={(e) => handleEditFormChange('editSessionDuration', parseInt(e.target.value, 10) || DEFAULT_SESSION_DURATION)}
                InputProps={{ inputProps: { min: 15, max: 240, step: 15 } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <StyledFormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={editForm.editSessionStatus}
                  onChange={(e) => handleEditFormChange('editSessionStatus', e.target.value)}
                  label="Status"
                >
                  {(['available', 'scheduled', 'confirmed', 'completed', 'cancelled'] as const).map(status => (
                    <MenuItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </StyledFormControl>
            </Grid>

            {/* Location */}
            <Grid item xs={12}>
              <StyledTextField
                label="Location"
                size="small"
                fullWidth
                value={editForm.editSessionLocation}
                onChange={(e) => handleEditFormChange('editSessionLocation', e.target.value)}
                placeholder="e.g., Main Studio, Park, Online"
              />
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <StyledTextField
                label="Session Notes"
                size="small"
                fullWidth
                multiline
                rows={3}
                value={editForm.editSessionNotes}
                onChange={(e) => handleEditFormChange('editSessionNotes', e.target.value)}
                placeholder="Add any relevant notes for this session..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <GlowButton
            text="Cancel"
            theme="cosmic"
            size="small"
            onClick={() => handleDialogClose('openEditDialog')}
          />
          <GlowButton
            text="Save Changes"
            theme="emerald"
            size="small"
            leftIcon={<CheckSquare size={16} />}
            onClick={handleSaveEdit}
            disabled={!editFormValidation.isValid}
          />
        </DialogActions>
      </StyledDialog>

      {/* New Session Dialog */}
      <StyledDialog
        open={dialogStates.openNewDialog}
        onClose={() => handleDialogClose('openNewDialog')}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Plus />
            <Typography variant="h6">Schedule New Session Slot</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
            Create a new available time slot. You can assign a client or trainer now, or leave it as generally available.
          </DialogContentText>
          <Grid container spacing={2}>
            {/* Client and Trainer Selection */}
            <Grid item xs={12} sm={6}>
              <StyledFormControl fullWidth size="small">
                <InputLabel>Assign Client (Optional)</InputLabel>
                <Select
                  value={newForm.newSessionClient}
                  onChange={(e) => handleNewFormChange('newSessionClient', e.target.value)}
                  label="Assign Client (Optional)"
                  disabled={loadingClients}
                >
                  <MenuItem value=""><em>Not Assigned</em></MenuItem>
                  {clients.map(client => (
                    <MenuItem key={client.id} value={client.id}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar 
                          src={client.photo || undefined} 
                          sx={{ width: 24, height: 24, fontSize: '0.7rem' }}
                        >
                          {client.firstName?.[0]}{client.lastName?.[0]}
                        </Avatar>
                        <span>{client.firstName} {client.lastName}</span>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </StyledFormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <StyledFormControl fullWidth size="small">
                <InputLabel>Assign Trainer (Optional)</InputLabel>
                <Select
                  value={newForm.newSessionTrainer}
                  onChange={(e) => handleNewFormChange('newSessionTrainer', e.target.value)}
                  label="Assign Trainer (Optional)"
                  disabled={loadingTrainers}
                >
                  <MenuItem value=""><em>Not Assigned</em></MenuItem>
                  {trainers.map(trainer => (
                    <MenuItem key={trainer.id} value={trainer.id}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar 
                          src={trainer.photo || undefined} 
                          sx={{ width: 24, height: 24, fontSize: '0.7rem' }}
                        >
                          {trainer.firstName?.[0]}{trainer.lastName?.[0]}
                        </Avatar>
                        <span>{trainer.firstName} {trainer.lastName}</span>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </StyledFormControl>
            </Grid>

            {/* Date and Time */}
            <Grid item xs={12} sm={6}>
              <StyledTextField
                label="Date"
                type="date"
                size="small"
                fullWidth
                value={newForm.newSessionDate}
                onChange={(e) => handleNewFormChange('newSessionDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: new Date().toISOString().slice(0, 10) }}
                error={!newFormValidation.isValid && !!newFormValidation.errors.date}
                helperText={newFormValidation.errors.date}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <StyledTextField
                label="Time"
                type="time"
                size="small"
                fullWidth
                value={newForm.newSessionTime}
                onChange={(e) => handleNewFormChange('newSessionTime', e.target.value)}
                InputLabelProps={{ shrink: true }}
                error={!newFormValidation.isValid && !!newFormValidation.errors.time}
                helperText={newFormValidation.errors.time}
              />
            </Grid>

            {/* Duration and Location */}
            <Grid item xs={12} sm={6}>
              <StyledTextField
                label="Duration (min)"
                type="number"
                size="small"
                fullWidth
                value={newForm.newSessionDuration}
                onChange={(e) => handleNewFormChange('newSessionDuration', parseInt(e.target.value, 10) || DEFAULT_SESSION_DURATION)}
                InputProps={{ inputProps: { min: 15, max: 240, step: 15 } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <StyledTextField
                label="Location"
                size="small"
                fullWidth
                value={newForm.newSessionLocation}
                onChange={(e) => handleNewFormChange('newSessionLocation', e.target.value)}
                placeholder="e.g., Main Studio"
              />
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <StyledTextField
                label="Notes (Optional)"
                size="small"
                fullWidth
                multiline
                rows={3}
                value={newForm.newSessionNotes}
                onChange={(e) => handleNewFormChange('newSessionNotes', e.target.value)}
                placeholder="e.g., Open slot for new clients, Focus on beginners"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <GlowButton
            text="Cancel"
            theme="cosmic"
            size="small"
            onClick={() => handleDialogClose('openNewDialog')}
          />
          <GlowButton
            text="Create Session Slot"
            theme="emerald"
            size="small"
            leftIcon={<Plus size={16} />}
            onClick={handleCreateNew}
            disabled={!newFormValidation.isValid}
          />
        </DialogActions>
      </StyledDialog>
    </>
  );
};

// ===== PERFORMANCE OPTIMIZATION =====

export default memo(AdminSessionsDialogs);
