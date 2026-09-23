# SwanGuard — Kimi K3, packet 4: FEATURE + DESIGN gap analysis (not a security review)

Packets 1-3 were security. This one is different: **the owner (Sean) says the app does not yet
have the features he described in his own vision doc, and he wants it made genuinely usable and
expanded to many more news sources.** Your job is a gap analysis + a concrete build/design plan.

## What I need from you, concretely

1. **Gap table:** what the vision specifies vs what is actually built, ranked by
   value-per-unit-of-effort. Be blunt about what is missing.
2. **Source-expansion architecture:** how to go from ONE hardcoded connector to 50+ news
   sources WITHOUT writing 50 bespoke clients. Name the abstraction.
3. **Make the bias/blindspot spectrum REAL.** Today it is deliberately faked-off (see below).
   What is the minimum honest mechanism that turns it on?
4. **2-3 concrete DESIGN DIRECTIONS** for the source picker ("channel wall") and the feed —
   described precisely enough to build, mobile-first. Include what makes each distinct.
5. **Build order.** What ships first to make the app feel usable and complete.

Give reasoning, tradeoffs, and where you are uncertain. Do NOT invent facts about third-party
APIs — if you are unsure of a licence or a rate limit, say so and mark it for verification.

## THE VISION (owner's locked decisions — plan around these, not about them)

- **Evidence, not oracle.** Never declares bare true/false. Shows the source spectrum, who
  owns/funds each source, whether primary records back the claim, and historical precedent.
  Flags contradictions WITH both receipts attached. The user concludes. This is the credibility
  moat AND the legal defence.
- **#1 stated pain: "stop being confusing."** Verbatim: the app "still looks amateur," is
  "overly complicated," has "too many buttons that don't make sense." Success test: *the owner
  opens the app and immediately knows where he is, what to do, and how to get back — zero
  confusion, on his phone.* Every other feature is secondary to this.
- **Design north star: Ground News + Microsoft News simplicity.** One primary feed you land on,
  a Microsoft-News-style **channel wall** for picking sources, progressive disclosure, a reading
  flow that never dead-ends. Mobile-first, dark default.
- **"Keep it real" doctrine.** Universal app, but it does not sanitise that experience differs
  by race — it states it and PROVES it with sourced, locality-level data (Stanford Open Policing
  traffic-stop disparity). Protective orgs (ACLU, SPLC) are a first-class tracked source class.
- **Defamation discipline:** nothing is labelled without a citation.
- **Five pillars:** 1 Newsroom (Ground-News-grade), 2 News Analyst (catalogs/tags/cross-checks,
  gets smarter as you save), 3 Archive (truth-vault + American historical spine back to the 1790
  census), 4 Safety Map (modern Green Book, sourced, offline, never logs user location),
  5 Ethical Market (buy from companies whose DOCUMENTED actions align — FEC donations, Open
  Food Facts, FDA recalls).
- Family-trust engine is ICEBOXED (reversible, not deleted). No fourth tab.

## GROUNDED REALITY — what is actually built today (verified, not guessed)

- **3-tab Newsroom shell** (Feed / Sources / Archive) + a gated owner console. Mounted and
  working. The legacy 14-module shell is fully tree-shaken out of the production bundle.
- **Exactly ONE live source: Federal Register.** It is a government-records connector, not a
  news outlet. 100 real records flow end-to-end, verified live.
- **The connector control plane is the reusable bone:** per-connector contract gates -> owner
  enable (default OFF, exact confirmation phrase) -> kill switch -> daily quota -> retention
  window -> provenance-stamped receipts. Adding a connector today means writing a bespoke
  client + a config block + wiring.
- **The service boundary is the load-bearing design decision.** `storyService.ts` defines the
  interface; `demoStoryService` and `httpStoryService` implement it; components NEVER touch
  storage or fetch. Live data landed with ZERO component changes. Preserve this.
- **The spectrum is deliberately OFF.** A single government record is one source, so the mapper
  reports `{left:0, center:1, right:0}` with `blindspot: null` rather than inventing coverage it
  has not measured. Turning it on honestly requires MULTIPLE INDEPENDENT OUTLETS PER STORY —
  i.e. story clustering, which does not exist yet.
- Demo mode ships fixtures (clearly badged); production cannot reach demo mode without an
  explicit staging flag.
- **No AI analyst, no archive intelligence, no safety map, no market.** Pillars 2-5 are unbuilt.
  The Archive tab is local-storage save/unsave only.

## RESEARCH I have already done (use it; correct me if I am wrong)

Owner asked specifically for "Microsoft News's" providers and "Idaho News" and "many more
stations". Findings:

- **MSN does not publish a complete provider list** and licenses content from thousands of
  publishers commercially. Replicating MSN's catalogue directly is not available to us. BUT
  nearly every one of those publishers exposes **public RSS**, which is free and unlimited.
- **RSS is the only free path to real multi-outlet news at scale**, including local TV
  (Idaho-style local stations almost all publish RSS). AP/Reuters wires are licensed.
- Free/low-cost APIs found (VERIFY terms before relying on any):
  - **GDELT** — free, global, updates ~every 15 min, 100+ languages, back to 1979, via BigQuery
    and file downloads. Strongest archival/analysis option.
  - **Currents API** — ~600 req/day free, commercial use permitted on free tier.
  - **GNews** — ~100 req/day free, 60k+ sources.
  - **NewsData.io** — 97k+ sources, 206 countries, 10-year archive, commercial use on free tier.
  - Already-planned free civic sources: Congress.gov, openFEC, CourtListener, Census,
    Open Food Facts, **Stanford Open Policing** (the "keep it real" spine).

## Hard constraints you must respect

- **No mock data, ever.** A dormant source shows an EMPTY feed; a failed fetch throws a visible
  error. Never backfill with fixtures.
- **Do not invent a left/center/right spectrum for a single source.** Until clustering exists,
  reporting a spectrum we did not measure is fabrication.
- Every new connector must keep: contract test before enable, owner-enable default OFF, kill
  switch, health/staleness check, cost circuit-breaker, terms attestation.
- Stack: React + styled-components + Vite (no MUI, no Tailwind), Node/TS + raw `pg` (no ORM).
- 44px minimum touch targets; mobile and desktop matter equally.

## The connector template you are generalising (apps/api/src/officialConnectorClients.ts)
```typescript
import { allowlistFederalRegisterDocument, allowlistRecallItem, allowlistWeatherAlert } from '@family-first/domain';
import type {
  OfficialConnectorFetchBatch,
  OfficialConnectorFetchedItem,
  OfficialConnectorProviderClient
} from './officialConnectorTypes';

const NWS_ALERTS_URL = 'https://api.weather.gov/alerts/active';
const CPSC_RECALLS_URL = 'https://www.saferproducts.gov/RestWebServices/Recall';
const FEDERAL_REGISTER_URL = 'https://www.federalregister.gov/api/v1/documents.json';
const FEDERAL_REGISTER_FIELDS = [
  'document_number', 'title', 'abstract', 'publication_date', 'type', 'agencies', 'html_url', 'pdf_url'
] as const;
const DEFAULT_MAX_RESPONSE_BYTES = 5_000_000;

export class OfficialConnectorProviderError extends Error {
  constructor() {
    super('Official connector provider request failed');
    this.name = 'OfficialConnectorProviderError';
  }
}

type CommonClientOptions = {
  fetchImpl?: typeof fetch;
  maxItems?: number;
  maxResponseBytes?: number;
  timeoutMs?: number;
};

export function createNwsAlertsClient(options: CommonClientOptions & {
  area: string;
  userAgent: string;
}): OfficialConnectorProviderClient {
  const area = normalizeArea(options.area);
  const userAgent = normalizeUserAgent(options.userAgent);
  const fetchImpl = options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const maxItems = boundedInteger(options.maxItems, 200, 1, 500);
  const maxResponseBytes = boundedInteger(options.maxResponseBytes, DEFAULT_MAX_RESPONSE_BYTES, 1, 10_000_000);
  const timeoutMs = boundedInteger(options.timeoutMs, 10_000, 250, 30_000);

  return {
    connectorKey: 'nws_alerts',
    async fetchBatch(): Promise<OfficialConnectorFetchBatch> {
      const url = new URL(NWS_ALERTS_URL);
      url.searchParams.set('area', area);
      const payload = await fetchJson(fetchImpl, url.toString(), {
        headers: { accept: 'application/geo+json', 'user-agent': userAgent },
        signal: AbortSignal.timeout(timeoutMs)
      }, maxResponseBytes);
      const features = isRecord(payload) && Array.isArray(payload.features) ? payload.features : [];
      const items = features.slice(0, maxItems).map(mapNwsFeature).filter(isFetchedItem);
      return { connectorKey: 'nws_alerts', items, quotaSpent: 1 };
    }
  };
}

export function createCpscRecallsClient(options: CommonClientOptions & {
  lookbackDays?: number;
  now?: () => Date;
} = {}): OfficialConnectorProviderClient {
  const fetchImpl = options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const lookbackDays = boundedInteger(options.lookbackDays, 14, 1, 90);
  const maxItems = boundedInteger(options.maxItems, 100, 1, 500);
  const maxResponseBytes = boundedInteger(options.maxResponseBytes, DEFAULT_MAX_RESPONSE_BYTES, 1, 10_000_000);
  const timeoutMs = boundedInteger(options.timeoutMs, 10_000, 250, 30_000);
  const now = options.now ?? (() => new Date());

  return {
    connectorKey: 'cpsc_recalls',
    async fetchBatch(): Promise<OfficialConnectorFetchBatch> {
      const end = startOfUtcDay(now());
      const start = new Date(end.getTime() - lookbackDays * 86_400_000);
      const url = new URL(CPSC_RECALLS_URL);
      url.searchParams.set('format', 'json');
      url.searchParams.set('RecallDateStart', dateLabel(start));
      url.searchParams.set('RecallDateEnd', dateLabel(end));
      const payload = await fetchJson(fetchImpl, url.toString(), {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs)
      }, maxResponseBytes);
      const rows = Array.isArray(payload) ? payload : [];
      const items = rows.slice(0, maxItems).map(mapCpscRecall).filter(isFetchedItem);
      return { connectorKey: 'cpsc_recalls', items, quotaSpent: 1 };
    }
  };
}

export function createFederalRegisterClient(options: CommonClientOptions & {
  lookbackDays?: number;
  now?: () => Date;
} = {}): OfficialConnectorProviderClient {
  const fetchImpl = options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const lookbackDays = boundedInteger(options.lookbackDays, 14, 1, 90);
  const maxItems = boundedInteger(options.maxItems, 100, 1, 500);
  const maxResponseBytes = boundedInteger(options.maxResponseBytes, DEFAULT_MAX_RESPONSE_BYTES, 1, 10_000_000);
  const timeoutMs = boundedInteger(options.timeoutMs, 10_000, 250, 30_000);
  const now = options.now ?? (() => new Date());

  return {
    connectorKey: 'federal_register',
    async fetchBatch(): Promise<OfficialConnectorFetchBatch> {
      const end = startOfUtcDay(now());
      const start = new Date(end.getTime() - lookbackDays * 86_400_000);
      const url = new URL(FEDERAL_REGISTER_URL);
      url.searchParams.set('conditions[publication_date][gte]', dateLabel(start));
      url.searchParams.set('conditions[publication_date][lte]', dateLabel(end));
      url.searchParams.set('order', 'newest');
      url.searchParams.set('per_page', String(maxItems));
      for (const field of FEDERAL_REGISTER_FIELDS) url.searchParams.append('fields[]', field);
      const payload = await fetchJson(fetchImpl, url.toString(), {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs)
      }, maxResponseBytes);
      const rows = isRecord(payload) && Array.isArray(payload.results) ? payload.results : [];
      const items = rows.slice(0, maxItems).map(mapFederalRegisterDocument).filter(isFetchedItem);
      return { connectorKey: 'federal_register', items, quotaSpent: 1 };
    }
  };
}

/**
 * Read a response body, ABORTING as soon as it exceeds the cap.
 *
 * `response.text()` buffers the entire body into a string before anything can measure it, so
 * the byte check that used to follow it bounded only what got PARSED AND STORED — never what
 * was held in memory. A hostile or compromised upstream (explicitly in the threat model for
 * this surface, and about to become a much wider surface as more news feeds are added) could
 * answer with no `content-length` — or a lied-small one, which passes the header check just as
 * easily — and stream gigabytes into the heap. The declared-length check above is a cheap
 * early-out, not the enforcement.
 *
 * Streaming the body and stopping at the first chunk that crosses the cap makes the limit real:
 * memory is bounded by `maxBytes + one chunk` no matter what the upstream sends. `cancel()`
 * tears down the connection rather than politely draining it.
 */
async function readCapped(response: Response, maxBytes: number): Promise<string> {
  const body = response.body;
  // No stream available (some fetch stubs, and older runtimes) — fall back, but still measure.
  if (!body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) throw new OfficialConnectorProviderError();
    return text;
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new OfficialConnectorProviderError();
      chunks.push(decoder.decode(value, { stream: true }));
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  chunks.push(decoder.decode());
  return chunks.join('');
}

async function fetchJson(fetchImpl: typeof fetch, url: string, init: RequestInit, maxBytes: number): Promise<unknown> {
  try {
    // Never follow redirects. These are fixed government API endpoints — a 3xx is never
    // legitimate, and following one lets a compromised host / DNS-rebind / TLS middlebox
    // steer the server to an internal address (SSRF). Fail closed instead.
    const response = await fetchImpl(url, { ...init, redirect: 'error' });
    const length = Number(response.headers.get('content-length') ?? '0');
    if (!response.ok || (Number.isFinite(length) && length > maxBytes)) throw new OfficialConnectorProviderError();
    return JSON.parse(await readCapped(response, maxBytes)) as unknown;
  } catch (error) {
    if (error instanceof OfficialConnectorProviderError) throw error;
    throw new OfficialConnectorProviderError();
  }
}

function mapFederalRegisterDocument(value: unknown): OfficialConnectorFetchedItem | null {
  const payload = allowlistFederalRegisterDocument(value);
  return payload ? { externalId: payload.documentNumber, payload } : null;
}

function mapNwsFeature(value: unknown): OfficialConnectorFetchedItem | null {
  if (!isRecord(value) || !isRecord(value.properties)) return null;
  const externalId = clippedString(value.id, 500);
  const payload = allowlistWeatherAlert({
    alertId: externalId,
    area: clippedString(value.properties.areaDesc, 500),
    effective: clippedString(value.properties.effective, 64),
    event: clippedString(value.properties.event, 180),
    expires: clippedString(value.properties.expires, 64),
    headline: clippedString(value.properties.headline, 600),
    severity: clippedString(value.properties.severity, 40)
  });
  return externalId && payload ? { externalId, payload } : null;
}

function mapCpscRecall(value: unknown): OfficialConnectorFetchedItem | null {
  if (!isRecord(value)) return null;
  const externalId = clippedString(value.RecallID, 80);
  const payload = allowlistRecallItem({
    hazard: nestedNames(value.Hazards, 600),
    productName: nestedNames(value.Products, 400),
    recallDate: clippedString(value.RecallDate, 64),
    recallId: externalId,
    remedy: nestedNames(value.Remedies, 400),
    title: clippedString(value.Title, 600)
  });
  return externalId && payload ? { externalId, payload } : null;
}

function nestedNames(value: unknown, max: number): string {
  if (!Array.isArray(value)) return '';
  return value.map((item) => isRecord(item) ? clippedString(item.Name, 240) : '').filter(Boolean).join('; ').slice(0, max);
}

function clippedString(value: unknown, max: number): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value).slice(0, max);
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function normalizeArea(value: string): string {
  const area = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(area)) throw new OfficialConnectorProviderError();
  return area;
}

function normalizeUserAgent(value: string): string {
  const userAgent = value.trim();
  if (!userAgent || userAgent.length > 180 || /[\r\n\u0000-\u001f\u007f]/.test(userAgent)) {
    throw new OfficialConnectorProviderError();
  }
  return userAgent;
}

function boundedInteger(value: number | undefined, fallback: number, min: number, max: number): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < min || value > max) throw new OfficialConnectorProviderError();
  return value;
}

function startOfUtcDay(value: Date): Date {
  if (!Number.isFinite(value.getTime())) throw new OfficialConnectorProviderError();
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function dateLabel(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isFetchedItem(value: OfficialConnectorFetchedItem | null): value is OfficialConnectorFetchedItem {
  return value !== null;
}```

## The Newsroom data boundary you must preserve (apps/web/src/newsroom/storyService.ts)
```typescript
/**
 * BLUEPRINT
 * Purpose: The single data boundary for the Newsroom (Kimi Slice-1 rule 1 — the
 *          highest-leverage decision). Every read/write of stories, sources, and
 *          saved nodes goes through this interface; the UI never touches storage.
 *          In Slice 6 the MCP server becomes a thin adapter over THIS interface
 *          instead of a rewrite. In demo mode, reads come from demoData and Saves
 *          persist to localStorage using the REAL SavedRecord schema (the Slice 2
 *          hook — swap localStorage for a /brain markdown node when the backend lands).
 * Data: Reads apps/web/src/newsroom/demoData (in-memory); writes SavedRecord[] to
 *       localStorage key `swanguard:brain:saved:v1`.
 * States: Save/unsave are idempotent; a corrupt or unavailable store fails safe to [].
 * Safety: No network, no PII, no secrets. Demo-only persistence is namespaced + versioned.
 * Verification: storyService.test.ts (save/list/unsave roundtrip + corrupt-store fallback).
 */

import { DEMO_SOURCES, DEMO_STORIES } from './demoData';
import type { SavedRecord, SourceChannel, StoryNode } from './types';

const SAVED_KEY = 'swanguard:brain:saved:v1';

export interface SaveInput {
  tags?: string[];
  note?: string;
  status?: SavedRecord['status'];
}

/**
 * Thrown when a save or unsave could not be persisted. The caller MUST surface this — never
 * confirm an action the store refused.
 */
export class StoryPersistenceError extends Error {
  constructor(message = 'This browser blocked local storage, so nothing was saved') {
    super(message);
    this.name = 'StoryPersistenceError';
  }
}

export interface StoryService {
  listStories(): Promise<StoryNode[]>;
  getStory(id: string): Promise<StoryNode | undefined>;
  listSources(): Promise<SourceChannel[]>;
  listSaved(): Promise<SavedRecord[]>;
  isSaved(storyId: string): Promise<boolean>;
  save(storyId: string, input?: SaveInput): Promise<SavedRecord>;
  unsave(storyId: string): Promise<void>;
}

/** Minimal storage surface so tests can inject a fake (Node has no localStorage). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function resolveStore(explicit?: KeyValueStore): KeyValueStore | null {
  if (explicit) return explicit;
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    // localStorage can throw in private-mode / sandboxed contexts — fail safe.
  }
  return null;
}

function readSaved(store: KeyValueStore | null): SavedRecord[] {
  if (!store) return [];
  let raw: string | null = null;
  try {
    raw = store.getItem(SAVED_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Keep only well-formed records — a corrupt entry never crashes the feed.
    return parsed.filter(
      (entry): entry is SavedRecord =>
        !!entry && typeof entry.storyId === 'string' && typeof entry.savedAt === 'string'
    );
  } catch {
    return [];
  }
}

/**
 * Persist, and report honestly whether it worked.
 *
 * This used to swallow the failure and return void, so `save()` handed back a SavedRecord —
 * and the shell toasted "Saved to Archive" — when nothing had been written at all. In a
 * browser with storage blocked (private mode, a sandboxed frame, quota exhausted) the reader
 * was told their evidence was filed and the Archive was empty. A save confirmation for a save
 * that did not happen is exactly the receipt-that-lies failure this product exists to prevent.
 */
function writeSaved(store: KeyValueStore | null, records: SavedRecord[]): boolean {
  if (!store) return false;
  try {
    store.setItem(SAVED_KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

/** Default demo tags derived from a node, so a Save is meaningful with zero user input. */
function defaultTags(story: StoryNode | undefined): string[] {
  if (!story) return [];
  const tags: string[] = [];
  if (story.kicker) tags.push(story.kicker.toLowerCase());
  if (story.locality) tags.push(story.locality);
  const flagged = story.claims?.some((c) => c.status === 'contradicted-by-record');
  if (flagged) tags.push('disputed-claim');
  return tags;
}

/**
 * The demo/localStorage StoryService. `now` and `store` are injectable so tests are
 * deterministic and don't depend on a real clock or browser storage.
 */
export function createDemoStoryService(options: {
  store?: KeyValueStore;
  now?: () => string;
} = {}): StoryService {
  const store = resolveStore(options.store);
  const now = options.now ?? (() => new Date().toISOString());
  const stories = DEMO_STORIES;
  const byId = new Map(stories.map((s) => [s.id, s]));

  return {
    async listStories() {
      return stories;
    },
    async getStory(id) {
      return byId.get(id);
    },
    async listSources() {
      return DEMO_SOURCES;
    },
    async listSaved() {
      return readSaved(store);
    },
    async isSaved(storyId) {
      return readSaved(store).some((r) => r.storyId === storyId);
    },
    async save(storyId, input = {}) {
      const existing = readSaved(store);
      const record: SavedRecord = {
        storyId,
        savedAt: now(),
        tags: input.tags ?? defaultTags(byId.get(storyId)),
        status: input.status ?? 'saved',
        note: input.note
      };
      // Idempotent: replace any prior save for this story, newest kept at the top.
      const next = [record, ...existing.filter((r) => r.storyId !== storyId)];
      if (!writeSaved(store, next)) throw new StoryPersistenceError();
      return record;
    },
    async unsave(storyId) {
      const existing = readSaved(store);
      if (!writeSaved(store, existing.filter((r) => r.storyId !== storyId))) {
        throw new StoryPersistenceError('This browser blocked local storage, so nothing was removed');
      }
    }
  };
}
```

## The story shape the UI renders (apps/web/src/newsroom/types.ts)
```typescript
/**
 * BLUEPRINT
 * Purpose: The canonical Story/Node type for the SwanGuard "receipts graph" (the brain).
 *          Every pillar (Newsroom, Creator, Brain, agent layer) speaks this one type.
 *          Slice 1 renders only a subset; the full schema — provenance, claims, and the
 *          temporal fields — is defined NOW so no pillar is a retrofit later (Kimi §C).
 * Data: Pure types. No runtime, no storage, no IO.
 * Safety: Evidence-not-oracle is encoded in the type — a Claim carries a `status` plus a
 *         `contradicts` receipt, never a bare boolean "true/false" verdict.
 * Verification: consumed by storyService.test.ts + NewsroomShell.test.tsx.
 */

/** Where a node came from — determines which sensor/pillar wrote it. */
export type StoryType = 'article' | 'video' | 'record' | 'claim' | 'note';

/** Political lean of a source, or a trusted protective org. */
export type Camp = 'left' | 'center' | 'right' | 'org';

/** A provenance-stamped source that covered a story. */
export interface SourceRef {
  name: string;
  camp: Camp;
  /** "Owned by X Corp" / "Nonprofit, funded by Y" — shown on every source line. */
  ownership?: string;
  url?: string;
  /** ISO timestamp the content was retrieved — part of the receipt. */
  retrievedAt?: string;
  /** Content hash pinning the fetched bytes (Kimi §4). Optional until real ingestion. */
  sha256?: string;
}

/** Coverage spread across the political spectrum, by source count. */
export interface SpectrumCounts {
  left: number;
  center: number;
  right: number;
}

/**
 * A single extracted factual claim. `status` is always paired with evidence:
 * a `contradicted-by-record` claim MUST carry a `contradicts` receipt. The UI
 * never shows a bare verdict — it shows the receipt and lets the reader conclude.
 */
export interface ClaimRef {
  id: string;
  text: string;
  status: 'unreviewed' | 'corroborated' | 'contested' | 'contradicted-by-record';
  /** The record this claim conflicts with — required when status is contradicted-by-record. */
  contradicts?: { record: string; url?: string };
}

/** A primary-record backing (bill text, dataset, filing, court record). */
export interface RecordRef {
  label: string;
  kind: 'bill' | 'dataset' | 'record' | 'filing';
  url?: string;
}

/** A historical parallel — "America has done this before." */
export interface PrecedentRef {
  label: string;
  url?: string;
}

/**
 * The canonical node in the brain. Slice 1 populates it from demo data; later
 * slices populate it from real sensors. Field groups map to the Ledger panel:
 * sources → "Who's covering it", records → "What the record says",
 * precedents → "Precedent", claims → "Flags".
 */
export interface StoryNode {
  id: string;
  type: StoryType;
  title: string;
  deck?: string;
  /** Topic label, e.g. "Justice", "Voting", "Food Safety". */
  kicker?: string;
  locality?: string;
  publishedAtLabel?: string;
  sources: SourceRef[];
  spectrum: SpectrumCounts;
  /** Total distinct sources (may exceed spectrum sums when orgs are counted separately). */
  sourceCount: number;
  /** Which camp is under-covering this story, or null when balanced. */
  blindspot?: Camp | null;
  records?: RecordRef[];
  precedents?: PrecedentRef[];
  claims?: ClaimRef[];
  /**
   * A sourced "keep it real" locality-disparity stat (Stanford Open Policing class),
   * shown as its own card in-feed. Sourced, never an unsourced label.
   */
  disparity?: { label: string; source: string; url?: string };
  /** Entity ids this node references — proposed until human-confirmed (schema now, unused in Slice 1). */
  entities?: string[];
  /** Related node ids — proposed until confirmed (schema now, unused in Slice 1). */
  related?: string[];
  /** Temporal fields — present from day one, reasoning arrives with the track-record slice (Kimi §C). */
  validFrom?: string;
  validTo?: string;
  supersededBy?: string;
  /** Marks the single cinematic Atlas lead cover for a session. */
  lead?: boolean;
  /** Demo-only cover tone; real stories carry an image later. */
  imageTone?: 'blue' | 'amber' | 'teal';
}

/**
 * A user's decision to keep a node — stored separately from the evidence, as
 * theirs (Kimi §3). This is the real schema the Save button writes in demo mode
 * (localStorage now; a real markdown node in /brain once the backend lands).
 */
export interface SavedRecord {
  storyId: string;
  /** ISO timestamp. */
  savedAt: string;
  tags: string[];
  /** The reader's own status for this node — distinct from any source's claim. */
  status: 'saved' | 'corroborated' | 'contested' | 'contradicted-by-record';
  note?: string;
}

/** A toggleable source channel on the Sources wall. */
export interface SourceChannel {
  id: string;
  name: string;
  camp: Camp;
  group: 'trusted-org' | 'government' | 'wire' | 'independent' | 'local';
  detail: string;
  /** Default on/off — real channels default OFF and are owner-enabled (Kimi/connector posture). */
  enabled: boolean;
}
```
