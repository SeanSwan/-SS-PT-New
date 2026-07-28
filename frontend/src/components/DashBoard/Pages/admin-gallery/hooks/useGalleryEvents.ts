/**
 * useGalleryEvents — events list + stats controller
 * =================================================
 * Loads gallery events + aggregate stats, and exposes create / patch /
 * togglePublish / recount / delete. Errors are surfaced (never swallowed).
 */

import { useCallback, useEffect, useState } from 'react';
import {
  createEvent as apiCreate,
  deleteEvent as apiDelete,
  getStats,
  listEvents,
  recountEvent,
  updateEvent,
} from '../adminGalleryApi';
import type { GalleryEvent, GalleryStats, NewEventDraft } from '../types';

interface UseGalleryEvents {
  events: GalleryEvent[];
  stats: GalleryStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createEvent: (draft: NewEventDraft) => Promise<GalleryEvent>;
  patchEvent: (id: number, patch: Parameters<typeof updateEvent>[1]) => Promise<void>;
  togglePublish: (event: GalleryEvent) => Promise<void>;
  recount: (id: number) => Promise<void>;
  removeEvent: (id: number) => Promise<void>;
}

const errMsg = (e: unknown, fallback: string) =>
  (e as { message?: string })?.message || fallback;

export function useGalleryEvents(): UseGalleryEvents {
  const [events, setEvents] = useState<GalleryEvent[]>([]);
  const [stats, setStats] = useState<GalleryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventList, statBlock] = await Promise.all([listEvents(), getStats().catch(() => null)]);
      setEvents(eventList);
      if (statBlock) setStats(statBlock);
    } catch (e) {
      setError(errMsg(e, 'Failed to load galleries.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const upsert = useCallback((event: GalleryEvent) => {
    setEvents((prev) => {
      const idx = prev.findIndex((e) => e.id === event.id);
      if (idx === -1) return [event, ...prev];
      const next = [...prev];
      next[idx] = { ...next[idx], ...event };
      return next;
    });
  }, []);

  const createEvent = useCallback(
    async (draft: NewEventDraft) => {
      const created = await apiCreate(draft);
      upsert(created);
      void getStats().then(setStats).catch(() => undefined);
      return created;
    },
    [upsert],
  );

  const patchEvent = useCallback(
    async (id: number, patch: Parameters<typeof updateEvent>[1]) => {
      const updated = await updateEvent(id, patch);
      upsert(updated);
    },
    [upsert],
  );

  const togglePublish = useCallback(
    async (event: GalleryEvent) => {
      // Optimistic flip, revert on failure.
      const next = !event.isPublished;
      setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, isPublished: next } : e)));
      try {
        await updateEvent(event.id, { isPublished: next });
      } catch (e) {
        setEvents((prev) => prev.map((ev) => (ev.id === event.id ? { ...ev, isPublished: event.isPublished } : ev)));
        setError(errMsg(e, 'Failed to update publish state.'));
      }
    },
    [],
  );

  const recount = useCallback(
    async (id: number) => {
      const updated = await recountEvent(id);
      upsert(updated);
    },
    [upsert],
  );

  const removeEvent = useCallback(async (id: number) => {
    await apiDelete(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
    void getStats().then(setStats).catch(() => undefined);
  }, []);

  return { events, stats, loading, error, refresh, createEvent, patchEvent, togglePublish, recount, removeEvent };
}
