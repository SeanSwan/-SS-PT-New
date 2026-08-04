/**
 * ============================================================================
 * FILE: runner/runnerPrecache.ts
 * PURPOSE: Offline pre-cache — the class must survive gym Wi-Fi dying at
 *          minute 20. SWA-105 Slice 9 (Kimi R9: cache pre-flight).
 * AUTHOR: Claude Fable 5 | CREATED: 2026-08-03
 * ============================================================================
 *
 * LAWS:
 *  - PRE-FLIGHT GATES THE START BUTTON: "class fully cached" is checked
 *    BEFORE the class begins, not discovered at minute 20. Partial cache is
 *    a visible state the trainer accepts, never a silent one.
 *  - BUDGETED: media stops downloading at the byte budget; what was dropped
 *    is REPORTED (no silent truncation — a capped cache that reads as
 *    "covered everything" is how minute-20 surprises happen).
 *  - DEGRADATION IS A LADDER, decided per slot at render time:
 *    video -> image -> text (the exercise name is the floor — a class can run
 *    on names alone; it ran on whiteboards for decades).
 *  - Everything injected (fetch, cache) — every path unit-testable.
 */

export interface SlotMedia {
  slotId: string;
  videoUrl?: string | null;
  imageUrl?: string | null;
}

export interface CacheLike {
  put(url: string, bytes: number): Promise<void>;
  has(url: string): Promise<boolean>;
}

export interface FetchProbe {
  /** Resolve the byte size of a URL (HEAD-style); throw on network failure. */
  (url: string): Promise<number>;
}

export interface PrecacheManifest {
  cached: string[];
  failed: string[];
  /** Dropped by the byte budget — reported, never silent. */
  skippedForBudget: string[];
  totalBytes: number;
  complete: boolean;
}

/** Collect every media URL a plan can render, video first (cache priority). */
export function collectMedia(slots: SlotMedia[]): { videos: string[]; images: string[] } {
  const videos: string[] = [];
  const images: string[] = [];
  const seen = new Set<string>();
  for (const slot of slots) {
    for (const [url, bucket] of [[slot.videoUrl, videos], [slot.imageUrl, images]] as const) {
      if (url && !seen.has(url)) {
        seen.add(url);
        bucket.push(url);
      }
    }
  }
  return { videos, images };
}

/**
 * Fill the cache inside the budget. IMAGES FIRST: they are tiny and are the
 * degradation target — a cache that spent its whole budget on three 4K videos
 * and has no images left the floor with nothing when video four is missing.
 */
export async function precache(opts: {
  slots: SlotMedia[];
  cache: CacheLike;
  probe: FetchProbe;
  budgetBytes: number;
}): Promise<PrecacheManifest> {
  const { slots, cache, probe, budgetBytes } = opts;
  const { videos, images } = collectMedia(slots);

  const manifest: PrecacheManifest = {
    cached: [], failed: [], skippedForBudget: [], totalBytes: 0, complete: false,
  };

  for (const url of [...images, ...videos]) {
    if (await cache.has(url)) {
      manifest.cached.push(url);
      continue;
    }
    let bytes: number;
    try {
      bytes = await probe(url);
    } catch {
      manifest.failed.push(url);
      continue;
    }
    if (manifest.totalBytes + bytes > budgetBytes) {
      manifest.skippedForBudget.push(url);
      continue;
    }
    try {
      await cache.put(url, bytes);
      manifest.totalBytes += bytes;
      manifest.cached.push(url);
    } catch {
      manifest.failed.push(url);
    }
  }

  manifest.complete = manifest.failed.length === 0 && manifest.skippedForBudget.length === 0;
  return manifest;
}

export type PreflightStatus = 'ready' | 'partial' | 'not_cached';

/**
 * The Start-button gate. 'partial' is startable ONLY through the explicit
 * "start anyway" affordance — the trainer accepts the gaps, the app never
 * hides them.
 */
export function preflightStatus(manifest: PrecacheManifest | null): PreflightStatus {
  if (!manifest || manifest.cached.length === 0) return 'not_cached';
  return manifest.complete ? 'ready' : 'partial';
}

export type MediaResolution =
  | { kind: 'video'; url: string }
  | { kind: 'image'; url: string }
  | { kind: 'text' };

/** The per-slot degradation ladder, resolved against what is ACTUALLY cached. */
export function resolveMedia(slot: SlotMedia, manifest: PrecacheManifest): MediaResolution {
  const cached = new Set(manifest.cached);
  if (slot.videoUrl && cached.has(slot.videoUrl)) return { kind: 'video', url: slot.videoUrl };
  if (slot.imageUrl && cached.has(slot.imageUrl)) return { kind: 'image', url: slot.imageUrl };
  return { kind: 'text' };
}
