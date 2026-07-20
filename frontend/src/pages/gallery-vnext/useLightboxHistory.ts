/**
 * Gallery vNext — lightbox ↔ browser-history binding. PARITY with the shipped page
 * (GalleryPage.tsx:1521-1553): opening a photo pushes a history entry so the browser/phone BACK button
 * closes the lightbox instead of leaving the gallery; closing via UI pops the entry we pushed, with a
 * re-entry guard so the popstate handler doesn't double-close.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GalleryPhoto } from './gallery.types';

export interface LightboxHistory {
  lightboxIndex: number | null;
  setLightboxIndex: React.Dispatch<React.SetStateAction<number | null>>;
  openPhoto(photo: GalleryPhoto, photos: GalleryPhoto[]): void;
  closeLightbox(): void;
}

export function useLightboxHistory(): LightboxHistory {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const closingViaBack = useRef(false);

  const openPhoto = useCallback((photo: GalleryPhoto, photos: GalleryPhoto[]) => {
    const idx = photos.findIndex((p) => p.id === photo.id);
    if (idx < 0) return;
    setLightboxIndex(idx);
    window.history.pushState({ galleryPhoto: idx }, '');
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
    if (window.history.state?.galleryPhoto !== undefined) {
      closingViaBack.current = true;
      window.history.back();
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      if (closingViaBack.current) {
        closingViaBack.current = false;
        return;
      }
      setLightboxIndex((i) => (i !== null ? null : i));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return { lightboxIndex, setLightboxIndex, openPhoto, closeLightbox };
}
