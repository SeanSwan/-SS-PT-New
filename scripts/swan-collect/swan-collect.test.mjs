/**
 * swan-collect.test.mjs — unit tests for the portable collector.
 * Run: node --test scripts/swan-collect/swan-collect.test.mjs
 *
 * ZERO network. `fetch` is injected everywhere, so these run offline and fast.
 * They lock the behaviours that would silently corrupt a newsroom's evidence:
 *   - no fabricated dates, ever
 *   - markup never survives to a consumer
 *   - the scope gate fails CLOSED
 *   - retraction is never inferred from an incomplete window
 *   - reposts are not attributed to the reposting entity
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeItem, toIsoOrNull, safeHttpUrl, stripMarkup, clip, itemKey, CollectError, CAPS, cleanMetrics,
} from './core/item.mjs';
import { reconcile } from './core/reconcile.mjs';
import {
  checkEntity, assertCollectable, sanitizeHandles, ScopeDenied, CATEGORY_KEYS,
} from './core/entity-scope.mjs';
import { collectPosts, permalinkFor, searchActors } from './adapters/bluesky.mjs';
import { collectUploads, resolveChannel, createQuotaLedger, UNIT_COST } from './adapters/youtube.mjs';

const AT = '2026-08-11T12:00:00.000Z';
const base = { sourceKey: 'test', externalId: 'x1', kind: 'post', sourceTier: 'official-api', termsPosture: 'official-api' };

// ── core/item ───────────────────────────────────────────────────────────────

test('toIsoOrNull NEVER guesses — bad input becomes null, not now()', () => {
  assert.equal(toIsoOrNull('2026-08-11T12:00:00Z'), '2026-08-11T12:00:00.000Z');
  assert.equal(toIsoOrNull('not a date'), null);
  assert.equal(toIsoOrNull(''), null);
  assert.equal(toIsoOrNull(null), null);
  assert.equal(toIsoOrNull(undefined), null);
  // A bare number is ambiguous (seconds vs ms) so we refuse rather than guess.
  assert.equal(toIsoOrNull(1754913600), null);
  // Out-of-window dates are parse artifacts far more often than truth.
  assert.equal(toIsoOrNull('1200-01-01'), null);
  assert.equal(toIsoOrNull('2999-01-01'), null);
});

test('safeHttpUrl rejects every non-http(s) scheme and embedded credentials', () => {
  assert.equal(safeHttpUrl('https://example.com/a'), 'https://example.com/a');
  assert.equal(safeHttpUrl('javascript:alert(1)'), null);
  assert.equal(safeHttpUrl('data:text/html,<script>x</script>'), null);
  assert.equal(safeHttpUrl('file:///etc/passwd'), null);
  assert.equal(safeHttpUrl('https://user:pass@example.com'), null);
  assert.equal(safeHttpUrl('not a url'), null);
  assert.equal(safeHttpUrl(''), null);
});

test('stripMarkup removes scripts, styles, and tags', () => {
  assert.match(stripMarkup('<script>evil()</script>hello'), /hello/);
  assert.doesNotMatch(stripMarkup('<script>evil()</script>hello'), /evil/);
  assert.doesNotMatch(stripMarkup('<style>.a{}</style>hi'), /\.a\{/);
  assert.doesNotMatch(stripMarkup('<b onclick="x">hi</b>'), /onclick/);
});

test('normalizeItem strips markup BEFORE clipping so a cut tag cannot survive', () => {
  const item = normalizeItem({ ...base, text: '<img src=x onerror=alert(1)> real text' }, { fetchedAt: AT });
  assert.doesNotMatch(item.text, /onerror/);
  assert.doesNotMatch(item.text, /</);
  assert.match(item.text, /real text/);
});

test('normalizeItem enforces caps', () => {
  const item = normalizeItem({ ...base, text: 'a'.repeat(CAPS.text + 5_000) }, { fetchedAt: AT });
  assert.equal(item.text.length, CAPS.text);
});

test('normalizeItem throws on OUR bugs but degrades on THEIR data', () => {
  // our bug → loud
  assert.throws(() => normalizeItem({ ...base, sourceKey: undefined }, { fetchedAt: AT }), CollectError);
  assert.throws(() => normalizeItem({ ...base, externalId: '' }, { fetchedAt: AT }), CollectError);
  assert.throws(() => normalizeItem({ ...base, kind: 'tweet' }, { fetchedAt: AT }), CollectError);
  assert.throws(() => normalizeItem({ ...base, sourceTier: 'vibes' }, { fetchedAt: AT }), CollectError);
  assert.throws(() => normalizeItem({ ...base, termsPosture: 'fine-probably' }, { fetchedAt: AT }), CollectError);
  assert.throws(() => normalizeItem({ ...base, sourceKey: 'Bad Key' }, { fetchedAt: AT }), CollectError);
  assert.throws(() => normalizeItem(base, { fetchedAt: 'nonsense' }), CollectError);
  // their data → quiet degradation, never a thrown sync
  const item = normalizeItem({ ...base, publishedAt: 'garbage', canonicalUrl: 'javascript:x' }, { fetchedAt: AT });
  assert.equal(item.publishedAt, null);
  assert.equal(item.canonicalUrl, null);
});

test('normalizeItem always carries provenance', () => {
  const item = normalizeItem({ ...base, fetchMethod: 'xrpc' }, { fetchedAt: AT });
  assert.equal(item.sourceTier, 'official-api');
  assert.equal(item.termsPosture, 'official-api');
  assert.equal(item.fetchMethod, 'xrpc');
  assert.equal(item.fetchedAt, AT);
  assert.equal(item.lastSeenAt, AT);
  assert.equal(item.retractedAt, null);
});

// ── retraction ──────────────────────────────────────────────────────────────

const mk = (id) => normalizeItem({ ...base, externalId: id }, { fetchedAt: AT });
const LATER = '2026-08-12T12:00:00.000Z';

test('reconcile marks a vanished item retracted ONLY when the window was complete', () => {
  const prev = [mk('a'), mk('b')];
  const now = [mk('a')];

  const partial = reconcile(prev, now, { at: LATER });
  assert.equal(partial.retracted.length, 0, 'an incomplete window must NEVER mass-retract');

  const full = reconcile(prev, now, { at: LATER, windowComplete: true });
  assert.equal(full.retracted.length, 1);
  assert.equal(full.retracted[0].externalId, 'b');
  assert.equal(full.retracted[0].retractedAt, LATER);
});

test('reconcile preserves first-seen provenance and advances liveness', () => {
  const prev = [mk('a')];
  const { updated } = reconcile(prev, [mk('a')], { at: LATER, windowComplete: true });
  assert.equal(updated[0].fetchedAt, AT, 'original fetchedAt is preserved');
  assert.equal(updated[0].lastSeenAt, LATER, 'lastSeenAt advances');
});

test('reconcile classifies new items as added and does not re-stamp retractions', () => {
  const { added } = reconcile([], [mk('new')], { at: LATER, windowComplete: true });
  assert.equal(added.length, 1);
  const already = { ...mk('gone'), retractedAt: LATER };
  const { retracted } = reconcile([already], [], { at: '2026-08-13T00:00:00.000Z', windowComplete: true });
  assert.equal(retracted.length, 0, 'an already-retracted item is not re-stamped');
});

test('reconcile requires a valid timestamp', () => {
  assert.throws(() => reconcile([], [], { at: 'whenever' }), CollectError);
});

test('itemKey is stable and source-scoped', () => {
  assert.equal(itemKey(mk('a')), 'test:a');
});

// ── entity scope gate ───────────────────────────────────────────────────────

test('scope gate ALLOWS the four public categories', () => {
  assert.equal(checkEntity({ name: 'Reuters', category: 'organization' }).allowed, true);
  assert.equal(checkEntity({ name: 'Acme', category: 'brand_account' }).allowed, true);
  assert.equal(checkEntity({
    name: 'A Mayor', category: 'official', citation: 'https://city.gov/officials/mayor',
  }).allowed, true);
  assert.equal(checkEntity({
    name: 'A Figure', category: 'public_figure', citation: 'https://example.com/about',
  }).allowed, true);
});

test('scope gate DENIES private-person search — the whole point of the module', () => {
  const v = checkEntity({ name: 'Jane Q Neighbour', category: 'person' });
  assert.equal(v.allowed, false);
  assert.equal(v.code, 'OUT_OF_SCOPE');
  assert.match(v.reason, /does not build profiles of private individuals/);
});

test('scope gate FAILS CLOSED on unknown/omitted/prototype-polluting categories', () => {
  assert.equal(checkEntity({ name: 'X', category: 'future_category' }).allowed, false);
  assert.equal(checkEntity({ name: 'X' }).allowed, false);
  // `hasOwnProperty` guard: 'constructor' must not resolve via the prototype chain.
  assert.equal(checkEntity({ name: 'X', category: 'constructor' }).allowed, false);
  assert.equal(checkEntity({ name: 'X', category: 'toString' }).allowed, false);
  assert.equal(checkEntity(null).allowed, false);
});

test('scope gate requires a REAL citation where the category demands one', () => {
  const noCite = checkEntity({ name: 'A Mayor', category: 'official' });
  assert.equal(noCite.allowed, false);
  assert.equal(noCite.code, 'CITATION_REQUIRED');
  // A hand-wave is not a citation.
  assert.equal(checkEntity({ name: 'A Mayor', category: 'official', citation: 'well known' }).allowed, false);
  assert.equal(checkEntity({ name: 'A Mayor', category: 'official', citation: 'javascript:x' }).allowed, false);
});

test('assertCollectable throws ScopeDenied with a machine-readable code', () => {
  assert.throws(() => assertCollectable({ name: 'Someone', category: 'person' }), (e) => e instanceof ScopeDenied && e.code === 'OUT_OF_SCOPE');
});

test('sanitizeHandles drops anything that is not identifier-shaped', () => {
  const out = sanitizeHandles({
    bluesky: 'reuters.com',
    youtube: '@Reuters',
    bad: 'has space',
    worse: '../../etc/passwd',
    'BAD KEY': 'x',
    nested: { not: 'a string' },
  });
  // Spread to a plain object: `out` has a NULL PROTOTYPE by design (L2 fix), so
  // a strict deepEqual against a literal would fail on the prototype alone.
  assert.deepEqual({ ...out }, { bluesky: 'reuters.com', youtube: '@Reuters' });
});

test('the category list is exactly the four intended ones', () => {
  assert.deepEqual([...CATEGORY_KEYS].sort(), ['brand_account', 'official', 'organization', 'public_figure']);
});

// ── adapters (injected fetch, zero network) ─────────────────────────────────

const jsonRes = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test('bluesky permalinkFor builds a real link or returns null — never a guess', () => {
  assert.equal(
    permalinkFor('reuters.com', 'at://did:plc:abc/app.bsky.feed.post/3msxyz'),
    'https://bsky.app/profile/reuters.com/post/3msxyz',
  );
  assert.equal(permalinkFor('reuters.com', 'at://did:plc:abc/app.bsky.feed.like/3msxyz'), null);
  assert.equal(permalinkFor(null, 'at://did:plc:abc/app.bsky.feed.post/3msxyz'), null);
});

test('bluesky collectPosts normalizes, excludes reposts, and reports window completeness', async () => {
  const feed = {
    feed: [
      { post: { uri: 'at://did:plc:a/app.bsky.feed.post/p1', author: { handle: 'reuters.com', displayName: 'Reuters' }, record: { text: 'real post', createdAt: '2026-08-11T10:00:00Z' }, likeCount: 5 } },
      { reason: { $type: 'app.bsky.feed.defs#reasonRepost' }, post: { uri: 'at://did:plc:a/app.bsky.feed.post/p2', author: { handle: 'other.com' }, record: { text: 'someone else', createdAt: '2026-08-11T09:00:00Z' } } },
    ],
  };
  const { items, windowComplete } = await collectPosts('reuters.com', { fetchImpl: async () => jsonRes(feed) });
  assert.equal(items.length, 1, 'the repost is excluded — it is not this entity speaking');
  assert.equal(items[0].text, 'real post');
  assert.equal(items[0].sourceKey, 'bluesky');
  assert.equal(items[0].termsPosture, 'public-no-auth');
  assert.equal(items[0].publishedAt, '2026-08-11T10:00:00.000Z');
  assert.equal(windowComplete, true, 'no cursor returned → feed exhausted');
});

test('REGRESSION: searchActors enriches with follower counts — the impersonation signal', async () => {
  // searchActors returns NO counts (verified live: all null), so without the
  // getProfiles enrichment a human cannot tell the real Reuters (346k) from a
  // bot squatting the name (19k). Discovery without that signal is a trap.
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (url.includes('searchActors')) {
      return jsonRes({ actors: [{ handle: 'real.com', did: 'did:plc:1' }, { handle: 'fake.bsky.social', did: 'did:plc:2' }] });
    }
    return jsonRes({ profiles: [
      { handle: 'real.com', followersCount: 346118, postsCount: 98879, description: 'Official' },
      { handle: 'fake.bsky.social', followersCount: 19216, postsCount: 19574, description: 'This bot completed its mission' },
    ] });
  };
  const out = await searchActors('Reuters', { fetchImpl });
  assert.equal(out[0].followersCount, 346118);
  assert.equal(out[1].followersCount, 19216);
  assert.match(out[1].description, /bot completed/);
  assert.equal(calls.length, 2, 'enrichment costs exactly ONE extra batched call');
  assert.match(calls[1], /getProfiles/);
});

test('searchActors degrades to unenriched results rather than failing discovery', async () => {
  const fetchImpl = async (url) => (url.includes('searchActors')
    ? jsonRes({ actors: [{ handle: 'a.com', did: 'did:plc:1' }] })
    : jsonRes({}, 500));
  const out = await searchActors('x', { fetchImpl });
  assert.equal(out.length, 1, 'a failed enrichment must not lose the search result');
  assert.equal(out[0].followersCount, null);
});

test('bluesky surfaces rate limiting distinctly instead of as a generic failure', async () => {
  await assert.rejects(
    () => searchActors('x', { fetchImpl: async () => jsonRes({}, 429) }),
    (e) => e instanceof CollectError && /rate limited/.test(e.message),
  );
});

test('bluesky collectPosts stops at max and reports the window as INCOMPLETE', async () => {
  const page = () => ({
    cursor: 'more',
    feed: Array.from({ length: 50 }, (_, i) => ({
      post: { uri: `at://did:plc:a/app.bsky.feed.post/p${Math.random().toString(36).slice(2)}${i}`, author: { handle: 'a.com' }, record: { text: 't', createdAt: '2026-08-11T10:00:00Z' } },
    })),
  });
  const { items, windowComplete } = await collectPosts('a.com', { fetchImpl: async () => jsonRes(page()), max: 60 });
  assert.equal(items.length, 60);
  assert.equal(windowComplete, false, 'cut short by max → retraction must NOT be inferred');
});

test('youtube resolveChannel uses the 1-unit path for handles, not the 100-unit search', async () => {
  const ledger = createQuotaLedger();
  const seen = [];
  const fetchImpl = async (url) => {
    seen.push(url);
    return jsonRes({ items: [{ id: 'UC123', snippet: { title: 'Chan' }, contentDetails: { relatedPlaylists: { uploads: 'UU123' } } }] });
  };
  const out = await resolveChannel('@Reuters', { fetchImpl, apiKey: 'k', ledger });
  assert.equal(out.uploadsPlaylistId, 'UU123');
  assert.equal(ledger.spent, UNIT_COST.channels, 'must cost 1 unit, not 100');
  assert.match(seen[0], /forHandle=%40Reuters/);
});

test('youtube collectUploads prefers the true publish date over playlist-add date', async () => {
  const body = {
    items: [{
      contentDetails: { videoId: 'vid00000001', videoPublishedAt: '2020-01-01T00:00:00Z' },
      snippet: { title: 'Old video', description: 'd', channelTitle: 'Chan', channelId: 'UC1', publishedAt: '2026-08-01T00:00:00Z' },
    }],
  };
  const { items, windowComplete } = await collectUploads('UU123', { fetchImpl: async () => jsonRes(body), apiKey: 'k' });
  assert.equal(items[0].publishedAt, '2020-01-01T00:00:00.000Z', 'back-catalogue video must not be mis-dated to today');
  assert.equal(items[0].canonicalUrl, 'https://www.youtube.com/watch?v=vid00000001');
  assert.equal(items[0].sourceTier, 'official-api');
  assert.equal(windowComplete, true);
});

test('youtube reports quota exhaustion as its own actionable error', async () => {
  await assert.rejects(
    () => collectUploads('UU1', { fetchImpl: async () => jsonRes({ error: { errors: [{ reason: 'quotaExceeded' }] } }, 403), apiKey: 'k' }),
    (e) => e instanceof CollectError && /quota .*exhausted/.test(e.message),
  );
});

test('youtube refuses to run without a key rather than fetching a 403', async () => {
  let called = false;
  await assert.rejects(
    () => collectUploads('UU1', { fetchImpl: async () => { called = true; return jsonRes({}); } }),
    CollectError,
  );
  assert.equal(called, false, 'no network call is made without a key');
});

// ── Kimi K3 packet-6 findings — all empirically confirmed, now locked ────────

test('H1: an all-skipped page with a cycling cursor TERMINATES (was an infinite loop)', async () => {
  // Confirmed 2026-08-11: the verification harness hung so hard it starved its
  // own setTimeout and had to be killed externally. items.length never grew, so
  // neither loop condition could ever end.
  let calls = 0;
  const { items, windowComplete } = await collectPosts('a.com', {
    fetchImpl: async () => { calls += 1; return jsonRes({ cursor: 'loop', feed: [{ post: null }, { post: { uri: null } }] }); },
    max: 10,
  });
  assert.equal(items.length, 0);
  assert.equal(windowComplete, false, 'an anomalous run must NEVER authorize retraction');
  assert.ok(calls <= 3, `cycling cursor must stop immediately, made ${calls} calls`);
});

test('H1: youtube collectUploads also terminates on a cycling page token', async () => {
  let calls = 0;
  const { items, windowComplete } = await collectUploads('UU1', {
    fetchImpl: async () => { calls += 1; return jsonRes({ nextPageToken: 'same', items: [{ snippet: {} }] }); },
    apiKey: 'k', max: 10,
  });
  assert.equal(items.length, 0);
  assert.equal(windowComplete, false);
  assert.ok(calls <= 3, `must not burn quota in a loop; made ${calls} calls`);
});

test('H2: reconcile REFUSES to retract across mixed scopes (denial-of-truth)', () => {
  // Confirmed: an honest windowComplete=true from a complete Bluesky sync
  // retracted 2 of 3 items — every YouTube item for the entity.
  const mkS = (sk, id) => normalizeItem({ ...base, sourceKey: sk, externalId: id }, { fetchedAt: AT });
  const previous = [mkS('bluesky', 'b1'), mkS('youtube', 'y1'), mkS('youtube', 'y2')];
  assert.throws(
    () => reconcile(previous, [mkS('bluesky', 'b1')], { at: LATER, windowComplete: true }),
    (e) => e instanceof CollectError && /single source\+entity/.test(e.message),
  );
  // Correctly scoped input still works.
  const ok = reconcile([mkS('bluesky', 'b1'), mkS('bluesky', 'b2')], [mkS('bluesky', 'b1')], { at: LATER, windowComplete: true });
  assert.equal(ok.retracted.length, 1);
  assert.equal(ok.retracted[0].externalId, 'b2');
});

test('M1: stripMarkup is bounded — quadratic blowup cannot be triggered by input size', () => {
  // Measured before the fix: 34KB→72ms, 137KB→1.16s, 342KB→7.04s.
  const hostile = '<script'.repeat(200_000); // ~1.4MB
  const t0 = Date.now();
  stripMarkup(hostile);
  const ms = Date.now() - t0;
  assert.ok(ms < 500, `stripMarkup took ${ms}ms — input bounding is not working`);
});

test('M2: toIsoOrNull refuses partial and locale dates that INVENT precision', () => {
  // All of these silently fabricated month/day/hour before the fix.
  assert.equal(toIsoOrNull('2099'), null, 'a bare year sorted atop every queue forever');
  assert.equal(toIsoOrNull('2020'), null);
  assert.equal(toIsoOrNull('0'), null, "V8 turned '0' into 2000-01-01T08:00:00Z");
  assert.equal(toIsoOrNull('May 5 2020'), null);
  assert.equal(toIsoOrNull('2026-08-11'), '2026-08-11T00:00:00.000Z', 'full dates still parse');
  assert.equal(toIsoOrNull('2026-08-11T10:30:00Z'), '2026-08-11T10:30:00.000Z');
});

test('M3: metrics accepts counts only — no content, no unbounded objects, no proto', () => {
  const item = normalizeItem({
    ...base,
    metrics: {
      likes: 5,
      replies: null,
      evil: 'x'.repeat(100_000),   // string content → dropped
      Bad_Key: 1,                   // wrong shape → dropped
      __proto__: { polluted: true },
      nested: { a: 1 },             // object → dropped
    },
  }, { fetchedAt: AT });
  assert.equal(item.metrics.likes, 5);
  assert.equal(item.metrics.replies, null);
  assert.equal(item.metrics.evil, undefined);
  assert.equal(item.metrics.Bad_Key, undefined);
  assert.equal(item.metrics.nested, undefined);
  assert.equal({}.polluted, undefined, 'Object.prototype must be untouched');
  assert.equal(Object.getPrototypeOf(item.metrics), null, 'null prototype');
});

test('M3: a metrics key flood is capped', () => {
  const many = {};
  for (let i = 0; i < 500; i += 1) many[`k${i}`] = i;
  const item = normalizeItem({ ...base, metrics: many }, { fetchedAt: AT });
  assert.ok(Object.keys(item.metrics).length <= 32);
});

test('L1: citationIsUsable rejects embedded credentials, matching safeHttpUrl', () => {
  const v = checkEntity({ name: 'A Mayor', category: 'official', citation: 'https://u:p@city.gov/mayor' });
  assert.equal(v.allowed, false, 'the two URL validators must not disagree');
});

test('L1: an optional citation is bounded like every other field', () => {
  const v = checkEntity({ name: 'Acme', category: 'brand_account', citation: 'x'.repeat(10_000) });
  assert.equal(v.allowed, true);
  assert.ok(v.entity.citation.length <= 2_048);
  assert.equal(checkEntity({ name: 'Acme', category: 'brand_account', citation: { evil: 1 } }).entity.citation, null);
});

test('L2: sanitizeHandles stores __proto__/constructor as real keys, not phantoms', () => {
  const out = sanitizeHandles({ bluesky: 'a.com', __proto__: 'x.com', constructor: 'y.com' });
  assert.equal(out.bluesky, 'a.com');
  // On a normal object literal these silently vanish or shadow; on a null
  // prototype they round-trip as ordinary keys.
  assert.equal(Object.getPrototypeOf(out), null);
  assert.equal({}.polluted, undefined);
});

test('L3: a PINNED post is kept; only an actual repost is excluded', () => {
  // Live check found no `reason` field at all across 90 newsroom entries, so the
  // pin case is unproven upstream — but skipping only what we mean to skip is
  // correct regardless, and losing a pinned statement is the expensive direction.
  const feed = { feed: [
    { reason: { $type: 'app.bsky.feed.defs#reasonPin' }, post: { uri: 'at://did:plc:a/app.bsky.feed.post/pinned', author: { handle: 'a.com' }, record: { text: 'pinned statement', createdAt: '2026-08-01T00:00:00Z' } } },
    { reason: { $type: 'app.bsky.feed.defs#reasonRepost' }, post: { uri: 'at://did:plc:a/app.bsky.feed.post/rp', author: { handle: 'b.com' }, record: { text: 'someone else', createdAt: '2026-08-01T00:00:00Z' } } },
  ] };
  return collectPosts('a.com', { fetchImpl: async () => jsonRes(feed) }).then(({ items }) => {
    assert.equal(items.length, 1);
    assert.equal(items[0].text, 'pinned statement');
  });
});

test('L4: a degraded re-fetch cannot erase good data already held', () => {
  const before = normalizeItem({ ...base, externalId: 'a', title: 'Real title', canonicalUrl: 'https://e.com/a', publishedAt: '2026-08-01T00:00:00Z' }, { fetchedAt: AT });
  const degraded = normalizeItem({ ...base, externalId: 'a', publishedAt: 'garbage', canonicalUrl: 'javascript:x' }, { fetchedAt: AT });
  const { updated } = reconcile([before], [degraded], { at: LATER, windowComplete: true });
  assert.equal(updated[0].title, 'Real title', 'a transient null must not overwrite evidence');
  assert.equal(updated[0].canonicalUrl, 'https://e.com/a');
  assert.equal(updated[0].publishedAt, '2026-08-01T00:00:00.000Z');
});

test('L5: entity names are stripped of control characters before reaching logs/UI', () => {
  const v = checkEntity({ name: 'Acme\u0000\u001b[31m Corp\n', category: 'organization' });
  assert.equal(v.entity.name, 'Acme[31m Corp');
});

test('L5: youtube rejects a malformed videoId instead of interpolating it into a URL', async () => {
  const body = { items: [
    { contentDetails: { videoId: 'not-valid-id-way-too-long' }, snippet: { title: 'bad' } },
    { contentDetails: { videoId: 'abcdefghijk', videoPublishedAt: '2026-08-01T00:00:00Z' }, snippet: { title: 'good' } },
  ] };
  const { items } = await collectUploads('UU1', { fetchImpl: async () => jsonRes(body), apiKey: 'k' });
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'good');
});

test('L5: resolveChannel short-circuits on a cache hit, spending ZERO quota', async () => {
  // 200 entities x the 100-unit search fallback = 20,000 units = two days' quota.
  const cache = new Map([['@Reuters', { channelId: 'UC1', uploadsPlaylistId: 'UU1', title: 'R' }]]);
  const ledger = createQuotaLedger();
  let called = false;
  const out = await resolveChannel('@Reuters', {
    fetchImpl: async () => { called = true; return jsonRes({}); }, apiKey: 'k', ledger, cache,
  });
  assert.equal(out.uploadsPlaylistId, 'UU1');
  assert.equal(called, false, 'a cache hit must make no network call');
  assert.equal(ledger.spent, 0);
});

test('SECURITY: a youtube error never echoes the API key', async () => {
  const key = 'AIzaSy-SUPER-SECRET-KEY-VALUE';
  try {
    await collectUploads('UU1', { fetchImpl: async () => jsonRes({}, 500), apiKey: key });
    assert.fail('should have thrown');
  } catch (e) {
    assert.doesNotMatch(e.message, /SUPER-SECRET/, 'the key must never reach an error message or log');
  }
});
