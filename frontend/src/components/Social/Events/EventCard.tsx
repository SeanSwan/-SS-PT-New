/**
 * ============================================================================
 * FILE: EventCard.tsx
 * PURPOSE: Single community event card with RSVP actions
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * ============================================================================
 *
 * ┌─── SUB-COMPONENT: EventCard ───────────────────────────────┐
 * │ PARENT: EventsList                                          │
 * │ PURPOSE: Displays event details + RSVP buttons              │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────────────┐                │
 * │ │ [Title]                   [Category Pill] │                │
 * │ │ Description text (2 lines max)...         │                │
 * │ │ 📅 Apr 5  ⏰ 2:00PM  📍 In Person  👥 12 │                │
 * │ │ [Going] [Interested] [Maybe]              │                │
 * │ └──────────────────────────────────────────┘                │
 * │ Props: { event, onRsvp }                                    │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { memo, useCallback, useState } from 'react';
import { Calendar, Clock, MapPin, Users, Video } from 'lucide-react';
import type { CommunityEvent } from '../../../hooks/social/useEvents';
import {
  CardWrap, CardHeader, CardTitle, CategoryPill, CardDesc,
  CardMeta, AttendeeBadge, RsvpRow, RsvpBtn,
} from './EventStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Helpers
// ─────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  workout_class: 'Workout Class',
  group_training: 'Group Training',
  running_club: 'Running Club',
  yoga_session: 'Flexibility',
  hiking: 'Hiking',
  cycling_group: 'Cycling',
  swimming: 'Swimming',
  nutrition_workshop: 'Nutrition',
  wellness_seminar: 'Wellness',
  competition: 'Competition',
  social_meetup: 'Meetup',
  virtual_event: 'Virtual',
  outdoor_activity: 'Outdoor',
  fitness_bootcamp: 'Bootcamp',
  sports_game: 'Sports',
  other: 'Other',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

const locationIcon = (type: string) =>
  type === 'virtual' ? <Video size={12} aria-hidden="true" /> : <MapPin size={12} aria-hidden="true" />;

const locationLabel = (type: string) =>
  type === 'virtual' ? 'Virtual' : type === 'hybrid' ? 'Hybrid' : 'In Person';

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

interface EventCardProps {
  event: CommunityEvent;
  onRsvp: (eventId: string, status: 'going' | 'interested' | 'maybe' | 'not_going') => Promise<any>;
}

const EventCard: React.FC<EventCardProps> = ({ event, onRsvp }) => {
  const [busy, setBusy] = useState(false);

  const handleRsvp = useCallback(async (status: 'going' | 'interested' | 'maybe') => {
    if (busy) return;
    setBusy(true);
    try {
      await onRsvp(event.id, status);
    } catch (err) {
      console.error('RSVP failed:', err);
    } finally {
      setBusy(false);
    }
  }, [busy, event.id, onRsvp]);

  const isFull = !!(event.maxAttendees && event.currentAttendees >= event.maxAttendees);

  return (
    <CardWrap>
      <CardHeader>
        <CardTitle>{event.title}</CardTitle>
        <CategoryPill>{CATEGORY_LABELS[event.category] || event.category}</CategoryPill>
      </CardHeader>

      <CardDesc>{event.description}</CardDesc>

      <CardMeta>
        <span><Calendar size={12} aria-hidden="true" /> {formatDate(event.startDateTime)}</span>
        <span><Clock size={12} aria-hidden="true" /> {formatTime(event.startDateTime)}</span>
        <span>{locationIcon(event.locationType)} {locationLabel(event.locationType)}</span>
        <AttendeeBadge $full={isFull}>
          <Users size={12} aria-hidden="true" />{' '}
          {event.currentAttendees}{event.maxAttendees ? `/${event.maxAttendees}` : ''}
        </AttendeeBadge>
      </CardMeta>

      <RsvpRow>
        {(['going', 'interested', 'maybe'] as const).map(s => (
          <RsvpBtn
            key={s}
            $active={event.myStatus === s}
            onClick={() => handleRsvp(s)}
            disabled={busy || (s === 'going' && isFull && event.myStatus !== 'going')}
            aria-label={`RSVP ${s}`}
          >
            {s === 'going' ? '✓ Going' : s === 'interested' ? '★ Interested' : '? Maybe'}
          </RsvpBtn>
        ))}
      </RsvpRow>
    </CardWrap>
  );
};

export default memo(EventCard);
