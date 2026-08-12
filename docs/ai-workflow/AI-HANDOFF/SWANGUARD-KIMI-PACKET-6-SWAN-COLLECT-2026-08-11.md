# swan-collect — Kimi K3 hostile review: portable entity-intel collector

This is NET-NEW code that ingests UNTRUSTED data from third-party social platforms and
decides WHO a civic newsroom is allowed to build a record about. Two blast radii: a data
one (untrusted input) and an ETHICAL one (the scope gate is the only thing standing
between this product and a private-person dossier tool). Attack both.

## Ground rules (unchanged from packets 1-5)

1. Every finding is a HYPOTHESIS. Give the exact attack, precondition, file:line, and **what
   evidence confirms or kills it**. Rate confidence. I verify all of them — in packet 2 three
   of four died including the CRITICAL, in packet 3 six of nine died. **Calibration beats volume.**
2. Escalate scrutiny WITH severity.
3. "This is correct and here is why" is valuable. An empty CRITICAL list is acceptable.

## Context

SwanGuard is an evidence-first civic newsroom. It already has government connectors and an
RSS/Atom syndication slice. This adds ENTITY intel — pull what a named organisation/official
actually published, from Bluesky and YouTube (more sources later, X deliberately last).

Design intent:
- **The server NEVER fetches a social platform.** A collector runs on the operator's
  residential machine and POSTs batches to SwanGuard. Rationale: datacenter IPs are blocked
  by every platform, AND this leaves the SSRF surface hardened in packet 3 untouched.
- **A source is DATA, not code** — adapters normalize to one IntelItem shape.
- **No fabricated data, ever.** An unparseable date is null, NEVER guessed, NEVER now().
- **Fail-closed scope gate.** Only organization / official / brand_account / public_figure.
  Officials and public figures REQUIRE a citation URL.
- **Retraction:** an item not seen in a COMPLETE re-fetch is marked retracted, not deleted
  and not left looking live.
- **Portable by contract:** zero npm deps, zero repo coupling, all I/O injected.

## Already-verified — do NOT re-report

- 30/30 unit tests pass. Bluesky adapter proven against the LIVE network (search, resolve,
  paged author feed, profile enrichment).
- Markup is stripped BEFORE clipping (tested). Caps enforced (tested).
- YouTube key never appears in an error message (tested explicitly).
- normalizeItem throws on OUR enum/id bugs, degrades silently on THEIR bad data (tested).
- searchActors enrichment failure degrades to unenriched rather than losing results (tested).

## Attack these specifically

1. **reconcile() retraction — the denial-of-truth attack.** The `windowComplete` flag gates
   whether a missing item is marked retracted. Can a source returning [] on error, a duplicate/looping
   cursor, a rate-limit mid-page, or a crafted feed produce windowComplete=true with a short
   set — mass-retracting real items? Is my default-false the right safety, or is there a path
   that sets it true wrongly? This is the highest-consequence logic here.
2. **entity-scope — can anything reach a private individual?** Prototype pollution (I guard
   with hasOwnProperty — is that sufficient?), category confusion, unicode/homoglyph names,
   a citation URL that passes new URL() but is meaningless. Is citationIsUsable actually
   doing work, or is it security theatre?
3. **sanitizeHandles** — these values become URL path/query segments in adapters. Any
   injection, traversal, or parameter-smuggling path through the allowed charset
   [A-Za-z0-9._:@-]? Note bluesky uses URLSearchParams and youtube uses URL — is either
   bypassable with those characters?
4. **normalizeItem / stripMarkup** — can markup survive strip-then-clip? ReDoS on multi-MB
   attacker text (every regex is applied to untrusted input)? Can safeHttpUrl pass something
   dangerous downstream (unicode/punycode confusion, userinfo, redirect-ish shapes)?
5. **toIsoOrNull** — I reject bare numbers and years outside 1990..2100. Does that create a
   silent data-loss bug for legitimate content, or miss a fabrication path?
6. **Adapter loops** — collectPosts/collectUploads page until max or no cursor. Can a
   platform return a cursor that never advances (infinite loop / unbounded memory)? I cap
   totals; is the cap enforced on every path?
7. **The portability claim** — does anything here actually couple to this repo, or fail
   outside Node? I claim it runs in Deno/Bun/browser.
8. **Anything about this design that hurts at 200 entities x 6 sources** that is invisible at 2.

## The code


## scripts/swan-collect/core/item.mjs
```js
/**
 * item.mjs — the normalized IntelItem contract. The portable heart of swan-collect.
 * ============================================================================
 * PORTABILITY CONTRACT (Sean 2026-08-11: "have these components be something we
 * can use in other apps"):
 *   - ZERO npm dependencies. Node built-ins only — and in fact this file imports
 *     nothing at all, so it runs unchanged in Node, Deno, Bun, or a browser.
 *   - ZERO coupling to SwanGuard, SwanStudios, or any repo layout.
 *   - ZERO I/O. Pure functions. Network and clock are injected by the caller.
 *   Copy `scripts/swan-collect/` into any project and it works as-is.
 *
 * WHY A SINGLE SHAPE: every source (Bluesky, YouTube, RSS, a vendor API) speaks a
 * different dialect. Normalizing at the ADAPTER boundary means the consuming app
 * learns one shape, and adding a source never changes the consumer. This is the
 * same "a source is DATA, not code" principle SwanGuard's syndication slice
 * already established — extended from feeds to entities.
 *
 * DOCTRINE CARRIED OVER FROM SwanGuard (do not relax these):
 *   - **No fabricated data, ever.** An unparseable date becomes `null`, NEVER a
 *     guess and NEVER "now". A consumer can render "date unknown"; it cannot
 *     un-learn a fabricated timestamp.
 *   - **Caps on everything.** Every string is bounded before storage. Untrusted
 *     input of unbounded length is how a collector becomes a memory bug.
 *   - **No markup passthrough.** Text is stripped of tags at the boundary so a
 *     consumer that renders it cannot be the XSS sink.
 *   - **Provenance is mandatory,** not optional metadata. An item that cannot say
 *     where it came from and when it was last confirmed is not admissible.
 *
 * @module swan-collect/core/item
 */

/** Field caps. Generous enough for real content, bounded enough to be safe. */
export const CAPS = Object.freeze({
  externalId: 512,
  entityRef: 256,
  title: 1_000,
  text: 10_000,
  url: 2_048,
  sourceKey: 64,
  authorName: 256,
});

/** How much we trust the acquisition path. Drives UI labelling and audit queries. */
export const SOURCE_TIERS = Object.freeze(['official-api', 'public-no-auth', 'public-web', 'vendor-licensed']);

/**
 * The terms posture of a source, recorded per item so a reviewer can find every
 * gray-area source with one query instead of reading code. Costs nothing to carry.
 */
export const TERMS_POSTURES = Object.freeze(['official-api', 'public-no-auth', 'vendor-licensed', 'tos-gray']);

export const ITEM_KINDS = Object.freeze(['post', 'video', 'article', 'release']);

export class CollectError extends Error {}

/** Bound a string, collapse whitespace, and return null for anything empty. */
export function clip(value, max) {
  if (typeof value !== 'string') return null;
  const s = value.replace(/\s+/g, ' ').trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

/**
 * Strip markup so a consumer rendering this text cannot become an injection sink.
 * Deliberately aggressive and NOT an HTML parser: it removes anything that looks
 * like a tag rather than trying to understand it. Same reasoning as SwanGuard's
 * narrow extractor — a real parser accepts constructs we do not want to accept.
 */
export function stripMarkup(value) {
  if (typeof value !== 'string') return null;
  return value
    .replace(/<script[\s\S]*?<\/script\s*>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ');
}

/**
 * Parse a date to a strict ISO-8601 UTC string, or return null.
 *
 * Returning null on failure is a DOCTRINE decision, not laziness: a guessed date
 * on a civic-newsroom item is fabricated evidence. Callers must render "date
 * unknown" rather than receive a plausible lie.
 */
export function toIsoOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  // Reject bare numbers: an epoch could be seconds or ms and we will not guess.
  if (typeof value === 'number') return null;
  const d = new Date(value);
  const t = d.getTime();
  if (!Number.isFinite(t)) return null;
  // A date outside a sane window is far more likely a parse artifact than truth.
  const year = d.getUTCFullYear();
  if (year < 1990 || year > 2100) return null;
  return d.toISOString();
}

/**
 * Accept only http(s) URLs. Rejects javascript:, data:, file:, embedded
 * credentials, and anything `new URL()` cannot parse.
 *
 * NOTE ON SCOPE: this does NOT attempt to block private/internal hosts. That is
 * deliberate — this collector never lets a remote source dictate a fetch target,
 * so SSRF is not in this module's threat model. The consuming app must not treat
 * a `canonicalUrl` as fetchable without its own egress policy.
 */
export function safeHttpUrl(value) {
  const s = clip(value, CAPS.url);
  if (!s) return null;
  let u;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  if (u.username || u.password) return null;
  return u.toString();
}

const inEnum = (value, allowed) => (allowed.includes(value) ? value : null);

/**
 * Normalize one adapter-produced record into a validated IntelItem.
 *
 * Throws CollectError on a violation the ADAPTER should have prevented (bad
 * enum, missing id) — those are programming errors worth failing loudly on.
 * Returns degraded-but-valid data for anything the SOURCE controls (a bad date,
 * an unusable link), because one malformed remote record must never break a sync.
 * That asymmetry is the whole point: fail loudly on our bugs, degrade gracefully
 * on their data.
 */
export function normalizeItem(input, { fetchedAt }) {
  if (!input || typeof input !== 'object') throw new CollectError('item must be an object');

  const sourceKey = clip(input.sourceKey, CAPS.sourceKey);
  if (!sourceKey) throw new CollectError('sourceKey is required');
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(sourceKey)) {
    throw new CollectError(`sourceKey '${sourceKey}' must be a lowercase slug`);
  }

  const externalId = clip(input.externalId, CAPS.externalId);
  if (!externalId) throw new CollectError(`[${sourceKey}] externalId is required`);

  const sourceTier = inEnum(input.sourceTier, SOURCE_TIERS);
  if (!sourceTier) throw new CollectError(`[${sourceKey}] sourceTier must be one of ${SOURCE_TIERS.join('|')}`);

  const termsPosture = inEnum(input.termsPosture, TERMS_POSTURES);
  if (!termsPosture) throw new CollectError(`[${sourceKey}] termsPosture must be one of ${TERMS_POSTURES.join('|')}`);

  const kind = inEnum(input.kind, ITEM_KINDS);
  if (!kind) throw new CollectError(`[${sourceKey}] kind must be one of ${ITEM_KINDS.join('|')}`);

  const stamp = toIsoOrNull(fetchedAt);
  if (!stamp) throw new CollectError('fetchedAt must be a valid date supplied by the caller');

  return {
    // identity — (sourceKey, externalId) is the natural upsert key
    sourceKey,
    externalId,
    entityRef: clip(input.entityRef, CAPS.entityRef),
    kind,

    // content — markup stripped BEFORE clipping so a truncated tag cannot survive
    title: clip(stripMarkup(input.title), CAPS.title),
    text: clip(stripMarkup(input.text), CAPS.text),
    authorName: clip(stripMarkup(input.authorName), CAPS.authorName),
    canonicalUrl: safeHttpUrl(input.canonicalUrl),

    // time — publishedAt is null when unknown. NEVER guessed.
    publishedAt: toIsoOrNull(input.publishedAt),
    fetchedAt: stamp,
    lastSeenAt: stamp,
    retractedAt: null,

    // provenance — mandatory, and the reason this shape is auditable
    sourceTier,
    termsPosture,
    fetchMethod: clip(input.fetchMethod, CAPS.sourceKey),

    // small allowlisted extras; adapters must pre-shape these
    metrics: input.metrics && typeof input.metrics === 'object' ? input.metrics : null,
  };
}

/** Stable dedupe key. Two records with the same key are the same item. */
export const itemKey = (item) => `${item.sourceKey}:${item.externalId}`;

/**
 * Reconcile a freshly-fetched batch against what was previously stored.
 *
 * This implements the retraction rule: an item we stored but did NOT see in a
 * complete re-fetch is marked `retractedAt` rather than deleted or left looking
 * current. A newsroom that keeps serving a deleted post as live is both an
 * ethical failure and the likeliest route to a real defamation claim.
 *
 * `windowComplete` is the safety catch. Retraction is only inferred when the
 * caller states the fetch covered the same window as the stored set — otherwise
 * a paging failure or a rate-limited partial page would mass-retract real items.
 * Default false: the dangerous behaviour must be opted into explicitly.
 */
export function reconcile(previous, fetched, { at, windowComplete = false } = {}) {
  const stamp = toIsoOrNull(at);
  if (!stamp) throw new CollectError('reconcile requires a valid `at` timestamp');

  const seen = new Map(fetched.map((i) => [itemKey(i), i]));
  const prior = new Map((previous || []).map((i) => [itemKey(i), i]));

  const added = [];
  const updated = [];
  const retracted = [];

  for (const [key, item] of seen) {
    const before = prior.get(key);
    if (!before) { added.push(item); continue; }
    // Preserve first-seen provenance; only advance the liveness stamp.
    updated.push({ ...before, ...item, fetchedAt: before.fetchedAt, lastSeenAt: stamp, retractedAt: null });
  }

  if (windowComplete) {
    for (const [key, item] of prior) {
      if (seen.has(key)) continue;
      if (item.retractedAt) continue; // already marked; do not re-stamp
      retracted.push({ ...item, retractedAt: stamp });
    }
  }

  return { added, updated, retracted, windowComplete };
}
```


## scripts/swan-collect/core/entity-scope.mjs
```js
/**
 * entity-scope.mjs — the guardrail that decides WHO may be collected on.
 * ============================================================================
 * This is the most important file in swan-collect, and the smallest.
 *
 * THE PROBLEM IT SOLVES. "Search any person and pull all their posts" is two
 * products wearing one sentence. Collecting an ORGANISATION's or a PUBLIC
 * OFFICIAL's public statements is what a newsroom does, and it is well protected.
 * Aggregating everything a PRIVATE INDIVIDUAL ever posted is a dossier — that
 * carries privacy-tort, GDPR/CCPA and harassment-facilitation exposure, and it
 * would undercut the citation discipline the rest of the product is built on.
 *
 * The distinction cannot live in a policy document, because a policy document is
 * not in the call path. So it lives here, as a function that returns DENY, and
 * every collection run goes through it.
 *
 * PORTABILITY: zero imports, zero I/O, pure. Copy anywhere. The categories are
 * data, so a different app can supply its own registry without forking logic.
 *
 * DESIGN NOTE — fail-closed. `assertCollectable` denies anything it does not
 * positively recognise. A new category added upstream without updating this file
 * is refused rather than silently permitted. Given what is on the other side of a
 * wrong answer here, an unhelpful deny beats a permissive accept every time.
 *
 * @module swan-collect/core/entity-scope
 */

export class ScopeDenied extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

/**
 * The allowlisted categories. Anything not on this list is denied.
 *
 * `public_figure` deliberately requires a CITATION — it is the only category
 * where the claim "this person is public" is a judgement rather than a fact, and
 * an unsourced judgement about a named person is exactly the thing that becomes a
 * defamation problem. Same rule the product already applies to left/right camp
 * labels on news organisations: no label without a citation.
 */
export const ENTITY_CATEGORIES = Object.freeze({
  organization: { requiresCitation: false, why: 'Institutional speech by a company, agency, or nonprofit.' },
  official: { requiresCitation: true, why: 'Accountability of public power. Cite the office held.' },
  brand_account: { requiresCitation: false, why: 'Commercial speech from a product or brand account.' },
  public_figure: { requiresCitation: true, why: 'Cite what makes this person a public figure.' },
});

export const CATEGORY_KEYS = Object.freeze(Object.keys(ENTITY_CATEGORIES));

/** A citation must be a real http(s) source, not a hand-wave like "well known". */
function citationIsUsable(citation) {
  if (typeof citation !== 'string') return false;
  const s = citation.trim();
  if (s.length < 12 || s.length > 2_048) return false;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Decide whether an entity may be collected on.
 *
 * Returns `{ allowed: true, entity }` or `{ allowed: false, code, reason }`.
 * Never throws for a denial — a denial is an expected outcome, not an exception.
 * Use `assertCollectable` when a throw is wanted at a call boundary.
 *
 * The `reason` is written to be shown to a user verbatim. "No results" with no
 * explanation trains people to think the tool is broken; "we only cover
 * organisations and public officials" teaches them what the tool is for.
 */
export function checkEntity(entity) {
  if (!entity || typeof entity !== 'object') {
    return { allowed: false, code: 'MALFORMED', reason: 'No entity was supplied.' };
  }

  const name = typeof entity.name === 'string' ? entity.name.trim() : '';
  if (!name || name.length > 256) {
    return { allowed: false, code: 'MALFORMED', reason: 'An entity needs a name of 1-256 characters.' };
  }

  const category = entity.category;
  if (!Object.prototype.hasOwnProperty.call(ENTITY_CATEGORIES, category)) {
    return {
      allowed: false,
      code: 'OUT_OF_SCOPE',
      reason:
        'This tool covers organisations, public officials, brand accounts, and cited public figures. ' +
        'It does not build profiles of private individuals.',
    };
  }

  const rule = ENTITY_CATEGORIES[category];
  if (rule.requiresCitation && !citationIsUsable(entity.citation)) {
    return {
      allowed: false,
      code: 'CITATION_REQUIRED',
      reason: `Category '${category}' requires a citation (an http(s) URL). ${rule.why}`,
    };
  }

  return {
    allowed: true,
    entity: {
      name,
      category,
      citation: rule.requiresCitation ? entity.citation.trim() : (entity.citation ?? null),
      handles: sanitizeHandles(entity.handles),
    },
  };
}

/**
 * Normalize the per-source handles map ({ bluesky: 'reuters.com', youtube: 'UC…' }).
 * Values are bounded and stripped of anything that is not plausibly an identifier,
 * because these become URL path/query segments in adapters.
 */
export function sanitizeHandles(handles) {
  if (!handles || typeof handles !== 'object') return {};
  const out = {};
  for (const [source, value] of Object.entries(handles)) {
    if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(source)) continue;
    if (typeof value !== 'string') continue;
    const v = value.trim();
    // Identifier-ish only: no spaces, no scheme, no path traversal, no wildcards.
    if (!v || v.length > 256) continue;
    if (!/^[A-Za-z0-9._:@-]+$/.test(v)) continue;
    out[source] = v;
  }
  return out;
}

/** Throwing wrapper for call boundaries where a denial should stop the run. */
export function assertCollectable(entity) {
  const verdict = checkEntity(entity);
  if (!verdict.allowed) throw new ScopeDenied(verdict.reason, verdict.code);
  return verdict.entity;
}

```


## scripts/swan-collect/adapters/bluesky.mjs
```js
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
  let cursor;
  let exhausted = false;

  while (items.length < ceiling) {
    const data = await xrpc(fetchImpl, 'app.bsky.feed.getAuthorFeed', {
      actor, limit: Math.min(per, ceiling - items.length), cursor,
    });
    const feed = data?.feed || [];
    if (!feed.length) { exhausted = true; break; }

    for (const entry of feed) {
      const post = entry?.post;
      const record = post?.record;
      if (!post?.uri || !record) continue;
      // A repost is someone else's speech. Attributing it to this entity would be
      // a misattribution, so it is excluded unless explicitly requested.
      if (!includeReposts && entry?.reason) continue;

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

```


## scripts/swan-collect/adapters/youtube.mjs
```js
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
export async function resolveChannel(ref, { fetchImpl = fetch, apiKey, ledger } = {}) {
  if (typeof ref !== 'string' || !ref.trim()) throw new CollectError('youtube: a channel reference is required');
  const r = ref.trim();
  const opts = { apiKey, ledger };
  const part = 'snippet,contentDetails';

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
  return { channelId: ch.id, uploadsPlaylistId: uploads, title: ch.snippet?.title ?? null };
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
  let pageToken;
  let exhausted = false;

  while (items.length < ceiling) {
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
      if (!videoId) continue;
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
```
