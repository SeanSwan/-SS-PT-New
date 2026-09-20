/*
 * ConsoleDataAdapter — the modularity seam (05-contracts.md §1).
 * The UI imports ONLY this module. Transcribed verbatim from the contract;
 * do not "improve" shapes here without amending 05-contracts.md first.
 *
 * R2-01 (Astra round 2, 2026-09-20) FOUND THAT RULE BEING BROKEN IN THIS FILE.
 * Three declarations had drifted from what the bridge actually serializes, so a
 * future consumer would have been built on a contract the bridge does not honour:
 * `ytdlp` omitted the health PROVENANCE, `BrainDoc` omitted `generation`, and
 * `CanaryReading` could not express the `unknown` source. The contract
 * (`05-contracts.md`) was amended in the same pass. **Every declared field is now
 * asserted against a live payload by `bridge.contractsync.test.mjs`**, which
 * reads this file as text and requires each declared key to exist on the route —
 * so the next drift fails a test instead of shipping.
 */

export type Tier = 'T0' | 'T1' | 'T2' | 'T3' | 'T4';

export interface DamageReport {
  file: string;
  detail: string;
}

/**
 * Where a health verdict came from, and how old it is (lib/health.mjs:114).
 *
 * `unknown` IS A FIRST-CLASS SOURCE, not an absence. It means "no verdict has
 * been taken" — the probe has not run and there is no history entry — and it is
 * deliberately distinct from `probe` with `ok: false`, which means "a live check
 * ran and failed". Collapsing the two is how "we have not looked" comes to be
 * rendered as "it is broken" (R2-01).
 */
export type HealthSource = 'probe' | 'history' | 'unknown';

/**
 * The composed health reading, with its provenance (lib/health.mjs:283 `shape`).
 *
 * `stale` is true for any `history` reading BY DEFINITION — it is a record of a
 * past verdict, however recent, and must never be presented as a live one.
 */
export interface HealthReading {
  ok: boolean;
  version: string | null;
  reason: string;
  checkedAt: string | null;
  ageMs: number | null;
  source: HealthSource;
  stale: boolean;
  note: string | null;
}

export interface StatusInstrument {
  // R2 — mirrors status-command sources
  ytdlp: HealthReading;
  creators: { total: number; enabled: number; damaged: DamageReport | null };
  state: {
    damaged: DamageReport | null;
    videos: {
      total: number;
      fetched: number;
      coverage: number;
      counts: Record<string, number>;
    } | null;
  };
  budget: { used: number; perHour: number; unit: string; byKind: Record<string, number> };
  backlog: { lines: string[] }; // engine-formatted truth, not re-derived
  throttle: { active: boolean; kind?: string; until?: string; text: string };
  census: {
    inFlight: Array<{ channelId: string; detail: string }>;
    everSwept: number;
    discarded: boolean;
    error?: string;
  };
  lock: { held: boolean; pid?: number; host?: string; alive?: boolean };
  lastRun: { status: string; runId: string | null } | null;
  lastGood: { at: string; staleDays: number } | null;
  documents: number;
  publishedBrains: number;
  recentRuns: Array<{ runId: string; ok: boolean; fetched: number }>;
}

export interface CreatorRow {
  channelId: string;
  title: string;
  enabled: boolean;
  /**
   * Counts come from `state.json` via the same per-creator filter
   * `launch.mjs renderCreators` uses. `null` means the count COULD NOT BE TAKEN
   * — `state.json` is damaged — and must be rendered as absent, never as 0
   * (S1-H9). A zero here would read as "this creator has no videos".
   */
  videos: number | null;
  fetched: number | null; // from state.json, per renderCreators truth
}

export interface QueryHit {
  /**
   * NOT ALWAYS THE ENGINE'S CLAIM ID (A1-03/A1-04). The brain drawer reads the
   * raw `rules.jsonl` row and carries the engine's real `claim_id`. `/api/query`
   * reaches this shape through the engine's `queryBrains`, which drops
   * `claim_id`, so it falls back to the composite `${videoId}:${tStartMs}` —
   * which COLLIDES for two claims in one video at the same millisecond. Do not
   * key a list on this value across both routes; the divergence is pinned by
   * `bridge.brains.test.mjs` and is an engine-side defect awaiting an owner.
   */
  claimId: string;
  creatorId: string;
  creatorTitle: string;
  videoId: string;
  tStartMs: number;
  keyPhrase: string;
  /** Served by both routes; declared here since A1-03. */
  statement: string;
  topic: string;
  watchUrl: string; // https://youtu.be/<id>?t=<s>
}

export interface QueryResult {
  hits: QueryHit[];
  skipped: Array<Record<string, unknown>>;
}

export interface BrainDoc {
  /**
   * THE COMPATIBILITY FIELD, AND IT HOLDS A CHANNEL ID (R2-01).
   *
   * The route is `/api/brains/:slug` and the response field is called `slug`,
   * but the value is the creator's channel id — the engine namespaces a brain by
   * channel (`lib/render.mjs` `brainDir(r, namespace)`), and `lib/brains.mjs`
   * returns the request parameter unchanged. The name is retained because the
   * route and the field are already published; **do not "correct" it to
   * `channelId` without amending 05-contracts.md**, and do not treat it as a
   * human-readable label. `title` is the label.
   */
  slug: string;
  /**
   * The generation directory every field below was read from (R2-01). `null`
   * when the published pointer names no generation — in which case the three
   * documents are empty and `skipped` says why, rather than the route inventing
   * a generation name. It is the answer to "which publication is this?", and
   * without it a reader cannot tell a stale document from a fresh one.
   */
  generation: string | null;
  title: string;
  index: string;
  topics: string;
  timeline: string; // markdown from published generation
  claims: QueryHit[];
  skipped: Array<Record<string, unknown>>;
}

export interface RunState {
  journal: { status: string; runId: string | null } | null;
  lock: StatusInstrument['lock'];
  throttle: StatusInstrument['throttle'];
  budget: StatusInstrument['budget'];
  recentRuns: StatusInstrument['recentRuns'];
}

/**
 * `GET /api/canary` — the same health reading as `StatusInstrument.ytdlp`, as
 * its own route (lib/status.mjs:173 `canaryState`).
 *
 * EVERY FIELD IS REQUIRED AND NULLABLE, which is the R2-01 correction. The old
 * declaration made the provenance optional (`checkedAt?: string`) and typed
 * `source` as `'probe' | 'history'`. The bridge emits all eight keys
 * unconditionally, and `source` can also be `'unknown'`; so the old type both
 * understated what is always present and could not represent what is actually
 * sent. An optional marker on a field the bridge always sends invites a consumer
 * to treat "absent" as a real state that cannot occur.
 */
export interface CanaryReading {
  ok: boolean;
  version: string | null;
  reason: string;
  // cached-probe provenance (05-contracts.md §2a)
  checkedAt: string | null;
  ageMs: number | null;
  source: HealthSource;
  stale: boolean;
  note: string | null;
}

export interface ConsoleDataAdapter {
  getStatus(): Promise<StatusInstrument>;
  listCreators(): Promise<CreatorRow[]>;
  addCreator(ref: string): Promise<CreatorRow>; // T2
  setCreatorEnabled(channelId: string, enabled: boolean): Promise<CreatorRow>; // T2
  query(q: string, creator?: string): Promise<QueryResult>; // T0
  getBrain(slug: string): Promise<BrainDoc>; // T0
  getRunState(): Promise<RunState>; // T0
  startDailyRun(perHour: number): Promise<{ runId: string }>; // T2
  canary(): Promise<CanaryReading>; // T0
  repair(): Promise<{ requeued: number }>; // T2
  backup(dest?: string): Promise<{ dest: string; ok: boolean }>; // T2
}
