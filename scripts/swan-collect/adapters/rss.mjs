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
import { readCapped } from '../core/http.mjs';

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
    // Identity order: yt:videoId > guid > Atom id > link. TITLE IS NOT IDENTITY.
    // Kimi K3 packet-7 L2: falling back to the title collapsed two distinct
    // articles that happen to share a headline into one item, so the second was
    // recorded as an UPDATE of the first — distinct evidence silently merged.
    // An entry with no stable identifier is skipped instead; a missed item is
    // recoverable, a conflated one is not.
    const externalId = ytId || tagText(block, 'guid') || tagText(block, 'id') || link;
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
  // RFC-822 / RFC-1123, e.g. "Mon, 11 Aug 2026 10:00:00 GMT".
  // A TIME COMPONENT IS REQUIRED. Kimi K3 packet-7 L1 (confirmed): the gate used
  // to accept a date-only "11 Aug 2026", which V8 expanded to 07:00:00Z — an
  // invented hour, the same fabrication the shared toIsoOrNull guard exists to
  // prevent. A source that states only a date does not get a time from us.
  if (!/^(?:[A-Za-z]{3},\s*)?\d{1,2}\s+[A-Za-z]{3}\s+\d{4}\s+\d{1,2}:\d{2}/.test(s)) return null;
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

  // Streamed with a hard ceiling so a hostile endpoint cannot buffer GBs (M1).
  const raw = await readCapped(res, MAX_DOC_BYTES, `rss: ${url}`);

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
