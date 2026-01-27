import React from 'react';
import styled from 'styled-components';
import { Save } from 'lucide-react';
import RecurringSessionModal from '../RecurringSessionModal';
import BlockedTimeModal from '../BlockedTimeModal';
import NotificationPreferencesModal from '../NotificationPreferencesModal';
import SessionDetailModal from '../SessionDetailModal';
import RecurringSeriesModal from '../RecurringSeriesModal';
import AvailabilityEditor from '../Availability/AvailabilityEditor';
import AvailabilityOverrideModal from '../Availability/AvailabilityOverrideModal';
import ApplyPaymentModal from '../ApplyPaymentModal';
import ConflictPanel from '../Conflicts/ConflictPanel';
import {
  Modal,
  OutlinedButton,
  PrimaryButton,
  FlexBox,
  FormField,
  Label,
  BodyText,
  StyledInput,
  CustomSelect,
  CheckboxWrapper,
  HelperText,
  StyledTextarea,
  SmallText,
  PrimaryHeading,
  ErrorText
} from '../ui';

interface ScheduleModalsProps {
  mode: 'admin' | 'trainer' | 'client';
  showCreateDialog: boolean;
  setShowCreateDialog: (show: boolean) => void;
  showRecurringDialog: boolean;
  setShowRecurringDialog: (show: boolean) => void;
  showBlockedDialog: boolean;
  setShowBlockedDialog: (show: boolean) => void;
  showNotificationDialog: boolean;
  setShowNotificationDialog: (show: boolean) => void;
  showBookingDialog: boolean;
  setShowBookingDialog: (show: boolean) => void;
  showDetailDialog: boolean;
  setShowDetailDialog: (show: boolean) => void;
  showSeriesDialog: boolean;
  setShowSeriesDialog: (show: boolean) => void;
  showAvailabilityEditor: boolean;
  setShowAvailabilityEditor: (show: boolean) => void;
  showOverrideModal: boolean;
  setShowOverrideModal: (show: boolean) => void;
  showPaymentModal: boolean;
  setShowPaymentModal: (show: boolean) => void;
  conflictModalOpen: boolean;
  setConflictModalOpen: (show: boolean) => void;
  
  formData: any;
  setFormData: (data: any) => void;
  dbTrainers: any[];
  dbClients: any[];
  useManualClient: boolean;
  setUseManualClient: (use: boolean) => void;
  isSlotSelected: boolean;
  
  bookingTarget: any;
  bookingLoading: boolean;
  bookingError: string | null;
  creditsDisplay: string | number;
  sessionsRemaining: number | undefined;
  
  detailSession: any;
  activeSeriesGroupId: string | null;
  seriesSessions: any[];
  availabilityTrainerId: number | string | null;
  
  conflicts: any[];
  setConflicts: (conflicts: any[]) => void;
  alternatives: any[];
  canOverrideConflicts: boolean;
  
  handleCreateSession: () => Promise<void>;
  handleBookSession: () => Promise<void>;
  handleConflictAlternative: (alt: any) => void;
  handleConflictOverride: () => void;
  fetchSessions: () => Promise<void>;
  openSeriesDialog: (groupId: string) => void;
}

const ScheduleModals: React.FC<ScheduleModalsProps> = ({
  mode,
  showCreateDialog,
  setShowCreateDialog,
  showRecurringDialog,
  setShowRecurringDialog,
  showBlockedDialog,
  setShowBlockedDialog,
  showNotificationDialog,
  setShowNotificationDialog,
  showBookingDialog,
  setShowBookingDialog,
  showDetailDialog,
  setShowDetailDialog,
  showSeriesDialog,
  setShowSeriesDialog,
  showAvailabilityEditor,
  setShowAvailabilityEditor,
  showOverrideModal,
  setShowOverrideModal,
  showPaymentModal,
  setShowPaymentModal,
  conflictModalOpen,
  setConflictModalOpen,
  
  formData,
  setFormData,
  dbTrainers,
  dbClients,
  useManualClient,
  setUseManualClient,
  isSlotSelected,
  
  bookingTarget,
  bookingLoading,
  bookingError,
  creditsDisplay,
  sessionsRemaining,
  
  detailSession,
  activeSeriesGroupId,
  seriesSessions,
  availabilityTrainerId,
  
  conflicts,
  setConflicts,
  alternatives,
  canOverrideConflicts,
  
  handleCreateSession,
  handleBookSession,
  handleConflictAlternative,
  handleConflictOverride,
  fetchSessions,
  openSeriesDialog
}) => {
  const locationOptions = [
    { value: 'Main Studio', label: 'Main Studio' },
    { value: 'Gym Floor', label: 'Gym Floor' },
    { value: 'Private Room', label: 'Private Room' },
    { value: 'Online', label: 'Online Session' }
  ];

  return (
    <>
      {/* Create Session Modal */}
      {showCreateDialog && (
        <Modal
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          title="Create New Session"
          size="md"
          footer={
            <>
              <OutlinedButton onClick={() => setShowCreateDialog(false)}>
                Cancel
              </OutlinedButton>
              <PrimaryButton onClick={handleCreateSession}>
                <Save size={18} />
                Create Session
              </PrimaryButton>
            </>
          }
        >
          <FlexBox direction="column" gap="1.5rem">
            <FormField>
              <Label htmlFor="sessionDate" required>Session Date & Time</Label>
              {isSlotSelected ? (
                <BodyText style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {formData.sessionDate ? new Date(formData.sessionDate).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No date selected'}
                </BodyText>
              ) : (
                <StyledInput
                  id="sessionDate"
                  type="datetime-local"
                  value={formData.sessionDate}
                  onChange={(e) => setFormData({ ...formData, sessionDate: e.target.value })}
                />
              )}
            </FormField>

            <FormField>
              <Label htmlFor="trainerId">Assign Trainer</Label>
              <CustomSelect
                value={formData.trainerId?.toString() || ''}
                onChange={(value) => setFormData({ ...formData, trainerId: value ? Number(value) : undefined })}
                options={[
                  { value: '', label: '-- Select Trainer --' },
                  ...dbTrainers.map((t: any) => ({
                    value: (t.id || t.userId || t._id)?.toString(),
                    label: t.name || `${t.firstName || t.first_name || 'Unknown'} ${t.lastName || t.last_name || 'Trainer'}`.trim()
                  }))
                ]}
                aria-label="Select trainer"
              />
            </FormField>

            <FormField>
              <Label>Client</Label>
              <CheckboxWrapper style={{ marginBottom: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={useManualClient}
                  onChange={(e) => setUseManualClient(e.target.checked)}
                />
                <span>Enter client name manually</span>
              </CheckboxWrapper>
              {useManualClient ? (
                <StyledInput
                  id="manualClientName"
                  type="text"
                  value={formData.manualClientName || ''}
                  onChange={(e) => setFormData({ ...formData, manualClientName: e.target.value })}
                  placeholder="Enter client name..."
                />
              ) : (
                <CustomSelect
                  value={formData.clientId?.toString() || ''}
                  onChange={(value) => setFormData({ ...formData, clientId: value ? Number(value) : undefined })}
                  options={[
                    { value: '', label: '-- Select Client --' },
                    ...dbClients.map((c: any) => ({
                      value: (c.id || c.userId || c._id)?.toString(),
                      label: c.name || `${c.firstName || c.first_name || ''} ${c.lastName || c.last_name || ''}`.trim() || c.email || 'Unknown Client'
                    }))
                  ]}
                  aria-label="Select client"
                />
              )}
              {dbClients.length === 0 && !useManualClient && (
                <HelperText>No clients found. Check the toggle to enter manually.</HelperText>
              )}
            </FormField>

            <FormField>
              <Label htmlFor="duration" required>Duration (minutes)</Label>
              <CustomSelect
                value={formData.duration.toString()}
                onChange={(value) => setFormData({ ...formData, duration: Number(value) })}
                options={[
                  { value: '30', label: '30 minutes' },
                  { value: '60', label: '60 minutes' },
                  { value: '90', label: '90 minutes' },
                  { value: '120', label: '120 minutes' },
                ]}
                aria-label="Session duration"
              />
            </FormField>

            <FormField>
              <Label htmlFor="location" required>Location</Label>
              <CustomSelect
                value={formData.location}
                onChange={(value) => setFormData({ ...formData, location: value as string })}
                options={locationOptions}
                aria-label="Session location"
              />
            </FormField>

            <FormField>
              <Label htmlFor="notes">Notes</Label>
              <StyledTextarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any additional notes..."
                rows={3}
              />
            </FormField>

            <FormField>
              <CheckboxWrapper>
                <input
                  type="checkbox"
                  checked={formData.notifyClient}
                  onChange={(e) => setFormData({ ...formData, notifyClient: e.target.checked })}
                />
                <span>Notify client about this session</span>
              </CheckboxWrapper>
            </FormField>
          </FlexBox>
        </Modal>
      )}

      {showBookingDialog && bookingTarget && (
        <Modal
          isOpen={showBookingDialog}
          onClose={() => setShowBookingDialog(false)}
          title="Confirm Booking"
          size="sm"
          footer={
            <>
              <OutlinedButton onClick={() => setShowBookingDialog(false)} disabled={bookingLoading}>
                Cancel
              </OutlinedButton>
              <PrimaryButton onClick={handleBookSession} disabled={bookingLoading}>
                {bookingLoading ? 'Booking...' : 'Confirm Booking'}
              </PrimaryButton>
            </>
          }
        >
          <FlexBox direction="column" gap="1rem">
            <BodyText>
              You are booking the session below. One credit will be deducted on confirmation.
            </BodyText>
            <BookingCard>
              <BookingRow>
                <SmallText secondary>Date</SmallText>
                <BodyText>{new Date(bookingTarget.sessionDate).toLocaleDateString()}</BodyText>
              </BookingRow>
              <BookingRow>
                <SmallText secondary>Time</SmallText>
                <BodyText>{new Date(bookingTarget.sessionDate).toLocaleTimeString()}</BodyText>
              </BookingRow>
              <BookingRow>
                <SmallText secondary>Duration</SmallText>
                <BodyText>{bookingTarget.duration} min</BodyText>
              </BookingRow>
              <BookingRow>
                <SmallText secondary>Location</SmallText>
                <BodyText>{bookingTarget.location || 'Main Studio'}</BodyText>
              </BookingRow>
            </BookingCard>
            <CreditCard>
              <SmallText secondary>Credits Remaining</SmallText>
              <PrimaryHeading style={{ fontSize: '1.75rem' }}>
                {creditsDisplay}
              </PrimaryHeading>
              {typeof sessionsRemaining === 'number' && (
                <HelperText>
                  After booking: {Math.max(0, sessionsRemaining - 1)}
                </HelperText>
              )}
            </CreditCard>
            {bookingError && <ErrorText>{bookingError}</ErrorText>}
          </FlexBox>
        </Modal>
      )}

      <RecurringSessionModal
        open={showRecurringDialog}
        onClose={() => setShowRecurringDialog(false)}
        onSuccess={fetchSessions}
      />

      <BlockedTimeModal
        open={showBlockedDialog}
        onClose={() => setShowBlockedDialog(false)}
        onSuccess={fetchSessions}
      />

      <NotificationPreferencesModal
        open={showNotificationDialog}
        onClose={() => setShowNotificationDialog(false)}
        onSuccess={() => undefined}
      />

      <SessionDetailModal
        session={detailSession}
        open={showDetailDialog}
        mode={mode}
        onClose={() => setShowDetailDialog(false)}
        onUpdated={fetchSessions}
        onManageSeries={openSeriesDialog}
        seriesCount={detailSession?.recurringGroupId
          ? seriesSessions.length
          : undefined}
      />

      <RecurringSeriesModal
        groupId={activeSeriesGroupId}
        open={showSeriesDialog}
        onClose={() => setShowSeriesDialog(false)}
        onSuccess={fetchSessions}
        seriesSessions={seriesSessions}
      />

      {showAvailabilityEditor && availabilityTrainerId && (
        <Modal isOpen={showAvailabilityEditor} onClose={() => setShowAvailabilityEditor(false)} title="Manage Availability" size="lg">
          <AvailabilityEditor
            trainerId={availabilityTrainerId}
            onClose={() => setShowAvailabilityEditor(false)}
            onSaved={() => {
              setShowAvailabilityEditor(false);
              fetchSessions();
            }}
          />
        </Modal>
      )}

      {showOverrideModal && availabilityTrainerId && (
        <AvailabilityOverrideModal
          trainerId={availabilityTrainerId}
          isOpen={showOverrideModal}
          onClose={() => setShowOverrideModal(false)}
          onCreated={fetchSessions}
        />
      )}

      {mode === 'admin' && (
        <ApplyPaymentModal
          open={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onApplied={fetchSessions}
        />
      )}

      <ConflictPanel
        isOpen={conflictModalOpen}
        conflicts={conflicts}
        alternatives={alternatives}
        onSelectAlternative={handleConflictAlternative}
        onOverride={canOverrideConflicts ? handleConflictOverride : undefined}
        onClose={() => {
          setConflictModalOpen(false);
          setConflicts([]);
        }}
        canOverride={canOverrideConflicts}
      />
    </>
  );
};

export default ScheduleModals;

const BookingCard = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  @media (max-width: 480px) {
    padding: 0.75rem;
    border-radius: 8px;
    gap: 0.375rem;
  }
`;

const BookingRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
`;

const CreditCard = styled.div`
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.35);
  border-radius: 10px;
  padding: 1rem;
  text-align: center;

  @media (max-width: 480px) {
    padding: 0.75rem;
    border-radius: 8px;
  }
`;
