/**
 * SessionEditModal
 * ================
 * Editable detail form for scheduled session corrections from the detail modal.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import ForgeButton from '../ui/forge/ForgeButton'; // Forge strangler (was GlowButton)
import { universalMasterScheduleService } from '../../services/universal-master-schedule-service';
import {
  CheckboxWrapper,
  CustomSelect,
  FlexBox,
  FormField,
  HelperText,
  Label,
  Modal,
  OutlinedButton,
  StyledInput,
  StyledTextarea,
  TimeWheelPicker,
  combineDateAndTime,
  getTimezoneAbbr,
} from './ui';
import SearchableSelect from './ui/SearchableSelect';
import { normalizeScheduleOptionalId } from './UniversalMasterSchedule.logic';
import type { SessionDetail } from './SessionDetailModal.types';
import {
  SESSION_DURATION_OPTIONS,
  SESSION_LOCATION_OPTIONS,
} from './utils/sessionOptions';
import { StyledBox } from '@/components/ui/StyledBox';

interface SessionEditModalProps {
  open: boolean;
  session: SessionDetail | null;
  trainers: any[];
  clients: any[];
  onClose: () => void;
  onSaved: () => void;
}

const pad = (value: number) => String(value).padStart(2, '0');

const toLocalDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const toLocalTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const SessionEditModal: React.FC<SessionEditModalProps> = ({
  open,
  session,
  trainers,
  clients,
  onClose,
  onSaved,
}) => {
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState('Main Studio');
  const [customLocation, setCustomLocation] = useState('');
  const [trainerId, setTrainerId] = useState<string | number | undefined>();
  const [clientId, setClientId] = useState<string | number | undefined>();
  const [notes, setNotes] = useState('');
  const [notifyClient, setNotifyClient] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !session) return;
    setDateStr(toLocalDate(session.sessionDate));
    setTimeStr(toLocalTime(session.sessionDate));
    setDuration(Number(session.duration || 60));
    const nextLocation = session.location || 'Main Studio';
    const knownLocation = SESSION_LOCATION_OPTIONS.some((option) => option.value === nextLocation);
    setLocation(knownLocation ? nextLocation : '');
    setCustomLocation(knownLocation ? '' : nextLocation);
    setTrainerId(session.trainerId);
    setClientId(session.userId);
    setNotes(session.notes || '');
    setNotifyClient(session.notifyClient !== false);
    setFormError(null);
  }, [open, session]);

  const endPreview = useMemo(() => {
    if (!dateStr || !timeStr) return null;
    const start = new Date(combineDateAndTime(dateStr, timeStr));
    if (Number.isNaN(start.getTime())) return null;
    return new Date(start.getTime() + duration * 60000);
  }, [dateStr, duration, timeStr]);

  const handleSave = async () => {
    if (!session || !dateStr || !timeStr) {
      setFormError('Select a valid date and time.');
      return;
    }

    const nextLocation = customLocation ? customLocation.trim() : location;
    if (!nextLocation) {
      setFormError('Select or enter a location.');
      return;
    }

    const nextTrainerId = normalizeScheduleOptionalId(trainerId);
    const nextClientId = normalizeScheduleOptionalId(clientId);
    setSaving(true);
    setFormError(null);

    try {
      await universalMasterScheduleService.updateSession(String(session.id), {
        sessionDate: combineDateAndTime(dateStr, timeStr),
        duration,
        location: nextLocation,
        trainerId: nextTrainerId ?? undefined,
        userId: nextClientId ?? undefined,
        notes,
        notifyClient,
      } as any);
      onSaved();
      onClose();
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Unable to update session.';
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  if (!session) return null;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Edit Session"
      size="md"
      footer={(
        <>
          <OutlinedButton onClick={onClose} disabled={saving}>Cancel</OutlinedButton>
          <ForgeButton
            variant="primary"
            size="medium"
            onClick={handleSave}
            disabled={saving}
            isLoading={saving}
            leftIcon={<Save size={18} />}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </ForgeButton>
        </>
      )}
    >
      <FlexBox direction="column" gap="1.25rem">
        <FormField>
          <Label required>Date & Time</Label>
          <StyledInput type="date" value={dateStr} onChange={(event) => setDateStr(event.target.value)} />
          <TimeWheelPicker
            value={timeStr}
            onChange={setTimeStr}
            step={15}
            label="Session Time"
            timezone={getTimezoneAbbr()}
            data-testid="edit-session-time-picker"
          />
          {endPreview && (
            <HelperText>
              Ends at {endPreview.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </HelperText>
          )}
        </FormField>

        <FormField>
          <Label>Duration</Label>
          <CustomSelect
            value={String(duration)}
            onChange={(value) => setDuration(Number(value))}
            options={[...SESSION_DURATION_OPTIONS]}
            aria-label="Edit session duration"
          />
        </FormField>

        <FormField>
          <Label>Location</Label>
          <CustomSelect
            value={customLocation ? '__custom__' : location}
            onChange={(value) => {
              if (value === '__custom__') {
                setCustomLocation('');
                setLocation('');
                return;
              }
              setCustomLocation('');
              setLocation(String(value));
            }}
            options={[...SESSION_LOCATION_OPTIONS]}
            aria-label="Edit session location"
          />
          {customLocation !== '' && (
            <StyledBox as={StyledInput}
              type="text"
              value={customLocation}
              onChange={(event) => setCustomLocation(event.target.value)}
              placeholder="Enter custom location..."
              $style={{ marginTop: '0.5rem' }}
            />
          )}
        </FormField>

        <FormField>
          <Label>Trainer</Label>
          <CustomSelect
            value={trainerId?.toString() || ''}
            onChange={(value) => setTrainerId(normalizeScheduleOptionalId(value) ?? undefined)}
            options={[
              { value: '', label: '-- Select Trainer --' },
              ...trainers.map((trainer: any) => ({
                value: (trainer.id || trainer.userId || trainer._id)?.toString(),
                label: trainer.name || `${trainer.firstName || trainer.first_name || 'Unknown'} ${trainer.lastName || trainer.last_name || 'Trainer'}`.trim(),
              })),
            ]}
            aria-label="Edit session trainer"
          />
        </FormField>

        <FormField>
          <Label>Client</Label>
          <SearchableSelect
            label="Client"
            placeholder="Search clients by name..."
            value={clientId?.toString() || ''}
            onChange={(value) => setClientId(normalizeScheduleOptionalId(value) ?? undefined)}
            options={(clients || []).map((client: any) => ({
              value: (client.id || client.userId || client._id)?.toString(),
              label: `${client.firstName || client.first_name || ''} ${client.lastName || client.last_name || ''}`.trim() || client.email || 'Unknown Client',
            }))}
          />
        </FormField>

        <FormField>
          <Label>Notes</Label>
          <StyledTextarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
        </FormField>

        <FormField>
          <CheckboxWrapper>
            <input
              type="checkbox"
              checked={notifyClient}
              onChange={(event) => setNotifyClient(event.target.checked)}
            />
            <span>Notify client about this update</span>
          </CheckboxWrapper>
        </FormField>

        {formError && <StyledBox as={HelperText} $style={{ color: '#ef4444' }}>{formError}</StyledBox>} {/* swan-guard-allow-hex pre-existing legacy literal, untouched by the Forge strangler; token migration is its own backlog slice (ticket SWA-206; expires 2026-11-23) */}
      </FlexBox>
    </Modal>
  );
};

export default SessionEditModal;
