import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Save } from 'lucide-react';
import {
  CheckboxWrapper,
  combineDateAndTime,
  CustomSelect,
  FlexBox,
  FormField,
  getLocalToday,
  getMinTimeForToday,
  getTimezoneAbbr,
  HelperText,
  Label,
  Modal,
  OutlinedButton,
  StyledInput,
  StyledTextarea,
  TimeWheelPicker,
} from '../ui';
import ForgeButton from '../../ui/forge/ForgeButton'; // Forge strangler (was GlowButton)
import useSessionTypes from '../hooks/useSessionTypes';
import { normalizeScheduleOptionalId } from '../UniversalMasterSchedule.logic';
import {
  SESSION_DURATION_OPTIONS,
  SESSION_LOCATION_OPTIONS,
} from '../utils/sessionOptions';
import ScheduleCreateClientField from './ScheduleCreateClientField';
import { SCHEDULE_MODALS_THEME } from './ScheduleModals.theme';
import { StyledBox } from '@/components/ui/StyledBox';

interface ScheduleCreateSessionModalProps {
  showCreateDialog: boolean;
  setShowCreateDialog: (show: boolean) => void;
  formData: any;
  setFormData: (data: any) => void;
  dbTrainers: any[];
  dbClients: any[];
  useManualClient: boolean;
  setUseManualClient: (use: boolean) => void;
  isSlotSelected: boolean;
  handleCreateSession: () => Promise<void>;
}

const ScheduleCreateSessionModal: React.FC<ScheduleCreateSessionModalProps> = ({
  showCreateDialog,
  setShowCreateDialog,
  formData,
  setFormData,
  dbTrainers,
  dbClients,
  useManualClient,
  setUseManualClient,
  isSlotSelected,
  handleCreateSession,
}) => {
  const [customLocation, setCustomLocation] = useState('');
  const [sessionDateStr, setSessionDateStr] = useState('');
  const [sessionTimeStr, setSessionTimeStr] = useState('');
  const frozenNowRef = useRef(Date.now());
  const customLocationInputRef = useRef<HTMLInputElement>(null);
  const customLocationActive = Boolean(customLocation);

  useEffect(() => {
    if (!customLocationActive) return;
    const frame = window.requestAnimationFrame(() => customLocationInputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [customLocationActive]);
  const { sessionTypes, loading: sessionTypesLoading, error: sessionTypesError, fetchSessionTypes } = useSessionTypes();

  useEffect(() => {
    const sessionDate = formData.sessionDate || '';
    if (sessionDate.includes('T')) {
      const [date, time] = sessionDate.split('T');
      setSessionDateStr(date || '');
      setSessionTimeStr((time || '').slice(0, 5));
    } else if (sessionDate) {
      setSessionDateStr(sessionDate);
      setSessionTimeStr('');
    }
  }, [formData.sessionDate]);

  useEffect(() => {
    frozenNowRef.current = Date.now();
  }, [sessionDateStr]);

  useEffect(() => {
    if (!showCreateDialog) {
      setSessionDateStr('');
      setSessionTimeStr('');
    }
  }, [showCreateDialog]);

  useEffect(() => {
    if (showCreateDialog) {
      fetchSessionTypes().catch(() => undefined);
    }
  }, [showCreateDialog, fetchSessionTypes]);

  const isToday = sessionDateStr === getLocalToday();
  const computedMinTime = useMemo(() => {
    if (!isToday) return undefined;
    return getMinTimeForToday(15, frozenNowRef.current);
  }, [isToday]);

  const selectedSessionType = sessionTypes.find(
    (type) => String(type.id) === String(formData.sessionTypeId)
  );

  const effectiveBlock = useMemo(() => {
    if (!formData.sessionDate) return null;
    const start = new Date(formData.sessionDate);
    if (Number.isNaN(start.getTime())) return null;
    const bufferBefore = Number(formData.bufferBefore || 0);
    const bufferAfter = Number(formData.bufferAfter || 0);
    const duration = Number(formData.duration || 0);
    return {
      start: new Date(start.getTime() - bufferBefore * 60000),
      end: new Date(start.getTime() + (duration + bufferAfter) * 60000),
    };
  }, [formData.bufferAfter, formData.bufferBefore, formData.duration, formData.sessionDate]);

  const handleDateChange = (date: string) => {
    setSessionDateStr(date);
    setFormData({
      ...formData,
      sessionDate: date && sessionTimeStr ? combineDateAndTime(date, sessionTimeStr) : date,
    });
  };

  const handleTimeChange = (time: string) => {
    setSessionTimeStr(time);
    if (sessionDateStr && time) {
      setFormData({ ...formData, sessionDate: combineDateAndTime(sessionDateStr, time) });
    }
  };

  return (
    <Modal
      isOpen={showCreateDialog}
      onClose={() => setShowCreateDialog(false)}
      title="Create New Session"
      size="md"
      footer={(
        <>
          <OutlinedButton onClick={() => setShowCreateDialog(false)}>
            Cancel
          </OutlinedButton>
          <ForgeButton
            variant="primary"
            size="medium"
            onClick={handleCreateSession}
            leftIcon={<Save size={18} />}
          >
            Create Session
          </ForgeButton>
        </>
      )}
    >
      <FlexBox direction="column" gap="1.5rem">
        <FormField>
          <Label htmlFor="sessionDate" required>Session Date & Time</Label>
          <StyledBox as={FlexBox} gap="0.75rem" $style={{ flexDirection: 'column' }}>
            <StyledInput id="sessionDate" type="date" value={sessionDateStr} onChange={(e) => handleDateChange(e.target.value)} />
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
            {isSlotSelected && <HelperText>Slot prefilled from the calendar. Adjust date or time here before saving.</HelperText>}
            {computedMinTime === null && isToday && (
              <StyledBox as={HelperText} $style={{ color: SCHEDULE_MODALS_THEME.warning }}>
                No times available today. Select a future date.
              </StyledBox>
            )}
          </StyledBox>
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
              ...dbTrainers.map((trainer: any) => ({
                value: (trainer.id || trainer.userId || trainer._id)?.toString(),
                label: trainer.name || `${trainer.firstName || trainer.first_name || 'Unknown'} ${trainer.lastName || trainer.last_name || 'Trainer'}`.trim(),
              })),
            ]}
            aria-label="Select trainer"
          />
        </FormField>

        <ScheduleCreateClientField
          formData={formData}
          setFormData={setFormData}
          dbClients={dbClients}
          useManualClient={useManualClient}
          setUseManualClient={setUseManualClient}
        />

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
                bufferAfter: selected?.bufferAfter ?? 0,
              });
            }}
            options={[
              { value: '', label: sessionTypesLoading ? 'Loading session types...' : '-- Select Session Type --' },
              ...sessionTypes.map((type) => ({ value: type.id.toString(), label: type.name })),
            ]}
            aria-label="Session type"
          />
          {sessionTypesError && <StyledBox as={HelperText} $style={{ color: SCHEDULE_MODALS_THEME.danger }}>{sessionTypesError}</StyledBox>}
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
                setCustomLocation(' ');
                setFormData({ ...formData, location: '' });
              } else {
                setCustomLocation('');
                setFormData({ ...formData, location: value as string });
              }
            }}
            options={[...SESSION_LOCATION_OPTIONS]}
            aria-label="Session location"
          />
          {customLocationActive && (
            <StyledBox as={StyledInput}
              ref={customLocationInputRef}
              id="customLocation"
              type="text"
              value={customLocation.trim()}
              onChange={(e) => {
                setCustomLocation(e.target.value || ' ');
                setFormData({ ...formData, location: e.target.value.trim() });
              }}
              placeholder="Enter custom location..."
              $style={{ marginTop: '0.5rem' }}
            />
          )}
        </FormField>

        <FormField>
          <Label htmlFor="notes">Notes</Label>
          <StyledTextarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Add any additional notes..." rows={3} />
        </FormField>

        <FormField>
          <CheckboxWrapper>
            <input type="checkbox" checked={formData.notifyClient} onChange={(e) => setFormData({ ...formData, notifyClient: e.target.checked })} />
            <span>Notify client about this session</span>
          </CheckboxWrapper>
        </FormField>
      </FlexBox>
    </Modal>
  );
};

export default ScheduleCreateSessionModal;
