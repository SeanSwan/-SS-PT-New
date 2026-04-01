/**
 * ============================================================================
 * FILE: EventsList.tsx
 * PURPOSE: Community events list with create button — for embedding in community page
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * ============================================================================
 *
 * ┌─── SUB-COMPONENT: EventsList ──────────────────────────────┐
 * │ PARENT: ClientCommunityPage                                 │
 * │ PURPOSE: Shows upcoming events + create event trigger       │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────────────┐                │
 * │ │ 📅 Upcoming Events          [+ Create]   │                │
 * │ │ [EventCard]                               │                │
 * │ │ [EventCard]                               │                │
 * │ │ [EventCard]                               │                │
 * │ └──────────────────────────────────────────┘                │
 * │ Props: none (uses useEvents hook internally)                │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { useState, lazy, Suspense } from 'react';
import { Calendar, Plus } from 'lucide-react';
import { useEvents } from '../../../hooks/social/useEvents';
import EventCard from './EventCard';
import { EventsHeader, CreateEventBtn } from './EventStyles';

const EventCreateModal = lazy(() => import('./EventCreateModal'));

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const EventsList: React.FC = () => {
  const { events, isLoading, error, createEvent, rsvp } = useEvents();
  const [showCreate, setShowCreate] = useState(false);

  if (isLoading) {
    return (
      <div>
        <EventsHeader>
          <h3><Calendar size={18} aria-hidden="true" /> Upcoming Events</h3>
        </EventsHeader>
        <div style={{
          height: 60,
          borderRadius: 10,
          background: 'var(--bg-elevated, #141419)',
          opacity: 0.6,
        }} />
      </div>
    );
  }

  return (
    <div>
      <EventsHeader>
        <h3><Calendar size={18} aria-hidden="true" /> Upcoming Events</h3>
        <CreateEventBtn onClick={() => setShowCreate(true)} aria-label="Create event">
          <Plus size={14} aria-hidden="true" /> Create
        </CreateEventBtn>
      </EventsHeader>

      {error && (
        <div style={{
          background: 'var(--bg-elevated, #141419)',
          borderLeft: '4px solid var(--error-accent, #C92A54)',
          borderRadius: 8,
          padding: '0.75rem',
          marginBottom: '0.75rem',
          color: 'var(--text-primary, #E0ECF4)',
          fontSize: '0.8125rem',
        }}>
          {error}
        </div>
      )}

      {events.length === 0 ? (
        <p style={{
          color: 'var(--text-muted, #94a3b8)',
          fontSize: '0.875rem',
          textAlign: 'center',
          padding: '1.5rem 0',
        }}>
          No upcoming events. Create one to get the community moving!
        </p>
      ) : (
        events.slice(0, 5).map(ev => (
          <EventCard key={ev.id} event={ev} onRsvp={rsvp} />
        ))
      )}

      {showCreate && (
        <Suspense fallback={null}>
          <EventCreateModal
            onClose={() => setShowCreate(false)}
            onCreate={createEvent}
          />
        </Suspense>
      )}
    </div>
  );
};

export default EventsList;
