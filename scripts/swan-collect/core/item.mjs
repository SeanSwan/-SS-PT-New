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
/**
 * Turn a numeric reference into a character, or a space when it is not safe.
 *
 * Rejects control codes, out-of-range values, AND the surrogate block
 * 0xD800-0xDFFF. Kimi K3 packet-7 L7 (confirmed): `&#xD800;` previously produced
 * a LONE SURROGATE, which is a valid JS string but not valid UTF-8 — it survives
 * JSON.stringify and then breaks downstream consumers that expect real text.
 */
function codePoint(code) {
  if (!Number.isFinite(code) || code < 32 || code > 0x10ffff) return ' ';
  if (code >= 0xd800 && code <= 0xdfff) return ' ';
  return String.fromCodePoint(code);
}

export function decodeEntities(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d{1,7});/g, (_, d) => codePoint(Number(d)))
    .replace(/&#[xX]([0-9a-fA-F]{1,6});/g, (_, h) => codePoint(parseInt(h, 16)))
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
