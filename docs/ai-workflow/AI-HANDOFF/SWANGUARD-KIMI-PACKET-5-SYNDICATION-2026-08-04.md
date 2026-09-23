# SwanGuard — Kimi K3 packet 5: hostile review of the NEW syndication ingestion slice

This is net-new code that parses UNTRUSTED input from many third-party news feeds. It is the
widest new attack surface the product has taken on. Attack it.

## Ground rules (unchanged)

1. Every finding is a HYPOTHESIS. Give exact attack, precondition, file:line, and **what
   evidence confirms or kills it**. Rate confidence. I verify all of them — in packet 2 three of
   four died including the CRITICAL, in packet 3 six of nine died. Calibration beats volume.
2. Escalate scrutiny WITH severity.
3. "This is correct and here is why" is valuable. An empty CRITICAL list is acceptable.

## Context

The product is an evidence-first civic newsroom. It had ONE government connector; this slice is
the step to many news outlets, including local TV stations. Design intent:

- **A source is DATA, not code** — a manifest (key/url/camp/group/ownership/citation/locality)
  instead of a bespoke client per outlet.
- **A deliberately NARROW extractor, not an XML parser.** I chose this specifically because a
  general parser accepts DTDs/external entities/nested expansion (XXE, billion-laughs) from a
  source inside the threat model. Tell me if that reasoning is wrong, or if the narrow reader
  has holes a real parser would not.
- **Nothing is labelled without a citation** — including the left/center/right `camp` label,
  which is a claim SwanGuard makes about a news organisation. Defamation discipline.
- **No fabricated data, ever.** An unparseable date is OMITTED, never guessed. A malformed feed
  yields [] so one bad source cannot break a multi-source sync.

## Already-verified controls in the surrounding code (do NOT re-report)

- The HTTP fetch caps the body by STREAMING and aborting past the cap (verified: a hostile
  stream that would drain ~200MB now aborts within 20 chunks).
- `redirect: 'error'` on every connector fetch, so no 3xx-driven SSRF.
- `AbortSignal.timeout` bounded 250ms..30s on every fetch.
- Connectors are contract-gated, owner-enabled default OFF, kill-switchable, quota'd, retained.

## Attack these specifically

- **The extractor.** Can any input make it: return markup that later renders as HTML; emit a
  javascript:/data: link; expand or resolve an entity; produce catastrophic regex backtracking
  (ReDoS) on a crafted feed; mis-attribute one item's field to another; or exceed the declared
  caps? Note every regex is applied to attacker-controlled text of up to several MB.
- **`decodeEntities` ordering.** I decode ampersand LAST specifically so a decoded value cannot
  be re-interpreted. Is that sufficient, or is there a double-decode path I have missed?
- **`cleanText`** strips tags AFTER unwrapping CDATA. Can a payload survive that ordering?
- **`safeHttpUrl`** uses `new URL()`. Any bypass — userinfo, unicode/punycode confusion, embedded
  credentials, or a URL that is http(s) but points at internal infrastructure?
- **The manifest validator.** Is `assertManifestsValid` actually called anywhere it matters, or
  is it dead reassurance? (Be blunt — I have not wired it into startup yet.)
- **Migration 0025.** I widened three CHECKs from an enumeration to a slug regex. Is the regex
  right? Does the DO-block drop find the real constraints? Can the widening let anything harmful
  in that the enumeration blocked?
- **Anything about this design that will hurt at 50 sources** that is invisible at 10.

## The code


## packages/domain/src/syndicationFeed.ts
```
/**
 * BLUEPRINT
 * Purpose: Turn an RSS 2.0 / Atom 1.0 document into allowlisted civic story items. This is the
 *          single mechanism that lets SwanGuard reach many news outlets — including local TV
 *          stations — without writing a bespoke client per source. Nearly every outlet publishes
 *          one of these two formats.
 * Data: raw feed text in, `SyndicationItem[]` out. Pure — no network, no clock, no storage.
 * Safety: this is a deliberately NARROW extractor, not an XML parser, and that is a security
 *         decision rather than a shortcut. A general parser accepts DTDs, external entities and
 *         nested-entity expansion — XXE and billion-laughs — from a source we have explicitly
 *         placed inside the threat model. This reads only the handful of tags we allowlist,
 *         never resolves entities beyond five fixed XML built-ins, never follows a reference,
 *         strips every HTML tag out of extracted text, caps item count and field lengths, and
 *         accepts only http(s) links. Anything it cannot understand is dropped, not guessed.
 * Verification: syndicationFeed.test.ts.
 */

export interface SyndicationItem {
  /** Stable per-feed identifier: the feed's guid/id when present, else the link. */
  externalId: string;
  title: string;
  link: string;
  /** ISO-8601 when the feed gave a parseable date, else undefined — never invented. */
  publishedAt?: string;
  summary?: string;
}

/** Hard ceilings so a hostile feed cannot turn one sync into unbounded rows or giant columns. */
const MAX_ITEMS = 200;
const MAX_TITLE = 500;
const MAX_SUMMARY = 2_000;
const MAX_ID = 500;

/**
 * The five XML built-in entities, and nothing else. Numeric character references are decoded
 * only in the plain BMP range. No DTD, no custom entity, no external reference is ever honoured,
 * which is what makes entity-expansion attacks structurally impossible here rather than merely
 * mitigated.
 */
function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-fA-F]{1,6});/g, (_, hex) => safeCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d{1,7});/g, (_, dec) => safeCodePoint(Number.parseInt(dec, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    // Ampersand LAST, so a decoded value can never be re-interpreted as another entity.
    .replace(/&amp;/g, '&');
}

function safeCodePoint(code: number): string {
  if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return '';
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

/** Extracted text is never markup: CDATA is unwrapped, then every tag is removed. */
function cleanText(raw: string, max: number): string {
  const withoutCdata = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  const withoutTags = withoutCdata.replace(/<[^>]*>/g, ' ');
  return decodeEntities(withoutTags).replace(/\s+/g, ' ').trim().slice(0, max);
}

/** First occurrence of a tag's inner text within one entry, namespace-tolerant. */
function tagText(entry: string, tag: string): string | undefined {
  const match = new RegExp(`<(?:\\w+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${tag}>`, 'i').exec(entry);
  return match ? match[1] : undefined;
}

/** Atom puts the URL in an attribute; RSS puts it in the element body. Handle both. */
function entryLink(entry: string): string | undefined {
  const rss = tagText(entry, 'link');
  const fromBody = rss ? cleanText(rss, MAX_ID) : '';
  if (fromBody) return fromBody;

  // Prefer rel="alternate"; fall back to the first href.
  const alternate = /<(?:\w+:)?link\b[^>]*\brel=["']alternate["'][^>]*\bhref=["']([^"']+)["']/i.exec(entry)
    ?? /<(?:\w+:)?link\b[^>]*\bhref=["']([^"']+)["']/i.exec(entry);
  return alternate ? decodeEntities(alternate[1]).trim() : undefined;
}

/** Only absolute http(s). Rejects javascript:, data:, file: and relative junk outright. */
function safeHttpUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return undefined;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined;
  return parsed.toString();
}

/** A date we could not parse is omitted, never guessed — the UI renders "no date" honestly. */
function isoDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const time = Date.parse(cleanText(value, 100));
  return Number.isFinite(time) ? new Date(time).toISOString() : undefined;
}

/**
 * Parse a feed into allowlisted items.
 *
 * Returns [] for anything unrecognisable rather than throwing: a malformed feed from one source
 * must degrade to "this source had nothing" and never take down a multi-source sync.
 */
export function parseSyndicationFeed(raw: string): SyndicationItem[] {
  if (typeof raw !== 'string' || raw.length === 0) return [];

  const entries = raw.match(/<(?:\w+:)?(item|entry)(?:\s[^>]*)?>[\s\S]*?<\/(?:\w+:)?\1>/gi) ?? [];
  const items: SyndicationItem[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    if (items.length >= MAX_ITEMS) break;

    const title = cleanText(tagText(entry, 'title') ?? '', MAX_TITLE);
    const link = safeHttpUrl(entryLink(entry));
    // A story with no title or no reachable link is not evidence — drop it.
    if (!title || !link) continue;

    const rawId = cleanText(tagText(entry, 'guid') ?? tagText(entry, 'id') ?? '', MAX_ID);
    const externalId = rawId || link;
    if (seen.has(externalId)) continue;
    seen.add(externalId);

    const summaryRaw = tagText(entry, 'description') ?? tagText(entry, 'summary') ?? '';
    const summary = cleanText(summaryRaw, MAX_SUMMARY);

    items.push({
      externalId,
      title,
      link,
      publishedAt: isoDate(tagText(entry, 'pubDate') ?? tagText(entry, 'published') ?? tagText(entry, 'updated')),
      ...(summary ? { summary } : {})
    });
  }

  return items;
}
```

## apps/api/src/connectorManifests.ts
```
/**
 * Editorial classification vocabulary.
 *
 * These MIRROR the unions the Newsroom renders (`apps/web/src/newsroom/types.ts`). They are
 * duplicated rather than imported because the API must not depend on the web app, and hoisting
 * them into `@family-first/domain` is a wider refactor than this slice should carry. The
 * manifest test asserts the two stay in step, so the duplication cannot drift silently.
 */
export type Camp = 'left' | 'center' | 'right' | 'org';
export type SourceGroup = 'trusted-org' | 'government' | 'wire' | 'independent' | 'local';

/**
 * BLUEPRINT
 * Purpose: The source catalogue, as DATA. Adding a news outlet — a local station, a wire, an
 *          international desk — must be adding a row here, not writing another bespoke client.
 *          This is what turns "one connector" into the channel wall the product is supposed to be.
 * Data: pure declarations. No network, no clock, no storage.
 * Safety: every field that ends up in front of a reader is editorial metadata WE author, never
 *         anything the upstream feed asserts about itself. `camp` and `ownership` in particular
 *         are claims SwanGuard makes, so each carries a `citation` — the product's rule is that
 *         nothing is labelled without a source, and a bias label is exactly the kind of label
 *         that needs one.
 * Verification: connectorManifests.test.ts.
 */

export interface ConnectorManifest {
  /** Slug; must satisfy the DB constraint `^[a-z0-9][a-z0-9_]{2,63}$` (migration 0025). */
  connectorKey: string;
  /** Display name for the channel wall. */
  name: string;
  /** RSS/Atom covers almost every outlet; json-list covers government-style APIs. */
  kind: 'syndication';
  url: string;
  /** Editorial classification. Never taken from the feed. */
  camp: Camp;
  group: SourceGroup;
  /** Who owns/funds it — the trust signal the vision requires on every source line. */
  ownership: string;
  /** WHY we classify it this way. No label without a citation. */
  citation: string;
  /** Locality for the "your area" surface. Omitted for national/international. */
  locality?: string;
  /** Per-source ceilings; the generic client clamps these. */
  maxItems?: number;
  maxResponseBytes?: number;
}

/**
 * The starting catalogue.
 *
 * Deliberately small and verifiable rather than a sprawling list of URLs nobody has checked —
 * an entry whose feed 404s produces an empty source on the wall, which is exactly the kind of
 * quiet lie this product exists to avoid. Every URL here is a publicly documented feed. Each
 * one still ships OFF: a manifest makes a source *available* to enable, never enabled.
 *
 * Local stations are first-class, not an afterthought — the "your area" surface is the point.
 */
export const CONNECTOR_MANIFESTS: readonly ConnectorManifest[] = [
  {
    connectorKey: 'npr_national',
    name: 'NPR News',
    kind: 'syndication',
    url: 'https://feeds.npr.org/1001/rss.xml',
    camp: 'center',
    group: 'wire',
    ownership: 'Non-profit; member stations + underwriting + federal grants',
    citation: 'NPR publishes its funding breakdown in its annual financial statements (npr.org/about-npr/178660742).'
  },
  {
    connectorKey: 'pbs_newshour',
    name: 'PBS NewsHour',
    kind: 'syndication',
    url: 'https://www.pbs.org/newshour/feeds/rss/headlines',
    camp: 'center',
    group: 'wire',
    ownership: 'Non-profit public broadcasting; viewer + foundation funded',
    citation: 'PBS publishes annual reports and funding sources (pbs.org/about/about-pbs/).'
  },
  {
    connectorKey: 'bbc_world',
    name: 'BBC World',
    kind: 'syndication',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    camp: 'center',
    group: 'wire',
    ownership: 'UK public broadcaster funded by licence fee',
    citation: 'BBC Charter and Annual Report set out its funding (bbc.co.uk/aboutthebbc).'
  },
  {
    connectorKey: 'aljazeera_english',
    name: 'Al Jazeera English',
    kind: 'syndication',
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
    camp: 'center',
    group: 'wire',
    ownership: 'Funded by the government of Qatar',
    citation: 'Al Jazeera Media Network is state-funded; disclosed in its corporate profile.'
  },
  {
    connectorKey: 'propublica',
    name: 'ProPublica',
    kind: 'syndication',
    url: 'https://www.propublica.org/feeds/propublica/main',
    camp: 'left',
    group: 'independent',
    ownership: 'Non-profit newsroom; philanthropic donors, disclosed publicly',
    citation: 'ProPublica publishes its full donor list (propublica.org/about/supporters).'
  },
  {
    connectorKey: 'reason_magazine',
    name: 'Reason',
    kind: 'syndication',
    url: 'https://reason.com/latest/feed/',
    camp: 'right',
    group: 'independent',
    ownership: 'Reason Foundation, a libertarian non-profit',
    citation: 'Reason Foundation is a registered 501(c)(3); IRS filings are public.'
  },
  {
    connectorKey: 'idaho_statesman',
    name: 'Idaho Statesman',
    kind: 'syndication',
    url: 'https://www.idahostatesman.com/news/local/?widgetName=rssfeed&widgetContentId=712015&getXmlFeed=true',
    camp: 'center',
    group: 'local',
    ownership: 'McClatchy Company (chain-owned; Chatham Asset Management)',
    citation: 'McClatchy was acquired by Chatham Asset Management in 2020; SEC filings are public.',
    locality: 'Idaho'
  },
  {
    connectorKey: 'idaho_capital_sun',
    name: 'Idaho Capital Sun',
    kind: 'syndication',
    url: 'https://idahocapitalsun.com/feed/',
    camp: 'center',
    group: 'local',
    ownership: 'States Newsroom — non-profit, donor-funded state newsrooms',
    citation: 'States Newsroom publishes its funders (statesnewsroom.com/about).',
    locality: 'Idaho'
  },
  {
    connectorKey: 'aclu_news',
    name: 'ACLU',
    kind: 'syndication',
    url: 'https://www.aclu.org/feed',
    camp: 'left',
    group: 'trusted-org',
    ownership: 'Non-profit civil-liberties organisation; member and donor funded',
    citation: 'ACLU publishes annual reports and financials (aclu.org/annual-reports).'
  },
  {
    connectorKey: 'splc_news',
    name: 'Southern Poverty Law Center',
    kind: 'syndication',
    url: 'https://www.splcenter.org/rss.xml',
    camp: 'left',
    group: 'trusted-org',
    ownership: 'Non-profit legal advocacy; donor funded',
    citation: 'SPLC publishes audited financial statements (splcenter.org/about/financial-information).'
  }
] as const;

const KEY_PATTERN = /^[a-z0-9][a-z0-9_]{2,63}$/;

export function manifestByKey(connectorKey: string): ConnectorManifest | undefined {
  return CONNECTOR_MANIFESTS.find((manifest) => manifest.connectorKey === connectorKey);
}

/**
 * Fail LOUDLY at startup on a malformed catalogue rather than at 3am on a database CHECK.
 * A duplicate key would silently shadow a source; a bad slug would be rejected by migration 0025.
 */
export function assertManifestsValid(manifests: readonly ConnectorManifest[] = CONNECTOR_MANIFESTS): void {
  const seen = new Set<string>();
  for (const manifest of manifests) {
    if (!KEY_PATTERN.test(manifest.connectorKey)) {
      throw new Error(`connector manifest key is not a valid slug: ${manifest.connectorKey}`);
    }
    if (seen.has(manifest.connectorKey)) {
      throw new Error(`duplicate connector manifest key: ${manifest.connectorKey}`);
    }
    seen.add(manifest.connectorKey);
    const url = new URL(manifest.url);
    if (url.protocol !== 'https:') {
      throw new Error(`connector manifest must use https: ${manifest.connectorKey}`);
    }
    if (!manifest.citation.trim()) {
      throw new Error(`connector manifest must carry a citation for its camp label: ${manifest.connectorKey}`);
    }
  }
}
```

## packages/database/migrations/0025_connector_key_format_constraint.sql
```
-- Open the connector catalogue from a hard-coded list of three to a manifest-driven registry.
--
-- 0022 pinned every connector table to `check (connector_key in ('cpsc_recalls', 'nws_alerts',
-- 'federal_register'))`. That was correct when three bespoke clients were the whole product, but
-- it makes the database the blocker for the newsroom: adding a news outlet — a local station, a
-- wire, an international desk — would require a migration per source. The vision calls for a
-- channel wall of many sources, and the coverage spectrum cannot be honest until several
-- independent outlets cover the same story, so this constraint gates the core feature.
--
-- We widen the constraint WITHOUT giving up integrity: the key must still be a well-formed slug,
-- so a typo or injected junk is still rejected at the database boundary. Widening an existing
-- CHECK keeps every existing row valid and is safe in both directions of a rolling deploy.
--
-- NOTE ON HOW THE DROP IS WRITTEN. Those CHECKs were declared table-level and unnamed, so
-- PostgreSQL generated names like `official_connector_settings_check`, `..._check1`, `..._check2`
-- — the ordinal depends on how many other unnamed CHECKs the table has. Guessing a name and
-- writing `drop constraint if exists <guess>` would silently do NOTHING and leave the old
-- restrictive CHECK in force: a migration that reports success and changes nothing. So we look
-- the constraint up by its DEFINITION instead, and drop whichever one actually enumerates the
-- three legacy keys.

do $$
declare
  target record;
begin
  for target in
    select rel.relname as table_name, con.conname as constraint_name
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = current_schema()
      and con.contype = 'c'
      and rel.relname in (
        'official_connector_settings',
        'official_connector_items',
        'official_connector_receipts'
      )
      -- the legacy enumeration, however PostgreSQL chose to name it
      and pg_get_constraintdef(con.oid) like '%federal_register%'
      and pg_get_constraintdef(con.oid) like '%connector_key%'
  loop
    execute format('alter table %I drop constraint %I', target.table_name, target.constraint_name);
  end loop;
end $$;

alter table official_connector_settings
  add constraint official_connector_settings_connector_key_format
  check (connector_key ~ '^[a-z0-9][a-z0-9_]{2,63}$');

alter table official_connector_items
  add constraint official_connector_items_connector_key_format
  check (connector_key ~ '^[a-z0-9][a-z0-9_]{2,63}$');

alter table official_connector_receipts
  add constraint official_connector_receipts_connector_key_format
  check (connector_key ~ '^[a-z0-9][a-z0-9_]{2,63}$');
```
