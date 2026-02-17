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
 *
 * Migrated from MUI to styled-components + lucide-react
 */

import React, { memo, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import styled, { keyframes, css } from 'styled-components';
import { Calendar, Edit, Plus, CheckSquare, Eye, X } from 'lucide-react';
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

const DialogOverlay = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => ($open ? 'flex' : 'none')};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1300;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
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
  color: white;
  min-width: 400px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  @media (max-width: 600px) {
    min-width: auto;
  }
`;

const DialogHeader = styled.div`
  background: rgba(30, 58, 138, 0.3);
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
  padding: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const DialogHeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const DialogHeaderTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #fff;
`;

const DialogBody = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
  border-top: 1px solid rgba(59, 130, 246, 0.2);
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
`;

const DialogFooter = styled.div`
  background: rgba(30, 58, 138, 0.3);
  border-top: 1px solid rgba(59, 130, 246, 0.2);
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
`;

const CloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: background 0.2s, color 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  &:focus-visible {
    outline: 2px solid #0ea5e9;
    outline-offset: 2px;
  }
`;

const DetailGridContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const DetailCell = styled.div<{ $fullWidth?: boolean }>`
  ${({ $fullWidth }) => $fullWidth && css`
    grid-column: 1 / -1;
  `}
`;

const DetailLabel = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
  font-weight: 500;
`;

const DetailValue = styled.p`
  color: white;
  font-weight: 500;
  margin: 0 0 0.25rem 0;
`;

const DetailValueItalic = styled.p`
  color: white;
  font-weight: 500;
  margin: 0;
  font-style: italic;
  opacity: 0.7;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const FormCell = styled.div<{ $fullWidth?: boolean }>`
  ${({ $fullWidth }) => $fullWidth && css`
    grid-column: 1 / -1;
  `}
`;

const DialogDescription = styled.p`
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
  line-height: 1.5;
`;

const NotesContainer = styled.div<{ $empty?: boolean }>`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1rem;
  min-height: 80px;
  margin-top: 0.5rem;
  white-space: pre-wrap;
  line-height: 1.5;
  color: ${({ $empty }) => $empty ? 'rgba(255, 255, 255, 0.5)' : 'inherit'};
  font-style: ${({ $empty }) => $empty ? 'italic' : 'normal'};
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

// ===== FORM PRIMITIVES =====

const FieldWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  width: 100%;
`;

const FieldLabel = styled.label`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.75rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
`;

const StyledInput = styled.input<{ $error?: boolean }>`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid ${({ $error }) => $error ? '#ef4444' : 'rgba(255, 255, 255, 0.3)'};
  border-radius: 8px;
  color: white;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
  min-height: 44px;
  width: 100%;
  box-sizing: border-box;
  transition: background 0.2s, border-color 0.2s;

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  &:focus {
    background: rgba(255, 255, 255, 0.2);
    border-color: ${({ $error }) => $error ? '#ef4444' : '#3b82f6'};
    outline: none;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StyledTextarea = styled.textarea<{ $error?: boolean }>`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid ${({ $error }) => $error ? '#ef4444' : 'rgba(255, 255, 255, 0.3)'};
  border-radius: 8px;
  color: white;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
  font-family: inherit;
  min-height: 80px;
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  transition: background 0.2s, border-color 0.2s;

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  &:focus {
    background: rgba(255, 255, 255, 0.2);
    border-color: ${({ $error }) => $error ? '#ef4444' : '#3b82f6'};
    outline: none;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StyledSelect = styled.select`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  color: white;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
  min-height: 44px;
  width: 100%;
  box-sizing: border-box;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.7)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  padding-right: 2rem;
  transition: background-color 0.2s, border-color 0.2s;

  &:hover {
    background-color: rgba(255, 255, 255, 0.15);
  }

  &:focus {
    background-color: rgba(255, 255, 255, 0.2);
    border-color: #3b82f6;
    outline: none;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  option {
    background: #1e3a8a;
    color: white;
  }
`;

const FieldError = styled.span`
  color: #ef4444;
  font-size: 0.75rem;
  margin-top: 0.125rem;
`;

const MiniAvatar = styled.span<{ $src?: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 0.7rem;
  font-weight: 600;
  color: #fff;
  background: ${({ $src }) => $src ? `url(${$src}) center / cover no-repeat` : 'rgba(14, 165, 233, 0.4)'};
  flex-shrink: 0;
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

  // Handle overlay click (close on backdrop click)
  const handleOverlayClick = useCallback((dialog: keyof typeof dialogStates) => (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleDialogClose(dialog);
    }
  }, [handleDialogClose]);

  return (
    <>
      {/* View Session Dialog */}
      <DialogOverlay
        $open={dialogStates.openViewDialog}
        onClick={handleOverlayClick('openViewDialog')}
        role="dialog"
        aria-modal="true"
        aria-label="Session Details"
      >
        <DialogPanel>
          <DialogHeader>
            <DialogHeaderRow>
              <Eye size={20} />
              <DialogHeaderTitle>Session Details</DialogHeaderTitle>
            </DialogHeaderRow>
            <CloseButton
              onClick={() => handleDialogClose('openViewDialog')}
              aria-label="Close dialog"
            >
              <X size={20} />
            </CloseButton>
          </DialogHeader>
          <DialogBody>
            {sessionDetails && (
              <DetailGridContainer>
                {/* Session ID and Status */}
                <DetailCell $fullWidth>
                  <DetailLabel>Session ID</DetailLabel>
                  <DetailValue>
                    {sessionDetails.id || 'N/A'}
                  </DetailValue>
                </DetailCell>

                <DetailCell>
                  <DetailLabel>Status</DetailLabel>
                  <StatusChip status={sessionDetails.status} size="medium" />
                </DetailCell>

                <DetailCell>
                  <DetailLabel>Duration</DetailLabel>
                  <DetailValue>
                    {sessionDetails.duration || 60} minutes
                  </DetailValue>
                </DetailCell>

                {/* Date and Time */}
                <DetailCell>
                  <DetailLabel>Date</DetailLabel>
                  <DetailValue>
                    {sessionDetails.formattedDate}
                  </DetailValue>
                </DetailCell>

                <DetailCell>
                  <DetailLabel>Time</DetailLabel>
                  <DetailValue>
                    {sessionDetails.formattedTime}
                  </DetailValue>
                </DetailCell>

                {/* Location */}
                <DetailCell $fullWidth>
                  <DetailLabel>Location</DetailLabel>
                  <DetailValue>
                    {sessionDetails.location || 'Not specified'}
                  </DetailValue>
                </DetailCell>

                {/* Client Details */}
                <DetailCell $fullWidth>
                  <DetailLabel>Client</DetailLabel>
                  {sessionDetails.client ? (
                    <ClientTrainerDetails>
                      <ClientDisplay
                        client={sessionDetails.client}
                        showSessionCount={true}
                        compact={false}
                      />
                    </ClientTrainerDetails>
                  ) : (
                    <DetailValueItalic>
                      No client assigned
                    </DetailValueItalic>
                  )}
                </DetailCell>

                {/* Trainer Details */}
                <DetailCell $fullWidth>
                  <DetailLabel>Trainer</DetailLabel>
                  {sessionDetails.trainer ? (
                    <ClientTrainerDetails>
                      <TrainerDisplay
                        trainer={sessionDetails.trainer}
                        compact={false}
                      />
                    </ClientTrainerDetails>
                  ) : (
                    <DetailValueItalic>
                      No trainer assigned
                    </DetailValueItalic>
                  )}
                </DetailCell>

                {/* Notes */}
                <DetailCell $fullWidth>
                  <DetailLabel>Notes</DetailLabel>
                  <NotesContainer $empty={!sessionDetails.notes}>
                    {sessionDetails.notes || 'No notes for this session.'}
                  </NotesContainer>
                </DetailCell>
              </DetailGridContainer>
            )}
          </DialogBody>
          <DialogFooter>
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
          </DialogFooter>
        </DialogPanel>
      </DialogOverlay>

      {/* Edit Session Dialog */}
      <DialogOverlay
        $open={dialogStates.openEditDialog}
        onClick={handleOverlayClick('openEditDialog')}
        role="dialog"
        aria-modal="true"
        aria-label="Edit Session"
      >
        <DialogPanel>
          <DialogHeader>
            <DialogHeaderRow>
              <Edit size={20} />
              <DialogHeaderTitle>Edit Session</DialogHeaderTitle>
            </DialogHeaderRow>
            <CloseButton
              onClick={() => handleDialogClose('openEditDialog')}
              aria-label="Close dialog"
            >
              <X size={20} />
            </CloseButton>
          </DialogHeader>
          <DialogBody>
            <DialogDescription>
              Update the details for this session.
            </DialogDescription>
            <FormGrid>
              {/* Client Selection */}
              <FormCell>
                <FieldWrapper>
                  <FieldLabel>Client</FieldLabel>
                  <StyledSelect
                    value={editForm.editSessionClient}
                    onChange={(e) => handleEditFormChange('editSessionClient', e.target.value)}
                    disabled={loadingClients}
                  >
                    <option value="">Not Assigned</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.firstName} {client.lastName}
                      </option>
                    ))}
                  </StyledSelect>
                </FieldWrapper>
              </FormCell>

              {/* Trainer Selection */}
              <FormCell>
                <FieldWrapper>
                  <FieldLabel>Trainer</FieldLabel>
                  <StyledSelect
                    value={editForm.editSessionTrainer}
                    onChange={(e) => handleEditFormChange('editSessionTrainer', e.target.value)}
                    disabled={loadingTrainers}
                  >
                    <option value="">Not Assigned</option>
                    {trainers.map(trainer => (
                      <option key={trainer.id} value={trainer.id}>
                        {trainer.firstName} {trainer.lastName}
                      </option>
                    ))}
                  </StyledSelect>
                </FieldWrapper>
              </FormCell>

              {/* Date and Time */}
              <FormCell>
                <FieldWrapper>
                  <FieldLabel>Date</FieldLabel>
                  <StyledInput
                    type="date"
                    value={editForm.editSessionDate}
                    onChange={(e) => handleEditFormChange('editSessionDate', e.target.value)}
                    $error={!editFormValidation.isValid && !!editFormValidation.errors.date}
                  />
                  {!editFormValidation.isValid && editFormValidation.errors.date && (
                    <FieldError>{editFormValidation.errors.date}</FieldError>
                  )}
                </FieldWrapper>
              </FormCell>

              <FormCell>
                <FieldWrapper>
                  <FieldLabel>Time</FieldLabel>
                  <StyledInput
                    type="time"
                    value={editForm.editSessionTime}
                    onChange={(e) => handleEditFormChange('editSessionTime', e.target.value)}
                    $error={!editFormValidation.isValid && !!editFormValidation.errors.time}
                  />
                  {!editFormValidation.isValid && editFormValidation.errors.time && (
                    <FieldError>{editFormValidation.errors.time}</FieldError>
                  )}
                </FieldWrapper>
              </FormCell>

              {/* Duration and Status */}
              <FormCell>
                <FieldWrapper>
                  <FieldLabel>Duration (min)</FieldLabel>
                  <StyledInput
                    type="number"
                    value={editForm.editSessionDuration}
                    onChange={(e) => handleEditFormChange('editSessionDuration', parseInt(e.target.value, 10) || DEFAULT_SESSION_DURATION)}
                    min={15}
                    max={240}
                    step={15}
                  />
                </FieldWrapper>
              </FormCell>

              <FormCell>
                <FieldWrapper>
                  <FieldLabel>Status</FieldLabel>
                  <StyledSelect
                    value={editForm.editSessionStatus}
                    onChange={(e) => handleEditFormChange('editSessionStatus', e.target.value)}
                  >
                    {(['available', 'scheduled', 'confirmed', 'completed', 'cancelled'] as const).map(status => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </StyledSelect>
                </FieldWrapper>
              </FormCell>

              {/* Location */}
              <FormCell $fullWidth>
                <FieldWrapper>
                  <FieldLabel>Location</FieldLabel>
                  <StyledInput
                    type="text"
                    value={editForm.editSessionLocation}
                    onChange={(e) => handleEditFormChange('editSessionLocation', e.target.value)}
                    placeholder="e.g., Main Studio, Park, Online"
                  />
                </FieldWrapper>
              </FormCell>

              {/* Notes */}
              <FormCell $fullWidth>
                <FieldWrapper>
                  <FieldLabel>Session Notes</FieldLabel>
                  <StyledTextarea
                    value={editForm.editSessionNotes}
                    onChange={(e) => handleEditFormChange('editSessionNotes', e.target.value)}
                    placeholder="Add any relevant notes for this session..."
                    rows={3}
                  />
                </FieldWrapper>
              </FormCell>
            </FormGrid>
          </DialogBody>
          <DialogFooter>
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
          </DialogFooter>
        </DialogPanel>
      </DialogOverlay>

      {/* New Session Dialog */}
      <DialogOverlay
        $open={dialogStates.openNewDialog}
        onClick={handleOverlayClick('openNewDialog')}
        role="dialog"
        aria-modal="true"
        aria-label="Schedule New Session Slot"
      >
        <DialogPanel>
          <DialogHeader>
            <DialogHeaderRow>
              <Plus size={20} />
              <DialogHeaderTitle>Schedule New Session Slot</DialogHeaderTitle>
            </DialogHeaderRow>
            <CloseButton
              onClick={() => handleDialogClose('openNewDialog')}
              aria-label="Close dialog"
            >
              <X size={20} />
            </CloseButton>
          </DialogHeader>
          <DialogBody>
            <DialogDescription>
              Create a new available time slot. You can assign a client or trainer now, or leave it as generally available.
            </DialogDescription>
            <FormGrid>
              {/* Client and Trainer Selection */}
              <FormCell>
                <FieldWrapper>
                  <FieldLabel>Assign Client (Optional)</FieldLabel>
                  <StyledSelect
                    value={newForm.newSessionClient}
                    onChange={(e) => handleNewFormChange('newSessionClient', e.target.value)}
                    disabled={loadingClients}
                  >
                    <option value="">Not Assigned</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.firstName} {client.lastName}
                      </option>
                    ))}
                  </StyledSelect>
                </FieldWrapper>
              </FormCell>

              <FormCell>
                <FieldWrapper>
                  <FieldLabel>Assign Trainer (Optional)</FieldLabel>
                  <StyledSelect
                    value={newForm.newSessionTrainer}
                    onChange={(e) => handleNewFormChange('newSessionTrainer', e.target.value)}
                    disabled={loadingTrainers}
                  >
                    <option value="">Not Assigned</option>
                    {trainers.map(trainer => (
                      <option key={trainer.id} value={trainer.id}>
                        {trainer.firstName} {trainer.lastName}
                      </option>
                    ))}
                  </StyledSelect>
                </FieldWrapper>
              </FormCell>

              {/* Date and Time */}
              <FormCell>
                <FieldWrapper>
                  <FieldLabel>Date</FieldLabel>
                  <StyledInput
                    type="date"
                    value={newForm.newSessionDate}
                    onChange={(e) => handleNewFormChange('newSessionDate', e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    $error={!newFormValidation.isValid && !!newFormValidation.errors.date}
                  />
                  {!newFormValidation.isValid && newFormValidation.errors.date && (
                    <FieldError>{newFormValidation.errors.date}</FieldError>
                  )}
                </FieldWrapper>
              </FormCell>

              <FormCell>
                <FieldWrapper>
                  <FieldLabel>Time</FieldLabel>
                  <StyledInput
                    type="time"
                    value={newForm.newSessionTime}
                    onChange={(e) => handleNewFormChange('newSessionTime', e.target.value)}
                    $error={!newFormValidation.isValid && !!newFormValidation.errors.time}
                  />
                  {!newFormValidation.isValid && newFormValidation.errors.time && (
                    <FieldError>{newFormValidation.errors.time}</FieldError>
                  )}
                </FieldWrapper>
              </FormCell>

              {/* Duration and Location */}
              <FormCell>
                <FieldWrapper>
                  <FieldLabel>Duration (min)</FieldLabel>
                  <StyledInput
                    type="number"
                    value={newForm.newSessionDuration}
                    onChange={(e) => handleNewFormChange('newSessionDuration', parseInt(e.target.value, 10) || DEFAULT_SESSION_DURATION)}
                    min={15}
                    max={240}
                    step={15}
                  />
                </FieldWrapper>
              </FormCell>

              <FormCell>
                <FieldWrapper>
                  <FieldLabel>Location</FieldLabel>
                  <StyledInput
                    type="text"
                    value={newForm.newSessionLocation}
                    onChange={(e) => handleNewFormChange('newSessionLocation', e.target.value)}
                    placeholder="e.g., Main Studio"
                  />
                </FieldWrapper>
              </FormCell>

              {/* Notes */}
              <FormCell $fullWidth>
                <FieldWrapper>
                  <FieldLabel>Notes (Optional)</FieldLabel>
                  <StyledTextarea
                    value={newForm.newSessionNotes}
                    onChange={(e) => handleNewFormChange('newSessionNotes', e.target.value)}
                    placeholder="e.g., Open slot for new clients, Focus on beginners"
                    rows={3}
                  />
                </FieldWrapper>
              </FormCell>
            </FormGrid>
          </DialogBody>
          <DialogFooter>
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
          </DialogFooter>
        </DialogPanel>
      </DialogOverlay>
    </>
  );
};

// ===== PERFORMANCE OPTIMIZATION =====

export default memo(AdminSessionsDialogs);
