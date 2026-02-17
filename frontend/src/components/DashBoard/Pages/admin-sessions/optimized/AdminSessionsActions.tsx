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
 *
 * Migrated from MUI to styled-components + lucide-react (Galaxy-Swan theme)
 */

import React, { memo, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { Zap, Download, Plus, UserPlus, X } from 'lucide-react';
import {
  AdminSessionsActionsProps,
  Client,
  AddSessionsForm
} from './AdminSessionsTypes';
import { ClientDisplay } from './AdminSessionsSharedComponents';
import GlowButton from '../../../../ui/buttons/GlowButton';

// ===== STYLED COMPONENTS =====

const DialogOverlay = styled.div<{ $open: boolean }>`
  display: ${props => props.$open ? 'flex' : 'none'};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 1300;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`;

const DialogPanel = styled.div`
  background: linear-gradient(135deg,
    rgba(30, 58, 138, 0.95) 0%,
    rgba(14, 165, 233, 0.85) 50%,
    rgba(8, 145, 178, 0.95) 100%
  );
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 16px;
  backdrop-filter: blur(20px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  color: #e2e8f0;
  min-width: 400px;
  max-width: 480px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;

  @media (max-width: 600px) {
    min-width: auto;
    max-width: none;
  }
`;

const DialogTitleBar = styled.div`
  background: rgba(30, 58, 138, 0.3);
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const DialogTitleText = styled.span`
  font-size: 1.25rem;
  font-weight: 600;
  color: #e2e8f0;
`;

const DialogBody = styled.div`
  padding: 1.5rem;
  border-top: 1px solid rgba(59, 130, 246, 0.2);
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
`;

const DialogDescription = styled.p`
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 1.25rem 0;
  font-size: 0.875rem;
  line-height: 1.5;
`;

const DialogFooter = styled.div`
  background: rgba(30, 58, 138, 0.3);
  border-top: 1px solid rgba(59, 130, 246, 0.2);
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
`;

const FormGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormLabel = styled.label`
  display: block;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.75rem;
  font-weight: 500;
  margin-bottom: 0.375rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const StyledSelect = styled.select`
  width: 100%;
  min-height: 44px;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.875rem;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.7)' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  padding-right: 2rem;

  &:hover {
    background-color: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.5);
  }

  &:focus {
    background-color: rgba(255, 255, 255, 0.2);
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  option {
    background: rgba(15, 23, 42, 0.98);
    color: #e2e8f0;
    padding: 0.5rem;
  }
`;

const StyledInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.875rem;
  outline: none;
  box-sizing: border-box;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.5);
  }

  &:focus {
    background: rgba(255, 255, 255, 0.2);
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
`;

const StyledTextarea = styled.textarea`
  width: 100%;
  min-height: 88px;
  padding: 0.625rem 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.875rem;
  font-family: inherit;
  outline: none;
  resize: vertical;
  box-sizing: border-box;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.5);
  }

  &:focus {
    background: rgba(255, 255, 255, 0.2);
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
`;

const HelperText = styled.span`
  display: block;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.75rem;
  margin-top: 0.25rem;
`;

const ClientOptionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const MiniAvatar = styled.div<{ $src?: string }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${props => props.$src
    ? `url(${props.$src}) center/cover no-repeat`
    : 'linear-gradient(135deg, #0ea5e9, #7c3aed)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6rem;
  font-weight: 600;
  color: white;
  flex-shrink: 0;
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
    color: #e2e8f0;
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
    flex-shrink: 0;
  }

  .counter-text {
    flex: 1;

    .primary {
      color: #e2e8f0;
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
  const handleNotesChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleFormChange('addSessionsNote', event.target.value);
  }, [handleFormChange]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (isFormValid) {
      await onAddSessions();
    }
  }, [isFormValid, onAddSessions]);

  // Handle overlay click (close on backdrop)
  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  return (
    <>
      {/* Add Sessions Dialog */}
      <DialogOverlay
        $open={open}
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-label="Add Sessions to Client"
      >
        <DialogPanel>
          <DialogTitleBar>
            <Zap size={20} />
            <DialogTitleText>Add Sessions to Client</DialogTitleText>
          </DialogTitleBar>
          <DialogBody>
            <DialogDescription>
              Manually add purchased or complimentary sessions to a client's account.
            </DialogDescription>
            <FormGrid>
              {/* Client Selection */}
              <div>
                <FormLabel htmlFor="add-client-select">Select Client</FormLabel>
                <StyledSelect
                  id="add-client-select"
                  value={addSessionsForm.selectedClient}
                  onChange={(e) => handleClientSelect(e.target.value)}
                  disabled={loadingClients}
                >
                  <option value="">-- Select a Client --</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.firstName} {client.lastName} ({client.availableSessions || 0} current sessions)
                    </option>
                  ))}
                </StyledSelect>
              </div>

              {/* Selected Client Info */}
              {selectedClient && (
                <ClientSessionInfo>
                  <div className="info-label">Selected Client</div>
                  <ClientDisplay
                    client={selectedClient}
                    showSessionCount={true}
                    compact={false}
                  />
                </ClientSessionInfo>
              )}

              {/* Number of Sessions */}
              <div>
                <FormLabel htmlFor="sessions-count-input">Number of Sessions to Add</FormLabel>
                <StyledInput
                  id="sessions-count-input"
                  type="number"
                  value={addSessionsForm.sessionsToAdd}
                  onChange={handleSessionsCountChange}
                  min={1}
                  max={100}
                  step={1}
                />
                <HelperText>Enter a number between 1 and 100</HelperText>
              </div>

              {/* Session Counter Display */}
              {addSessionsForm.sessionsToAdd > 0 && selectedClient && (
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
              )}

              {/* Admin Notes */}
              <div>
                <FormLabel htmlFor="admin-notes-input">Admin Notes (Optional)</FormLabel>
                <StyledTextarea
                  id="admin-notes-input"
                  rows={3}
                  value={addSessionsForm.addSessionsNote}
                  onChange={handleNotesChange}
                  placeholder="Reason for adding sessions (e.g., purchased package, referral bonus, compensation)"
                />
              </div>
            </FormGrid>
          </DialogBody>
          <DialogFooter>
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
          </DialogFooter>
        </DialogPanel>
      </DialogOverlay>

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
