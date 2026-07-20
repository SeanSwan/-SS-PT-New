/**
 * Gallery vNext — session + data hook. BIND-ONLY: every call goes through `gallery.api.ts`, which uses the
 * SAME `/api/gallery/*` paths, bodies, and Bearer scheme the shipped GalleryPage already uses. Session
 * behavior mirrors the current page verbatim (GalleryPage.tsx:1137-1143, 1229-1240, 1480-1516): the token is
 * restored from sessionStorage keyed by slug, the gate submit establishes it, photos load once token+slug
 * exist. GalleryPage.tsx itself is untouched (it is the flag-OFF fallback) — this is a parallel implementation.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { accessEvent, getEventDetail, listEvents, listPhotos } from './gallery.api';
import type { GalleryEventSummary, GalleryPhoto, GateSubmitInput } from './gallery.types';

const tokenKey = (slug: string): string => `gallery-token-${slug || ''}`;

const isAbortError = (err: unknown): boolean =>
  err instanceof DOMException ? err.name === 'AbortError' : (err as { name?: string })?.name === 'AbortError';

export interface GallerySession {
  events: GalleryEventSummary[];
  photos: GalleryPhoto[];
  selectedEvent: GalleryEventSummary | null;
  galleryToken: string | null;
  printStorefrontEnabled: boolean;
  showGate: boolean;
  gateSlug: string;
  loading: boolean;
  error: string;
  gateLoading: boolean;
  gateError: string;
  openEvent(event: GalleryEventSummary): void;
  submitGate(input: GateSubmitInput): Promise<boolean>;
  dismissGate(): void;
  reloadEvents(): void;
}

export function useGallerySession(slug: string): GallerySession {
  const [events, setEvents] = useState<GalleryEventSummary[]>([]);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<GalleryEventSummary | null>(null);
  const [printStorefrontEnabled, setPrintStorefrontEnabled] = useState(false);
  const [galleryToken, setGalleryToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(tokenKey(slug)) || null;
    } catch {
      return null; // SSR / privacy mode
    }
  });
  const [showGate, setShowGate] = useState(false);
  const [gateSlug, setGateSlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gateLoading, setGateLoading] = useState(false);
  const [gateError, setGateError] = useState('');

  const eventsAbort = useRef<AbortController | null>(null);
  const photosAbort = useRef<AbortController | null>(null);
  const eventsRef = useRef<GalleryEventSummary[]>([]);
  eventsRef.current = events;

  const reloadEvents = useCallback(async () => {
    eventsAbort.current?.abort();
    const controller = new AbortController();
    eventsAbort.current = controller;
    setLoading(true);
    try {
      const data = await listEvents(controller.signal);
      if (data.success && data.events) {
        setEvents(data.events);
        setError('');
      } else {
        setError(data.error || 'We could not load the galleries.');
      }
    } catch (err) {
      if (!isAbortError(err)) setError('Connection error. Please try again.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  const loadPhotos = useCallback(async (eventSlug: string, token: string) => {
    photosAbort.current?.abort();
    const controller = new AbortController();
    photosAbort.current = controller;
    try {
      const data = await listPhotos(eventSlug, token, controller.signal);
      if (data.success && data.photos) {
        setPhotos(data.photos);
        setPrintStorefrontEnabled(Boolean(data.printStorefrontEnabled));
        setError('');
      } else {
        setError(data.error || 'We could not load these photos.');
      }
      // Merge richer event detail (description etc.) when we only have the access-gate shape.
      const detail = await getEventDetail(eventSlug, controller.signal);
      if (detail.success && detail.event) {
        setSelectedEvent((prev) => (prev ? { ...detail.event!, ...prev } : detail.event!));
      }
    } catch (err) {
      if (!isAbortError(err)) setError('Connection error. Please try again.');
    }
  }, []);

  // Mount: load the event list.
  useEffect(() => {
    void reloadEvents();
    return () => {
      eventsAbort.current?.abort();
      photosAbort.current?.abort();
    };
  }, [reloadEvents]);

  // Slug present → gate it (no token) or load it (token). Mirrors GalleryPage.tsx:1229-1240.
  useEffect(() => {
    if (!slug) return;
    if (!galleryToken) {
      setGateSlug(slug);
      setShowGate(true);
    } else {
      void loadPhotos(slug, galleryToken);
    }
  }, [slug, galleryToken, loadPhotos]);

  const openEvent = useCallback((event: GalleryEventSummary) => {
    setSelectedEvent(event);
    setGateSlug(event.slug);
    setShowGate(true);
    setGateError('');
  }, []);

  const dismissGate = useCallback(() => {
    setShowGate(false);
    setGateError('');
  }, []);

  /** Establishes the email-identified session. Returns true on success so the caller can fire the reveal. */
  const submitGate = useCallback(
    async (input: GateSubmitInput): Promise<boolean> => {
      setGateLoading(true);
      setGateError('');
      try {
        const data = await accessEvent(gateSlug, input);
        if (!data.success || !data.token) {
          setGateError(data.error || 'Access denied');
          return false;
        }
        setGalleryToken(data.token);
        try {
          sessionStorage.setItem(tokenKey(gateSlug), data.token);
        } catch {
          /* best-effort session persistence */
        }
        if (data.event) {
          const listed = eventsRef.current.find((ev) => ev.slug === data.event!.slug);
          setSelectedEvent((prev) => prev ?? (listed ? { ...data.event!, ...listed } : data.event!));
        }
        setShowGate(false);
        await loadPhotos(gateSlug, data.token);
        return true;
      } catch {
        setGateError('Connection error. Please try again.');
        return false;
      } finally {
        setGateLoading(false);
      }
    },
    [gateSlug, loadPhotos],
  );

  return {
    events,
    photos,
    selectedEvent,
    galleryToken,
    printStorefrontEnabled,
    showGate,
    gateSlug,
    loading,
    error,
    gateLoading,
    gateError,
    openEvent,
    submitGate,
    dismissGate,
    reloadEvents,
  };
}
