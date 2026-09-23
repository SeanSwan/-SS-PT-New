---
decision: "Hostile review of CB-HB, the shipped ingest heartbeat for SwanGuard's creator brain"
status: open
supersedes: none
---

# CONSULT PACKET — CB-HB (ingest heartbeat) hostile review

You are a **hostile reviewer of production monitoring code**. This slice has SHIPPED
(commit `72104cf`). Your job is to find what is wrong with it, not to praise it.

Be adversarial and specific: name files, functions, line-level logic, and concrete
failure traces. Mark anything you cannot verify from the code as `[UNSURE]` rather
than inventing it.

---

## Context

**System:** SwanGuard, a single-owner private news + creator-intelligence hub. Node +
TypeScript + Postgres, one desktop, one person. The "creator brain" ingests YouTube
creators daily and derives cited rules from what they say.

**Why this slice exists:** two prior hostile reviews independently returned the same
"one thing I would change" — build the heartbeat BEFORE the first fetch. The failure
mode they named: yt-dlp breaks when YouTube changes its player (historically every few
months) and the symptom is a `200` with an empty payload. The run goes green, zero rows
are stored, and the brain is silently stale for weeks while answering with full
confidence. This repository has already died that way once — 51 creators seeded, 0
items fetched, an intelligence wiki built and never fed. Its own name for the pattern is
"machinery shipped, feeding never wired."

**Repo laws that constrain this code:**
- "Fetched nothing" and "could not fetch" must never look the same. Refusal throws or is
  recorded as a refusal; it never returns a clean zero.
- Every creator is born disabled; `enabled` flips only through an owner-attributed route.
- Max 300 lines per file. Blueprint header on every module.
- `isDirectExecution(import.meta.url, process.argv[1])` is UNDECIDABLE under vite-node
  (it consumes the script argument), so an auto-running module cannot be imported by a
  test and an argv-guarded one never runs. The fix is a separate thin CLI entry file.
  An existing script in this repo (`retention:command-receipts`) still has this bug and
  is inert — it exits 0 having done nothing.

**What was already verified before this review (do not re-derive; attack it instead):**
- 56/56 across the four new suites; full api suite 666 passed / 0 type errors.
- Mutation test: flipping the in-flight default from `failed` to `success` made the
  crash-distinction test fail; restoring it passed. The suite detects that defect.
- The CLI was proven to execute by contrast with the known-inert runner: that one exits
  0 in silence, this one exits 1 with a named reason.
- `migration-literal-lint` SAFE across 30 migrations; tracked-secret scan 0 findings.

**Two bugs already found and fixed during the build (mentioned so you do not re-report
them, and so you can judge whether the FIX is correct):**
1. Staleness was measured against "any run", so a healthy 2h-old canary masked a
   30h-dead ingest. Now measured against ingestion-kind runs only.
2. `migration-literal-lint.mjs` hardcoded "29 migrations" in its success message while
   reading the directory, so adding the 30th produced a clean report saying 29.

---

## The code under review

### `packages/database/migrations/0030_ingest_run.sql`

```sql
-- Slice CB-HB — Ingest runs: the record that makes silence distinguishable from death.
--
-- WHY THIS EXISTS: the creator brain is designed to run unattended, daily, for years, on one
-- desktop owned by one person who is not watching it. Two independent hostile reviews
-- (GLM 5.3 and GLM 5.3-flash, 2026-09-03) converged on the same "one thing I would change":
-- build the heartbeat BEFORE the first fetch. Their reasoning is worth keeping verbatim,
-- because it is the failure this table exists to make impossible:
--
--   The way this class of system dies is not a crash. yt-dlp breaks when YouTube changes its
--   player (historically every few months) and the symptom is a 200 with an empty payload.
--   The run goes green. Zero segments are stored. The brain is silently stale for weeks while
--   rendering yesterday's answers with full confidence. By the time anyone notices, trust is
--   gone and the pipeline gets switched off.
--
-- This repository has already died that way once: 51 creators seeded, 0 items fetched, an
-- intelligence wiki built and never fed. The documented name for it is "machinery shipped,
-- feeding never wired". A run ledger is the cheapest possible defence — it costs one insert
-- per run and converts every silent failure into a next-morning message.
--
-- ─── THE RULES THIS TABLE ENCODES ─────────────────────────────────────────────────────
--
-- 1. EVERY RUN WRITES A ROW, INCLUDING THE ONES THAT REFUSED. The repo's ingest law already
--    says "fetched nothing" and "could not fetch" must never look the same. That law is
--    enforced at the runner by throwing; this table is where the distinction becomes
--    DURABLE. `outcome = 'refused'` with a reason is a first-class result, not an error to
--    be swallowed. A run that produced no row at all is itself the alarm (see rule 3).
--
-- 2. SUCCESS IS RECORDED AS LOUDLY AS FAILURE. A digest that only fires on problems teaches
--    the owner that no news is good news — and then a dead scheduler is indistinguishable
--    from a quiet week. The positive heartbeat is the point: `outcome = 'success'` rows are
--    what let a reader say "it ran, and here is what it found."
--
-- 3. THE ABSENCE OF A ROW IS THE HIGHEST-SEVERITY SIGNAL. Every other failure mode writes
--    something. A missing row means the scheduler did not fire, the machine was asleep, or
--    the process died before it could even record its own refusal. `started_at` is indexed
--    precisely so "when did anything last run" is a single cheap query.
--
-- 4. THE CANARY IS A RUN, NOT A FLAG. A nightly fetch of one fixed, known-good video proves
--    the acquisition path still works WITHOUT touching the catalog, the quota, or any
--    creator's data. Recording it as `kind = 'canary'` means the same alerting logic that
--    watches ingestion also watches the tool — and `tool_version` turns "yt-dlp broke" from
--    a mystery into a diff between two rows.
--
-- 5. COUNTS ARE JSONB, NOT COLUMNS. The shape of what a run counts will change as CB-FSM,
--    CB4 and CB4b land (fetched → deferred → whisper_queued → rules_minted). Freezing
--    today's fields into columns guarantees a migration per slice; a jsonb `counts` with a
--    documented convention absorbs that churn. This is a deliberate exception to the
--    usual preference for typed columns, made because the consumer is a human-readable
--    digest rather than a join key.
--
-- 6. NO FOREIGN KEY TO creator. A run spans many creators, and — critically — a run that
--    failed before it could resolve WHICH creators it was for must still be recordable.
--    An FK here would make the most important failure the one that cannot be written down.

create table ingest_run (
  -- Time-ordered text id so a listing sorts sensibly even without a join to started_at.
  -- Format: '<iso8601-basic>-<kind>-<short-random>', e.g. '20260903T0630Z-creator_ingest-a1b2'.
  id text primary key check (length(id) between 1 and 120),

  -- What kind of work this run was. Kept as a check constraint rather than an enum type so
  -- a later slice adds a kind with one migration line instead of an ALTER TYPE dance.
  --   creator_ingest — the daily fetch across enabled creators
  --   canary         — the fixed known-good video that proves the tool still works
  --   backfill       — the CB-BACKFILL catch-up lane (separate rate budget)
  --   digest         — the run that composed and delivered the daily message
  kind text not null check (kind in ('creator_ingest', 'canary', 'backfill', 'digest')),

  started_at timestamptz not null default now(),

  -- Null while a run is in flight. A row with a null finished_at whose started_at is hours
  -- old is a CRASHED run — a state that is invisible without this column, because a process
  -- killed mid-run cannot write its own epitaph.
  finished_at timestamptz,

  -- 'success'  — ran, did what it set out to do
  -- 'partial'  — ran, some units failed (per-creator failures inside a completed sweep)
  -- 'refused'  — declined to run, on purpose, with a reason (budget cap, lock held, no
  --              credentials). NOT an error. Rule 1.
  -- 'failed'   — tried and could not complete
  outcome text not null check (outcome in ('success', 'partial', 'refused', 'failed')),

  -- Free-form, human-first. Required for anything that is not a plain success, because a
  -- refusal without a reason is indistinguishable from a shrug.
  reason text,

  -- Rule 5. Convention (documented here because jsonb cannot enforce it):
  --   { "creators": n, "videos_seen": n, "fetched": n, "deferred": n,
  --     "failed": n, "rules_minted": n }
  -- Absent keys mean "this run did not do that kind of work", never zero.
  counts jsonb not null default '{}'::jsonb,

  -- YouTube Data API units this run actually spent. Cross-checks the CB5 quota ledger from
  -- a second, independent direction: if the ledger says 400 and the sum of runs says 40,
  -- one of them is lying and the difference is the bug.
  quota_units_spent integer not null default 0 check (quota_units_spent >= 0),

  -- The acquisition tool's version string (e.g. yt-dlp's). Rule 4: when the canary starts
  -- failing, the first question is "what changed", and this answers it without guesswork.
  tool_version text,

  created_at timestamptz not null default now()
);

-- The heartbeat query: "when did anything last run, and did it work?" Runs on every digest
-- and every health check, so it must not scan.
create index ingest_run_started_idx on ingest_run (started_at desc);

-- Per-kind recency: "when did the canary last pass?" is a different question from "when did
-- ingestion last run", and the alerting logic asks both.
create index ingest_run_kind_started_idx on ingest_run (kind, started_at desc);

-- Crashed-run detection (rule: null finished_at + old started_at). A partial index keeps
-- this cheap forever, because in-flight rows are a tiny hot subset of the table.
create index ingest_run_unfinished_idx on ingest_run (started_at) where finished_at is null;

-- DOWN
-- Usage: extract lines between "-- DOWN" and end of file, remove leading "-- ", then
-- execute. Commands use IF EXISTS for idempotent re-runs. Executable DOWN is H0.6.
-- drop index if exists ingest_run_unfinished_idx;
-- drop index if exists ingest_run_kind_started_idx;
-- drop index if exists ingest_run_started_idx;
-- drop table if exists ingest_run;
```

### `apps/api/src/ingestRun.ts`

```typescript
/**
 * BLUEPRINT
 * Purpose: CB-HB — the durable record of every ingest run, and the reads the heartbeat needs.
 * Data: ingest_run (migration 0030). No creator data, no content, no credentials.
 * States: a run is STARTED (finished_at null) and later FINISHED with an outcome. A row that
 *         stays started is a crashed run — a state nothing else in this system can express.
 * Safety: this store cannot read or write `creator`, `creator_item`, or any transcript table.
 *         It records that work happened, never what the work was about. That separation is
 *         deliberate: the heartbeat must keep working when the thing it watches is broken,
 *         and a monitor that shares a failure domain with its subject monitors nothing.
 * Verification: ingestRun.test.ts (memory semantics + the crash/absence distinctions).
 */

import type { DatabaseRuntime } from './database';

export type IngestRunKind = 'creator_ingest' | 'canary' | 'backfill' | 'digest';
export type IngestRunOutcome = 'success' | 'partial' | 'refused' | 'failed';

/**
 * Counts are open-ended on purpose (migration 0030, rule 5): the shape changes as CB-FSM,
 * CB4 and CB4b land. An ABSENT key means "this run did not do that kind of work" — it is
 * not zero, and a digest must render the two differently or "fetched 0" and "did not fetch"
 * collapse into the same sentence, which is the exact conflation the ingest law forbids.
 */
export type IngestRunCounts = Record<string, number>;

export interface IngestRunRecord {
  id: string;
  kind: IngestRunKind;
  startedAt: string;
  finishedAt?: string;
  outcome: IngestRunOutcome;
  reason?: string;
  counts: IngestRunCounts;
  quotaUnitsSpent: number;
  toolVersion?: string;
}

export interface StartRunInput {
  kind: IngestRunKind;
  /** Injected so tests are deterministic and so a run's clock is the caller's, not the DB's. */
  now?: Date;
}

export interface FinishRunInput {
  id: string;
  outcome: IngestRunOutcome;
  reason?: string;
  counts?: IngestRunCounts;
  quotaUnitsSpent?: number;
  toolVersion?: string;
  now?: Date;
}

export interface IngestRunStore {
  /**
   * Writes the row BEFORE the work starts.
   *
   * Ordering is the whole point: a run recorded only on completion is invisible when it
   * crashes, and a crash mid-fetch is one of the most likely failures on a desktop that
   * sleeps, reboots for updates, and shares a GPU with an interactive app.
   */
  start(input: StartRunInput): Promise<IngestRunRecord>;
  finish(input: FinishRunInput): Promise<IngestRunRecord>;
  /** Most recent runs first. `kind` narrows; omitted means all kinds. */
  recent(options?: { kind?: IngestRunKind; limit?: number }): Promise<IngestRunRecord[]>;
  /** Runs started at or after `since`, most recent first. The window the heartbeat evaluates. */
  since(since: Date, options?: { kind?: IngestRunKind }): Promise<IngestRunRecord[]>;
}

/**
 * Time-ordered id: sorting by id and sorting by time agree, so a listing is sensible even
 * before a join. The random suffix exists because two runs can legitimately start inside the
 * same second (the daily sweep and its canary), and a collision there would silently drop one
 * of them — losing precisely the row that proves the other ran.
 */
export function buildRunId(kind: IngestRunKind, now: Date, random = Math.random): string {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const suffix = Math.floor(random() * 0xffff).toString(16).padStart(4, '0');
  return `${stamp}-${kind}-${suffix}`;
}

export function createMemoryIngestRunStore(seed: IngestRunRecord[] = []): IngestRunStore {
  const rows = new Map<string, IngestRunRecord>();
  for (const row of seed) rows.set(row.id, row);

  const sorted = () =>
    [...rows.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  return {
    async start({ kind, now = new Date() }) {
      const record: IngestRunRecord = {
        id: buildRunId(kind, now),
        kind,
        startedAt: now.toISOString(),
        // An in-flight run is recorded as 'failed' until it says otherwise. If the process
        // dies here, the row that survives says the run did not succeed — which is true.
        // Defaulting to 'success' would make every crash look like a good day.
        outcome: 'failed',
        reason: 'in flight',
        counts: {},
        quotaUnitsSpent: 0
      };
      rows.set(record.id, record);
      return record;
    },

    async finish({ id, outcome, reason, counts, quotaUnitsSpent, toolVersion, now = new Date() }) {
      const existing = rows.get(id);
      if (!existing) throw new Error(`ingest run ${id} was never started`);
      const updated: IngestRunRecord = {
        ...existing,
        outcome,
        reason,
        counts: counts ?? existing.counts,
        quotaUnitsSpent: quotaUnitsSpent ?? existing.quotaUnitsSpent,
        toolVersion: toolVersion ?? existing.toolVersion,
        finishedAt: now.toISOString()
      };
      rows.set(id, updated);
      return updated;
    },

    async recent({ kind, limit = 50 } = {}) {
      return sorted()
        .filter((row) => (kind ? row.kind === kind : true))
        .slice(0, limit);
    },

    async since(sinceDate, { kind } = {}) {
      const cutoff = sinceDate.toISOString();
      return sorted().filter(
        (row) => row.startedAt >= cutoff && (kind ? row.kind === kind : true)
      );
    }
  };
}

export function createPostgresIngestRunStore(db: DatabaseRuntime): IngestRunStore {
  return {
    async start({ kind, now = new Date() }) {
      const id = buildRunId(kind, now);
      const result = await db.query<Record<string, unknown>>(
        `insert into ingest_run (id, kind, started_at, outcome, reason, counts, quota_units_spent)
         values ($1, $2, $3, 'failed', 'in flight', '{}'::jsonb, 0)
         returning id, kind, started_at, finished_at, outcome, reason, counts,
                   quota_units_spent, tool_version`,
        [id, kind, now.toISOString()]
      );
      return toRunRecord(result.rows[0] as Record<string, unknown>);
    },

    async finish({ id, outcome, reason, counts, quotaUnitsSpent, toolVersion, now = new Date() }) {
      const result = await db.query<Record<string, unknown>>(
        `update ingest_run set
           outcome = $2,
           reason = $3,
           counts = coalesce($4::jsonb, counts),
           quota_units_spent = coalesce($5, quota_units_spent),
           tool_version = coalesce($6, tool_version),
           finished_at = $7
         where id = $1
         returning id, kind, started_at, finished_at, outcome, reason, counts,
                   quota_units_spent, tool_version`,
        [
          id,
          outcome,
          reason ?? null,
          counts ? JSON.stringify(counts) : null,
          quotaUnitsSpent ?? null,
          toolVersion ?? null,
          now.toISOString()
        ]
      );
      const row = result.rows[0];
      // A finish with no matching row means the start was never written — the run is
      // unaccounted for. Throwing is correct: silently inserting here would manufacture a
      // record whose started_at is a lie, and the heartbeat's crash detection reads that
      // column.
      if (!row) throw new Error(`ingest run ${id} was never started`);
      return toRunRecord(row as Record<string, unknown>);
    },

    async recent({ kind, limit = 50 } = {}) {
      const result = await db.query<Record<string, unknown>>(
        `select id, kind, started_at, finished_at, outcome, reason, counts,
                quota_units_spent, tool_version
         from ingest_run
         where ($1::text is null or kind = $1)
         order by started_at desc
         limit $2`,
        [kind ?? null, limit]
      );
      return result.rows.map(toRunRecord);
    },

    async since(sinceDate, { kind } = {}) {
      const result = await db.query<Record<string, unknown>>(
        `select id, kind, started_at, finished_at, outcome, reason, counts,
                quota_units_spent, tool_version
         from ingest_run
         where started_at >= $1 and ($2::text is null or kind = $2)
         order by started_at desc`,
        [sinceDate.toISOString(), kind ?? null]
      );
      return result.rows.map(toRunRecord);
    }
  };
}

function iso(value: unknown): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
}

function toRunRecord(row: Record<string, unknown>): IngestRunRecord {
  const counts = row.counts;
  return {
    id: String(row.id),
    kind: row.kind as IngestRunKind,
    startedAt: iso(row.started_at) ?? new Date(0).toISOString(),
    finishedAt: iso(row.finished_at),
    outcome: row.outcome as IngestRunOutcome,
    reason: row.reason === null || row.reason === undefined ? undefined : String(row.reason),
    // pg returns jsonb already parsed; a string means someone stored text. Tolerate both
    // rather than throwing inside a monitor.
    counts:
      typeof counts === 'string'
        ? (JSON.parse(counts) as IngestRunCounts)
        : ((counts ?? {}) as IngestRunCounts),
    quotaUnitsSpent: Number(row.quota_units_spent ?? 0),
    toolVersion:
      row.tool_version === null || row.tool_version === undefined
        ? undefined
        : String(row.tool_version)
  };
}
```

### `apps/api/src/ingestHeartbeat.ts`

```typescript
/**
 * BLUEPRINT
 * Purpose: CB-HB — turn the run ledger into a verdict and a message a human will actually read.
 * Data: IngestRunRecord[] only. Pure: no clock of its own, no database, no network.
 * States: every evaluation returns a verdict; there is no "nothing to say" path (see below).
 * Safety: this module decides whether to ALARM. It is pure and fully injected so its logic is
 *         testable without a database, a scheduler, or a real failure — because the one thing
 *         worse than no monitoring is monitoring nobody has ever seen fire.
 * Verification: ingestHeartbeat.test.ts, including a negative control per alarm.
 */

import type { IngestRunRecord } from './ingestRun';

/**
 * WHY THERE IS NO "SILENT" VERDICT.
 *
 * Both hostile reviews (GLM 5.3 and 5.3-flash, 2026-09-03) landed on the same point from
 * different directions: a digest that fires only on problems teaches its reader that no news
 * is good news. After a few quiet weeks, a dead scheduler and a quiet week look identical —
 * and the reader has been trained to read both as fine.
 *
 * So the digest ALWAYS sends. `severity` changes how it reads, never whether it arrives.
 * The absence of a message is then unambiguous: it means the thing that sends messages is
 * itself dead, which is information.
 */
export type HeartbeatSeverity = 'ok' | 'attention' | 'alarm';

export interface HeartbeatAlert {
  code:
    | 'no_run'
    | 'crashed_run'
    | 'canary_failed'
    | 'canary_stale'
    | 'no_successful_fetch'
    | 'low_success_rate';
  severity: Exclude<HeartbeatSeverity, 'ok'>;
  detail: string;
}

export interface HeartbeatVerdict {
  severity: HeartbeatSeverity;
  alerts: HeartbeatAlert[];
  /** Counts summed across the window, for the digest body. */
  totals: {
    runs: number;
    success: number;
    partial: number;
    refused: number;
    failed: number;
    quotaUnitsSpent: number;
  };
  lastRunAt?: string;
  lastCanaryAt?: string;
  toolVersion?: string;
}

export interface HeartbeatThresholds {
  /** A daily job that has not run in this long is not "quiet", it is missing. */
  maxHoursSinceRun: number;
  /** A run in flight longer than this did not finish — the process died. */
  maxHoursInFlight: number;
  /** The canary proves the acquisition tool still works; stale means unproven. */
  maxHoursSinceCanary: number;
  /**
   * Zero successful fetches for this long, WHILE creators were publishing, is the silent-rot
   * signature. The publishing condition matters: a genuinely quiet week is not a failure, and
   * alarming on it is how a monitor gets muted.
   */
  maxHoursWithoutSuccessfulFetch: number;
  /** Below this ratio of success+partial over completed runs, something is systematically wrong. */
  minSuccessRate: number;
}

export const DEFAULT_HEARTBEAT_THRESHOLDS: HeartbeatThresholds = {
  maxHoursSinceRun: 26, // a daily job, plus two hours of slack for a late scheduler
  maxHoursInFlight: 6,
  maxHoursSinceCanary: 48,
  maxHoursWithoutSuccessfulFetch: 72,
  minSuccessRate: 0.8
};

export interface HeartbeatInput {
  runs: IngestRunRecord[];
  now: Date;
  /**
   * Did enabled creators publish anything in the window? Supplied by the caller because this
   * module does not read creator data (see the blueprint's safety note). When false, the
   * "no successful fetch" alarm is suppressed — there was nothing to fetch.
   */
  creatorsPublished: boolean;
  thresholds?: HeartbeatThresholds;
}

const HOUR_MS = 3_600_000;

export function evaluateHeartbeat({
  runs,
  now,
  creatorsPublished,
  thresholds = DEFAULT_HEARTBEAT_THRESHOLDS
}: HeartbeatInput): HeartbeatVerdict {
  const alerts: HeartbeatAlert[] = [];
  const hoursSince = (iso: string) => (now.getTime() - new Date(iso).getTime()) / HOUR_MS;

  const sorted = [...runs].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const lastRun = sorted[0];
  const canaries = sorted.filter((r) => r.kind === 'canary');
  const lastCanary = canaries[0];

  const totals = {
    runs: sorted.length,
    success: sorted.filter((r) => r.outcome === 'success').length,
    partial: sorted.filter((r) => r.outcome === 'partial').length,
    refused: sorted.filter((r) => r.outcome === 'refused').length,
    failed: sorted.filter((r) => r.outcome === 'failed' && r.finishedAt).length,
    quotaUnitsSpent: sorted.reduce((sum, r) => sum + r.quotaUnitsSpent, 0)
  };

  // ── 1. The WORK has not run. Highest severity: every other failure writes a row. ────────
  //
  // Staleness is measured against ingestion runs ONLY, never "any row at all". A canary is a
  // cheap tool-check on its own schedule; if it were allowed to satisfy this test, then a
  // scheduler that fires the canary but whose ingest step dies at startup would report
  // perfect health forever — the canary would be answering a question nobody asked.
  // Caught by ingestHeartbeat.test.ts: a 30h-stale ingest beside a 2h-old canary.
  const workRuns = sorted.filter((r) => r.kind === 'creator_ingest' || r.kind === 'backfill');
  const lastWorkRun = workRuns[0];

  if (sorted.length === 0) {
    alerts.push({
      code: 'no_run',
      severity: 'alarm',
      detail: 'no ingest run recorded in the window at all'
    });
  } else if (!lastWorkRun) {
    alerts.push({
      code: 'no_run',
      severity: 'alarm',
      detail: 'runs exist in the window but none of them were ingestion — the fetch step never fired'
    });
  } else if (hoursSince(lastWorkRun.startedAt) > thresholds.maxHoursSinceRun) {
    alerts.push({
      code: 'no_run',
      severity: 'alarm',
      detail: `last ingestion run was ${Math.floor(hoursSince(lastWorkRun.startedAt))}h ago (limit ${thresholds.maxHoursSinceRun}h)`
    });
  }

  // ── 2. A run that started and never finished: the process died mid-work. ────────────────
  for (const run of sorted) {
    if (run.finishedAt) continue;
    if (hoursSince(run.startedAt) > thresholds.maxHoursInFlight) {
      alerts.push({
        code: 'crashed_run',
        severity: 'alarm',
        detail: `${run.kind} run ${run.id} started ${Math.floor(hoursSince(run.startedAt))}h ago and never finished`
      });
    }
  }

  // ── 3. The canary. This is the yt-dlp-broke detector, and it is the whole reason the
  //       canary is a run rather than a boolean flag. ─────────────────────────────────────
  if (lastCanary && lastCanary.outcome !== 'success' && lastCanary.finishedAt) {
    alerts.push({
      code: 'canary_failed',
      severity: 'alarm',
      detail: `canary ${lastCanary.outcome}${lastCanary.reason ? `: ${lastCanary.reason}` : ''}${
        lastCanary.toolVersion ? ` (${lastCanary.toolVersion})` : ''
      }`
    });
  }
  if (!lastCanary) {
    alerts.push({
      code: 'canary_stale',
      severity: 'attention',
      detail: 'no canary run in the window — the acquisition tool is unproven'
    });
  } else if (hoursSince(lastCanary.startedAt) > thresholds.maxHoursSinceCanary) {
    alerts.push({
      code: 'canary_stale',
      severity: 'attention',
      detail: `canary last ran ${Math.floor(hoursSince(lastCanary.startedAt))}h ago (limit ${thresholds.maxHoursSinceCanary}h)`
    });
  }

  // ── 4. Silent rot: runs are green but nothing is actually being fetched. ────────────────
  //
  // `fetched` ABSENT means the run did no fetching work (a refusal, a digest run). `fetched: 0`
  // means it fetched and found nothing. Only a positive count counts as evidence the pipeline
  // works — which is exactly the "fetched nothing" vs "could not fetch" law, read from the
  // consuming side.
  const fetchRuns = sorted.filter((r) => r.kind === 'creator_ingest' || r.kind === 'backfill');
  const lastSuccessfulFetch = fetchRuns.find(
    (r) => (r.outcome === 'success' || r.outcome === 'partial') && (r.counts.fetched ?? 0) > 0
  );
  if (creatorsPublished) {
    const hours = lastSuccessfulFetch
      ? hoursSince(lastSuccessfulFetch.startedAt)
      : Number.POSITIVE_INFINITY;
    if (hours > thresholds.maxHoursWithoutSuccessfulFetch) {
      alerts.push({
        code: 'no_successful_fetch',
        severity: 'alarm',
        detail: lastSuccessfulFetch
          ? `nothing fetched in ${Math.floor(hours)}h while creators were publishing`
          : 'nothing fetched in the entire window while creators were publishing'
      });
    }
  }

  // ── 5. Success rate across COMPLETED runs. Refusals are excluded on purpose: a budget cap
  //       doing its job is not a malfunction, and counting it as one trains the reader to
  //       ignore the number. ────────────────────────────────────────────────────────────
  const completed = sorted.filter((r) => r.finishedAt && r.outcome !== 'refused');
  if (completed.length > 0) {
    const good = completed.filter((r) => r.outcome === 'success' || r.outcome === 'partial').length;
    const rate = good / completed.length;
    if (rate < thresholds.minSuccessRate) {
      alerts.push({
        code: 'low_success_rate',
        severity: 'attention',
        detail: `${good}/${completed.length} runs succeeded (${Math.round(rate * 100)}%, floor ${Math.round(
          thresholds.minSuccessRate * 100
        )}%)`
      });
    }
  }

  const severity: HeartbeatSeverity = alerts.some((a) => a.severity === 'alarm')
    ? 'alarm'
    : alerts.length > 0
      ? 'attention'
      : 'ok';

  return {
    severity,
    alerts,
    totals,
    lastRunAt: lastRun?.startedAt,
    lastCanaryAt: lastCanary?.startedAt,
    toolVersion: sorted.find((r) => r.toolVersion)?.toolVersion
  };
}

/**
 * Renders the message. Plain text, because it is going to Telegram and because a format that
 * survives being read on a phone at 07:00 is worth more than one that renders prettily.
 *
 * The good-day message is deliberately as informative as the bad-day one (see the severity
 * note at the top of this file).
 */
export function renderHeartbeatDigest(verdict: HeartbeatVerdict, windowHours: number): string {
  const icon = verdict.severity === 'ok' ? '✅' : verdict.severity === 'attention' ? '⚠️' : '🚨';
  const lines = [`${icon} Creator brain — last ${windowHours}h`];

  const t = verdict.totals;
  lines.push(
    `runs ${t.runs} (${t.success} ok, ${t.partial} partial, ${t.refused} refused, ${t.failed} failed) · quota ${t.quotaUnitsSpent} units`
  );

  if (verdict.lastRunAt) lines.push(`last run ${verdict.lastRunAt}`);
  if (verdict.lastCanaryAt) lines.push(`last canary ${verdict.lastCanaryAt}`);
  if (verdict.toolVersion) lines.push(`tool ${verdict.toolVersion}`);

  if (verdict.alerts.length === 0) {
    lines.push('no alerts');
  } else {
    for (const alert of verdict.alerts) {
      lines.push(`${alert.severity === 'alarm' ? '🚨' : '⚠️'} ${alert.code}: ${alert.detail}`);
    }
  }

  return lines.join('\n');
}
```

### `apps/api/src/ingestHeartbeatRunner.ts`

```typescript
/**
 * BLUEPRINT
 * Purpose: CB-HB — the thing that actually runs the heartbeat: read the ledger, evaluate,
 *          deliver the digest, and record that it did so.
 * Data: ingest_run via IngestRunStore. Reads a single boolean about creator activity from an
 *       injected probe; never touches creator rows itself.
 * States: success (delivered) | failed (delivery threw) | refused (no delivery configured).
 *         These are three different things and the ledger records which.
 * Safety: THE DELIVERY FAILURE IS THE POINT. A heartbeat whose send silently fails is worse
 *         than no heartbeat: the owner is told, by the absence of alarms, that all is well,
 *         while the mechanism that would have told him otherwise is itself dead. So a failed
 *         send is recorded as a failed run — and the next run's own evaluation sees it.
 * Verification: ingestHeartbeatRunner.test.ts, including the silent-delivery-failure case.
 */

import {
  DEFAULT_HEARTBEAT_THRESHOLDS,
  evaluateHeartbeat,
  renderHeartbeatDigest,
  type HeartbeatSeverity,
  type HeartbeatThresholds,
  type HeartbeatVerdict
} from './ingestHeartbeat';
import type { IngestRunStore } from './ingestRun';

export interface HeartbeatDelivery {
  /** Throws on failure. Returning quietly means the message reached its destination. */
  send(message: string, severity: HeartbeatSeverity): Promise<void>;
}

export interface HeartbeatRunResult {
  verdict: HeartbeatVerdict;
  message: string;
  delivered: boolean;
  runId: string;
}

export interface HeartbeatRunnerOptions {
  runs: IngestRunStore;
  delivery: HeartbeatDelivery;
  /**
   * Did enabled creators publish during the window? Injected rather than queried here so this
   * module keeps no dependency on creator data — a monitor that shares a failure domain with
   * its subject monitors nothing.
   */
  creatorsPublished: (since: Date) => Promise<boolean>;
  windowHours?: number;
  thresholds?: HeartbeatThresholds;
  now?: () => Date;
}

export interface HeartbeatRunner {
  run(): Promise<HeartbeatRunResult>;
}

export const DEFAULT_HEARTBEAT_WINDOW_HOURS = 24;

export function createHeartbeatRunner({
  runs,
  delivery,
  creatorsPublished,
  windowHours = DEFAULT_HEARTBEAT_WINDOW_HOURS,
  thresholds = DEFAULT_HEARTBEAT_THRESHOLDS,
  now = () => new Date()
}: HeartbeatRunnerOptions): HeartbeatRunner {
  return {
    async run() {
      const at = now();
      const since = new Date(at.getTime() - windowHours * 3_600_000);

      // The digest records ITSELF as a run. Dogfooding: if the digest job stops firing, the
      // absence of these rows is visible in exactly the same ledger everything else uses.
      const self = await runs.start({ kind: 'digest', now: at });

      let verdict: HeartbeatVerdict;
      let message: string;
      try {
        const windowRuns = (await runs.since(since)).filter((r) => r.id !== self.id);
        verdict = evaluateHeartbeat({
          runs: windowRuns,
          now: at,
          creatorsPublished: await creatorsPublished(since),
          thresholds
        });
        message = renderHeartbeatDigest(verdict, windowHours);
      } catch (error) {
        // Evaluation itself broke. Record it and rethrow — a heartbeat that cannot evaluate
        // must not report "ok".
        await runs.finish({
          id: self.id,
          outcome: 'failed',
          reason: `evaluation failed: ${errorText(error)}`,
          now: now()
        });
        throw error;
      }

      try {
        await delivery.send(message, verdict.severity);
      } catch (error) {
        await runs.finish({
          id: self.id,
          outcome: 'failed',
          reason: `delivery failed: ${errorText(error)}`,
          counts: { alerts: verdict.alerts.length },
          now: now()
        });
        // Deliberately NOT rethrown. The caller is a scheduler; crashing it would lose the
        // ledger row we just wrote. The failure is durable and the next run's evaluation
        // will see this row as a failed run, which is how an undelivered heartbeat becomes
        // visible instead of invisible.
        return { verdict, message, delivered: false, runId: self.id };
      }

      await runs.finish({
        id: self.id,
        outcome: 'success',
        counts: { alerts: verdict.alerts.length },
        now: now()
      });
      return { verdict, message, delivered: true, runId: self.id };
    }
  };
}

/**
 * Delivery that writes to stdout. The default until an external adapter is approved.
 *
 * This is honest rather than useless: a scheduled task's stdout goes somewhere, and a digest
 * in a log file is strictly more than the nothing that exists today. It is NOT a substitute
 * for a push — reading a log requires remembering to look, which is the habit this whole
 * slice exists to remove.
 */
export function createLogHeartbeatDelivery(
  write: (line: string) => void = (line) => console.log(line)
): HeartbeatDelivery {
  return {
    async send(message) {
      write(message);
    }
  };
}

/**
 * The delivery used when none is configured.
 *
 * It THROWS rather than quietly doing nothing, so the run records `failed: delivery not
 * configured`. A no-op delivery would make an unconfigured heartbeat indistinguishable from a
 * working one — the same conflation the repo's ingest law forbids, one layer up.
 */
export function createUnavailableHeartbeatDelivery(reason: string): HeartbeatDelivery {
  return {
    async send() {
      throw new Error(`heartbeat delivery is not configured: ${reason}`);
    }
  };
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
```

### `apps/api/src/ingestHeartbeatEntrypoint.ts`

```typescript
/**
 * BLUEPRINT
 * Purpose: CB-HB — compose the heartbeat from config and run it once. The operator entry.
 * Data: Reads ingest_run and counts recent creator_item rows. Writes one ingest_run row.
 * States: Refuses to run in memory mode — a heartbeat that "succeeded" against an in-memory
 *         runtime would report perfect health about a database it never opened, which is the
 *         exact lying receipt this workstream keeps paying for (see creatorSeedImportRunner).
 * Safety: Delivery defaults to UNAVAILABLE, not to a no-op. Until an external adapter is
 *         approved, every run records `failed: delivery is not configured` — visible, honest,
 *         and impossible to mistake for a working monitor. Opt into stdout with
 *         SWANGUARD_HEARTBEAT_DELIVERY=log.
 * Verification: ingestHeartbeatEntrypoint.test.ts (composition + refusals, no database).
 */

import { loadConfig } from './config';
import { createDatabaseRuntime, type DatabaseRuntime } from './database';
import { createPostgresIngestRunStore, type IngestRunStore } from './ingestRun';
import {
  createHeartbeatRunner,
  createLogHeartbeatDelivery,
  createUnavailableHeartbeatDelivery,
  DEFAULT_HEARTBEAT_WINDOW_HOURS,
  type HeartbeatDelivery,
  type HeartbeatRunResult
} from './ingestHeartbeatRunner';

export class HeartbeatRunnerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HeartbeatRunnerError';
  }
}

export interface HeartbeatEntrypointOptions {
  env?: NodeJS.ProcessEnv;
  createRuntime?: (env: NodeJS.ProcessEnv) => DatabaseRuntime;
  /** Overrides for tests; production composes these from the runtime. */
  runs?: IngestRunStore;
  delivery?: HeartbeatDelivery;
  creatorsPublished?: (since: Date) => Promise<boolean>;
  windowHours?: number;
  now?: () => Date;
}

/**
 * Chooses delivery from the environment.
 *
 * Deliberately fails closed. `SWANGUARD_HEARTBEAT_DELIVERY` unset means unavailable — the run
 * is recorded as failed with a reason. That is the honest state today: there is no approved
 * external notification path in this repo (see dailyBrief.ts, "no external notification"),
 * and pretending otherwise by silently succeeding would defeat the entire slice.
 */
export function resolveHeartbeatDelivery(env: NodeJS.ProcessEnv): HeartbeatDelivery {
  const mode = env.SWANGUARD_HEARTBEAT_DELIVERY?.trim();
  if (mode === 'log') return createLogHeartbeatDelivery();
  return createUnavailableHeartbeatDelivery(
    mode
      ? `unknown delivery mode "${mode}"`
      : 'set SWANGUARD_HEARTBEAT_DELIVERY=log, or wire an approved adapter'
  );
}

/**
 * "Did creators publish in the window?" — the probe that suppresses the silent-rot alarm on a
 * genuinely quiet week.
 *
 * Reads `creator_item.published_at`, not `fetched_at`: the question is whether the WORLD
 * produced anything, not whether we managed to collect it. Using fetched_at would make the
 * alarm self-suppressing — no fetches means no fetched_at rows means "nobody published"
 * means no alarm, precisely when the alarm is needed most.
 */
export function createPublishedProbe(db: DatabaseRuntime): (since: Date) => Promise<boolean> {
  return async (since) => {
    const result = await db.query<{ n: number }>(
      `select count(*)::int as n
       from creator_item item
       join creator c on c.id = item.creator_id
       where c.enabled = true and item.published_at >= $1`,
      [since.toISOString()]
    );
    return (result.rows[0]?.n ?? 0) > 0;
  };
}

export async function runHeartbeatOnce(
  options: HeartbeatEntrypointOptions = {}
): Promise<HeartbeatRunResult> {
  const env = options.env ?? process.env;
  const windowHours = options.windowHours ?? DEFAULT_HEARTBEAT_WINDOW_HOURS;

  // Fully injected path — used by tests, and by any caller that already holds its stores.
  if (options.runs && options.creatorsPublished) {
    return createHeartbeatRunner({
      runs: options.runs,
      delivery: options.delivery ?? resolveHeartbeatDelivery(env),
      creatorsPublished: options.creatorsPublished,
      windowHours,
      now: options.now
    }).run();
  }

  const config = loadConfig(env);
  if (config.database.mode !== 'postgres') {
    throw new HeartbeatRunnerError(
      'heartbeat requires the postgres runtime; a memory-mode run would report health about a database it never opened'
    );
  }

  const db = (options.createRuntime ?? (() => createDatabaseRuntime(config)))(env);
  try {
    return await createHeartbeatRunner({
      runs: createPostgresIngestRunStore(db),
      delivery: options.delivery ?? resolveHeartbeatDelivery(env),
      creatorsPublished: options.creatorsPublished ?? createPublishedProbe(db),
      windowHours,
      now: options.now
    }).run();
  } finally {
    await db.close();
  }
}

export interface HeartbeatEntrypointOutput {
  error(message: string): void;
  info(message: string): void;
}

export async function runHeartbeatEntrypoint(
  options: HeartbeatEntrypointOptions & {
    exit?: (code: number) => void;
    output?: HeartbeatEntrypointOutput;
  } = {}
): Promise<void> {
  const output = options.output ?? console;
  const exit = options.exit ?? process.exit;

  try {
    const result = await runHeartbeatOnce(options);
    output.info(result.message);
    output.info(
      JSON.stringify({
        event: 'ingest_heartbeat.completed',
        runId: result.runId,
        severity: result.verdict.severity,
        delivered: result.delivered,
        alerts: result.verdict.alerts.map((a) => a.code)
      })
    );
    // An undelivered digest exits non-zero so a scheduler's own failure reporting sees it.
    // The ledger row already records it; this makes it visible one layer up as well.
    if (!result.delivered) exit(1);
  } catch (error) {
    // Same wording discipline as creatorSeedImportRunner: only errors whose messages are
    // known not to embed a connection string are reported verbatim.
    output.error(
      error instanceof HeartbeatRunnerError ? error.message : 'ingest heartbeat could not complete'
    );
    exit(1);
  }
}
```

### `apps/api/src/ingestHeartbeatCli.ts`

```typescript
/**
 * BLUEPRINT
 * Purpose: The executable entry point for the CB-HB heartbeat. Nothing but a call.
 * Data: None of its own — see ingestHeartbeatEntrypoint.ts.
 * States: Exits non-zero with a one-line reason on failure.
 * Safety: This file exists BECAUSE self-detection is impossible under vite-node, which
 *         consumes the script argument and leaves the target path out of process.argv
 *         entirely. A module that auto-runs on import cannot be imported by a test; a module
 *         that guards on argv never runs at all. Separating the two solves both. The same
 *         pattern as creatorSeedImportCli.ts — and the reason `retention:command-receipts`
 *         is currently inert is that it did NOT follow it.
 * Verification: ingestHeartbeatEntrypoint.test.ts covers the function this calls. The proof
 *               that this file runs is that `npm run heartbeat -w @family-first/api` prints
 *               a digest instead of silence.
 */

import { runHeartbeatEntrypoint } from './ingestHeartbeatEntrypoint';

void runHeartbeatEntrypoint();
```


---

## The tests (judge whether they prove what they claim)

### `apps/api/src/ingestRun.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import {
  buildRunId,
  createMemoryIngestRunStore,
  type IngestRunRecord
} from './ingestRun';

/**
 * CB-HB — the run ledger. The properties worth asserting are the DISTINCTIONS this table
 * exists to preserve, because every one of them collapses into "looks fine" if it is wrong:
 *
 *   - a crashed run must not look like a successful one
 *   - a refusal must not look like an empty success
 *   - "did not fetch" must not look like "fetched nothing" (the repo's ingest law)
 *   - the ABSENCE of a run must be detectable at all
 */

const at = (iso: string) => new Date(iso);

describe('buildRunId', () => {
  it('sorts lexically in the same order as time', () => {
    const earlier = buildRunId('creator_ingest', at('2026-09-03T06:30:00Z'), () => 0);
    const later = buildRunId('creator_ingest', at('2026-09-03T07:30:00Z'), () => 0);
    expect(earlier < later).toBe(true);
  });

  it('does not collide for two runs that start in the same second', () => {
    // The daily sweep and its canary genuinely start together. A collision would overwrite
    // one row and silently destroy the evidence that the other ran.
    const now = at('2026-09-03T06:30:00Z');
    const a = buildRunId('creator_ingest', now, () => 0.1);
    const b = buildRunId('canary', now, () => 0.9);
    expect(a).not.toBe(b);
  });
});

describe('ingest run store — the crash distinction', () => {
  it('records a row BEFORE the work runs, so a crash leaves evidence', async () => {
    const store = createMemoryIngestRunStore();
    const run = await store.start({ kind: 'creator_ingest', now: at('2026-09-03T06:30:00Z') });

    // Nothing has finished. If the process died right here, this is what survives.
    expect(run.finishedAt).toBeUndefined();
    expect(await store.recent()).toHaveLength(1);
  });

  it('an in-flight run reads as NOT successful', async () => {
    // This is the load-bearing default. If a started run defaulted to 'success', every
    // process killed mid-fetch would leave behind a row claiming a good day.
    const store = createMemoryIngestRunStore();
    const run = await store.start({ kind: 'creator_ingest' });
    expect(run.outcome).toBe('failed');
    expect(run.outcome).not.toBe('success');
  });

  it('a crashed run is distinguishable from a finished one by finishedAt alone', async () => {
    const store = createMemoryIngestRunStore();
    const crashed = await store.start({ kind: 'creator_ingest', now: at('2026-09-03T06:30:00Z') });
    const completed = await store.start({ kind: 'canary', now: at('2026-09-03T06:31:00Z') });
    await store.finish({ id: completed.id, outcome: 'success', now: at('2026-09-03T06:32:00Z') });

    const rows = await store.recent();
    const byId = new Map(rows.map((r) => [r.id, r]));
    expect(byId.get(crashed.id)?.finishedAt).toBeUndefined();
    expect(byId.get(completed.id)?.finishedAt).toBeDefined();
  });
});

describe('ingest run store — the refusal distinction', () => {
  it('a refusal is a first-class outcome carrying its reason, not an error', async () => {
    const store = createMemoryIngestRunStore();
    const run = await store.start({ kind: 'creator_ingest' });
    const done = await store.finish({
      id: run.id,
      outcome: 'refused',
      reason: 'daily fetch budget exhausted (20/20)'
    });

    expect(done.outcome).toBe('refused');
    expect(done.reason).toContain('budget');
    expect(done.finishedAt).toBeDefined();
  });

  it('"did not fetch" and "fetched nothing" are different rows, not the same row', async () => {
    // The repo's ingest law, expressed in the ledger. A refused run has no `fetched` key at
    // all; a successful run that found nothing has `fetched: 0`. A digest reading these must
    // be able to say "could not run" vs "ran, nothing new" — see migration 0030 rule 5.
    const store = createMemoryIngestRunStore();

    const refused = await store.start({ kind: 'creator_ingest' });
    await store.finish({ id: refused.id, outcome: 'refused', reason: 'no credentials' });

    const empty = await store.start({ kind: 'creator_ingest' });
    await store.finish({ id: empty.id, outcome: 'success', counts: { fetched: 0 } });

    const rows = await store.recent();
    const byId = new Map(rows.map((r) => [r.id, r]));
    expect(byId.get(refused.id)?.counts.fetched).toBeUndefined();
    expect(byId.get(empty.id)?.counts.fetched).toBe(0);
  });
});

describe('ingest run store — reads the heartbeat depends on', () => {
  const seeded = (): IngestRunRecord[] => [
    {
      id: '20260901T0630Z-creator_ingest-0001',
      kind: 'creator_ingest',
      startedAt: '2026-09-01T06:30:00.000Z',
      finishedAt: '2026-09-01T06:31:00.000Z',
      outcome: 'success',
      counts: { fetched: 3 },
      quotaUnitsSpent: 4
    },
    {
      id: '20260902T0630Z-canary-0002',
      kind: 'canary',
      startedAt: '2026-09-02T06:30:00.000Z',
      finishedAt: '2026-09-02T06:30:20.000Z',
      outcome: 'failed',
      reason: 'timed-text returned empty payload',
      counts: {},
      quotaUnitsSpent: 0,
      toolVersion: 'yt-dlp 2026.08.11'
    },
    {
      id: '20260903T0630Z-creator_ingest-0003',
      kind: 'creator_ingest',
      startedAt: '2026-09-03T06:30:00.000Z',
      finishedAt: '2026-09-03T06:34:00.000Z',
      outcome: 'partial',
      reason: '1 creator failed',
      counts: { fetched: 2, failed: 1 },
      quotaUnitsSpent: 3
    }
  ];

  it('returns most recent first', async () => {
    const store = createMemoryIngestRunStore(seeded());
    const rows = await store.recent();
    expect(rows[0]?.startedAt).toBe('2026-09-03T06:30:00.000Z');
  });

  it('narrows by kind — "when did the canary last pass" is its own question', async () => {
    const store = createMemoryIngestRunStore(seeded());
    const canaries = await store.recent({ kind: 'canary' });
    expect(canaries).toHaveLength(1);
    expect(canaries[0]?.outcome).toBe('failed');
  });

  it('since() bounds the window the heartbeat evaluates', async () => {
    const store = createMemoryIngestRunStore(seeded());
    const rows = await store.since(at('2026-09-02T00:00:00Z'));
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.startedAt >= '2026-09-02T00:00:00.000Z')).toBe(true);
  });

  it('since() returns empty when nothing ran — the highest-severity signal', async () => {
    // Absence is the alarm (migration 0030 rule 3). It must be expressible as a plain
    // empty result, not an error, or the health check cannot distinguish "nothing ran"
    // from "the query broke".
    const store = createMemoryIngestRunStore(seeded());
    const rows = await store.since(at('2026-09-04T00:00:00Z'));
    expect(rows).toEqual([]);
  });

  it('preserves the tool version, so "what changed" is answerable', async () => {
    const store = createMemoryIngestRunStore(seeded());
    const [canary] = await store.recent({ kind: 'canary' });
    expect(canary?.toolVersion).toBe('yt-dlp 2026.08.11');
  });
});

describe('ingest run store — finishing a run that was never started', () => {
  it('throws rather than inventing a row', async () => {
    // Silently inserting would manufacture a started_at that is a lie, and crash detection
    // reads exactly that column.
    const store = createMemoryIngestRunStore();
    await expect(store.finish({ id: 'never-started', outcome: 'success' })).rejects.toThrow(
      /never started/
    );
  });
});
```

### `apps/api/src/ingestHeartbeat.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HEARTBEAT_THRESHOLDS,
  evaluateHeartbeat,
  renderHeartbeatDigest,
  type HeartbeatInput
} from './ingestHeartbeat';
import type { IngestRunRecord } from './ingestRun';

/**
 * CB-HB — the alarm logic.
 *
 * EVERY alarm here gets BOTH a positive case (it fires when it should) and a negative control
 * (it stays quiet when it should). A monitor with only positive tests is a monitor nobody has
 * proven can stay silent, and one that cries wolf gets muted — which is the same outcome as
 * having no monitor, reached more expensively.
 */

const NOW = new Date('2026-09-03T08:00:00.000Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

const run = (overrides: Partial<IngestRunRecord> = {}): IngestRunRecord => ({
  id: `run-${Math.random().toString(16).slice(2)}`,
  kind: 'creator_ingest',
  startedAt: hoursAgo(2),
  finishedAt: hoursAgo(2),
  outcome: 'success',
  counts: { fetched: 3 },
  quotaUnitsSpent: 4,
  ...overrides
});

const healthyCanary = () =>
  run({ kind: 'canary', outcome: 'success', counts: {}, toolVersion: 'yt-dlp 2026.09.01' });

const evaluate = (overrides: Partial<HeartbeatInput> = {}) =>
  evaluateHeartbeat({
    runs: [run(), healthyCanary()],
    now: NOW,
    creatorsPublished: true,
    ...overrides
  });

describe('a healthy window', () => {
  it('is ok with no alerts', () => {
    const verdict = evaluate();
    expect(verdict.severity).toBe('ok');
    expect(verdict.alerts).toEqual([]);
  });

  it('still produces a full digest — the good day is reported as loudly as the bad one', () => {
    // The whole point of the positive heartbeat. If this ever renders as empty or silent,
    // the "no news is good news" trap is back.
    const message = renderHeartbeatDigest(evaluate(), 24);
    expect(message).toContain('✅');
    expect(message).toContain('runs 2');
    expect(message).toContain('no alerts');
  });
});

describe('alarm: nothing ran', () => {
  it('fires when the window is completely empty', () => {
    const verdict = evaluate({ runs: [] });
    expect(verdict.severity).toBe('alarm');
    expect(verdict.alerts.map((a) => a.code)).toContain('no_run');
  });

  it('fires when the last run is older than the threshold', () => {
    const stale = run({ startedAt: hoursAgo(30), finishedAt: hoursAgo(30) });
    const verdict = evaluate({ runs: [stale, healthyCanary()] });
    expect(verdict.alerts.map((a) => a.code)).toContain('no_run');
  });

  it('NEGATIVE CONTROL: stays quiet at 25h, just inside the 26h limit', () => {
    const recent = run({ startedAt: hoursAgo(25), finishedAt: hoursAgo(25) });
    const verdict = evaluate({ runs: [recent, healthyCanary()] });
    expect(verdict.alerts.map((a) => a.code)).not.toContain('no_run');
  });

  it('a healthy canary does NOT satisfy staleness — the canary answers a different question', () => {
    // The bug this locks down: measuring staleness against "any run" let a 2h-old canary
    // mask a 30h-dead ingest. A scheduler whose canary fires but whose fetch step dies at
    // startup would have reported perfect health indefinitely.
    const staleIngest = run({ startedAt: hoursAgo(30), finishedAt: hoursAgo(30) });
    const verdict = evaluate({ runs: [staleIngest, healthyCanary()] });
    const alert = verdict.alerts.find((a) => a.code === 'no_run');
    expect(alert?.detail).toContain('ingestion');
  });

  it('fires when runs exist but none of them are ingestion at all', () => {
    const verdict = evaluate({ runs: [healthyCanary(), run({ kind: 'digest', counts: {} })] });
    const alert = verdict.alerts.find((a) => a.code === 'no_run');
    expect(alert?.severity).toBe('alarm');
    expect(alert?.detail).toContain('never fired');
  });

  it('NEGATIVE CONTROL: a backfill run counts as ingestion', () => {
    // Backfill is real fetching work. Excluding it would alarm through an entire
    // multi-day catch-up, which is when the operator is watching most closely.
    const verdict = evaluate({ runs: [run({ kind: 'backfill' }), healthyCanary()] });
    expect(verdict.alerts.map((a) => a.code)).not.toContain('no_run');
  });
});

describe('alarm: a run crashed mid-work', () => {
  it('fires for a run that started long ago and never finished', () => {
    const crashed = run({ startedAt: hoursAgo(8), finishedAt: undefined, outcome: 'failed' });
    const verdict = evaluate({ runs: [crashed, healthyCanary()] });
    expect(verdict.severity).toBe('alarm');
    expect(verdict.alerts.map((a) => a.code)).toContain('crashed_run');
  });

  it('NEGATIVE CONTROL: a run in flight for 1h is working, not crashed', () => {
    const inFlight = run({ startedAt: hoursAgo(1), finishedAt: undefined, outcome: 'failed' });
    const verdict = evaluate({ runs: [inFlight, healthyCanary()] });
    expect(verdict.alerts.map((a) => a.code)).not.toContain('crashed_run');
  });
});

describe('alarm: the canary — the yt-dlp-broke detector', () => {
  it('fires when the canary failed, and names the tool version', () => {
    const broken = run({
      kind: 'canary',
      outcome: 'failed',
      reason: 'timed-text returned empty payload',
      counts: {},
      toolVersion: 'yt-dlp 2026.08.11'
    });
    const verdict = evaluate({ runs: [run(), broken] });
    expect(verdict.severity).toBe('alarm');
    const alert = verdict.alerts.find((a) => a.code === 'canary_failed');
    expect(alert?.detail).toContain('empty payload');
    expect(alert?.detail).toContain('yt-dlp 2026.08.11');
  });

  it('flags a stale canary as attention, not alarm — unproven is not broken', () => {
    const old = run({ kind: 'canary', startedAt: hoursAgo(60), finishedAt: hoursAgo(60), counts: {} });
    const verdict = evaluate({ runs: [run(), old] });
    expect(verdict.alerts.map((a) => a.code)).toContain('canary_stale');
    expect(verdict.severity).toBe('attention');
  });

  it('flags a missing canary as unproven', () => {
    const verdict = evaluate({ runs: [run()] });
    expect(verdict.alerts.map((a) => a.code)).toContain('canary_stale');
  });

  it('NEGATIVE CONTROL: a canary still in flight is not yet a failure', () => {
    // Reading an unfinished canary as failed would alarm every night mid-run.
    const inFlight = run({
      kind: 'canary',
      startedAt: hoursAgo(1),
      finishedAt: undefined,
      outcome: 'failed',
      counts: {}
    });
    const verdict = evaluate({ runs: [run(), inFlight] });
    expect(verdict.alerts.map((a) => a.code)).not.toContain('canary_failed');
  });
});

describe('alarm: silent rot — green runs that fetch nothing', () => {
  const greenButEmpty = () =>
    run({ startedAt: hoursAgo(80), finishedAt: hoursAgo(80), outcome: 'success', counts: { fetched: 0 } });

  it('fires when nothing has been fetched for 72h while creators published', () => {
    const verdict = evaluate({ runs: [greenButEmpty(), healthyCanary()], creatorsPublished: true });
    expect(verdict.severity).toBe('alarm');
    expect(verdict.alerts.map((a) => a.code)).toContain('no_successful_fetch');
  });

  it('NEGATIVE CONTROL: stays quiet when creators genuinely published nothing', () => {
    // A quiet week is not a failure. Alarming on it is how a monitor gets muted.
    const verdict = evaluate({ runs: [greenButEmpty(), healthyCanary()], creatorsPublished: false });
    expect(verdict.alerts.map((a) => a.code)).not.toContain('no_successful_fetch');
  });

  it('NEGATIVE CONTROL: a run that actually fetched something clears it', () => {
    const productive = run({ startedAt: hoursAgo(10), finishedAt: hoursAgo(10), counts: { fetched: 2 } });
    const verdict = evaluate({ runs: [productive, healthyCanary()], creatorsPublished: true });
    expect(verdict.alerts.map((a) => a.code)).not.toContain('no_successful_fetch');
  });

  it('a refusal does NOT count as a successful fetch', () => {
    // `fetched` absent (refused) must not satisfy the "we fetched something" test, or a
    // budget cap firing daily would mask a totally dead pipeline.
    const refused = run({ startedAt: hoursAgo(2), finishedAt: hoursAgo(2), outcome: 'refused', counts: {} });
    const verdict = evaluate({
      runs: [refused, greenButEmpty(), healthyCanary()],
      creatorsPublished: true
    });
    expect(verdict.alerts.map((a) => a.code)).toContain('no_successful_fetch');
  });
});

describe('attention: success rate', () => {
  it('fires below the floor', () => {
    const runs = [
      run({ outcome: 'failed' }),
      run({ outcome: 'failed' }),
      run({ outcome: 'success' }),
      healthyCanary()
    ];
    const verdict = evaluate({ runs });
    expect(verdict.alerts.map((a) => a.code)).toContain('low_success_rate');
  });

  it('NEGATIVE CONTROL: refusals are excluded — a budget cap doing its job is not a fault', () => {
    // Counting refusals as failures would make a correctly-capped system look broken, and
    // the reader would learn to ignore the number.
    const runs = [
      run({ outcome: 'refused', counts: {} }),
      run({ outcome: 'refused', counts: {} }),
      run({ outcome: 'refused', counts: {} }),
      run({ outcome: 'success' }),
      healthyCanary()
    ];
    const verdict = evaluate({ runs });
    expect(verdict.alerts.map((a) => a.code)).not.toContain('low_success_rate');
  });
});

describe('digest rendering', () => {
  it('marks an alarm digest distinctly and lists every alert', () => {
    const verdict = evaluate({ runs: [], creatorsPublished: true });
    const message = renderHeartbeatDigest(verdict, 24);
    expect(message).toContain('🚨');
    expect(message).toContain('no_run');
  });

  it('reports quota spend, so the CB5 ledger has an independent cross-check', () => {
    const verdict = evaluate({ runs: [run({ quotaUnitsSpent: 7 }), healthyCanary()] });
    const message = renderHeartbeatDigest(verdict, 24);
    expect(message).toContain('quota 11 units');
  });
});

describe('thresholds are data, not magic numbers', () => {
  it('honours a caller-supplied threshold set', () => {
    const stale = run({ startedAt: hoursAgo(10), finishedAt: hoursAgo(10) });
    const strict = evaluateHeartbeat({
      runs: [stale, healthyCanary()],
      now: NOW,
      creatorsPublished: true,
      thresholds: { ...DEFAULT_HEARTBEAT_THRESHOLDS, maxHoursSinceRun: 6 }
    });
    expect(strict.alerts.map((a) => a.code)).toContain('no_run');
  });
});
```

### `apps/api/src/ingestHeartbeatRunner.test.ts`

```typescript
import { describe, expect, it, vi } from 'vitest';
import {
  createHeartbeatRunner,
  createLogHeartbeatDelivery,
  createUnavailableHeartbeatDelivery,
  type HeartbeatDelivery
} from './ingestHeartbeatRunner';
import { createMemoryIngestRunStore, type IngestRunRecord } from './ingestRun';

/**
 * CB-HB — the runner.
 *
 * The properties worth asserting are the ones that decide whether a FAILED HEARTBEAT IS
 * VISIBLE. A monitor that fails quietly is worse than none: the owner reads the absence of
 * alarms as health, while the thing that would have raised one is itself dead.
 */

const NOW = new Date('2026-09-03T08:00:00.000Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

const healthyWindow = (): IngestRunRecord[] => [
  {
    id: '20260903T0630Z-creator_ingest-0001',
    kind: 'creator_ingest',
    startedAt: hoursAgo(2),
    finishedAt: hoursAgo(2),
    outcome: 'success',
    counts: { fetched: 3 },
    quotaUnitsSpent: 4
  },
  {
    id: '20260903T0631Z-canary-0002',
    kind: 'canary',
    startedAt: hoursAgo(2),
    finishedAt: hoursAgo(2),
    outcome: 'success',
    counts: {},
    quotaUnitsSpent: 0,
    toolVersion: 'yt-dlp 2026.09.01'
  }
];

function recordingDelivery(): HeartbeatDelivery & { sent: string[] } {
  const sent: string[] = [];
  return {
    sent,
    async send(message) {
      sent.push(message);
    }
  };
}

const runnerWith = (
  delivery: HeartbeatDelivery,
  seed: IngestRunRecord[] = healthyWindow(),
  creatorsPublished = true
) => {
  const runs = createMemoryIngestRunStore(seed);
  return {
    runs,
    runner: createHeartbeatRunner({
      runs,
      delivery,
      creatorsPublished: async () => creatorsPublished,
      now: () => NOW
    })
  };
};

describe('the digest always sends', () => {
  it('delivers on a healthy day — silence must mean something', () => {
    const delivery = recordingDelivery();
    const { runner } = runnerWith(delivery);
    return runner.run().then((result) => {
      expect(result.delivered).toBe(true);
      expect(delivery.sent).toHaveLength(1);
      expect(delivery.sent[0]).toContain('✅');
    });
  });

  it('delivers on an alarm day too', async () => {
    const delivery = recordingDelivery();
    const { runner } = runnerWith(delivery, []);
    const result = await runner.run();
    expect(result.verdict.severity).toBe('alarm');
    expect(delivery.sent[0]).toContain('🚨');
  });
});

describe('the runner records itself', () => {
  it('writes a digest run and finishes it successfully', async () => {
    const { runner, runs } = runnerWith(recordingDelivery());
    const result = await runner.run();

    const digests = await runs.recent({ kind: 'digest' });
    expect(digests).toHaveLength(1);
    expect(digests[0]?.id).toBe(result.runId);
    expect(digests[0]?.outcome).toBe('success');
    expect(digests[0]?.finishedAt).toBeDefined();
  });

  it('excludes its own in-flight row from the window it reports on', async () => {
    // Without this the digest counts itself, and its own unfinished row is a candidate for
    // the crashed-run alarm — a monitor generating its own alerts.
    const { runner } = runnerWith(recordingDelivery());
    const result = await runner.run();
    expect(result.verdict.totals.runs).toBe(2); // the seeded ingest + canary, not the digest
    expect(result.verdict.alerts).toEqual([]);
  });
});

describe('a failed delivery is recorded, not swallowed', () => {
  const exploding: HeartbeatDelivery = {
    async send() {
      throw new Error('telegram unreachable');
    }
  };

  it('records the run as failed with the reason', async () => {
    const { runner, runs } = runnerWith(exploding);
    const result = await runner.run();

    expect(result.delivered).toBe(false);
    const [digest] = await runs.recent({ kind: 'digest' });
    expect(digest?.outcome).toBe('failed');
    expect(digest?.reason).toContain('delivery failed');
    expect(digest?.reason).toContain('telegram unreachable');
  });

  it('does not crash the scheduler — the ledger row must survive', async () => {
    // Rethrowing would let a scheduler treat the whole run as lost and, depending on its
    // retry policy, discard the very row that records the failure.
    const { runner } = runnerWith(exploding);
    await expect(runner.run()).resolves.toMatchObject({ delivered: false });
  });

  it('the failure becomes visible to the NEXT evaluation', async () => {
    // This is the mechanism that makes an undelivered heartbeat detectable at all: the
    // failed digest row lowers the success rate the next run computes.
    const { runner, runs } = runnerWith(exploding);
    await runner.run();

    const second = createHeartbeatRunner({
      runs,
      delivery: recordingDelivery(),
      creatorsPublished: async () => true,
      now: () => NOW
    });
    const result = await second.run();
    expect(result.verdict.totals.failed).toBeGreaterThan(0);
  });
});

describe('an unconfigured delivery is a failure, not a no-op', () => {
  it('records failed rather than reporting a clean run', async () => {
    // A no-op delivery would make an unconfigured heartbeat indistinguishable from a working
    // one — "could not send" and "sent nothing" collapsing into the same result.
    const { runner, runs } = runnerWith(
      createUnavailableHeartbeatDelivery('no adapter approved yet')
    );
    const result = await runner.run();

    expect(result.delivered).toBe(false);
    const [digest] = await runs.recent({ kind: 'digest' });
    expect(digest?.outcome).toBe('failed');
    expect(digest?.reason).toContain('not configured');
  });
});

describe('a broken evaluation cannot report ok', () => {
  it('records the failure and rethrows', async () => {
    const runs = createMemoryIngestRunStore();
    vi.spyOn(runs, 'since').mockRejectedValueOnce(new Error('ledger unreadable'));
    const delivery = recordingDelivery();
    const runner = createHeartbeatRunner({
      runs,
      delivery,
      creatorsPublished: async () => true,
      now: () => NOW
    });

    await expect(runner.run()).rejects.toThrow(/ledger unreadable/);
    expect(delivery.sent).toHaveLength(0);

    const [digest] = await runs.recent({ kind: 'digest' });
    expect(digest?.outcome).toBe('failed');
    expect(digest?.reason).toContain('evaluation failed');
  });
});

describe('log delivery', () => {
  it('writes the message', async () => {
    const lines: string[] = [];
    const { runner } = runnerWith(createLogHeartbeatDelivery((line) => lines.push(line)));
    await runner.run();
    expect(lines[0]).toContain('Creator brain');
  });
});

describe('the quiet-week suppression reaches the runner', () => {
  it('does not alarm on no fetches when creators published nothing', async () => {
    const stale: IngestRunRecord[] = [
      {
        id: '20260901T0630Z-creator_ingest-0009',
        kind: 'creator_ingest',
        startedAt: hoursAgo(3),
        finishedAt: hoursAgo(3),
        outcome: 'success',
        counts: { fetched: 0 },
        quotaUnitsSpent: 2
      }
    ];
    const { runner } = runnerWith(recordingDelivery(), stale, false);
    const result = await runner.run();
    expect(result.verdict.alerts.map((a) => a.code)).not.toContain('no_successful_fetch');
  });
});
```

### `apps/api/src/ingestHeartbeatEntrypoint.test.ts`

```typescript
import { describe, expect, it, vi } from 'vitest';
import { createMemoryIngestRunStore } from './ingestRun';
import {
  HeartbeatRunnerError,
  resolveHeartbeatDelivery,
  runHeartbeatEntrypoint,
  runHeartbeatOnce
} from './ingestHeartbeatEntrypoint';

/**
 * CB-HB — composition and refusals. No database needed.
 *
 * The refusals are the point: a heartbeat that runs against the wrong thing, or reports
 * success without delivering, is worse than one that does not exist.
 */

const NOW = new Date('2026-09-03T08:00:00.000Z');

const captureOutput = () => {
  const info: string[] = [];
  const errors: string[] = [];
  return { info: (m: string) => info.push(m), error: (m: string) => errors.push(m), lines: info, errors };
};

describe('delivery resolution fails closed', () => {
  it('is unavailable when nothing is configured', async () => {
    const delivery = resolveHeartbeatDelivery({});
    await expect(delivery.send('x', 'ok')).rejects.toThrow(/not configured/);
  });

  it('names an unknown mode rather than silently falling back', async () => {
    // A silent fallback to stdout would let a typo'd env var look like a working push.
    const delivery = resolveHeartbeatDelivery({ SWANGUARD_HEARTBEAT_DELIVERY: 'telegran' });
    await expect(delivery.send('x', 'ok')).rejects.toThrow(/telegran/);
  });

  it('opts into stdout only when explicitly asked', async () => {
    const delivery = resolveHeartbeatDelivery({ SWANGUARD_HEARTBEAT_DELIVERY: 'log' });
    await expect(delivery.send('x', 'ok')).resolves.toBeUndefined();
  });
});

describe('memory mode is refused', () => {
  it('throws rather than reporting health about a database it never opened', async () => {
    await expect(
      runHeartbeatOnce({
        env: { DATABASE_MODE: 'memory', SWANGUARD_HEARTBEAT_DELIVERY: 'log' } as NodeJS.ProcessEnv
      })
    ).rejects.toBeInstanceOf(HeartbeatRunnerError);
  });
});

describe('the injected path runs end to end', () => {
  it('delivers and reports the run id', async () => {
    const sent: string[] = [];
    const result = await runHeartbeatOnce({
      env: {} as NodeJS.ProcessEnv,
      runs: createMemoryIngestRunStore(),
      creatorsPublished: async () => false,
      delivery: { async send(message) { sent.push(message); } },
      now: () => NOW
    });

    expect(result.delivered).toBe(true);
    expect(sent).toHaveLength(1);
    expect(result.runId).toContain('digest');
  });
});

describe('the entrypoint exit codes', () => {
  it('exits non-zero when the digest was not delivered', async () => {
    // The ledger already records it; this makes the failure visible to the scheduler too.
    const exit = vi.fn();
    const output = captureOutput();
    await runHeartbeatEntrypoint({
      env: {} as NodeJS.ProcessEnv,
      runs: createMemoryIngestRunStore(),
      creatorsPublished: async () => false,
      now: () => NOW,
      exit,
      output
    });
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('does not exit non-zero on a delivered digest', async () => {
    const exit = vi.fn();
    await runHeartbeatEntrypoint({
      env: {} as NodeJS.ProcessEnv,
      runs: createMemoryIngestRunStore(),
      creatorsPublished: async () => false,
      delivery: { async send() {} },
      now: () => NOW,
      exit,
      output: captureOutput()
    });
    expect(exit).not.toHaveBeenCalled();
  });

  it('prints the digest text, not just a status code', async () => {
    const output = captureOutput();
    await runHeartbeatEntrypoint({
      env: {} as NodeJS.ProcessEnv,
      runs: createMemoryIngestRunStore(),
      creatorsPublished: async () => false,
      delivery: { async send() {} },
      now: () => NOW,
      exit: vi.fn(),
      output
    });
    expect(output.lines.join('\n')).toContain('Creator brain');
    expect(output.lines.join('\n')).toContain('ingest_heartbeat.completed');
  });

  it('reports a generic message for errors that might embed a connection string', async () => {
    const output = captureOutput();
    const exit = vi.fn();
    await runHeartbeatEntrypoint({
      env: { DATABASE_MODE: 'postgres', DATABASE_URL: 'postgres://u:p@h/db' } as NodeJS.ProcessEnv,
      createRuntime: () => {
        throw new Error('connection to postgres://u:p@h/db refused');
      },
      exit,
      output
    });

    expect(exit).toHaveBeenCalledWith(1);
    const all = output.errors.join('\n');
    expect(all).toBe('ingest heartbeat could not complete');
    expect(all).not.toContain('postgres://');
  });
});
```


---

# YOUR REVIEW

## Q1 — Can this monitor fail silently?
The entire slice exists to make silence impossible. Find every path where it could
still go quiet, report health it has not established, or fail to fire without anyone
noticing. Consider at minimum: the scheduler never invoking it, `runs.start()` itself
throwing, a partially-written ledger, clock skew / DST / timezone, `now` injected
inconsistently, the digest run polluting its own window, and what happens on the very
first run when the table is empty.

## Q2 — Are the alarm thresholds and conditions actually right?
Attack each of the six alarms (`no_run`, `crashed_run`, `canary_failed`,
`canary_stale`, `no_successful_fetch`, `low_success_rate`). For each: can it false-fire
(training the owner to mute it), and can it miss a real failure? Pay particular
attention to the `creatorsPublished` suppression and to whether `counts.fetched` is a
sound proxy for "the pipeline works".

## Q3 — Is the SQL right?
Schema, indexes, constraints, the upsert/update semantics, jsonb `counts`, the
`(xmax = 0)`-style insert/update distinction if relevant, timezone handling on
`started_at`, and whether the three indexes are the ones the actual queries need. Name
any index that is unused or any query that will scan.

## Q4 — Concurrency and crash semantics
Two runs starting in the same second. Two processes. A crash between `start()` and
`finish()`. A `finish()` for a row another process already finished. Restart mid-run.
Is `buildRunId`'s collision resistance adequate, and is `Math.random` the right choice
here?

## Q5 — Does the test suite prove what it claims?
The suite asserts "negative controls" on every alarm. Judge honestly: are they real
negative controls, or do they pass for reasons unrelated to the logic? Name any test
that would still pass if the behaviour it names were broken. Name what is NOT tested
that should be.

## Q6 — The delivery design
Delivery fails closed: unconfigured means every run records `failed: delivery is not
configured`. The runner does NOT rethrow on delivery failure (to preserve the ledger
row) but the entrypoint exits non-zero. Attack this: is it right? What breaks when the
real adapter arrives? Is "the failure becomes visible to the NEXT evaluation" actually
true, or is it a comforting story?

## Q7 — What did the author miss entirely?
The gap that is not in any of the above.

## Output format
```
## VERDICT (3-5 sentences: is this sound, and what is the single worst defect)
## Q1 SILENT-FAILURE PATHS
## Q2 ALARM CORRECTNESS  (per alarm: false-fire risk / miss risk)
## Q3 SQL
## Q4 CONCURRENCY AND CRASH SEMANTICS
## Q5 TEST SUITE HONESTY  (name specific weak tests)
## Q6 DELIVERY DESIGN
## Q7 WHAT WAS MISSED
## RANKED FIX LIST  (severity | file | what to change | why)
```
Prefer tables and specific line references over prose. Do not pad. Do not compliment.
