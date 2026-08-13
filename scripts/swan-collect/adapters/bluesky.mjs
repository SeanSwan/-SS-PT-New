/**
 * bluesky.mjs — Bluesky / AT Protocol adapter. NO API KEY, NO ACCOUNT.
 * ============================================================================
 * The cleanest source in the ladder, and the reason it is built first.
 *
 * VERIFIED LIVE 2026-08-11 against https://public.api.bsky.app (zero auth):
 *   - app.bsky.actor.searchActors    → 200, found reuters.com
 *   - com.atproto.identity.resolveHandle → 200, did:plc:jbvnehrrdqoulco4rf5gxg5r
 *   - app.bsky.feed.getAuthorFeed    → 200, live posts + a `cursor` (paging works)
 *   - app.bsky.actor.getProfile      → 200, Reuters: 98,866 posts / 346,110 followers
 * Real newsrooms publish here in real time, readable with no credential at all.
 *
 * WHY THIS MATTERS STRATEGICALLY: the goal is reaching what entities publish
 * without funding a platform. Many newsrooms, agencies and officials post to
 * Bluesky as well as (or instead of) X. Every item from here is `official-api` /
 * `public-no-auth` — no terms-of-service gray area, no key, no bill, no argument.
 *
 * PORTABILITY: `fetch` is INJECTED, never imported. That keeps this file runnable
 * in Node/Deno/Bun/browser, and — more importantly — makes it testable with zero
 * network. Copy the folder into another app and it works unchanged.
 *
 * @module swan-collect/adapters/bluesky
 */

import { normalizeItem, CollectError } from '../core/item.mjs';

export const SOURCE_KEY = 'bluesky';
const BASE = 'https://public.api.bsky.app/xrpc';

/** Bluesky caps getAuthorFeed at 100 per page; asking for more is an error. */
const MAX_PAGE = 100;
/** Our own ceiling on a single collection run — bounded work, always. */
const MAX_TOTAL = 500;
/** Hard page brake. MAX_PAGES x MAX_PAGE > MAX_TOTAL, so it never truncates a legitimate run. */
const MAX_PAGES = 20;

const clampPage = (n) => Math.min(Math.max(Number.isFinite(Number(n)) ? Number(n) : 50, 1), MAX_PAGE);

/**
 * Perform one XRPC GET. Params go through URLSearchParams so a handle can never
 * inject extra query parameters or escape the path.
 */
async function xrpc(fetchImpl, method, params, { timeoutMs = 15_000 } = {}) {
  const url = new URL(`${BASE}/${method}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  const res = await fetchImpl(url.toString(), {
    method: 'GET',
    headers: { accept: 'application/json' },
    redirect: 'error', // no 3xx-driven redirection off the public AppView
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res || typeof res.status !== 'number') throw new CollectError('bluesky: malformed fetch response');
  if (res.status === 429) throw new CollectError('bluesky: rate limited (429) — back off and retry later');
  if (!res.ok) {
    let detail = '';
    try { detail = JSON.stringify(await res.json()).slice(0, 200); } catch { /* body may not be JSON */ }
    throw new CollectError(`bluesky: ${method} returned ${res.status} ${detail}`);
  }
  return res.json();
}

/**
 * Find candidate accounts for an entity name. This is DISCOVERY only — it
 * proposes handles for a human to confirm; it never auto-binds a handle to an
 * entity. Auto-binding is how a collector ends up confidently following an
 * impersonator or a parody account and attributing its words to a real org.
 */
export async function searchActors(name, { fetchImpl = fetch, limit = 8, enrich = true } = {}) {
  if (typeof name !== 'string' || !name.trim()) throw new CollectError('bluesky: a search term is required');
  const data = await xrpc(fetchImpl, 'app.bsky.actor.searchActors', { q: name.trim(), limit: clampPage(limit) });
  const actors = (data?.actors || []).map((a) => ({
    handle: a.handle,
    did: a.did,
    displayName: a.displayName ?? null,
    description: a.description ?? null,
    followersCount: null,
    postsCount: null,
  }));
  if (!enrich || !actors.length) return actors;

  // searchActors does NOT return follower/post counts — verified live 2026-08-11,
  // every result came back null. Without those numbers a human cannot tell a real
  // org from an impersonator, and that is the entire job of this call. The live
  // search for "Reuters" returned the genuine account (346k followers) alongside
  // a bot whose own bio reads "This bot completed its mission" (19k) — indistinguishable
  // without enrichment. getProfiles batches every candidate into ONE extra
  // unauthenticated request, so the signal is essentially free.
  try {
    const url = new URL(`${BASE}/app.bsky.actor.getProfiles`);
    for (const a of actors.slice(0, 25)) url.searchParams.append('actors', a.handle);
    const res = await fetchImpl(url.toString(), {
      method: 'GET', headers: { accept: 'application/json' },
      redirect: 'error', signal: AbortSignal.timeout(15_000),
    });
    if (!res?.ok) return actors; // enrichment is a nicety; never fail discovery over it
    const profiles = (await res.json())?.profiles || [];
    const byHandle = new Map(profiles.map((p) => [p.handle, p]));
    return actors.map((a) => {
      const p = byHandle.get(a.handle);
      return p
        ? { ...a, followersCount: p.followersCount ?? null, postsCount: p.postsCount ?? null, description: p.description ?? a.description }
        : a;
    });
  } catch {
    return actors;
  }
}

/** Resolve a handle to its stable DID. DIDs survive handle changes; store both. */
export async function resolveHandle(handle, { fetchImpl = fetch } = {}) {
  const data = await xrpc(fetchImpl, 'com.atproto.identity.resolveHandle', { handle });
  const did = data?.did;
  if (typeof did !== 'string' || !did.startsWith('did:')) {
    throw new CollectError(`bluesky: could not resolve handle '${handle}'`);
  }
  return did;
}

/**
 * Turn an at:// URI into the public web permalink, which is what a citation
 * should point at. Returns null rather than guessing if the shape is unfamiliar —
 * a wrong canonical URL is worse than an absent one.
 */
export function permalinkFor(handleOrDid, atUri) {
  if (typeof atUri !== 'string') return null;
  const m = atUri.match(/^at:\/\/[^/]+\/app\.bsky\.feed\.post\/([A-Za-z0-9._~-]{1,64})$/);
  if (!m || !handleOrDid) return null;
  return `https://bsky.app/profile/${encodeURIComponent(handleOrDid)}/post/${m[1]}`;
}

/**
 * Collect an entity's recent posts, newest first.
 *
 * Returns `{ items, windowComplete }`. `windowComplete` is TRUE only when the
 * feed was exhausted (no cursor left) rather than cut short by `max` — the
 * reconcile step needs that distinction, because inferring retraction from a
 * truncated page would mass-retract items that are simply older than the window.
 */
export async function collectPosts(handle, { fetchImpl = fetch, max = 100, pageSize = 50, includeReposts = false } = {}) {
  if (typeof handle !== 'string' || !handle.trim()) throw new CollectError('bluesky: handle is required');
  const actor = handle.trim();
  const ceiling = Math.min(Math.max(Number(max) || 100, 1), MAX_TOTAL);
  const per = clampPage(pageSize);

  const items = [];
  const seenCursors = new Set();
  // Per-run id dedupe. The seen-cursor brake stops the LOOP, but only after a
  // replayed page has been consumed — so without this a server that returns the
  // same page twice yields duplicate items and an inflated fetched count.
  const seenIds = new Set();
  let cursor;
  let exhausted = false;
  let pages = 0;

  // Loop termination must NOT depend on items.length growing. Kimi K3 finding H1
  // (confirmed 2026-08-11): a page whose entries are ALL skipped — every entry a
  // repost, or every `post.uri` null — leaves items.length unchanged; if the
  // cursor then cycles, neither loop condition ever ends and the collector spins
  // forever at one network call per iteration. The verification harness hung so
  // hard it starved its own setTimeout and had to be killed externally.
  // Two independent brakes, both leaving exhausted=false → windowComplete=false
  // → fail-closed, so an anomalous run can never authorize retraction.
  while (items.length < ceiling && pages < MAX_PAGES) {
    pages += 1;
    const data = await xrpc(fetchImpl, 'app.bsky.feed.getAuthorFeed', {
      actor, limit: Math.min(per, ceiling - items.length), cursor,
    });
    const feed = data?.feed || [];
    if (!feed.length) { exhausted = true; break; }

    for (const entry of feed) {
      const post = entry?.post;
      const record = post?.record;
      if (!post?.uri || !record) continue;
      // A REPOST is someone else's speech; attributing it to this entity would be
      // a misattribution, so it is excluded unless explicitly requested. Match the
      // reason `$type` explicitly rather than testing truthiness.
      //
      // Kimi K3 finding L3 (partially confirmed): the old `if (entry?.reason)`
      // dropped EVERY annotated entry, which would silently discard a PINNED post
      // — often a newsroom's most newsworthy item. Live check across reuters.com,
      // apnews.com and npr.org (90 entries, 2026-08-11) found no `reason` field at
      // all, so the pin case is unproven in the default feed; this is corrected
      // anyway because skipping only what we mean to skip is right regardless, and
      // the failure direction (losing evidence) is the expensive one.
      const reasonType = typeof entry?.reason?.$type === 'string' ? entry.reason.$type : '';
      if (!includeReposts && reasonType.includes('reasonRepost')) continue;
      // A replayed page must not yield duplicate items (see seenIds note).
      if (seenIds.has(post.uri)) continue;
      seenIds.add(post.uri);

      items.push(normalizeItem({
        sourceKey: SOURCE_KEY,
        externalId: post.uri,
        entityRef: actor,
        kind: 'post',
        text: record.text,
        authorName: post.author?.displayName || post.author?.handle || null,
        canonicalUrl: permalinkFor(post.author?.handle || actor, post.uri),
        publishedAt: record.createdAt,
        sourceTier: 'public-no-auth',
        termsPosture: 'public-no-auth',
        fetchMethod: 'xrpc',
        metrics: {
          likes: post.likeCount ?? null,
          reposts: post.repostCount ?? null,
          replies: post.replyCount ?? null,
        },
      }, { fetchedAt: new Date().toISOString() }));
    }

    cursor = data?.cursor;
    if (!cursor) { exhausted = true; break; }
    // A repeated cursor means the server is cycling us. Stop, and deliberately
    // leave `exhausted` false so the caller cannot infer a complete window.
    if (seenCursors.has(cursor)) break;
    seenCursors.add(cursor);
  }

  return { items: items.slice(0, ceiling), windowComplete: exhausted };
}

/** Adapter descriptor — what the registry needs to know without importing internals. */
export const adapter = Object.freeze({
  key: SOURCE_KEY,
  label: 'Bluesky',
  tier: 'public-no-auth',
  termsPosture: 'public-no-auth',
  requiresCredential: false,
  handleField: 'bluesky',
  search: searchActors,
  collect: collectPosts,
});
