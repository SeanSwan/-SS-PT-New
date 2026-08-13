/**
 * vendor.mjs — the closed platforms: X, Instagram, TikTok, Facebook.
 * ============================================================================
 * WHY THIS FILE EXISTS AS ONE ADAPTER AND NOT FOUR SCRAPERS.
 *
 * Measured live 2026-08-11, from a residential IP, no credentials:
 *   Instagram  `?__a=1`                       → 400  (Meta closed it)
 *   Reddit     `/r/news/new.json`             → 403  (even with a browser UA)
 *   X          `cdn.syndication.twimg.com`    → 200 but ZERO bytes
 *   TikTok     `/@handle`                     → 200, 364KB of SPA shell HTML
 *   Facebook   `/Reuters`                     → 200, 480KB of login-walled HTML
 *
 * So: none of the four is reachable keyless in any durable way. TikTok and
 * Facebook "work" only in the sense that HTML comes back — the data sits in an
 * embedded JSON blob whose shape changes without notice. Writing four parsers
 * against those blobs is the maintenance treadmill: each breaks independently,
 * silently, and usually at the worst time.
 *
 * The honest engineering answer is to let a metered vendor absorb that churn
 * (Apify, SocialCrawl, Bright Data all sell exactly this) and keep ONE adapter
 * here that speaks a provider-agnostic shape. Sean's objection was never
 * spending money — it was funding X specifically. Paying a data vendor does not.
 *
 * SHIPS DISABLED. No provider is configured by default, no key is embedded, and
 * every item it produces is stamped `vendor-licensed` so a reader can always see
 * that this item did not come from an official API.
 *
 * ⚠ HONEST STATUS: implemented and unit-tested against injected fetches, but
 * NOT live-verified — no vendor account exists in this session. Treat the
 * response mappings below as a starting contract to confirm against the real
 * provider before trusting them.
 *
 * @module swan-collect/adapters/vendor
 */

import { normalizeItem, CollectError, clip } from '../core/item.mjs';
import { readCapped } from '../core/http.mjs';

export const SOURCE_KEY_PREFIX = 'vendor';

/** Platforms this adapter is meant to cover. Each becomes `vendor_<platform>`. */
export const PLATFORMS = Object.freeze(['x', 'instagram', 'tiktok', 'facebook', 'linkedin', 'threads']);

const MAX_TOTAL = 500;
const MAX_PAGES = 20;
/** Hard ceiling on one vendor response body. */
const MAX_BODY_BYTES = 8_000_000;

/**
 * A provider descriptor is DATA, not code — the same principle as SwanGuard's
 * source manifests. Adding a vendor means adding one of these, never a new file.
 *
 * `map` describes where the fields live in that vendor's response, using simple
 * dotted paths. Deliberately not a general expression language: a config format
 * powerful enough to compute is a config format powerful enough to attack.
 */
export function defineProvider({ name, endpoint, authHeader = 'Authorization', authPrefix = 'Bearer ', itemsPath, map, pageParam, cursorPath }) {
  if (typeof name !== 'string' || !/^[a-z][a-z0-9_-]{0,31}$/.test(name)) {
    throw new CollectError('vendor: provider name must be a lowercase slug');
  }
  if (typeof endpoint !== 'string' || !endpoint.startsWith('https://')) {
    throw new CollectError(`vendor: provider '${name}' endpoint must be an https URL`);
  }
  if (!map || typeof map !== 'object' || !map.externalId) {
    throw new CollectError(`vendor: provider '${name}' needs a field map including externalId`);
  }
  return Object.freeze({ name, endpoint, authHeader, authPrefix, itemsPath: itemsPath || 'items', map: Object.freeze({ ...map }), pageParam: pageParam || 'cursor', cursorPath: cursorPath || 'cursor' });
}

/**
 * Read a dotted path out of an object. Returns undefined rather than throwing.
 * Rejects prototype-walking segments so a hostile response cannot reach
 * `__proto__` or `constructor` through a configured path.
 */
export function readPath(obj, path) {
  if (!obj || typeof path !== 'string' || !path) return undefined;
  let cur = obj;
  for (const seg of path.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined;
    if (seg === '__proto__' || seg === 'constructor' || seg === 'prototype') return undefined;
    if (!Object.prototype.hasOwnProperty.call(cur, seg)) return undefined;
    cur = cur[seg];
  }
  return cur;
}

/**
 * Reference implementations. These match the SHAPE the named vendors document;
 * they are unverified against a live account and must be confirmed before use.
 */
export const PROVIDERS = Object.freeze({
  generic: defineProvider({
    name: 'generic',
    endpoint: 'https://example.invalid/v1/{platform}/posts',
    itemsPath: 'items',
    cursorPath: 'nextCursor',
    map: {
      externalId: 'id', text: 'text', title: 'title', canonicalUrl: 'url',
      publishedAt: 'createdAt', authorName: 'author.name',
      likes: 'stats.likes', comments: 'stats.comments', shares: 'stats.shares',
    },
  }),
});

const platformKey = (platform) => `${SOURCE_KEY_PREFIX}_${platform}`;

/**
 * Collect from a vendor. Fails CLOSED: no provider, no key, or an unknown
 * platform all refuse before any network call is attempted.
 */
export async function collectVendor(handle, {
  fetchImpl = fetch, provider, apiKey, platform, max = 100, entityRef = null, timeoutMs = 30_000,
} = {}) {
  if (!provider || typeof provider !== 'object') {
    throw new CollectError('vendor: no provider configured — this adapter ships disabled by design');
  }
  if (!PLATFORMS.includes(platform)) {
    throw new CollectError(`vendor: platform must be one of ${PLATFORMS.join('|')}`);
  }
  if (typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new CollectError(`vendor: provider '${provider.name}' requires an API key`);
  }
  if (typeof handle !== 'string' || !handle.trim()) throw new CollectError('vendor: a handle is required');

  const ceiling = Math.min(Math.max(Number(max) || 100, 1), MAX_TOTAL);
  const items = [];
  const seenCursors = new Set();
  // Per-run id dedupe. The seen-cursor brake stops the LOOP, but only after a
  // replayed page has been consumed — so without this a server that returns the
  // same page twice yields duplicate items and an inflated fetched count.
  const seenIds = new Set();
  let cursor;
  let pages = 0;
  let exhausted = false;

  // Same termination discipline as every other adapter (Kimi K3 H1).
  while (items.length < ceiling && pages < MAX_PAGES) {
    pages += 1;

    const url = new URL(provider.endpoint.replace('{platform}', encodeURIComponent(platform)));
    url.searchParams.set('handle', handle.trim());
    url.searchParams.set('limit', String(Math.min(100, ceiling - items.length)));
    if (cursor) url.searchParams.set(provider.pageParam, cursor);

    const res = await fetchImpl(url.toString(), {
      method: 'GET',
      headers: {
        accept: 'application/json',
        // The key goes ONLY in a header, never the query string — so it cannot
        // leak through a logged URL, a referer, or an error message built from one.
        [provider.authHeader]: `${provider.authPrefix}${apiKey}`,
      },
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res || typeof res.status !== 'number') throw new CollectError('vendor: malformed fetch response');
    if (res.status === 401 || res.status === 403) throw new CollectError(`vendor: ${provider.name} rejected the credential (${res.status})`);
    if (res.status === 429) throw new CollectError(`vendor: ${provider.name} rate limited (429)`);
    if (!res.ok) throw new CollectError(`vendor: ${provider.name} returned ${res.status}`);

    // res.json() had NO cap at all (M1). Read bounded, then parse.
    const body = JSON.parse(await readCapped(res, MAX_BODY_BYTES, `vendor: ${provider.name}`));
    const batch = readPath(body, provider.itemsPath);
    if (!Array.isArray(batch) || !batch.length) { exhausted = true; break; }

    for (const raw of batch) {
      // `limit` is only a REQUEST parameter — nothing binds the response. Kimi K3
      // packet-7 M2: a vendor returning 1,000,000 items in one page would run a
      // million normalizeItem calls and buffer them all before the trailing
      // slice(). The ceiling has to be enforced inside the loop, not after it.
      if (items.length >= ceiling) break;
      const externalId = readPath(raw, provider.map.externalId);
      if (externalId === undefined || externalId === null) continue;
      if (seenIds.has(String(externalId))) continue;
      seenIds.add(String(externalId));
      items.push(normalizeItem({
        sourceKey: platformKey(platform),
        externalId: clip(String(externalId), 512),
        entityRef: entityRef || handle.trim(),
        kind: platform === 'tiktok' ? 'video' : 'post',
        title: readPath(raw, provider.map.title),
        text: readPath(raw, provider.map.text),
        authorName: readPath(raw, provider.map.authorName),
        canonicalUrl: readPath(raw, provider.map.canonicalUrl),
        publishedAt: readPath(raw, provider.map.publishedAt),
        // A vendor is a THIRD-HAND source. Labelling it honestly is the whole
        // reason the posture field exists — a reader must be able to tell this
        // apart from something we got from the platform's own API.
        sourceTier: 'vendor-licensed',
        termsPosture: 'vendor-licensed',
        fetchMethod: `vendor:${provider.name}`,
        metrics: {
          likes: numOrNull(readPath(raw, provider.map.likes)),
          comments: numOrNull(readPath(raw, provider.map.comments)),
          shares: numOrNull(readPath(raw, provider.map.shares)),
        },
      }, { fetchedAt: new Date().toISOString() }));
    }

    cursor = readPath(body, provider.cursorPath);
    if (!cursor || typeof cursor !== 'string') { exhausted = true; break; }
    if (seenCursors.has(cursor)) break;
    seenCursors.add(cursor);
  }

  return { items: items.slice(0, ceiling), windowComplete: exhausted };
}

const numOrNull = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** One descriptor per closed platform, all disabled until a provider + key arrive. */
export const adapters = Object.freeze(PLATFORMS.map((platform) => Object.freeze({
  key: platformKey(platform),
  label: platform === 'x' ? 'X / Twitter' : platform[0].toUpperCase() + platform.slice(1),
  tier: 'vendor-licensed',
  termsPosture: 'vendor-licensed',
  requiresCredential: true,
  credentialHint: 'A metered data-vendor key (Apify / SocialCrawl / Bright Data). Not a platform key.',
  enabled: false,
  handleField: platform,
  platform,
  collect: (handle, opts = {}) => collectVendor(handle, { ...opts, platform }),
})));
