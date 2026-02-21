import React, { useEffect, useRef, useState, useMemo } from 'react';
import styled from 'styled-components';
import { Save, Trash2 } from 'lucide-react';
import RecurringSessionModal from '../RecurringSessionModal';
import BlockedTimeModal from '../BlockedTimeModal';
import NotificationPreferencesModal from '../NotificationPreferencesModal';
import SessionDetailModal from '../SessionDetailModal';
import RecurringSeriesModal from '../RecurringSeriesModal';
import ClientRecurringBookingModal from '../ClientRecurringBookingModal';
import AvailabilityEditor from '../Availability/AvailabilityEditor';
import AvailabilityOverrideModal from '../Availability/AvailabilityOverrideModal';
import ApplyPaymentModal from '../ApplyPaymentModal';
import ConflictPanel from '../Conflicts/ConflictPanel';
import useSessionTypes from '../hooks/useSessionTypes';
import {
  Modal,
  OutlinedButton,
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
  ErrorText,
  TimeWheelPicker,
  combineDateAndTime,
  getLocalToday,
  getMinTimeForToday,
  getTimezoneAbbr,
} from '../ui';
import GlowButton from '../../ui/buttons/GlowButton';
import SearchableSelect from '../ui/SearchableSelect';

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
  showClientRecurringDialog: boolean;
  setShowClientRecurringDialog: (show: boolean) => void;

  formData: any;
  setFormData: (data: any) => void;
  dbTrainers: any[];
  dbClients: any[];
  useManualClient: boolean;
  setUseManualClient: (use: boolean) => void;
  templates: Array<{
    id: string;
    name: string;
    duration: number;
    location: string;
    notes?: string;
    sessionTypeId?: number;
    trainerId?: number;
    bufferBefore?: number;
    bufferAfter?: number;
    isDefault?: boolean;
  }>;
  selectedTemplateId: string;
  onTemplateChange: (templateId: string) => void;
  onSaveTemplate: (name: string) => void;
  onDeleteTemplate: (id: string) => void;
  isSlotSelected: boolean;
  
  bookingTarget: any;
  bookingLoading: boolean;
  bookingError: string | null;
  creditsDisplay: string | number;
  sessionsRemaining: number | undefined;
  availableSessions: any[];
  
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
  showClientRecurringDialog,
  setShowClientRecurringDialog,

  formData,
  setFormData,
  dbTrainers,
  dbClients,
  useManualClient,
  setUseManualClient,
  templates,
  selectedTemplateId,
  onTemplateChange,
  onSaveTemplate,
  onDeleteTemplate,
  isSlotSelected,
  
  bookingTarget,
  bookingLoading,
  bookingError,
  creditsDisplay,
  sessionsRemaining,
  availableSessions,

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
    { value: 'Online', label: 'Online Session' },
    { value: '__custom__', label: 'Other (Custom)' }
  ];
  const [customLocation, setCustomLocation] = useState('');

  const [showTemplateNameInput, setShowTemplateNameInput] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateError, setTemplateError] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);
  const {
    sessionTypes,
    loading: sessionTypesLoading,
    error: sessionTypesError,
    fetchSessionTypes
  } = useSessionTypes();

  // Split date/time state for TimeWheelPicker integration
  const [sessionDateStr, setSessionDateStr] = useState('');
  const [sessionTimeStr, setSessionTimeStr] = useState('');
  const frozenNowRef = useRef(Date.now());

  // Sync from formData.sessionDate → split state (when opening or slot-select fills it)
  useEffect(() => {
    const sd = formData.sessionDate || '';
    if (sd.includes('T')) {
      const [d, t] = sd.split('T');
      setSessionDateStr(d || '');
      setSessionTimeStr((t || '').slice(0, 5)); // "HH:mm"
    } else if (sd) {
      setSessionDateStr(sd);
      setSessionTimeStr('');
    }
  }, [formData.sessionDate]);

  // Recompute frozenNow when date changes
  useEffect(() => {
    frozenNowRef.current = Date.now();
  }, [sessionDateStr]);

  // Compute minTime for today
  const isToday = sessionDateStr === getLocalToday();
  const computedMinTime = useMemo(() => {
    if (!isToday) return undefined;
    return getMinTimeForToday(15, frozenNowRef.current);
  }, [isToday]);

  // Sync split state → formData.sessionDate
  const handleDateChange = (date: string) => {
    setSessionDateStr(date);
    if (date && sessionTimeStr) {
      setFormData({ ...formData, sessionDate: combineDateAndTime(date, sessionTimeStr) });
    } else if (date) {
      setFormData({ ...formData, sessionDate: date });
    }
  };

  const handleTimeChange = (time: string) => {
    setSessionTimeStr(time);
    if (sessionDateStr && time) {
      setFormData({ ...formData, sessionDate: combineDateAndTime(sessionDateStr, time) });
    }
  };

  useEffect(() => {
    if (showTemplateNameInput) {
      templateInputRef.current?.focus();
    }
  }, [showTemplateNameInput]);

  useEffect(() => {
    if (!showCreateDialog) {
      setShowTemplateNameInput(false);
      setTemplateName('');
      setTemplateError('');
      setPendingDeleteId(null);
      setSessionDateStr('');
      setSessionTimeStr('');
    }
  }, [showCreateDialog]);

  useEffect(() => {
    if (showCreateDialog) {
      fetchSessionTypes().catch(() => undefined);
    }
  }, [showCreateDialog, fetchSessionTypes]);

  const selectedSessionType = sessionTypes.find(
    (type) => String(type.id) === String(formData.sessionTypeId)
  );
  const effectiveBlock = (() => {
    if (!formData.sessionDate) return null;
    const start = new Date(formData.sessionDate);
    if (Number.isNaN(start.getTime())) return null;
    const bufferBefore = Number(formData.bufferBefore || 0);
    const bufferAfter = Number(formData.bufferAfter || 0);
    const duration = Number(formData.duration || 0);
    const effectiveStart = new Date(start.getTime() - bufferBefore * 60000);
    const effectiveEnd = new Date(start.getTime() + (duration + bufferAfter) * 60000);
    return {
      start: effectiveStart,
      end: effectiveEnd
    };
  })();

  const handleSaveTemplateClick = () => {
    if (!showTemplateNameInput) {
      setShowTemplateNameInput(true);
      setTemplateError('');
      return;
    }

    const trimmed = templateName.trim();
    if (trimmed.length < 2 || trimmed.length > 50) {
      setTemplateError('Name must be 2-50 characters.');
      return;
    }
    const exists = templates.some(
      (template) => template.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setTemplateError('Template name already exists.');
      return;
    }

    onSaveTemplate(trimmed);
    setTemplateName('');
    setTemplateError('');
    setShowTemplateNameInput(false);
  };

  const handleTemplateKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSaveTemplateClick();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setShowTemplateNameInput(false);
      setTemplateName('');
      setTemplateError('');
    }
  };

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
              <GlowButton
                variant="primary"
                size="medium"
                onClick={handleCreateSession}
                leftIcon={<Save size={18} />}
              >
                Create Session
              </GlowButton>
            </>
          }
        >
          <FlexBox direction="column" gap="1.5rem">
            {/* Template controls hidden — not useful for current workflow */}

            <FormField>
              <Label htmlFor="sessionDate" required>Session Date & Time</Label>
              {isSlotSelected ? (
                <BodyText style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {formData.sessionDate ? new Date(formData.sessionDate).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No date selected'}
                </BodyText>
              ) : (
                <FlexBox gap="0.75rem" style={{ flexDirection: 'column' }}>
                  <StyledInput
                    id="sessionDate"
                    type="date"
                    value={sessionDateStr}
                    onChange={(e) => handleDateChange(e.target.value)}
                  />
                  <TimeWheelPicker
                    value={sessionTimeStr}
                    onChange={handleTimeChange}
                    minTime={computedMinTime}
                    step={15}
                    disabled={!sessionDateStr}
                    label="Session Time"
                    timezone={getTimezoneAbbr()}
                    data-testid="session-time-picker"
                  />
                  {computedMinTime === null && isToday && (
                    <HelperText style={{ color: '#f59e0b' }}>
                      No times available today. Select a future date.
                    </HelperText>
                  )}
                </FlexBox>
              )}
              {effectiveBlock && (
                <HelperText>
                  Effective block: {effectiveBlock.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {effectiveBlock.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </HelperText>
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
              {!useManualClient ? (
                <>
                  <SearchableSelect
                    label="Client"
                    placeholder="Search clients by name..."
                    value={formData.clientId?.toString() || ''}
                    onChange={(value) => {
                      setFormData({ ...formData, clientId: value ? Number(value) : undefined, manualClientName: '' });
                    }}
                    options={
                      (dbClients || []).map((c: any) => ({
                        value: (c.id || c.userId || c._id)?.toString(),
                        label: `${c.firstName || c.first_name || ''} ${c.lastName || c.last_name || ''}`.trim() || c.email || 'Unknown Client',
                        subLabel: c.availableSessions != null ? `${c.availableSessions} sessions remaining` : undefined,
                      }))
                    }
                  />
                  {dbClients.length === 0 && (
                    <HelperText>No clients found in system.</HelperText>
                  )}
                  <ManualEntryLink
                    type="button"
                    onClick={() => {
                      setUseManualClient(true);
                      setFormData({ ...formData, clientId: undefined });
                    }}
                  >
                    or enter client name manually
                  </ManualEntryLink>
                </>
              ) : (
                <>
                  <StyledInput
                    id="manualClientName"
                    type="text"
                    value={formData.manualClientName || ''}
                    onChange={(e) => setFormData({ ...formData, manualClientName: e.target.value, clientId: undefined })}
                    placeholder="Enter client name..."
                  />
                  <ManualEntryLink
                    type="button"
                    onClick={() => {
                      setUseManualClient(false);
                      setFormData({ ...formData, manualClientName: '' });
                    }}
                  >
                    or select from client list
                  </ManualEntryLink>
                </>
              )}
            </FormField>

            <FormField>
              <Label htmlFor="sessionType">Session Type</Label>
              <CustomSelect
                value={formData.sessionTypeId?.toString() || ''}
                onChange={(value) => {
                  const selected = sessionTypes.find((type) => String(type.id) === String(value));
                  setFormData({
                    ...formData,
                    sessionTypeId: value ? Number(value) : undefined,
                    duration: selected?.duration ?? formData.duration,
                    bufferBefore: selected?.bufferBefore ?? 0,
                    bufferAfter: selected?.bufferAfter ?? 0
                  });
                }}
                options={[
                  { value: '', label: sessionTypesLoading ? 'Loading session types...' : '-- Select Session Type --' },
                  ...sessionTypes.map((type) => ({
                    value: type.id.toString(),
                    label: `${type.name} (${type.duration} min)`
                  }))
                ]}
                aria-label="Session type"
              />
              {sessionTypesError && (
                <HelperText style={{ color: '#ef4444' }}>{sessionTypesError}</HelperText>
              )}
              {selectedSessionType && (
                <HelperText>
                  Duration: {selectedSessionType.duration} min | Buffer: {selectedSessionType.bufferBefore} min before, {selectedSessionType.bufferAfter} min after
                </HelperText>
              )}
            </FormField>

            <FormField>
              <Label htmlFor="location" required>Location</Label>
              <CustomSelect
                value={customLocation ? '__custom__' : formData.location}
                onChange={(value) => {
                  if (value === '__custom__') {
                    setCustomLocation(' '); // trigger custom mode
                    setFormData({ ...formData, location: '' });
                  } else {
                    setCustomLocation('');
                    setFormData({ ...formData, location: value as string });
                  }
                }}
                options={locationOptions}
                aria-label="Session location"
              />
              {customLocation && (
                <StyledInput
                  id="customLocation"
                  type="text"
                  value={customLocation.trim()}
                  onChange={(e) => {
                    setCustomLocation(e.target.value || ' ');
                    setFormData({ ...formData, location: e.target.value.trim() });
                  }}
                  placeholder="Enter custom location..."
                  style={{ marginTop: '0.5rem' }}
                  autoFocus
                />
              )}
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
              <GlowButton
                variant="emerald"
                size="medium"
                onClick={handleBookSession}
                disabled={bookingLoading}
                isLoading={bookingLoading}
              >
                {bookingLoading ? 'Booking...' : 'Confirm Booking'}
              </GlowButton>
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

      {mode === 'client' && (
        <ClientRecurringBookingModal
          open={showClientRecurringDialog}
          onClose={() => setShowClientRecurringDialog(false)}
          onSuccess={fetchSessions}
          availableSessions={availableSessions}
          userCredits={sessionsRemaining || 0}
        />
      )}

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

const DeleteButton = styled.button`
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 0.2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #ef4444;
  }
`;

const InlineConfirm = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.7rem;
`;

const ConfirmText = styled.span`
  color: rgba(255, 255, 255, 0.7);
`;

const ConfirmButton = styled.button`
  border: none;
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  border-radius: 6px;
  padding: 0.1rem 0.4rem;
  cursor: pointer;
  font-size: 0.65rem;
  font-weight: 600;
`;

const CancelButton = styled.button`
  border: none;
  background: rgba(148, 163, 184, 0.2);
  color: #94a3b8;
  border-radius: 6px;
  padding: 0.1rem 0.4rem;
  cursor: pointer;
  font-size: 0.65rem;
  font-weight: 600;
`;

const ManualEntryLink = styled.button`
  background: none;
  border: none;
  color: rgba(0, 255, 255, 0.7);
  font-size: 0.75rem;
  padding: 0.25rem 0;
  cursor: pointer;
  text-align: left;
  transition: color 0.15s ease;
  min-height: 44px;
  display: flex;
  align-items: center;

  &:hover {
    color: rgba(0, 255, 255, 1);
    text-decoration: underline;
  }
`;
