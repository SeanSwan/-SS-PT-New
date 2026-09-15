#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/registry.mjs
 * PURPOSE: The creator catalog — accept a creator reference, canonicalise it,
 *          and store it DISABLED, behind strict reads.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR05)
 * ADDED: 2026-09-12 | REWRITTEN 2026-09-13
 * ============================================================================
 *
 * WHAT THE REVIEW FOUND (HR05):
 *   An unreadable registry was treated as an EMPTY one. A run then reported
 *   `ok: true`, and `add` happily wrote a fresh catalog over the damaged file,
 *   discarding every owner enable/disable choice, label and discovery
 *   bookkeeping. The catalog is AUTHORITATIVE OWNER STATE, not a cache: it is
 *   the record of which creators the owner deliberately turned on.
 *
 *   Every read now goes through `schema.mjs`, and every write refuses when the
 *   read was damaged. Creating a catalog that does not exist yet is still a
 *   valid first run — that is `absent`, which is a different status from
 *   `corrupt`.
 *
 * WHY VALIDATION IS SEPARATE FROM RESOLUTION:
 *   `channelUrlFrom` is a pure, offline check — "is this string shaped like a
 *   creator reference?" — and it is REUSED from swan-scout rather than
 *   reimplemented. Resolving that reference to a channel id costs a network
 *   call. Keeping them apart means a bad paste is rejected without touching
 *   YouTube, and the error names the actual problem instead of surfacing later
 *   as a confusing yt-dlp failure.
 *
 * @module creator-brains/registry
 */

import { channelUrlFrom } from '../../swan-scout/yt-scout-lib.mjs';
import { runOperation } from './ytdlp.mjs';
import {
  readRegistry, registryOrDefault, isDamaged, describeRead, saveRegistry, upsertCreator,
} from './store.mjs';
import { nowIso } from './paths.mjs';

export class RegistryError extends Error {}

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
 * Add (or refresh) a creator. Returns `{ok, creator}` or `{ok:false, reason}`.
 * A creator already in the registry keeps its `enabled` flag — re-adding must
 * never silently change whether we are allowed to fetch it.
 */
export async function addCreator({ ref, r, deps = {}, now, name = null }) {
  const check = validateCreatorRef(ref);
  if (!check.ok) return { ok: false, reason: check.reason };

  const read = readRegistry(r);
  if (isDamaged(read)) {
    return {
      ok: false,
      reason: `registry.json is ${describeRead(read)} — refusing to write over the creator catalog. `
        + 'Restore it from a backup, or move it aside deliberately to start a new catalog.',
    };
  }

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

  const reg = registryOrDefault(read);
  const creator = upsertCreator(reg, {
    channelId: resolved.channelId,
    title: name || resolved.title || resolved.channelId,
    handle: /^@/.test(String(ref).trim()) ? String(ref).trim() : null,
    url: `https://www.youtube.com/channel/${resolved.channelId}/videos`,
  }, { now: now ? now() : Date.now() });
  saveRegistry(reg, r);
  return { ok: true, creator, reason: null };
}

/** List creators. THROWS on a damaged registry rather than reporting none. */
export function listCreators(r) {
  const read = readRegistry(r);
  if (isDamaged(read)) {
    const err = new RegistryError(
      `registry.json is ${describeRead(read)} — refusing to treat a damaged catalog as empty`,
    );
    err.read = read;
    throw err;
  }
  const reg = registryOrDefault(read);
  return Object.values(reg.creators).sort((a, b) => String(a.title).localeCompare(String(b.title)));
}

/** Safe variant for status surfaces: returns `{ok, creators, read}`. */
export function listCreatorsSafe(r) {
  const read = readRegistry(r);
  if (isDamaged(read)) return { ok: false, creators: [], read };
  return { ok: true, creators: listCreators(r), read };
}

export function getCreator(r, channelId) {
  const read = readRegistry(r);
  if (isDamaged(read)) return null;
  return registryOrDefault(read).creators[channelId] || null;
}

/** Flip the enable flag. The ONLY way a creator starts being fetched. */
export function setEnabled(r, channelId, enabled, { now } = {}) {
  const read = readRegistry(r);
  if (isDamaged(read)) {
    throw new RegistryError(`registry.json is ${describeRead(read)} — refusing to write over the creator catalog`);
  }
  const reg = registryOrDefault(read);
  const c = reg.creators[channelId];
  if (!c) throw new RegistryError(`no creator '${channelId}' in the registry`);
  c.enabled = !!enabled;
  c.enabledAt = enabled ? nowIso(now) : null;
  saveRegistry(reg, r);
  return c;
}

/** Persist discovery bookkeeping (high-water mark) back onto the creator row. */
export function touchCreator(r, channelId, patch) {
  const read = readRegistry(r);
  if (isDamaged(read)) return null;
  const reg = registryOrDefault(read);
  const c = reg.creators[channelId];
  if (!c) return null;
  Object.assign(c, patch);
  saveRegistry(reg, r);
  return c;
}
