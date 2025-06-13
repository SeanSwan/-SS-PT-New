/**
 * AdminSessionsActions.tsx
 * =========================
 * 
 * Action components for Admin Sessions (Add Sessions, Export, Bulk Operations)
 * Part of the Admin Sessions optimization following proven Trainer Dashboard methodology
 * 
 * Features:
 * - Add sessions to client dialog
 * - Export sessions functionality
 * - Bulk operations handling
 * - Form validation and error handling
 * - Performance-optimized action handling
 * - WCAG AA accessibility compliance
 * - Mobile-responsive action buttons
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
import { Zap, Download, Plus, UserPlus } from 'lucide-react';
import {
  AdminSessionsActionsProps,
  Client,
  AddSessionsForm
} from './AdminSessionsTypes';
import { ClientDisplay } from './AdminSessionsSharedComponents';
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

const ActionButtonsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  justify-content: flex-start;
  margin-top: 1.5rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    width: 100%;
    
    & > * {
      width: 100%;
    }
  }
`;

const ClientSessionInfo = styled.div`
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  padding: 1rem;
  margin-top: 0.5rem;
  
  .info-label {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }
  
  .info-value {
    color: white;
    font-weight: 500;
  }
`;

const SessionCounter = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
  
  .counter-icon {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #10b981, #34d399);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 1.2rem;
  }
  
  .counter-text {
    flex: 1;
    
    .primary {
      color: white;
      font-weight: 500;
      font-size: 1rem;
    }
    
    .secondary {
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.85rem;
      margin-top: 0.25rem;
    }
  }
`;

// ===== MAIN COMPONENT =====

const AdminSessionsActions: React.FC<AdminSessionsActionsProps> = ({
  addSessionsForm,
  clients,
  loadingClients,
  open,
  onClose,
  onFormChange,
  onAddSessions,
  onExportSessions,
  onCreateNewSession
}) => {
  // Find selected client details
  const selectedClient = useMemo(() => {
    return clients.find(client => client.id === addSessionsForm.selectedClient) || null;
  }, [clients, addSessionsForm.selectedClient]);

  // Form validation
  const isFormValid = useMemo(() => {
    return (
      addSessionsForm.selectedClient.length > 0 &&
      addSessionsForm.sessionsToAdd > 0 &&
      addSessionsForm.sessionsToAdd <= 100
    );
  }, [addSessionsForm.selectedClient, addSessionsForm.sessionsToAdd]);

  // Handle form field changes
  const handleFormChange = useCallback((field: keyof AddSessionsForm, value: string | number) => {
    onFormChange(field, value);
  }, [onFormChange]);

  // Handle client selection
  const handleClientSelect = useCallback((clientId: string) => {
    handleFormChange('selectedClient', clientId);
  }, [handleFormChange]);

  // Handle sessions count change
  const handleSessionsCountChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(1, Math.min(100, parseInt(event.target.value, 10) || 1));
    handleFormChange('sessionsToAdd', value);
  }, [handleFormChange]);

  // Handle notes change
  const handleNotesChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    handleFormChange('addSessionsNote', event.target.value);
  }, [handleFormChange]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (isFormValid) {
      await onAddSessions();
    }
  }, [isFormValid, onAddSessions]);

  return (
    <>
      {/* Add Sessions Dialog */}
      <StyledDialog
        open={open}
        onClose={onClose}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Zap />
            <Typography variant="h6">Add Sessions to Client</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2.5 }}>
            Manually add purchased or complimentary sessions to a client's account.
          </DialogContentText>
          <Grid container spacing={2}>
            {/* Client Selection */}
            <Grid item xs={12}>
              <StyledFormControl fullWidth size="small">
                <InputLabel id="add-client-select-label">Select Client</InputLabel>
                <Select
                  labelId="add-client-select-label"
                  value={addSessionsForm.selectedClient}
                  onChange={(e) => handleClientSelect(e.target.value)}
                  label="Select Client"
                  disabled={loadingClients}
                >
                  <MenuItem value="">
                    <em>-- Select a Client --</em>
                  </MenuItem>
                  {clients.map(client => (
                    <MenuItem key={client.id} value={client.id}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar 
                          src={client.photo || undefined} 
                          sx={{ width: 24, height: 24, fontSize: '0.7rem' }}
                        >
                          {client.firstName?.[0]}{client.lastName?.[0]}
                        </Avatar>
                        <MuiBox>
                          <Typography variant="body2">
                            {client.firstName} {client.lastName}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            sx={{ color: 'rgba(255, 255, 255, 0.6)' }}
                          >
                            ({client.availableSessions || 0} current sessions)
                          </Typography>
                        </MuiBox>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </StyledFormControl>
            </Grid>

            {/* Selected Client Info */}
            {selectedClient && (
              <Grid item xs={12}>
                <ClientSessionInfo>
                  <div className="info-label">Selected Client</div>
                  <ClientDisplay 
                    client={selectedClient} 
                    showSessionCount={true}
                    compact={false}
                  />
                </ClientSessionInfo>
              </Grid>
            )}

            {/* Number of Sessions */}
            <Grid item xs={12}>
              <StyledTextField
                label="Number of Sessions to Add"
                type="number"
                size="small"
                fullWidth
                value={addSessionsForm.sessionsToAdd}
                onChange={handleSessionsCountChange}
                InputProps={{ 
                  inputProps: { min: 1, max: 100, step: 1 }
                }}
                helperText="Enter a number between 1 and 100"
              />
            </Grid>

            {/* Session Counter Display */}
            {addSessionsForm.sessionsToAdd > 0 && selectedClient && (
              <Grid item xs={12}>
                <SessionCounter>
                  <div className="counter-icon">
                    +{addSessionsForm.sessionsToAdd}
                  </div>
                  <div className="counter-text">
                    <div className="primary">
                      Adding {addSessionsForm.sessionsToAdd} session{addSessionsForm.sessionsToAdd !== 1 ? 's' : ''}
                    </div>
                    <div className="secondary">
                      New total: {(selectedClient.availableSessions || 0) + addSessionsForm.sessionsToAdd} sessions
                    </div>
                  </div>
                </SessionCounter>
              </Grid>
            )}

            {/* Admin Notes */}
            <Grid item xs={12}>
              <StyledTextField
                label="Admin Notes (Optional)"
                size="small"
                fullWidth
                multiline
                rows={3}
                value={addSessionsForm.addSessionsNote}
                onChange={handleNotesChange}
                placeholder="Reason for adding sessions (e.g., purchased package, referral bonus, compensation)"
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
          />
          <GlowButton
            text="Add Sessions"
            theme="emerald"
            size="small"
            leftIcon={<Zap size={16} />}
            onClick={handleSubmit}
            disabled={!isFormValid}
          />
        </DialogActions>
      </StyledDialog>

      {/* Action Buttons for Table View */}
      <ActionButtonsContainer>
        <GlowButton
          text="Schedule New Slot"
          theme="cosmic"
          leftIcon={<Plus size={18} />}
          onClick={onCreateNewSession}
        />
        <GlowButton
          text="Export Sessions"
          theme="ruby"
          leftIcon={<Download size={18} />}
          onClick={onExportSessions}
        />
      </ActionButtonsContainer>
    </>
  );
};

// ===== PERFORMANCE OPTIMIZATION =====

export default memo(AdminSessionsActions);

// ===== UTILITY FUNCTIONS =====

export const validateAddSessionsForm = (form: AddSessionsForm): boolean => {
  return (
    form.selectedClient.length > 0 &&
    form.sessionsToAdd > 0 &&
    form.sessionsToAdd <= 100
  );
};

export const prepareAddSessionsData = (form: AddSessionsForm) => {
  return {
    clientId: form.selectedClient,
    sessionsToAdd: form.sessionsToAdd,
    adminNote: form.addSessionsNote.trim() || `Admin added ${form.sessionsToAdd} sessions`
  };
};

// ===== EXPORT FUNCTIONALITY =====

export const exportSessionsToCSV = (sessions: any[]) => {
  const headers = [
    'Session ID',
    'Client Name',
    'Client Email',
    'Trainer Name',
    'Trainer Email',
    'Date',
    'Time',
    'Duration (min)',
    'Location',
    'Status',
    'Notes'
  ];

  const csvData = sessions.map(session => [
    session.id || '',
    session.client ? `${session.client.firstName} ${session.client.lastName}` : '',
    session.client?.email || '',
    session.trainer ? `${session.trainer.firstName} ${session.trainer.lastName}` : '',
    session.trainer?.email || '',
    session.sessionDate ? new Date(session.sessionDate).toLocaleDateString() : '',
    session.sessionDate ? new Date(session.sessionDate).toLocaleTimeString() : '',
    session.duration || '',
    session.location || '',
    session.status || '',
    session.notes || ''
  ]);

  const csvContent = [headers, ...csvData]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `sessions_export_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportSessionsToJSON = (sessions: any[]) => {
  const exportData = {
    exportDate: new Date().toISOString(),
    sessionCount: sessions.length,
    sessions: sessions.map(session => ({
      id: session.id,
      sessionDate: session.sessionDate,
      duration: session.duration,
      location: session.location,
      status: session.status,
      notes: session.notes,
      client: session.client ? {
        id: session.client.id,
        name: `${session.client.firstName} ${session.client.lastName}`,
        email: session.client.email,
        availableSessions: session.client.availableSessions
      } : null,
      trainer: session.trainer ? {
        id: session.trainer.id,
        name: `${session.trainer.firstName} ${session.trainer.lastName}`,
        email: session.trainer.email
      } : null
    }))
  };

  const jsonContent = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `sessions_export_${new Date().toISOString().split('T')[0]}.json`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ===== ACCESSIBILITY HELPERS =====

export const getAddSessionsAriaLabel = (
  selectedClient: Client | null,
  sessionsToAdd: number
): string => {
  if (!selectedClient) {
    return 'Add sessions form. No client selected.';
  }
  
  return `Add ${sessionsToAdd} sessions to ${selectedClient.firstName} ${selectedClient.lastName}. Current sessions: ${selectedClient.availableSessions}.`;
};

// ===== FORM HELPERS =====

export const resetAddSessionsForm = (): AddSessionsForm => ({
  selectedClient: '',
  sessionsToAdd: 1,
  addSessionsNote: ''
});

export const getFormFieldError = (field: keyof AddSessionsForm, form: AddSessionsForm): string | null => {
  switch (field) {
    case 'selectedClient':
      return form.selectedClient.length === 0 ? 'Please select a client' : null;
    case 'sessionsToAdd':
      if (form.sessionsToAdd <= 0) return 'Must add at least 1 session';
      if (form.sessionsToAdd > 100) return 'Cannot add more than 100 sessions at once';
      return null;
    default:
      return null;
  }
};
