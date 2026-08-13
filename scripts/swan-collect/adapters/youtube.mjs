/**
 * youtube.mjs — YouTube Data API v3 adapter. FREE quota, fully ToS-clean.
 * ============================================================================
 * Sean's stated preference was "do YouTube via API if I can." He can — and it is
 * both the cleanest and the cheapest path.
 *
 * THE QUOTA MATH THAT DRIVES THIS DESIGN (verified 2026-08-11):
 *   - 10,000 units/day, free. No billing meter, no card. Quota is NOT purchasable;
 *     the only way past it is a manual audit form. So the design must be frugal
 *     by construction, not frugal by hope.
 *   - `search.list`        = 100 units  → only ~100 calls/day. EXPENSIVE.
 *   - `channels.list`      =   1 unit
 *   - `playlistItems.list` =   1 unit   → 50 videos per call
 *
 * Therefore the pattern here is: resolve a channel ONCE (cheap via `forHandle`,
 * or 100 units via search as a last resort), CACHE its uploads-playlist id, then
 * page uploads at 1 unit per 50 videos forever. Pulling a creator's entire back
 * catalogue costs single-digit units. Naively calling `search.list` per sync
 * would exhaust a whole day's quota on ~100 syncs — the difference between a
 * feature that scales and one that dies in week one.
 *
 * NO KEY? The sibling `scripts/swan-scout/` already does keyless YouTube via
 * yt-dlp and is proven working. That is the operator-side fallback; this adapter
 * is the clean server-or-operator path. Both normalize to the same IntelItem, so
 * the consuming app cannot tell which was used except by reading `fetchMethod`.
 *
 * PORTABILITY: `fetch` injected, key passed in, zero repo coupling.
 *
 * @module swan-collect/adapters/youtube
 */

import { normalizeItem, CollectError } from '../core/item.mjs';

export const SOURCE_KEY = 'youtube';
const BASE = 'https://www.googleapis.com/youtube/v3';

/** Quota cost per endpoint — surfaced so a run can report what it spent. */
export const UNIT_COST = Object.freeze({ search: 100, channels: 1, playlistItems: 1, videos: 1 });
const MAX_PAGE = 50;
const MAX_TOTAL = 500;
/** Hard page brake — see the H1 note in collectUploads. */
const MAX_PAGES = 20;
/** YouTube video ids are exactly 11 chars; validated before URL interpolation. */
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

const clampPage = (n) => Math.min(Math.max(Number.isFinite(Number(n)) ? Number(n) : 50, 1), MAX_PAGE);

/**
 * A quota ledger the caller can inspect after a run. Making spend VISIBLE is the
 * point: an invisible 10,000-unit budget is one that gets silently exhausted at
 * 3pm with no idea which call did it.
 */
export function createQuotaLedger() {
  return { spent: 0, calls: [], note(endpoint) { this.spent += UNIT_COST[endpoint] || 1; this.calls.push(endpoint); } };
}

async function api(fetchImpl, endpoint, params, { apiKey, ledger, timeoutMs = 15_000 }) {
  if (typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new CollectError('youtube: an API key is required (free — console.cloud.google.com, enable YouTube Data API v3)');
  }
  const url = new URL(`${BASE}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  // The key goes in the query because that is the only form this API accepts.
  // It must therefore NEVER be echoed: every throw below is built from status +
  // Google's message, never from url.toString().
  url.searchParams.set('key', apiKey);

  const res = await fetchImpl(url.toString(), {
    method: 'GET',
    headers: { accept: 'application/json' },
    redirect: 'error',
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (ledger) ledger.note(endpoint);

  if (!res || typeof res.status !== 'number') throw new CollectError('youtube: malformed fetch response');
  if (res.status === 403) {
    let reason = '';
    try { reason = (await res.json())?.error?.errors?.[0]?.reason || ''; } catch { /* non-JSON body */ }
    if (reason === 'quotaExceeded') {
      throw new CollectError('youtube: daily quota (10,000 units) exhausted — resets at midnight Pacific');
    }
    throw new CollectError(`youtube: 403 ${reason || 'forbidden — check the key and that the API is enabled'}`);
  }
  if (!res.ok) throw new CollectError(`youtube: ${endpoint} returned ${res.status}`);
  return res.json();
}

/**
 * Resolve a channel to { channelId, uploadsPlaylistId, title }.
 *
 * Tries the 1-unit `forHandle` lookup first and only falls back to the 100-unit
 * search when the caller passes a plain name. CACHE THE RESULT — re-resolving on
 * every sync is the single easiest way to burn the day's quota.
 */
export async function resolveChannel(ref, { fetchImpl = fetch, apiKey, ledger, cache } = {}) {
  if (typeof ref !== 'string' || !ref.trim()) throw new CollectError('youtube: a channel reference is required');
  const r = ref.trim();
  const opts = { apiKey, ledger };
  const part = 'snippet,contentDetails';

  // Kimi K3 finding L5(b): the doc said "CACHE THE RESULT" but the function took
  // no cache and returned no handle, making the advice unenforceable. At 200
  // entities the 100-unit search fallback costs 20,000 units — TWO DAYS of the
  // entire daily quota, spent in one sync. Pass any `{get,set}` (a Map works) and
  // resolution becomes a one-time cost per channel.
  if (cache && typeof cache.get === 'function') {
    const hit = await cache.get(r);
    if (hit && hit.uploadsPlaylistId) return hit;
  }

  let data;
  if (/^UC[A-Za-z0-9_-]{22}$/.test(r)) {
    data = await api(fetchImpl, 'channels', { part, id: r }, opts);
  } else if (r.startsWith('@')) {
    data = await api(fetchImpl, 'channels', { part, forHandle: r }, opts);
  } else {
    // 100 units — the expensive path, used only when we have nothing better.
    const found = await api(fetchImpl, 'search', { part: 'snippet', q: r, type: 'channel', maxResults: 1 }, opts);
    const id = found?.items?.[0]?.snippet?.channelId || found?.items?.[0]?.id?.channelId;
    if (!id) throw new CollectError(`youtube: no channel found for '${r}'`);
    data = await api(fetchImpl, 'channels', { part, id }, opts);
  }

  const ch = data?.items?.[0];
  const uploads = ch?.contentDetails?.relatedPlaylists?.uploads;
  if (!ch?.id || !uploads) throw new CollectError(`youtube: could not resolve a uploads playlist for '${r}'`);
  const resolved = { channelId: ch.id, uploadsPlaylistId: uploads, title: ch.snippet?.title ?? null };
  if (cache && typeof cache.set === 'function') await cache.set(r, resolved);
  return resolved;
}

/**
 * Page a channel's uploads at 1 unit per 50 videos.
 *
 * `windowComplete` is true only when the playlist was exhausted, so the reconcile
 * step never infers retraction from a page cut short by `max`.
 */
export async function collectUploads(uploadsPlaylistId, {
  fetchImpl = fetch, apiKey, ledger, max = 100, pageSize = 50, entityRef = null,
} = {}) {
  if (typeof uploadsPlaylistId !== 'string' || !uploadsPlaylistId.trim()) {
    throw new CollectError('youtube: uploadsPlaylistId is required (get it from resolveChannel and CACHE it)');
  }
  const ceiling = Math.min(Math.max(Number(max) || 100, 1), MAX_TOTAL);
  const per = clampPage(pageSize);
  const items = [];
  const seenTokens = new Set();
  // Per-run id dedupe. The seen-cursor brake stops the LOOP, but only after a
  // replayed page has been consumed — so without this a server that returns the
  // same page twice yields duplicate items and an inflated fetched count.
  const seenIds = new Set();
  let pageToken;
  let exhausted = false;
  let pages = 0;

  // Same H1 brake as the Bluesky adapter: a page where every entry lacks
  // contentDetails.videoId leaves items.length unchanged, so a cycling
  // nextPageToken would spin forever at 1 quota unit per iteration — burning the
  // entire 10,000-unit daily budget in a few minutes. Both brakes leave
  // exhausted=false → windowComplete=false → retraction cannot be authorized.
  while (items.length < ceiling && pages < MAX_PAGES) {
    pages += 1;
    const data = await api(fetchImpl, 'playlistItems', {
      part: 'snippet,contentDetails',
      playlistId: uploadsPlaylistId.trim(),
      maxResults: Math.min(per, ceiling - items.length),
      pageToken,
    }, { apiKey, ledger });

    const list = data?.items || [];
    if (!list.length) { exhausted = true; break; }

    for (const it of list) {
      const videoId = it?.contentDetails?.videoId;
      // Validate BEFORE interpolating into canonicalUrl. This value comes
      // straight from the API response and never passes through sanitizeHandles,
      // so it is the one identifier in this adapter with no upstream guard.
      if (!videoId || !VIDEO_ID.test(videoId)) continue;
      if (seenIds.has(videoId)) continue;
      seenIds.add(videoId);
      const sn = it.snippet || {};
      items.push(normalizeItem({
        sourceKey: SOURCE_KEY,
        externalId: videoId,
        entityRef: entityRef || sn.channelId || null,
        kind: 'video',
        title: sn.title,
        text: sn.description,
        authorName: sn.channelTitle,
        canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
        // videoPublishedAt is the true publish time; snippet.publishedAt is when
        // it entered the playlist. Preferring the former avoids quietly
        // mis-dating back-catalogue videos.
        publishedAt: it.contentDetails?.videoPublishedAt || sn.publishedAt,
        sourceTier: 'official-api',
        termsPosture: 'official-api',
        fetchMethod: 'data-api-v3',
      }, { fetchedAt: new Date().toISOString() }));
    }

    pageToken = data?.nextPageToken;
    if (!pageToken) { exhausted = true; break; }
    if (seenTokens.has(pageToken)) break; // cycling token → stop, window stays incomplete
    seenTokens.add(pageToken);
  }

  return { items: items.slice(0, ceiling), windowComplete: exhausted };
}

export const adapter = Object.freeze({
  key: SOURCE_KEY,
  label: 'YouTube',
  tier: 'official-api',
  termsPosture: 'official-api',
  requiresCredential: true,
  credentialHint: 'YOUTUBE_API_KEY — free, 10,000 units/day',
  handleField: 'youtube',
  resolve: resolveChannel,
  collect: collectUploads,
});