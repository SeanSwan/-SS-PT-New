import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Trash2, Lock, ShoppingCart } from 'lucide-react';
import RecurringSessionModal from '../RecurringSessionModal';
import BlockedTimeModal from '../BlockedTimeModal';
import NotificationPreferencesModal from '../NotificationPreferencesModal';
import SessionDetailModal from '../SessionDetailModal';
import SessionEditModal from '../SessionEditModal';
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
import {
  getClientSessionSignal,
  isNonDeductingClientSource,
  normalizeAvailableSessions,
} from '../../DashBoard/workspaces/clients-team/clientSessionSignal';
import SearchableSelect from '../ui/SearchableSelect';
import { normalizeScheduleOptionalId } from '../UniversalMasterSchedule.logic';
import {
  SESSION_DURATION_OPTIONS,
  SESSION_LOCATION_OPTIONS,
} from '../utils/sessionOptions';
import { SCHEDULE_MODALS_THEME } from './ScheduleModals.theme';
import {
  BookingCard,
  BookingRow,
  CancelButton,
  ConfirmButton,
  ConfirmText,
  CreditCard,
  DeleteButton,
  InlineConfirm,
  LockDescription,
  LockIconWrapper,
  LockTitle,
  ManualEntryLink,
  PremiumLockOverlay,
  PurchaseButton,
} from './ScheduleModals.styles';

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
  sessionsRemaining: number | string | null | undefined;
  clientSource?: string | null;
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
  clientSource,
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
  const navigate = useNavigate();
  const [preselectedPaymentClientId, setPreselectedPaymentClientId] = useState<number | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const normalizedSessionsRemaining = sessionsRemaining == null
    ? undefined
    : normalizeAvailableSessions(sessionsRemaining);
  const hasNoCredits = normalizedSessionsRemaining != null && normalizedSessionsRemaining <= 0;
  const isFreeTrackingBooking = mode === 'client' && isNonDeductingClientSource(clientSource);
  const isPaidCreditLocked = mode === 'client' && !isFreeTrackingBooking && hasNoCredits;
  const isBookingLocked = isFreeTrackingBooking || isPaidCreditLocked;

  const locationOptions = [...SESSION_LOCATION_OPTIONS];
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
                {isSlotSelected && (
                  <HelperText>
                    Slot prefilled from the calendar. Adjust date or time here before saving.
                  </HelperText>
                )}
                {computedMinTime === null && isToday && (
                  <HelperText style={{ color: SCHEDULE_MODALS_THEME.warning }}>
                    No times available today. Select a future date.
                  </HelperText>
                )}
              </FlexBox>
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
                onChange={(value) => {
                  const nextTrainerId = normalizeScheduleOptionalId(value);
                  setFormData({ ...formData, trainerId: nextTrainerId ?? undefined });
                }}
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
                      const nextClientId = normalizeScheduleOptionalId(value);
                      setFormData({ ...formData, clientId: nextClientId ?? undefined, manualClientName: '' });
                    }}
                    options={
                      (dbClients || []).map((c: any) => {
                        const sessionSignal = getClientSessionSignal(c);
                        return {
                          value: (c.id || c.userId || c._id)?.toString(),
                          label: `${c.firstName || c.first_name || ''} ${c.lastName || c.last_name || ''}`.trim() || c.email || 'Unknown Client',
                          subLabel: `${sessionSignal.label} - ${sessionSignal.note}`,
                        };
                      })
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
                  const nextSessionTypeId = normalizeScheduleOptionalId(value);
                  setFormData({
                    ...formData,
                    sessionTypeId: nextSessionTypeId ?? undefined,
                    duration: selected?.duration ?? formData.duration,
                    bufferBefore: selected?.bufferBefore ?? 0,
                    bufferAfter: selected?.bufferAfter ?? 0
                  });
                }}
                options={[
                  { value: '', label: sessionTypesLoading ? 'Loading session types...' : '-- Select Session Type --' },
                  ...sessionTypes.map((type) => ({
                    value: type.id.toString(),
                    label: type.name
                  }))
                ]}
                aria-label="Session type"
              />
              {sessionTypesError && (
                <HelperText style={{ color: SCHEDULE_MODALS_THEME.danger }}>{sessionTypesError}</HelperText>
              )}
              {selectedSessionType && (
                <HelperText>
                  Duration: {selectedSessionType.duration} min | Buffer: {selectedSessionType.bufferBefore} min before, {selectedSessionType.bufferAfter} min after
                </HelperText>
              )}
            </FormField>

            <FormField>
              <Label htmlFor="duration">Duration</Label>
              <CustomSelect
                value={String(formData.duration || 60)}
                onChange={(value) => setFormData({ ...formData, duration: Number(value) })}
                options={[...SESSION_DURATION_OPTIONS]}
                aria-label="Session duration"
              />
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
          title={isBookingLocked ? (isFreeTrackingBooking ? 'Session Tracking Only' : 'Session Locked') : 'Confirm Booking'}
          size="sm"
          footer={
            isBookingLocked ? (
              <OutlinedButton onClick={() => setShowBookingDialog(false)}>
                Close
              </OutlinedButton>
            ) : (
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
            )
          }
        >
          <FlexBox direction="column" gap="1rem">
            {isBookingLocked ? (
              /* Premium Lock State — Gemini 3.1 Pro Design Spec */
              <PremiumLockOverlay>
                <LockIconWrapper>
                  <Lock size={28} color={SCHEDULE_MODALS_THEME.accentSecondary} />
                </LockIconWrapper>
                <LockTitle>{isFreeTrackingBooking ? 'Session Tracking Only' : 'Unlock Sessions'}</LockTitle>
                <LockDescription>
                  {isFreeTrackingBooking
                    ? 'This account is tracked through Workout Logger. SwanStudios booking credits do not apply.'
                    : 'You have no paid session credits remaining. Purchase a package to book this session.'}
                </LockDescription>
                <BookingCard>
                  <BookingRow>
                    <SmallText secondary>Date</SmallText>
                    <BodyText>{new Date(bookingTarget.sessionDate).toLocaleDateString()}</BodyText>
                  </BookingRow>
                  <BookingRow>
                    <SmallText secondary>Time</SmallText>
                    <BodyText>{new Date(bookingTarget.sessionDate).toLocaleTimeString()}</BodyText>
                  </BookingRow>
                </BookingCard>
                {!isFreeTrackingBooking && (
                  <PurchaseButton onClick={() => { setShowBookingDialog(false); navigate('/shop'); }}>
                    <ShoppingCart size={18} />
                    Secure Your Session
                  </PurchaseButton>
                )}
              </PremiumLockOverlay>
            ) : (
              <>
                <BodyText>
                  You are booking the session below. One paid credit will be deducted on confirmation.
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
                  {normalizedSessionsRemaining != null && (
                    <HelperText>
                      After booking: {Math.max(0, normalizedSessionsRemaining - 1)}
                    </HelperText>
                  )}
                </CreditCard>
              </>
            )}
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

      {mode === 'client' && !isFreeTrackingBooking && (
        <ClientRecurringBookingModal
          open={showClientRecurringDialog}
          onClose={() => setShowClientRecurringDialog(false)}
          onSuccess={fetchSessions}
          availableSessions={availableSessions}
          userCredits={normalizedSessionsRemaining ?? 0}
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
        onEditSession={mode === 'admin' || mode === 'trainer' ? () => {
          setShowDetailDialog(false);
          setShowEditDialog(true);
        } : undefined}
        onManageSeries={openSeriesDialog}
        onApplyPayment={mode === 'admin' ? (clientId: number) => {
          setShowDetailDialog(false);
          setPreselectedPaymentClientId(clientId);
          setShowPaymentModal(true);
        } : undefined}
        seriesCount={detailSession?.recurringGroupId
          ? seriesSessions.length
          : undefined}
      />

      <SessionEditModal
        open={showEditDialog}
        session={detailSession}
        trainers={dbTrainers}
        clients={dbClients}
        onClose={() => setShowEditDialog(false)}
        onSaved={fetchSessions}
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
          onClose={() => {
            setShowPaymentModal(false);
            setPreselectedPaymentClientId(null);
          }}
          onApplied={fetchSessions}
          preselectedClientId={preselectedPaymentClientId ?? undefined}
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
