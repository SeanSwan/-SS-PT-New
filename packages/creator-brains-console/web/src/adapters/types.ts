/*
 * ConsoleDataAdapter — the modularity seam (05-contracts.md §1).
 * The UI imports ONLY this module. Transcribed verbatim from the contract;
 * do not "improve" shapes here without amending 05-contracts.md first.
 */

export type Tier = 'T0' | 'T1' | 'T2' | 'T3' | 'T4';

export interface DamageReport {
  file: string;
  detail: string;
}

export interface StatusInstrument {
  // R2 — mirrors status-command sources
  ytdlp: { ok: boolean; version: string | null; reason: string };
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
  slug: string;
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

export interface CanaryReading {
  ok: boolean;
  version: string | null;
  reason: string;
  // cached-probe provenance (05-contracts.md §2a)
  checkedAt?: string;
  ageMs?: number;
  source?: 'probe' | 'history';
  stale?: boolean;
  note?: string | null;
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
