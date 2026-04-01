/**
 * ============================================================================
 * FILE: EventCreateModal.tsx
 * PURPOSE: Modal form for creating a new community event
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * ============================================================================
 *
 * ┌─── SUB-COMPONENT: EventCreateModal ────────────────────────┐
 * │ PARENT: EventsList                                          │
 * │ PURPOSE: Form to create events via POST /api/social/events  │
 * │ Props: { onClose, onCreate }                                │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Create] → validates → POST /api/social/events → closes     │
 * │ [Cancel] → closes modal                                     │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { CalendarPlus, X } from 'lucide-react';
import type { CreateEventPayload } from '../../../hooks/social/useEvents';
import {
  FormOverlay, FormCard, FormGroup, FormInput, FormTextarea,
  FormSelect, FormRow, FormActions, SubmitBtn, CancelBtn,
} from './EventStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Category options (match backend ENUM)
// ─────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'workout_class', label: 'Workout Class' },
  { value: 'group_training', label: 'Group Training' },
  { value: 'running_club', label: 'Running Club' },
  { value: 'hiking', label: 'Hiking' },
  { value: 'cycling_group', label: 'Cycling' },
  { value: 'swimming', label: 'Swimming' },
  { value: 'nutrition_workshop', label: 'Nutrition Workshop' },
  { value: 'wellness_seminar', label: 'Wellness Seminar' },
  { value: 'competition', label: 'Competition' },
  { value: 'social_meetup', label: 'Social Meetup' },
  { value: 'virtual_event', label: 'Virtual Event' },
  { value: 'outdoor_activity', label: 'Outdoor Activity' },
  { value: 'fitness_bootcamp', label: 'Fitness Bootcamp' },
  { value: 'sports_game', label: 'Sports Game' },
  { value: 'other', label: 'Other' },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onCreate: (payload: CreateEventPayload) => Promise<any>;
}

const EventCreateModal: React.FC<Props> = ({ onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('social_meetup');
  const [locationType, setLocationType] = useState<'in_person' | 'virtual' | 'hybrid'>('in_person');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [address, setAddress] = useState('');
  const [maxAttendees, setMaxAttendees] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Focus trap: close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || !description.trim() || !startDate || !startTime) {
      setError('Please fill in title, description, date, and time.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const startDateTime = new Date(`${startDate}T${startTime}`).toISOString();
      const dur = parseInt(duration) || 60;
      const endDateTime = new Date(new Date(startDateTime).getTime() + dur * 60000).toISOString();

      await onCreate({
        title: title.trim(),
        description: description.trim(),
        category,
        locationType,
        startDateTime,
        endDateTime,
        duration: dur,
        address: address.trim() || undefined,
        maxAttendees: maxAttendees ? parseInt(maxAttendees) : undefined,
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create event');
    } finally {
      setSubmitting(false);
    }
  }, [title, description, category, locationType, startDate, startTime, duration, address, maxAttendees, onCreate, onClose]);

  return (
    <FormOverlay
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="Create Event"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <FormCard>
        <h3><CalendarPlus size={20} aria-hidden="true" /> Create Event</h3>

        <FormGroup>
          <label htmlFor="evt-title">Title *</label>
          <FormInput id="evt-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Morning Run Club" maxLength={200} />
        </FormGroup>

        <FormGroup>
          <label htmlFor="evt-desc">Description *</label>
          <FormTextarea id="evt-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this event about?" maxLength={2000} />
        </FormGroup>

        <FormRow>
          <FormGroup>
            <label htmlFor="evt-cat">Category</label>
            <FormSelect id="evt-cat" value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </FormSelect>
          </FormGroup>
          <FormGroup>
            <label htmlFor="evt-loc">Location Type</label>
            <FormSelect id="evt-loc" value={locationType} onChange={e => setLocationType(e.target.value as any)}>
              <option value="in_person">In Person</option>
              <option value="virtual">Virtual</option>
              <option value="hybrid">Hybrid</option>
            </FormSelect>
          </FormGroup>
        </FormRow>

        <FormRow>
          <FormGroup>
            <label htmlFor="evt-date">Date *</label>
            <FormInput id="evt-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </FormGroup>
          <FormGroup>
            <label htmlFor="evt-time">Time *</label>
            <FormInput id="evt-time" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </FormGroup>
        </FormRow>

        <FormRow>
          <FormGroup>
            <label htmlFor="evt-dur">Duration (minutes)</label>
            <FormInput id="evt-dur" type="number" value={duration} onChange={e => setDuration(e.target.value)} min="15" max="480" />
          </FormGroup>
          <FormGroup>
            <label htmlFor="evt-max">Max Attendees</label>
            <FormInput id="evt-max" type="number" value={maxAttendees} onChange={e => setMaxAttendees(e.target.value)} placeholder="Unlimited" min="2" />
          </FormGroup>
        </FormRow>

        {locationType !== 'virtual' && (
          <FormGroup>
            <label htmlFor="evt-addr">Address</label>
            <FormInput id="evt-addr" value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St or park name" />
          </FormGroup>
        )}

        {error && (
          <div style={{
            background: 'var(--bg-elevated, #141419)',
            borderLeft: '4px solid var(--error-accent, #C92A54)',
            borderRadius: 8,
            padding: '0.75rem',
            marginTop: '0.5rem',
            color: 'var(--text-primary, #E0ECF4)',
            fontSize: '0.8125rem',
          }}>
            {error}
          </div>
        )}

        <FormActions>
          <CancelBtn type="button" onClick={onClose}>Cancel</CancelBtn>
          <SubmitBtn type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Event'}
          </SubmitBtn>
        </FormActions>
      </FormCard>
    </FormOverlay>
  );
};

export default EventCreateModal;
