/**
 * galleryViewPrefs.ts
 * ===================
 * Persisted view + picture-size preferences for the gallery (Sean: "more options for the
 * gallery views" + "more options for the fixed picture size in the view").
 *
 * Net-new: the live gallery had NO view state, NO size control, and NO persistence.
 * This adds a size preset (S/M/L/XL column density) + a layout mode (grid/list) that
 * survive reload via VERSIONED localStorage (Kimi R2/R3: version the key + validate the
 * stored enum on read so a stale value can never crash or silently no-op; SSR/incognito
 * safe). Hero/masonry deliberately excluded — Masonry breaks keyboard/reading order
 * (Kimi R2 §b.7), Hero is a follow-up.
 */
import { useCallback, useEffect, useState } from 'react';

export type GalleryLayout = 'grid' | 'list';
export type GallerySize = 's' | 'm' | 'l' | 'xl';

export interface GalleryViewPrefs {
  layout: GalleryLayout;
  size: GallerySize;
}

const DEFAULTS: GalleryViewPrefs = { layout: 'grid', size: 'm' };

// Versioned key — bump the suffix if the shape/enum ever changes so old values are ignored.
const STORAGE_KEY = 'swan.gallery.view.v1';

const LAYOUTS: readonly GalleryLayout[] = ['grid', 'list'];
const SIZES: readonly GallerySize[] = ['s', 'm', 'l', 'xl'];

/** Min column width per size preset (drives the grid's auto-fill density). */
export const SIZE_MIN_PX: Record<GallerySize, number> = {
  s: 130,
  m: 200,
  l: 280,
  xl: 380,
};

export const SIZE_LABEL: Record<GallerySize, string> = { s: 'S', m: 'M', l: 'L', xl: 'XL' };

function readStored(): GalleryViewPrefs {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return DEFAULTS;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<GalleryViewPrefs>;
    // Validate every field against the known enums — a stale/garbage value falls back.
    const layout = LAYOUTS.includes(parsed.layout as GalleryLayout) ? (parsed.layout as GalleryLayout) : DEFAULTS.layout;
    const size = SIZES.includes(parsed.size as GallerySize) ? (parsed.size as GallerySize) : DEFAULTS.size;
    return { layout, size };
  } catch {
    return DEFAULTS;
  }
}

function writeStored(prefs: GalleryViewPrefs): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* incognito / quota / disabled storage — preference is in-memory only, no throw */
  }
}

/** Hook: persisted gallery view prefs + setters. */
export function useGalleryViewPrefs() {
  const [prefs, setPrefs] = useState<GalleryViewPrefs>(readStored);

  useEffect(() => { writeStored(prefs); }, [prefs]);

  const setLayout = useCallback((layout: GalleryLayout) => setPrefs((p) => ({ ...p, layout })), []);
  const setSize = useCallback((size: GallerySize) => setPrefs((p) => ({ ...p, size })), []);

  return { ...prefs, setLayout, setSize };
}

// Exposed for tests.
export const __TESTING__ = { STORAGE_KEY, DEFAULTS, readStored, writeStored, LAYOUTS, SIZES };
