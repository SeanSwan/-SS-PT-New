#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/registry.mjs
 * PURPOSE: The creator catalog — accept a creator reference, canonicalise it,
 *          and store it DISABLED.
 * PART OF: Creator Brains — SS-PT acquisition engine (blueprint 1.0, S2)
 * ADDED: 2026-09-12
 * ============================================================================
 *
 * WHY EVERY CREATOR IS BORN DISABLED:
 *   Sean's trigger law (upstream §6, carried from Phase 131): enabling a
 *   creator is an owner-attributed decision that starts real traffic against a
 *   real channel. A catalog sync that could enable creators would let an
 *   upstream list edit turn into thousands of requests nobody asked for. So
 *   `add` stores `enabled: false` and the owner flips it deliberately.
 *
 * WHY VALIDATION IS SEPARATE FROM RESOLUTION:
 *   `channelUrlFrom` is a pure, offline check — "is this string shaped like a
 *   creator reference?" — and it is REUSED from swan-scout rather than
 *   reimplemented (CB0: "port it, do not rewrite it"). Resolving that reference
 *   to a channel id costs a network call. Keeping them apart means a bad paste
 *   is rejected without touching YouTube, and the error names the actual
 *   problem instead of surfacing as a confusing yt-dlp failure later.
 *
 * @module creator-brains/registry
 */

import { channelUrlFrom } from '../../swan-scout/yt-scout-lib.mjs';
import { runYtDlp } from './ytdlp.mjs';
import { loadRegistry, saveRegistry, upsertCreator } from './store.mjs';
import { nowIso } from './paths.mjs';

export class RegistryError extends Error {}

/** Channel ids are exactly `UC` + 22 url-safe chars. */
const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;

export function isChannelId(s) {
  return typeof s === 'string' && CHANNEL_ID.test(s.trim());
}

/**
 * PURE validation. Returns `{ok:true, url}` or `{ok:false, reason}`.
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
 * Default implementation asks yt-dlp for the channel's own identity. Injected
 * in tests so the whole catalog path is testable without the network.
 */
export function defaultResolveCreator(url) {
  const tpl = ['%(channel_id)s', '%(playlist_channel_id)s', '%(playlist_uploader_id)s', '%(channel)s', '%(playlist_title)s'].join('\t');
  const out = runYtDlp([
    url, '--flat-playlist', '--playlist-end', '1', '--no-warnings', '--print', tpl,
  ], { timeout: 180_000 });
  const line = String(out || '').split('\n').map((l) => l.trim()).filter(Boolean).pop();
  if (!line) return null;
  const parts = line.split('\t');
  const id = parts.find((p) => isChannelId(p));
  if (!id) return null;
  const title = parts.find((p) => p && p !== 'NA' && !isChannelId(p) && !/^@/.test(p)) || id;
  return { channelId: id, title, url };
}

/**
 * Add (or refresh) a creator. Returns `{ok, creator}` or `{ok:false, reason}`.
 * A creator already in the registry keeps its `enabled` flag — re-adding must
 * never silently change whether we are allowed to fetch it.
 */
export async function addCreator({ ref, r, deps = {}, now, name = null }) {
  const check = validateCreatorRef(ref);
  if (!check.ok) return { ok: false, reason: check.reason };

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

  const reg = loadRegistry(r);
  const creator = upsertCreator(reg, {
    channelId: resolved.channelId,
    title: name || resolved.title || resolved.channelId,
    handle: /^@/.test(String(ref).trim()) ? String(ref).trim() : null,
    url: `https://www.youtube.com/channel/${resolved.channelId}/videos`,
  }, { now: now ? now() : Date.now() });
  saveRegistry(reg, r);
  return { ok: true, creator, reason: null };
}

export function listCreators(r) {
  const reg = loadRegistry(r);
  return Object.values(reg.creators).sort((a, b) => String(a.title).localeCompare(String(b.title)));
}

export function getCreator(r, channelId) {
  const reg = loadRegistry(r);
  return reg.creators[channelId] || null;
}

/** Flip the enable flag. The ONLY way a creator starts being fetched. */
export function setEnabled(r, channelId, enabled, { now } = {}) {
  const reg = loadRegistry(r);
  const c = reg.creators[channelId];
  if (!c) throw new RegistryError(`no creator '${channelId}' in the registry`);
  c.enabled = !!enabled;
  c.enabledAt = enabled ? nowIso(now) : null;
  saveRegistry(reg, r);
  return c;
}

/** Persist discovery bookkeeping (high-water mark) back onto the creator row. */
export function touchCreator(r, channelId, patch) {
  const reg = loadRegistry(r);
  const c = reg.creators[channelId];
  if (!c) return null;
  Object.assign(c, patch);
  saveRegistry(reg, r);
  return c;
}
