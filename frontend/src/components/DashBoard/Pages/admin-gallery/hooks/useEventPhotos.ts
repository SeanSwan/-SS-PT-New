/**
 * useEventPhotos — selected-event photo grid controller
 * =====================================================
 * Loads an event's photos, supports live insertion during upload, and optimistic
 * per-photo delete (rolls back on failure). Deletes go through the single-photo
 * endpoint (the backend bulk-delete route is shadowed and unreliable).
 */

import { useCallback, useState } from 'react';
import { deletePhoto as apiDeletePhoto, listEventPhotos } from '../adminGalleryApi';
import type { GalleryPhoto } from '../types';

interface UseEventPhotos {
  photos: GalleryPhoto[];
  loading: boolean;
  error: string | null;
  load: (eventId: number) => Promise<void>;
  addPhoto: (photo: GalleryPhoto) => void;
  removePhoto: (photoId: number) => Promise<void>;
  clear: () => void;
}

const errMsg = (e: unknown, fallback: string) => (e as { message?: string })?.message || fallback;

export function useEventPhotos(): UseEventPhotos {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (eventId: number) => {
    setLoading(true);
    setError(null);
    try {
      setPhotos(await listEventPhotos(eventId));
    } catch (e) {
      setError(errMsg(e, 'Failed to load photos.'));
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const addPhoto = useCallback((photo: GalleryPhoto) => {
    setPhotos((prev) => (prev.some((p) => p.id === photo.id) ? prev : [...prev, photo]));
  }, []);

  const removePhoto = useCallback(
    async (photoId: number) => {
      const snapshot = photos;
      setError(null);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      try {
        await apiDeletePhoto(photoId);
      } catch (e) {
        setPhotos(snapshot); // rollback
        setError(errMsg(e, 'Failed to delete photo.'));
      }
    },
    [photos],
  );

  const clear = useCallback(() => {
    setPhotos([]);
    setError(null);
    setLoading(false);
  }, []);

  return { photos, loading, error, load, addPhoto, removePhoto, clear };
}
