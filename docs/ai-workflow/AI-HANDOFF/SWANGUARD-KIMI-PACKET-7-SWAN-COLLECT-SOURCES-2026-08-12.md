# swan-collect — Kimi K3 hostile review, packet 7: sources, registry, store, runner

Follow-up to packet 6 (you found 2 HIGH / 3 MEDIUM / 5 LOW; ALL were verified and fixed —
your H1 loop hang and H2 reconcile scope bug were both confirmed empirically). This packet is
the NEW code built since: four more sources, the registry, the on-disk store, and the runner
that ties it together.

## Ground rules (unchanged)

1. Every finding is a HYPOTHESIS. Exact attack, precondition, file:line, and **what evidence
   confirms or kills it**. Rate confidence. I verify all of them. **Calibration beats volume.**
2. Escalate scrutiny WITH severity.
3. "This is correct and here is why" is valuable. An empty CRITICAL list is acceptable.

## What changed since packet 6 (all your findings applied)

- H1: page brake + seen-cursor set in EVERY adapter; anomalies leave windowComplete=false.
- H2: reconcile now throws if `previous` spans more than one (sourceKey, entityRef) scope.
- M1: stripMarkup bounds input to 64KB BEFORE the regex.
- M2: toIsoOrNull requires a YYYY-MM-DD prefix (bare years / locale strings now null).
- M3: metrics are numbers-or-null, key-capped, null-prototype.
- L1/L2/L4/L5: citation bounded + userinfo rejected; sanitizeHandles on a null prototype;
  reconcile merges non-null so a degraded fetch cannot erase good data; control chars stripped
  from names; videoId validated; resolveChannel takes a cache.

## Found by MY OWN hostile review after packet 6 (already fixed — do not re-report, but tell me
## if the fixes are wrong)

- **Entity decoding was missing entirely.** Mastodon HTML rendered as `We&#39;re`. Fixed with
  decodeAndStrip. The ORDER is the interesting part: decode must run BEFORE strip, because
  strip-then-decode turns `&lt;script&gt;` into live `<script>` in the output.
- **A replayed page produced DUPLICATE items** — the seen-cursor brake stops the loop only
  AFTER the repeated page is consumed. Added per-run externalId dedupe to all four adapters.
- **cellName collided across distinct entities**: `Acme/Corp`, `Acme_Corp`, `Acme Corp`,
  `Acme?Corp`, `Acme#Corp` all mapped to ONE file, and any two refs sharing 120 chars
  collided on truncation. Two entities sharing a cell is the same data-mixing failure as H2.
  Fixed by appending an FNV-1a hash of the raw ref.
- **A handle that failed sanitization was SILENTLY DROPPED** — `--rss <url>` never ran because
  a URL's "/" is outside the identifier charset, and nothing reported it. Now URLs are a valid
  handle shape and every drop is surfaced in the receipt.

## Live-verified facts behind the design (2026-08-11/12, residential IP, no credentials)

- Bluesky public AppView: search / resolve / paged author feed / getProfiles — ALL 200, no auth.
- Mastodon accounts/lookup + statuses: 200, no auth.
- RSS: NPR 200, **Reddit /r/news/.rss 200** (its JSON API is 403 even with a browser UA),
  **YouTube channel feed 200 for some channel ids and 404 for others**.
- Instagram `?__a=1` 400; X syndication 200 with ZERO bytes; TikTok/Facebook return only SPA
  or login-walled HTML. Hence the vendor adapter for those four.

## Attack these specifically

1. **The store is the new blast radius.** cellName is now hash-suffixed — can two distinct
   entityRefs still collide (FNV-1a is 32-bit; is that adequate here, and what breaks if it
   collides)? Can a crafted entityRef escape the directory, overwrite an unrelated cell, or
   produce a filename that is legal on Linux but hazardous on Windows (reserved device names
   like CON/PRN/AUX/NUL, trailing dot/space)? `store.read` fails OPEN to `[]` — I argue that
   is safe because an empty `previous` can only cause ADDs. Is that reasoning airtight?
2. **The runner's failure isolation.** One source throwing must not abort others, and a failed
   source must not be recorded as a successful empty sync. Can a partial run produce a state
   where the next run wrongly retracts?
3. **RSS extractor.** It is a narrow extractor by design (no XML parser -> no XXE). Can any
   input make it: emit markup that later renders; produce catastrophic backtracking on a
   multi-MB feed; mis-attribute one entry's field to another (my tag regexes are per-block —
   is the block splitting itself sound?); or exceed MAX_ITEMS / MAX_SCAN_CHARS?
4. **normalizeFeedDate** accepts RFC-822 that toIsoOrNull deliberately refuses. Have I opened
   the fabrication hole M2 closed, through a side door?
5. **Mastodon host validation** — it becomes the request target. Any bypass: punycode/IDN
   homograph, trailing dot, uppercase, DNS rebinding, a host that passes the regex but resolves
   internally? Note the collector runs operator-side, so rate the severity accordingly.
6. **Vendor adapter.** The key is header-only. Can it leak via URL, error, or redirect? Is
   `readPath` a safe config language? Can a hostile vendor response poison items or exhaust
   memory? It ships disabled — is the disable actually enforceable, or bypassable?
7. **The registry's fail-closed claim** — can an adapter run without its credential, or be
   silently skipped rather than reported unavailable?
8. **Cross-cutting:** anything that breaks at 200 entities x 6 sources that is invisible at 2.
9. **Portability claim, now narrowed:** core/ + adapters/ are universal; run.mjs imports
   node:url and store.mjs lazily imports node:fs/promises when no fs is injected. Is that
   division actually clean, or does something else couple to Node?

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
export const STRIP_INPUT_CAP = 65_536;

/**
 * Decode the XML/HTML predefined entities plus numeric refs.
 *
 * `&amp;` is decoded LAST so a decoded value can never be re-interpreted as
 * another entity (`&amp;lt;` must end as the literal text `&lt;`, not as `<`).
 * Same ordering rule SwanGuard's syndication `decodeEntities` established.
 */
export function decodeEntities(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d{1,7});/g, (_, d) => {
      const code = Number(d);
      return code >= 32 && code <= 0x10ffff ? String.fromCodePoint(code) : ' ';
    })
    .replace(/&#[xX]([0-9a-fA-F]{1,6});/g, (_, h) => {
      const code = parseInt(h, 16);
      return code >= 32 && code <= 0x10ffff ? String.fromCodePoint(code) : ' ';
    })
    .replace(/&amp;/g, '&'); // LAST — see above
}

/**
 * Decode entities and THEN strip markup. The order is load-bearing and is the
 * opposite of what looks natural.
 *
 * Strip-then-decode is a live XSS hole: `&lt;script&gt;` survives the strip
 * (there are no angle brackets yet), then decoding turns it INTO `<script>` in
 * the output. Decode-then-strip turns it into `<script>` first, which the
 * stripper then removes. Found 2026-08-11 from live Mastodon output rendering
 * `We&#39;re` — the entities were never decoded at all, which was the visible
 * symptom of the missing step.
 */
export function decodeAndStrip(value) {
  if (typeof value !== 'string') return null;
  return stripMarkup(decodeEntities(value));
}

export function stripMarkup(value) {
  if (typeof value !== 'string') return null;
  // Bound BEFORE the regex runs. `<script[\s\S]*?</script>` is lazy but
  // unanchored: every unclosed `<script` re-scans to end-of-string, so cost is
  // quadratic in attacker input. MEASURED 2026-08-11 (Kimi K3 finding M1,
  // confirmed): 34KB → 72ms, 137KB → 1.16s, 342KB → 7.04s. 4x input ≈ 100x time.
  // Caps used to be applied only AFTER stripping, which meant the cap protected
  // storage but not CPU. 64KB is far past any legitimate post; a tag truncated
  // at the boundary renders as inert literal text, and clip() re-bounds after.
  const s = value.length > STRIP_INPUT_CAP ? value.slice(0, STRIP_INPUT_CAP) : value;
  return s
    .replace(/<script[\s\S]*?<\/script\s*>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ');
}

/**
 * Metrics are COUNTS, never content. Numbers-or-null only, key-count capped,
 * key-shape validated, and built on a null prototype.
 *
 * Kimi K3 finding M3 (confirmed): the old passthrough accepted any object —
 * megabyte string values, 10,000 keys, or a JSON-parsed `__proto__` — making it
 * the single hole in "caps on everything", and a proto-pollution vector for any
 * consumer doing `Object.assign(row, item.metrics)`.
 */
export function cleanMetrics(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const out = Object.create(null);
  let seen = 0;
  let kept = 0;
  for (const [k, v] of Object.entries(input)) {
    if (seen++ >= 32) break;
    if (!/^[a-z][a-zA-Z0-9_]{0,31}$/.test(k)) continue;
    if (typeof v === 'number' && Number.isFinite(v)) { out[k] = v; kept += 1; }
    else if (v === null) { out[k] = null; kept += 1; }
  }
  return kept ? out : null;
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
  // Require at least a YYYY-MM-DD prefix. Kimi K3 finding M2 (confirmed): V8
  // happily expands partial and locale strings, INVENTING precision the source
  // never stated —
  //   '2099'       → 2099-01-01T00:00:00.000Z  (sorts atop every queue forever)
  //   '0'          → 2000-01-01T08:00:00.000Z  (a year, month, day AND hour)
  //   'May 5 2020' → 2020-05-05T07:00:00.000Z
  // Each is a guessed date wearing a parse's clothing, which is precisely what
  // the no-fabrication doctrine forbids. This also removes V8-specific loose
  // parsing, so the portability claim holds across Node/Deno/Bun/browser.
  if (typeof value === 'string' && !/^\d{4}-\d{2}-\d{2}/.test(value.trim())) return null;
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
    title: clip(decodeAndStrip(input.title), CAPS.title),
    text: clip(decodeAndStrip(input.text), CAPS.text),
    authorName: clip(decodeAndStrip(input.authorName), CAPS.authorName),
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

    // counts only — validated, capped, null-prototype (see cleanMetrics)
    metrics: cleanMetrics(input.metrics),
  };
}

/** Stable dedupe key. Two records with the same key are the same item. */
export const itemKey = (item) => `${item.sourceKey}:${item.externalId}`;

```


## scripts/swan-collect/core/reconcile.mjs
```js
/**
 * reconcile.mjs — how a SET of items changes between syncs.
 * ============================================================================
 * Split from item.mjs at a real seam: item.mjs answers "what IS one record"
 * (normalize, validate, cap); this file answers "what CHANGED since last time"
 * (added / updated / retracted). Dependency runs one way, reconcile -> item.
 *
 * This is the highest-consequence logic in swan-collect. A false retraction
 * removes evidence a newsroom is holding, which is why the scope seal below
 * throws rather than degrades.
 *
 * @module swan-collect/core/reconcile
 */

import { CollectError, toIsoOrNull, itemKey } from './item.mjs';

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

  // SCOPE SEAL. Retraction may only ever apply within ONE (sourceKey, entityRef)
  // cell. Kimi K3 finding H2 (confirmed empirically 2026-08-11): with a
  // heterogeneous `previous`, an HONEST windowComplete=true from a complete
  // Bluesky sync retracted every YouTube item for the entity — 2 of 3 items
  // wrongly marked withdrawn. That is the denial-of-truth attack executed with
  // correct flags and truthful data; the failure mode is scope confusion, not a
  // lying caller. The invariant therefore lives HERE, not in a caller contract,
  // because the caller is the thing most likely to get it wrong.
  if (windowComplete) {
    const scopes = new Set([...prior.values()].map((i) => `${i.sourceKey}\u0000${i.entityRef ?? ''}`));
    if (scopes.size > 1) {
      throw new CollectError(
        `reconcile: windowComplete requires 'previous' scoped to a single source+entity; got ${scopes.size} scopes. ` +
        'Filter the prior set by (sourceKey, entityRef) before reconciling.',
      );
    }
  }

  const added = [];
  const updated = [];
  const retracted = [];

  for (const [key, item] of seen) {
    const before = prior.get(key);
    if (!before) { added.push(item); continue; }
    // Preserve first-seen provenance; only advance the liveness stamp.
    // Kimi K3 finding L4 (confirmed): a plain `{...before, ...item}` lets a
    // transient source glitch overwrite good values with null. Fields the source
    // may legitimately drop are merged non-null so a degraded fetch cannot erase
    // evidence a newsroom already holds.
    updated.push({
      ...before,
      ...item,
      title: item.title ?? before.title,
      text: item.text ?? before.text,
      canonicalUrl: item.canonicalUrl ?? before.canonicalUrl,
      publishedAt: item.publishedAt ?? before.publishedAt,
      metrics: item.metrics ?? before.metrics,
      fetchedAt: before.fetchedAt,
      lastSeenAt: stamp,
      retractedAt: null,
    });
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

/**
 * A citation must be a real http(s) source, not a hand-wave like "well known".
 *
 * HONEST SCOPE (Kimi K3 finding L1): this checks FORMAT, not CLAIM. It cannot
 * know whether the linked page actually establishes public-figure status — only
 * a human can. It is still worth having, because it forces the operator to
 * produce a locatable source instead of an assertion, and it makes the claim
 * auditable later. The user-facing wording below says so rather than implying
 * the citation was substantively verified.
 */
function citationIsUsable(citation) {
  if (typeof citation !== 'string') return false;
  const s = citation.trim();
  if (s.length < 12 || s.length > 2_048) return false;
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    // Align with safeHttpUrl in item.mjs, which rejects embedded credentials.
    // Two validators disagreeing about what a safe URL is invites the gap.
    return !u.username && !u.password;
  } catch {
    return false;
  }
}

/**
 * Strip control characters. Kimi K3 finding L5: `name` was trimmed but not
 * sanitized, and it reaches logs AND the user-facing `ScopeDenied.reason`, so a
 * newline or ANSI escape could forge log lines or corrupt terminal output.
 */
const stripControl = (s) => [...s].filter((c) => c.charCodeAt(0) > 31 && c.charCodeAt(0) !== 127).join('');

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
export function checkEntity(entity, { onDroppedHandle } = {}) {
  if (!entity || typeof entity !== 'object') {
    return { allowed: false, code: 'MALFORMED', reason: 'No entity was supplied.' };
  }

  const name = typeof entity.name === 'string' ? stripControl(entity.name).trim() : '';
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
      // Wording is deliberately honest about what was checked (Kimi K3 L1): the
      // URL is format-checked only. Saying "requires a citation" full stop would
      // imply the system verified the claim, which it cannot.
      reason:
        `Category '${category}' requires a citation URL — format-checked only; ` +
        `a human must confirm it supports the claim. ${rule.why}`,
    };
  }

  return {
    allowed: true,
    entity: {
      name,
      category,
      // Bound the citation even where it is optional. Every other field is
      // capped; leaving this one unbounded made it the exception (Kimi K3 L1).
      citation: rule.requiresCitation
        ? entity.citation.trim()
        : (typeof entity.citation === 'string' ? stripControl(entity.citation).trim().slice(0, 2_048) || null : null),
      handles: sanitizeHandles(entity.handles, { onDropped: onDroppedHandle }),
    },
  };
}

/**
 * Normalize the per-source handles map ({ bluesky: 'reuters.com', youtube: 'UC…' }).
 *
 * CONSUMER CONTRACT (Kimi K3 finding L5): the allowed charset includes `.`, so
 * `..` passes. That is safe ONLY because every adapter today places handles in
 * QUERY parameters via URLSearchParams / URL, never in a path segment. Any future
 * adapter that interpolates a handle into a path MUST `encodeURIComponent` it, or
 * it reintroduces traversal.
 */
export function sanitizeHandles(handles, { onDropped } = {}) {
  if (!handles || typeof handles !== 'object') return {};
  // Null prototype (Kimi K3 L2): `__proto__` matches the source-key regex, and
  // assigning it on a normal object literal is a silent no-op that then reads
  // back as Object.prototype — a phantom handle rather than a stored one.
  // `constructor` would shadow instead. A null-prototype object stores both as
  // ordinary keys, so what goes in is what comes out.
  const out = Object.create(null);
  const drop = (source, why) => { if (typeof onDropped === 'function') onDropped(source, why); };

  for (const [source, value] of Object.entries(handles)) {
    if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(source)) { drop(source, 'source key is not a lowercase slug'); continue; }
    if (typeof value !== 'string') { drop(source, 'value is not a string'); continue; }
    const v = value.trim();
    if (!v || v.length > 2_048) { drop(source, 'value is empty or over 2048 chars'); continue; }

    // TWO legitimate handle shapes, because sources genuinely differ:
    //   identifier — reuters.com, @user@host, UC… channel ids
    //   http(s) URL — a feed address (the RSS adapter takes a whole URL)
    // Found 2026-08-11 by a live run: `--rss https://feeds.npr.org/...` was
    // SILENTLY dropped because a URL's "/" is outside the identifier charset,
    // so the source never ran and nothing reported it. A silent drop is the
    // worst failure shape here — the operator believes a source is covered when
    // it is not.
    if (/^[A-Za-z0-9._:@-]{1,256}$/.test(v)) { out[source] = v; continue; }
    if (isSafeFeedUrl(v)) { out[source] = v; continue; }

    drop(source, 'value is neither an identifier nor a safe http(s) URL');
  }
  return out;
}

/** http(s) only, no credentials — the shape a feed-style handle may take. */
function isSafeFeedUrl(value) {
  try {
    const u = new URL(value);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    return !u.username && !u.password;
  } catch {
    return false;
  }
}

/** Throwing wrapper for call boundaries where a denial should stop the run. */
export function assertCollectable(entity) {
  const verdict = checkEntity(entity);
  if (!verdict.allowed) throw new ScopeDenied(verdict.reason, verdict.code);
  return verdict.entity;
}

```


## scripts/swan-collect/core/registry.mjs
```js
/**
 * registry.mjs — the adapter registry. One place that knows what sources exist.
 * ============================================================================
 * Adapters are DATA here, not imports scattered through calling code. A consumer
 * asks the registry what exists, what needs a credential, and what each source's
 * terms posture is — without importing any adapter's internals.
 *
 * That indirection is what makes the folder portable in practice rather than in
 * principle: a different app can register its own adapters, or drop ones it does
 * not want, without editing a single call site.
 *
 * FAIL-CLOSED ORDERING. `listEnabled` returns only adapters that are both
 * registered AND satisfied (credential present when required). A source that
 * needs a key it does not have is reported as UNAVAILABLE with a reason, never
 * silently skipped — a silent skip is how a sync quietly stops covering a
 * platform and nobody notices for a month.
 *
 * @module swan-collect/core/registry
 */

import { CollectError } from './item.mjs';

/** Source tiers ranked by how much a reader should trust the acquisition path. */
const TIER_RANK = Object.freeze({ 'official-api': 0, 'public-no-auth': 1, 'public-web': 2, 'vendor-licensed': 3 });

export function createRegistry() {
  const adapters = new Map();

  const api = {
    /** Register one adapter descriptor. Rejects duplicates and malformed shapes. */
    register(adapter) {
      if (!adapter || typeof adapter !== 'object') throw new CollectError('registry: adapter must be an object');
      const { key, collect } = adapter;
      if (typeof key !== 'string' || !/^[a-z][a-z0-9_-]{0,63}$/.test(key)) {
        throw new CollectError(`registry: '${key}' is not a valid adapter key`);
      }
      if (typeof collect !== 'function') throw new CollectError(`registry: adapter '${key}' has no collect()`);
      if (adapters.has(key)) throw new CollectError(`registry: adapter '${key}' is already registered`);
      adapters.set(key, adapter);
      return api;
    },

    registerAll(list) {
      for (const a of list) api.register(a);
      return api;
    },

    get(key) {
      const a = adapters.get(key);
      if (!a) throw new CollectError(`registry: no adapter '${key}'. Registered: ${[...adapters.keys()].join(', ') || '(none)'}`);
      return a;
    },

    has: (key) => adapters.has(key),

    /** Every registered adapter, cleanest-tier first. */
    list() {
      return [...adapters.values()].sort((a, b) => (TIER_RANK[a.tier] ?? 9) - (TIER_RANK[b.tier] ?? 9));
    },

    /**
     * Split the registry into what can run now and what cannot, with reasons.
     * `credentials` is a plain map of adapterKey -> secret. Secrets are only ever
     * tested for PRESENCE here; their values are never copied into the result.
     */
    status(credentials = {}) {
      const available = [];
      const unavailable = [];
      for (const a of api.list()) {
        if (a.enabled === false) {
          unavailable.push({ key: a.key, label: a.label, reason: 'disabled by default — configure a provider to enable' });
          continue;
        }
        if (a.requiresCredential) {
          const secret = credentials[a.key];
          if (typeof secret !== 'string' || !secret.trim()) {
            unavailable.push({ key: a.key, label: a.label, reason: `missing credential — ${a.credentialHint || 'see adapter docs'}` });
            continue;
          }
        }
        available.push({ key: a.key, label: a.label, tier: a.tier, termsPosture: a.termsPosture });
      }
      return { available, unavailable };
    },

    listEnabled(credentials = {}) {
      return api.status(credentials).available.map((s) => adapters.get(s.key));
    },
  };

  return api;
}

/**
 * Build a registry preloaded with every adapter that ships in this folder.
 * Import-on-demand keeps the core usable without pulling adapters a consumer
 * does not want — and keeps `core/` free of any dependency on `adapters/`.
 */
export async function createDefaultRegistry() {
  const registry = createRegistry();
  const [bluesky, youtube, rss, mastodon, vendor] = await Promise.all([
    import('../adapters/bluesky.mjs'),
    import('../adapters/youtube.mjs'),
    import('../adapters/rss.mjs'),
    import('../adapters/mastodon.mjs'),
    import('../adapters/vendor.mjs'),
  ]);
  registry.register(bluesky.adapter);
  registry.register(youtube.adapter);
  registry.register(rss.adapter);
  registry.register(mastodon.adapter);
  registry.registerAll(vendor.adapters);
  return registry;
}

```


## scripts/swan-collect/core/store.mjs
```js
/**
 * store.mjs — the local item store. JSON on disk, scoped by (source, entity).
 * ============================================================================
 * Deliberately boring: one JSON file per (sourceKey, entityRef) cell. That shape
 * is not an accident — it is the physical expression of the reconcile scope seal.
 * Because a file IS one cell, `previous` can never accidentally span two sources,
 * which is exactly the mistake that produced Kimi K3 finding H2 (an honest
 * complete-window flag from one source mass-retracting another's items).
 *
 * A database would work too; the point is that the STORAGE LAYOUT enforces the
 * invariant rather than relying on every caller to filter correctly.
 *
 * PORTABILITY: the filesystem is INJECTED. Pass any `{ readFile, writeFile,
 * mkdir, readdir }` and this runs on node:fs, memfs, or an in-memory stub. The
 * default binding is created lazily so importing this module in a browser (where
 * node:fs does not exist) does not throw until you actually ask for disk.
 *
 * @module swan-collect/core/store
 */

import { CollectError } from './item.mjs';

/**
 * FNV-1a 32-bit. Pure JS on purpose: `node:crypto` does not exist in a browser,
 * and the portability contract says this folder runs anywhere. This is a
 * COLLISION-AVOIDANCE hash for filenames, never a security primitive.
 */
export function shortHash(input) {
  let h = 0x811c9dc5;
  const s = String(input);
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36).padStart(7, '0').slice(0, 7);
}

/**
 * Filesystem-safe cell name, guaranteed distinct per distinct entityRef.
 *
 * THE COLLISION THIS FIXES (found by hostile review 2026-08-11): sanitizing
 * alone mapped `Acme/Corp`, `Acme_Corp`, `Acme Corp`, `Acme?Corp` and
 * `Acme#Corp` — five DIFFERENT entities — onto one file, and any two refs
 * sharing their first 120 characters collided on truncation. Two entities
 * sharing a cell is the same data-mixing failure as the reconcile scope bug:
 * entity A's stored set would contain entity B's items. With `windowComplete`
 * true the scope seal turns that into a crash; with it false the items quietly
 * merge. Neither is acceptable.
 *
 * The fix appends a hash of the RAW ref, so the readable part stays readable and
 * uniqueness no longer depends on the sanitizer being lossless.
 */
export function cellName(sourceKey, entityRef) {
  if (typeof sourceKey !== 'string' || !/^[a-z][a-z0-9_-]{0,63}$/.test(sourceKey)) {
    throw new CollectError(`store: invalid sourceKey '${sourceKey}'`);
  }
  const ref = typeof entityRef === 'string' && entityRef.trim() ? entityRef.trim() : '_';
  // This is a FILENAME — traversal, separators, colons (Windows alternate data
  // streams) and control characters must all die here.
  const safe = ref
    .replace(/[^A-Za-z0-9._@-]/g, '_')
    .replace(/\.{2,}/g, '_')
    .slice(0, 100);
  return `${sourceKey}__${safe || '_'}__${shortHash(ref)}.json`;
}

let _fsPromise;
async function defaultFs() {
  if (!_fsPromise) _fsPromise = import('node:fs/promises');
  const fs = await _fsPromise;
  return {
    readFile: (p) => fs.readFile(p, 'utf-8'),
    writeFile: (p, d) => fs.writeFile(p, d, 'utf-8'),
    mkdir: (p) => fs.mkdir(p, { recursive: true }),
    readdir: (p) => fs.readdir(p),
  };
}

/**
 * Create a store rooted at `dir`. Nothing is read or written until a method is
 * called, so constructing a store is always safe.
 */
export function createStore(dir, { fs } = {}) {
  if (typeof dir !== 'string' || !dir) throw new CollectError('store: a directory is required');
  const io = async () => fs || defaultFs();
  const join = (name) => `${dir.replace(/[/\\]+$/, '')}/${name}`;

  return {
    dir,

    /** Read one cell. A missing or corrupt cell reads as EMPTY, never as an error. */
    async read(sourceKey, entityRef) {
      const f = await io();
      try {
        const raw = await f.readFile(join(cellName(sourceKey, entityRef)));
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed?.items) ? parsed.items : [];
      } catch {
        // A first run has no file; a truncated write has bad JSON. Both mean
        // "nothing known yet" — and critically, an empty `previous` can only
        // ever cause items to be ADDED, never retracted. Failing open here is
        // therefore safe in the one direction that matters.
        return [];
      }
    },

    /** Replace one cell atomically enough for a local operator tool. */
    async write(sourceKey, entityRef, items, meta = {}) {
      const f = await io();
      await f.mkdir(dir);
      const payload = {
        sourceKey,
        entityRef: entityRef ?? null,
        savedAt: meta.savedAt ?? null,
        count: items.length,
        items,
      };
      await f.writeFile(join(cellName(sourceKey, entityRef)), JSON.stringify(payload, null, 2));
      return payload.count;
    },

    /** List the cells present on disk. */
    async cells() {
      const f = await io();
      try {
        const names = await f.readdir(dir);
        return names.filter((n) => n.endsWith('.json'));
      } catch {
        return [];
      }
    },
  };
}

```


## scripts/swan-collect/adapters/rss.mjs
```js
/**
 * rss.mjs — RSS 2.0 / Atom 1.0 adapter. NO KEY. The highest-leverage source.
 * ============================================================================
 * One adapter, many platforms. VERIFIED LIVE 2026-08-11:
 *   - NPR                      https://feeds.npr.org/1001/rss.xml        200, 14.7KB
 *   - Reddit (JSON API is 403) https://www.reddit.com/r/news/.rss        200, 25.4KB
 *   - YouTube (some channels)  .../feeds/videos.xml?channel_id=UC…       200, 21KB
 *
 * That last two matter a lot. Reddit's JSON API now returns 403 even with a
 * browser user-agent, but its RSS still serves — so RSS is the *only* keyless
 * Reddit path. And YouTube's channel feed costs ZERO quota, making it a free
 * fallback when the Data API's 10,000 units/day is precious. (Caveat, measured:
 * the YouTube feed 404s for some channel ids and 200s for others, so it is a
 * fallback, not a replacement.)
 *
 * WHY A NARROW EXTRACTOR, NOT AN XML PARSER — this is a security decision, not a
 * shortcut, and it mirrors the same call SwanGuard's syndication slice already
 * made. A general XML parser accepts DTDs, external entities and nested-entity
 * expansion, which means XXE and billion-laughs from a source that is squarely
 * inside the threat model. This reads only the tags it wants and ignores
 * everything else, so there is no entity machinery to attack.
 *
 * REDOS DISCIPLINE — every regex here runs against attacker-controlled text, so
 * the document is bounded BEFORE any regex touches it. This is the lesson from
 * Kimi K3 finding M1: caps applied after the regex protect storage but not CPU.
 *
 * PORTABILITY: `fetch` injected, zero deps, zero repo coupling.
 *
 * @module swan-collect/adapters/rss
 */

import { normalizeItem, CollectError, clip, decodeEntities } from '../core/item.mjs';

export const SOURCE_KEY = 'rss';

/** Hard ceiling on a fetched document. Larger than any real feed, small enough to bound regex cost. */
export const MAX_DOC_BYTES = 4_000_000;
/** Bound before extraction (M1 lesson): regex work must never scale with attacker generosity. */
export const MAX_SCAN_CHARS = 2_000_000;
const MAX_ITEMS = 200;

/** Unwrap CDATA, then decode. Order matters: a payload must not survive both steps. */
export function unwrapCdata(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

/**
 * Pull the first occurrence of a tag's inner text from a block.
 * Non-greedy, anchored to the tag name, and tolerant of attributes.
 */
export function tagText(block, name) {
  const re = new RegExp(`<${name}(?:\\s[^>]{0,500})?>([\\s\\S]{0,20000}?)</${name}\\s*>`, 'i');
  const m = block.match(re);
  if (!m) return null;
  return decodeEntities(unwrapCdata(m[1]));
}

/** Read an attribute off the first matching self-closing or open tag. */
export function tagAttr(block, name, attr) {
  const re = new RegExp(`<${name}\\s[^>]{0,500}?${attr}\\s*=\\s*["']([^"']{0,2048})["']`, 'i');
  const m = block.match(re);
  return m ? decodeEntities(m[1]) : null;
}

/**
 * Split a feed document into per-entry blocks. Handles RSS `<item>` and Atom
 * `<entry>`. Bounded by MAX_ITEMS so a crafted feed cannot produce unbounded work.
 */
export function splitEntries(doc) {
  const out = [];
  for (const tag of ['item', 'entry']) {
    const re = new RegExp(`<${tag}(?:\\s[^>]{0,500})?>([\\s\\S]{0,200000}?)</${tag}\\s*>`, 'gi');
    let m;
    while ((m = re.exec(doc)) !== null) {
      out.push(m[1]);
      if (out.length >= MAX_ITEMS) return out;
    }
    if (out.length) return out; // a document is RSS or Atom, not both
  }
  return out;
}

/**
 * Extract items from a feed document. PURE — no network, no clock beyond the
 * injected `fetchedAt`. This is the piece worth unit-testing hardest.
 */
export function extractFeed(doc, { sourceUrl, entityRef, fetchedAt, termsPosture = 'public-no-auth' } = {}) {
  if (typeof doc !== 'string') throw new CollectError('rss: document must be a string');
  const scan = doc.length > MAX_SCAN_CHARS ? doc.slice(0, MAX_SCAN_CHARS) : doc;

  const feedTitle = tagText(scan, 'title');
  const items = [];

  for (const block of splitEntries(scan)) {
    // Atom uses <id>, RSS uses <guid>; fall back to the link, then the title.
    // A YouTube feed carries <yt:videoId>, which is the stablest id it offers.
    const ytId = tagText(block, 'yt:videoId');
    const link =
      tagAttr(block, 'link', 'href') || tagText(block, 'link') || null;
    const externalId = ytId || tagText(block, 'guid') || tagText(block, 'id') || link || tagText(block, 'title');
    if (!externalId) continue;

    // Reddit/Atom put the body in <content>; RSS in <description>.
    const body = tagText(block, 'content') || tagText(block, 'description') || tagText(block, 'summary')
      || tagText(block, 'media:description');

    const published = tagText(block, 'pubDate') || tagText(block, 'published') || tagText(block, 'updated');

    items.push(normalizeItem({
      sourceKey: SOURCE_KEY,
      externalId: clip(externalId, 512),
      entityRef: entityRef || sourceUrl || null,
      kind: ytId ? 'video' : 'article',
      title: tagText(block, 'title') || tagText(block, 'media:title'),
      text: body,
      authorName: tagText(block, 'author') || tagText(block, 'dc:creator') || feedTitle,
      canonicalUrl: ytId ? `https://www.youtube.com/watch?v=${ytId}` : link,
      // pubDate is RFC-822 ("Mon, 11 Aug 2026 10:00:00 GMT"), which toIsoOrNull
      // rejects because it demands a YYYY-MM-DD prefix. Convert it here, where
      // the format is KNOWN, rather than loosening the shared no-fabrication
      // guard for every source.
      publishedAt: normalizeFeedDate(published),
      sourceTier: 'public-no-auth',
      termsPosture,
      fetchMethod: 'feed',
    }, { fetchedAt }));
  }

  return { feedTitle, items };
}

/**
 * Feeds carry RFC-822 dates (RSS) or ISO-8601 (Atom). `toIsoOrNull` deliberately
 * refuses anything without a YYYY-MM-DD prefix so that no source can smuggle in
 * an invented date, so RFC-822 is converted HERE — at the one boundary where the
 * format is known and unambiguous — instead of relaxing the shared guard.
 * Anything else still becomes null rather than a guess.
 */
export function normalizeFeedDate(value) {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s; // already ISO; shared guard handles it
  // RFC-822 / RFC-1123, e.g. "Mon, 11 Aug 2026 10:00:00 GMT"
  if (!/^(?:[A-Za-z]{3},\s*)?\d{1,2}\s+[A-Za-z]{3}\s+\d{4}/.test(s)) return null;
  const d = new Date(s);
  const t = d.getTime();
  if (!Number.isFinite(t)) return null;
  const year = d.getUTCFullYear();
  if (year < 1990 || year > 2100) return null;
  return d.toISOString();
}

/**
 * Fetch and extract a feed. The body is read as text with a hard byte cap so a
 * hostile or misconfigured endpoint cannot stream unbounded data at us.
 */
export function feedUrlFor(ref) {
  if (typeof ref !== 'string' || !ref.trim()) return null;
  const s = ref.trim();
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (u.username || u.password) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function collectFeed(ref, { fetchImpl = fetch, entityRef = null, timeoutMs = 20_000, termsPosture } = {}) {
  const url = feedUrlFor(ref);
  if (!url) throw new CollectError(`rss: '${ref}' is not a valid http(s) feed URL`);

  const res = await fetchImpl(url, {
    method: 'GET',
    headers: { accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' },
    redirect: 'error',
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res || typeof res.status !== 'number') throw new CollectError('rss: malformed fetch response');
  if (!res.ok) throw new CollectError(`rss: ${url} returned ${res.status}`);

  const raw = await res.text();
  if (raw.length > MAX_DOC_BYTES) {
    throw new CollectError(`rss: document exceeds ${MAX_DOC_BYTES} bytes — refusing to parse`);
  }

  const { feedTitle, items } = extractFeed(raw, {
    sourceUrl: url, entityRef, fetchedAt: new Date().toISOString(), termsPosture,
  });
  // A feed is a complete window by definition — it is the publisher's own list.
  // But it is a TRUNCATED window (most feeds carry only recent items), so an
  // item aging out is NOT a retraction. windowComplete stays false.
  return { feedTitle, items, windowComplete: false };
}

export const adapter = Object.freeze({
  key: SOURCE_KEY,
  label: 'RSS / Atom',
  tier: 'public-no-auth',
  termsPosture: 'public-no-auth',
  requiresCredential: false,
  handleField: 'rss',
  collect: collectFeed,
  /** Known keyless feed shapes, for the UI to offer as presets. */
  templates: Object.freeze({
    reddit_sub: 'https://www.reddit.com/r/{handle}/.rss',
    reddit_user: 'https://www.reddit.com/user/{handle}/.rss',
    youtube_channel: 'https://www.youtube.com/feeds/videos.xml?channel_id={handle}',
    mastodon_user: 'https://{host}/@{handle}.rss',
  }),
});

```


## scripts/swan-collect/adapters/mastodon.mjs
```js
/**
 * mastodon.mjs — Mastodon / ActivityPub adapter. NO API KEY for public data.
 * ============================================================================
 * VERIFIED LIVE 2026-08-11: `GET https://mastodon.social/api/v1/accounts/lookup`
 * returned 200 with clean JSON and no credential of any kind.
 *
 * WHY IT EARNS A SLOT: Mastodon is FEDERATED, so "which server" is part of the
 * identity — a handle is `@user@host`. That is a real difference from every other
 * adapter here and it has a security consequence: the host comes from
 * caller-supplied data and becomes the request target. An unvalidated host is a
 * server-side request forgery primitive. This module therefore validates the host
 * shape and refuses anything that is not a plain public hostname.
 *
 * Note the collector is designed to run on an operator machine, so SSRF here is
 * lower-consequence than it would be server-side — but the guard is cheap and the
 * portability contract means this file could end up somewhere it matters.
 *
 * PORTABILITY: `fetch` injected, zero deps, zero repo coupling.
 *
 * @module swan-collect/adapters/mastodon
 */

import { normalizeItem, CollectError, clip } from '../core/item.mjs';

export const SOURCE_KEY = 'mastodon';
const MAX_PAGE = 40;
const MAX_TOTAL = 400;
const MAX_PAGES = 20;

/**
 * Hostnames only: letters, digits, dots, hyphens. No scheme, no port, no path,
 * no userinfo, no IP-literal shapes, no localhost. Deliberately strict — this
 * value becomes the request target.
 */
const HOST = /^(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?:\.[a-z0-9-]{1,63})+$/i;
const BLOCKED_HOSTS = new Set(['localhost', 'localhost.localdomain']);

export function isSafeHost(host) {
  if (typeof host !== 'string') return false;
  const h = host.trim().toLowerCase();
  if (!h || BLOCKED_HOSTS.has(h)) return false;
  if (!HOST.test(h)) return false;
  // Reject bare IPv4 literals: a hostname made only of digits and dots is an
  // address, and addresses are how you reach infrastructure rather than a server.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return false;
  return true;
}

/**
 * Split `@user@host`, `user@host`, or `https://host/@user` into { host, user }.
 * Returns null when the shape is unrecognized — never a partial guess.
 */
export function parseAcct(input, { defaultHost = 'mastodon.social' } = {}) {
  if (typeof input !== 'string' || !input.trim()) return null;
  const s = input.trim().replace(/^@/, '');

  const urlMatch = s.match(/^https?:\/\/([^/]+)\/@([A-Za-z0-9_]{1,64})/i);
  if (urlMatch) {
    return isSafeHost(urlMatch[1]) ? { host: urlMatch[1].toLowerCase(), user: urlMatch[2] } : null;
  }

  const parts = s.split('@');
  if (parts.length === 2) {
    const [user, host] = parts;
    if (!/^[A-Za-z0-9_]{1,64}$/.test(user) || !isSafeHost(host)) return null;
    return { host: host.toLowerCase(), user };
  }
  if (parts.length === 1) {
    if (!/^[A-Za-z0-9_]{1,64}$/.test(parts[0])) return null;
    if (!isSafeHost(defaultHost)) return null;
    return { host: defaultHost.toLowerCase(), user: parts[0] };
  }
  return null;
}

async function api(fetchImpl, host, path, params = {}, { timeoutMs = 15_000 } = {}) {
  const url = new URL(`https://${host}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  const res = await fetchImpl(url.toString(), {
    method: 'GET',
    headers: { accept: 'application/json' },
    redirect: 'error',
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res || typeof res.status !== 'number') throw new CollectError('mastodon: malformed fetch response');
  if (res.status === 429) throw new CollectError('mastodon: rate limited (429) — back off and retry later');
  if (res.status === 404) throw new CollectError(`mastodon: not found on ${host}`);
  if (!res.ok) throw new CollectError(`mastodon: ${path} on ${host} returned ${res.status}`);
  return res.json();
}

/** Resolve `@user@host` to the instance-local numeric account id. */
export async function lookupAccount(acct, { fetchImpl = fetch, defaultHost } = {}) {
  const parsed = parseAcct(acct, defaultHost ? { defaultHost } : undefined);
  if (!parsed) throw new CollectError(`mastodon: '${acct}' is not a valid @user@host handle`);
  const data = await api(fetchImpl, parsed.host, '/api/v1/accounts/lookup', { acct: parsed.user });
  if (!data?.id) throw new CollectError(`mastodon: no account '${parsed.user}' on ${parsed.host}`);
  return {
    id: String(data.id),
    host: parsed.host,
    acct: `@${parsed.user}@${parsed.host}`,
    displayName: data.display_name ?? null,
    followersCount: data.followers_count ?? null,
    statusesCount: data.statuses_count ?? null,
    url: data.url ?? null,
  };
}

/**
 * Collect an account's public statuses, newest first.
 *
 * Boosts (`reblog`) are excluded by default for the same reason reposts are on
 * Bluesky: a boost is someone else's speech, and attributing it to this entity
 * would be a misattribution.
 */
export async function collectStatuses(acct, {
  fetchImpl = fetch, defaultHost, max = 100, pageSize = 40, includeBoosts = false, includeReplies = false,
} = {}) {
  const account = await lookupAccount(acct, { fetchImpl, defaultHost });
  const ceiling = Math.min(Math.max(Number(max) || 100, 1), MAX_TOTAL);
  const per = Math.min(Math.max(Number(pageSize) || MAX_PAGE, 1), MAX_PAGE);

  const items = [];
  const seenCursors = new Set();
  // Per-run id dedupe. The seen-cursor brake stops the LOOP, but only after a
  // replayed page has been consumed — so without this a server that returns the
  // same page twice yields duplicate items and an inflated fetched count.
  const seenIds = new Set();
  let maxId;
  let exhausted = false;
  let pages = 0;

  // Same termination discipline as every other adapter (Kimi K3 H1): loop exit
  // must not depend on items.length growing, because a page of all-boosts adds
  // nothing. Page brake + repeated-cursor brake, both leaving exhausted=false.
  while (items.length < ceiling && pages < MAX_PAGES) {
    pages += 1;
    const batch = await api(fetchImpl, account.host, `/api/v1/accounts/${encodeURIComponent(account.id)}/statuses`, {
      limit: Math.min(per, ceiling - items.length),
      max_id: maxId,
      exclude_replies: includeReplies ? undefined : 'true',
      exclude_reblogs: includeBoosts ? undefined : 'true',
    });
    if (!Array.isArray(batch) || !batch.length) { exhausted = true; break; }

    for (const st of batch) {
      if (!st?.id) continue;
      if (!includeBoosts && st.reblog) continue;
      if (seenIds.has(st.id)) continue;
      seenIds.add(st.id);
      items.push(normalizeItem({
        sourceKey: SOURCE_KEY,
        externalId: `${account.host}:${st.id}`,
        entityRef: account.acct,
        kind: 'post',
        // `content` is server-rendered HTML; normalizeItem strips it.
        text: st.content,
        authorName: st.account?.display_name || st.account?.acct || account.displayName,
        canonicalUrl: st.url || st.uri || null,
        publishedAt: st.created_at,
        sourceTier: 'public-no-auth',
        termsPosture: 'public-no-auth',
        fetchMethod: 'mastodon-api',
        metrics: {
          favourites: st.favourites_count ?? null,
          reblogs: st.reblogs_count ?? null,
          replies: st.replies_count ?? null,
        },
      }, { fetchedAt: new Date().toISOString() }));
    }

    const last = batch[batch.length - 1];
    maxId = last?.id;
    if (!maxId) { exhausted = true; break; }
    if (seenCursors.has(maxId)) break;
    seenCursors.add(maxId);
  }

  return { account, items: items.slice(0, ceiling), windowComplete: exhausted };
}

export const adapter = Object.freeze({
  key: SOURCE_KEY,
  label: 'Mastodon',
  tier: 'public-no-auth',
  termsPosture: 'public-no-auth',
  requiresCredential: false,
  handleField: 'mastodon',
  resolve: lookupAccount,
  collect: collectStatuses,
});

```


## scripts/swan-collect/adapters/vendor.mjs
```js
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

export const SOURCE_KEY_PREFIX = 'vendor';

/** Platforms this adapter is meant to cover. Each becomes `vendor_<platform>`. */
export const PLATFORMS = Object.freeze(['x', 'instagram', 'tiktok', 'facebook', 'linkedin', 'threads']);

const MAX_TOTAL = 500;
const MAX_PAGES = 20;

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

    const body = await res.json();
    const batch = readPath(body, provider.itemsPath);
    if (!Array.isArray(batch) || !batch.length) { exhausted = true; break; }

    for (const raw of batch) {
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

```


## scripts/swan-collect/run.mjs
```js
#!/usr/bin/env node
/**
 * run.mjs — the collector runner. Entity in, reconciled items on disk, receipt out.
 * ============================================================================
 * This is the piece that turns the parts into something you invoke:
 *
 *   entity → SCOPE GATE → per-source adapters → normalize → reconcile → store
 *                ↓ deny                                          ↓
 *           explained refusal                              sync receipt
 *
 * ORDERING IS THE POINT. The scope gate runs FIRST and once, before any network
 * call, so a refused entity costs nothing and leaves no trace. Every adapter then
 * runs independently: one source failing (rate limit, outage, bad handle) must
 * never abort the others, because a newsroom that loses Bluesky when YouTube is
 * down is a newsroom with a single point of failure it did not choose.
 *
 * Usage:
 *   node run.mjs --name "Reuters" --category organization \
 *                --bluesky reuters.com --rss https://feeds.npr.org/1001/rss.xml
 *   node run.mjs --sources            # what can run right now, and what cannot
 *
 * @module swan-collect/run
 */

import { createDefaultRegistry } from './core/registry.mjs';
import { createStore } from './core/store.mjs';
import { reconcile } from './core/reconcile.mjs';
import { checkEntity } from './core/entity-scope.mjs';
import { CollectError } from './core/item.mjs';

/**
 * Collect one entity across every satisfied source.
 *
 * Returns a RECEIPT — never throws for a single source's failure. The receipt is
 * the audit artifact: it records what ran, what each source produced, and what
 * failed and why. A run that half-worked must be legible as such.
 */
export async function collectEntity(entity, {
  registry, store, credentials = {}, now = () => new Date().toISOString(), max = 100, log = () => {},
} = {}) {
  // A dropped handle must be LOUD. Silently ignoring a source the operator asked
  // for means they believe it is covered when it is not — which, for a newsroom,
  // is a gap in the evidence base that nobody knows exists.
  const droppedHandles = [];
  const verdict = checkEntity(entity, {
    onDroppedHandle: (source, why) => {
      droppedHandles.push({ source, why });
      log(`  ⚠ handle for '${source}' was rejected: ${why}`);
    },
  });
  if (!verdict.allowed) {
    // A refusal is a first-class result, not an exception. It is returned in the
    // same shape as a success so a caller cannot forget to handle it.
    return { allowed: false, code: verdict.code, reason: verdict.reason, sources: [], totals: zero() };
  }

  const ent = verdict.entity;
  const reg = registry || await createDefaultRegistry();
  const at = now();
  const sources = [];

  for (const adapter of reg.listEnabled(credentials)) {
    const handle = ent.handles[adapter.handleField];
    if (!handle) continue; // this entity simply has no presence on this source

    const entry = { source: adapter.key, tier: adapter.tier, termsPosture: adapter.termsPosture, handle };
    try {
      log(`  ${adapter.key}: collecting ${handle}…`);
      const result = await adapter.collect(handle, {
        max,
        entityRef: ent.name,
        apiKey: credentials[adapter.key],
      });
      const fetched = result.items || [];

      // Scope seal in practice: `previous` is read from the cell for exactly
      // this (source, entity) pair, so reconcile can never see a mixed set.
      const previous = store ? await store.read(adapter.key, ent.name) : [];
      const diff = reconcile(previous, fetched, { at, windowComplete: result.windowComplete === true });

      const merged = [...diff.added, ...diff.updated, ...diff.retracted];
      if (store) await store.write(adapter.key, ent.name, merged, { savedAt: at });

      Object.assign(entry, {
        ok: true,
        fetched: fetched.length,
        added: diff.added.length,
        updated: diff.updated.length,
        retracted: diff.retracted.length,
        windowComplete: diff.windowComplete,
      });
    } catch (e) {
      // One source failing is expected and survivable. Record it and continue.
      Object.assign(entry, { ok: false, error: e instanceof CollectError ? e.message : `unexpected: ${e.message}` });
      log(`  ${adapter.key}: FAILED — ${entry.error}`);
    }
    sources.push(entry);
  }

  return { allowed: true, entity: ent, at, sources, droppedHandles, totals: tally(sources) };
}

const zero = () => ({ fetched: 0, added: 0, updated: 0, retracted: 0, failed: 0 });

function tally(sources) {
  const t = zero();
  for (const s of sources) {
    if (!s.ok) { t.failed += 1; continue; }
    t.fetched += s.fetched; t.added += s.added; t.updated += s.updated; t.retracted += s.retracted;
  }
  return t;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────

export function parseArgs(argv) {
  const out = { handles: {}, credentials: {} };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (!flag.startsWith('--')) continue;
    const key = flag.slice(2);
    const next = argv[i + 1];
    const value = next && !next.startsWith('--') ? (i += 1, next) : true;
    if (key === 'name') out.name = value;
    else if (key === 'category') out.category = value;
    else if (key === 'citation') out.citation = value;
    else if (key === 'max') out.max = Number(value);
    else if (key === 'dir') out.dir = value;
    else if (key === 'sources' || key === 'help') out[key] = true;
    else out.handles[key] = value; // --bluesky reuters.com, --rss https://…
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const registry = await createDefaultRegistry();

  // Credentials come from the environment ONLY. Never a flag — a flag lands in
  // shell history and in the process list where any local user can read it.
  const credentials = {
    youtube: process.env.YOUTUBE_API_KEY,
    ...Object.fromEntries(['x', 'instagram', 'tiktok', 'facebook', 'linkedin', 'threads']
      .map((p) => [`vendor_${p}`, process.env.SWAN_VENDOR_KEY])),
  };

  if (args.help || (!args.name && !args.sources)) {
    console.log(`swan-collect — portable entity intel

  node run.mjs --sources
  node run.mjs --name "Reuters" --category organization --bluesky reuters.com
  node run.mjs --name "NPR" --category organization --rss https://feeds.npr.org/1001/rss.xml

Categories: organization | official | brand_account | public_figure
  (official and public_figure require --citation <https url>)

Credentials come from the environment: YOUTUBE_API_KEY, SWAN_VENDOR_KEY.`);
    return;
  }

  if (args.sources) {
    const { available, unavailable } = registry.status(credentials);
    console.log('AVAILABLE NOW');
    for (const a of available) console.log(`  ${a.key.padEnd(18)} ${a.termsPosture}`);
    console.log('\nUNAVAILABLE');
    for (const a of unavailable) console.log(`  ${a.key.padEnd(18)} ${a.reason}`);
    return;
  }

  const store = createStore(args.dir || '.ai-workflow/collect-store');
  const receipt = await collectEntity(
    { name: args.name, category: args.category, citation: args.citation, handles: args.handles },
    { registry, store, credentials, max: args.max || 100, log: (m) => console.log(m) },
  );

  if (!receipt.allowed) {
    console.error(`REFUSED (${receipt.code}): ${receipt.reason}`);
    process.exitCode = 2;
    return;
  }

  console.log(`\n${receipt.entity.name} — ${receipt.at}`);
  for (const s of receipt.sources) {
    console.log(s.ok
      ? `  ${s.source.padEnd(18)} ${s.fetched} fetched · +${s.added} ~${s.updated} ⊘${s.retracted} · window ${s.windowComplete ? 'complete' : 'partial'}`
      : `  ${s.source.padEnd(18)} FAILED — ${s.error}`);
  }
  const t = receipt.totals;
  console.log(`  TOTAL: ${t.fetched} fetched, +${t.added} new, ${t.retracted} withdrawn, ${t.failed} source(s) failed`);
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(`fatal: ${e.message}`); process.exitCode = 1; });
}

```
