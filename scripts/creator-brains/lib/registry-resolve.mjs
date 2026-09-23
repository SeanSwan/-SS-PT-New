#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/registry-resolve.mjs
 * PURPOSE: Turn a creator reference into a channel identity — offline where
 *          possible, over the network where not, and WITHOUT owning the store.
 * PART OF: Creator Brains — SS-PT acquisition engine (F04, Astra hostile r1)
 * ADDED: 2026-09-23
 * ============================================================================
 *
 * EXTRACTED FROM `registry.mjs` AT THE SEAM, NOT TRIMMED TO FIT (Rule 4). The
 * F04 repair split the add path into "resolve" and "commit"; this is the resolve
 * half, and the split is the point rather than a tidiness exercise — see below.
 *
 * ── WHY RESOLUTION IS ITS OWN HALF (F04, Astra r1) ──────────────────────────
 *
 * This is the SLOW half. `defaultResolveCreator` shells out to yt-dlp with a
 * 180 s ceiling, and the console runs it on a worker thread that it will
 * TERMINATE when a 60 s deadline expires. A thread that can be killed at any
 * instant must own nothing that needs cleaning up, so nothing here takes the
 * store lock, writes a file, or holds a handle.
 *
 * That is not a stylistic preference. The F01/F03 fix put `acquireLock` inside
 * the terminable worker, and `terminate()` landing in the millisecond between
 * acquire and release strands the lock on disk. Worker threads share
 * `process.pid`, so the surviving bridge process looks like a LIVE owner and
 * `acquireLock` refuses to reclaim it — the store is not busy, it is wedged for
 * every later writer including the daily run. Splitting the halves is what lets
 * the console keep the deadline on the slow half and take it off the half that
 * owns the store.
 *
 * ── WHY THE PRE-FLIGHT READ IS HERE AND NOT IN THE CRITICAL SECTION ─────────
 *
 * It exists so a damaged catalog or an unresolvable ref is refused BEFORE the
 * network call, and it is explicitly NOT the read that feeds the write.
 * Promoting it into the critical section would leave the lost update in place
 * while appearing to hold a lock; `commitResolvedCreator` therefore re-reads.
 *
 * ── WHY VALIDATION IS SEPARATE FROM RESOLUTION ─────────────────────────────
 *
 * `channelUrlFrom` is a pure, offline check — "is this string shaped like a
 * creator reference?" — and it is REUSED from swan-scout rather than
 * reimplemented. Resolving that reference to a channel id costs a network call.
 * Keeping them apart means a bad paste is rejected without touching YouTube, and
 * the error names the actual problem instead of surfacing later as a confusing
 * yt-dlp failure.
 *
 * @module creator-brains/registry-resolve
 */

import { channelUrlFrom } from '../../swan-scout/yt-scout-lib.mjs';
import { runOperation } from './ytdlp.mjs';
import { readRegistry, isDamaged } from './store.mjs';
import { damagedRefusal } from './registry-write-guard.mjs';

/** Channel ids are exactly `UC` + 22 url-safe chars. */
const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;

export function isChannelId(s) {
  return typeof s === 'string' && CHANNEL_ID.test(s.trim());
}

/**
 * PURE validation. Returns `{ok:true, url, channelId}` or `{ok:false, reason}`.
 * No network. A phrase is not a creator — that is a user error worth naming.
 */
export function validateCreatorRef(ref) {
  if (typeof ref !== 'string' || !ref.trim()) {
    return { ok: false, reason: 'a creator reference is required (@handle, channel URL, or UC… id)' };
  }
  if (isChannelId(ref)) {
    return { ok: true, url: `https://www.youtube.com/channel/${ref.trim()}/videos`, channelId: ref.trim() };
  }
  const url = channelUrlFrom(ref);
  if (!url) {
    return {
      ok: false,
      reason: `'${ref.trim()}' is not a creator reference — use @handle, a channel URL, or a UC… id `
        + '(for a topic phrase use a search, not the registry)',
    };
  }
  return { ok: true, url, channelId: null };
}

/**
 * Resolve a validated reference to `{channelId, title, url}`.
 * Default implementation asks yt-dlp for the channel's own identity. Injected in
 * tests so the whole catalog path is testable without the network.
 */
export function defaultResolveCreator(url) {
  // `resolveChannel` asks for the PLAYLIST-level identity fields, which a flat
  // enumeration DOES populate. Asking for per-video `channel_id` in flat mode
  // returns nothing, which is why the first version of this could not resolve a
  // handle at all.
  const out = runOperation('resolveChannel', { url }, { timeout: 180_000 });
  const line = String(out || '').split('\n').map((l) => l.trim()).filter(Boolean).pop();
  if (!line) return null;
  const [playlistChannelId, uploaderId, title] = line.split('\t').map((s) => (s === 'NA' ? null : s));
  const id = [playlistChannelId, uploaderId].find(isChannelId);
  if (!id) return null;
  return { channelId: id, title: title || id, url };
}

/**
 * Validate a ref and resolve it to a channel identity. Returns
 * `{ok:true, ref, resolved}` or `{ok:false, reason}`.
 *
 * Takes and releases nothing: this is the half that is safe to abandon.
 */
export function resolveCreatorRef({ ref, r, deps = {} }) {
  const check = validateCreatorRef(ref);
  if (!check.ok) return { ok: false, reason: check.reason };

  const pre = readRegistry(r);
  if (isDamaged(pre)) return { ok: false, reason: damagedRefusal(pre) };

  const resolve = deps.resolveCreator || defaultResolveCreator;
  let resolved;
  try {
    resolved = resolve(check.url, ref);
  } catch (e) {
    return { ok: false, reason: `could not resolve '${ref}': ${e.message}` };
  }
  if (!resolved || !isChannelId(resolved.channelId)) {
    return { ok: false, reason: `'${ref}' did not resolve to a YouTube channel id` };
  }
  return { ok: true, ref, resolved };
}
