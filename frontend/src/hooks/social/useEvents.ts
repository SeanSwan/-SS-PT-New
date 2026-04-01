/**
 * ============================================================================
 * FILE: useEvents.ts
 * PURPOSE: Hook for community events — list, create, RSVP
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * ============================================================================
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

export interface EventOrganizer {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  photo?: string;
}

export interface CommunityEvent {
  id: string;
  organizerId: number;
  organizer?: EventOrganizer;
  title: string;
  description: string;
  shortDescription?: string;
  category: string;
  fitnessLevel: string;
  locationType: 'in_person' | 'virtual' | 'hybrid';
  venue?: Record<string, unknown>;
  address?: string;
  startDateTime: string;
  endDateTime: string;
  duration: number;
  maxAttendees?: number;
  currentAttendees: number;
  isFree: boolean;
  tags: string[];
  equipmentNeeded: string[];
  coverImage?: string;
  status: string;
  visibility: string;
  views: number;
  interested: number;
  myStatus?: string | null;
}

export interface CreateEventPayload {
  title: string;
  description: string;
  category: string;
  locationType: string;
  startDateTime: string;
  endDateTime: string;
  duration: number;
  address?: string;
  venue?: Record<string, unknown>;
  maxAttendees?: number;
  fitnessLevel?: string;
  isFree?: boolean;
  tags?: string[];
  equipmentNeeded?: string[];
  visibility?: string;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// ─────────────────────────────────────────────────────────────

export const useEvents = () => {
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [myEvents, setMyEvents] = useState<CommunityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async (params?: {
    category?: string;
    locationType?: string;
    limit?: number;
  }) => {
    try {
      setIsLoading(true);
      const query = new URLSearchParams();
      if (params?.category) query.set('category', params.category);
      if (params?.locationType) query.set('locationType', params.locationType);
      if (params?.limit) query.set('limit', String(params.limit));

      const { data } = await api.get(`/api/social/events?${query.toString()}`);
      setEvents(data.events || []);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch events:', err);
      setError(err.message);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMyEvents = useCallback(async () => {
    try {
      const { data } = await api.get('/api/social/events/my');
      setMyEvents([
        ...(data.organized || []),
        ...(data.attending || []),
      ]);
    } catch (err) {
      console.error('Failed to fetch my events:', err);
    }
  }, []);

  const createEvent = useCallback(async (payload: CreateEventPayload) => {
    const { data } = await api.post('/api/social/events', payload);
    if (data.success && data.event) {
      setEvents(prev => [data.event, ...prev]);
    }
    return data.event;
  }, []);

  const rsvp = useCallback(async (eventId: string, status: 'going' | 'interested' | 'maybe' | 'not_going') => {
    const { data } = await api.post(`/api/social/events/${eventId}/rsvp`, { status });
    // Update local state
    setEvents(prev => prev.map(e =>
      e.id === eventId ? { ...e, myStatus: status, currentAttendees: e.currentAttendees + (status === 'going' ? 1 : 0) } : e
    ));
    return data.attendance;
  }, []);

  useEffect(() => {
    fetchEvents({ limit: 20 });
  }, [fetchEvents]);

  return {
    events,
    myEvents,
    isLoading,
    error,
    fetchEvents,
    fetchMyEvents,
    createEvent,
    rsvp,
  };
};
