/**
 * store.mjs — durable state for quotes and jobs.
 *
 * ── WHY A JSON FILE AND NOT A DATABASE ──────────────────────────────────────
 * The same trade `spendGuard.mjs` already made: the thing being stored is one
 * operator's work on one machine, and a schema migration to hold a few hundred rows
 * would be worse than a file a human can open, read, and delete. It also survives a
 * restart without a service to start.
 *
 * ── ATOMIC WRITES ───────────────────────────────────────────────────────────
 * Write to a sibling temp file, flush, then rename. A rename within one volume is
 * atomic, so a crash mid-write leaves the previous good file rather than a truncated
 * one. The spend guard learned this the expensive way: a ledger truncated to "{" was
 * read as a fresh day and became an unlimited-quota exploit.
 *
 * Astra's caveat, recorded rather than assumed away: *"A file's readability is not
 * evidence of crash safety."* This is the design; proving it needs the write-boundary
 * drill in test STORE-001, which has not been run.
 *
 * ── WHAT SURVIVES A RESTART, AND WHAT CANNOT ────────────────────────────────
 * Records survive. In-flight WORK does not. On boot, any job still non-terminal is
 * marked `failed` with `E_ORPHANED` and is NEVER auto-retried: a local render may
 * well have finished on the ComfyUI host, and a hosted one may have been billed.
 * Astra's stronger position — hold the job in `reconciling` and require operator
 * intervention rather than declaring it failed — is NOT implemented here and is
 * flagged in the README as open work. Declaring failure is the weaker claim; it
 * under-reports rather than inventing a success.
 */

import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * The status vocabulary. Astra REVISED this away from the vendor's.
 *
 * The first version adopted Higgsfield's words wholesale (`queued` / `in_progress` /
 * `completed`), on the reasoning that an integrating agent had already seen them.
 * Astra rejected that: *"Do not make 'local GPU execution' and 'hosted billable
 * generation' interchangeable merely because both produce video."* The vendor's
 * vocabulary is a vendor's vocabulary, and adopting it as the public contract bakes
 * one vendor's lifecycle into both lanes.
 *
 * `reconciling` is non-terminal ON PURPOSE: a poll timeout is not a provider failure,
 * and a job whose true state is unknown must be able to say so rather than choosing
 * between "running" and "failed".
 */
export const STATUS = Object.freeze({
  QUEUED: 'queued',
  SUBMITTING: 'submitting',
  RUNNING: 'running',
  FINALIZING: 'finalizing',
  RECONCILING: 'reconciling',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  NSFW: 'nsfw',
  CANCELED: 'canceled',
});

const TERMINAL = new Set([STATUS.SUCCEEDED, STATUS.FAILED, STATUS.NSFW, STATUS.CANCELED]);

export function isTerminal(status) {
  return TERMINAL.has(status);
}

export const DEFAULT_MAX_JOBS = 200;
export const DEFAULT_QUOTE_TTL_MS = 5 * 60 * 1000;

export class StoreError extends Error {
  constructor(code, message) { super(message); this.name = 'StoreError'; this.code = code; }
}

function makeAtomicFile(path, io) {
  return {
    read(key) {
      try {
        if (!io.existsSync(path)) return [];
        const raw = JSON.parse(io.readFileSync(path, 'utf8'));
        return Array.isArray(raw?.[key]) ? raw[key] : [];
      } catch (err) {
        // A MISSING file is a fresh start. A CORRUPT one is a different thing, and
        // silently returning [] would reset history — including the record of what
        // was already billed. Refusing is the reading that cannot lose money.
        if (err && err.code === 'ENOENT') return [];
        throw new StoreError('E_STORE_CORRUPT',
          `The store at ${path} exists but could not be parsed (${err.message}). `
          + 'Move it aside to start fresh; the existing records are preserved until you do.');
      }
    },
    write(key, rows) {
      const dir = dirname(path);
      if (!io.existsSync(dir)) io.mkdirSync(dir, { recursive: true });
      const tmp = `${path}.tmp`;
      io.writeFileSync(tmp, JSON.stringify({ schema: 1, [key]: rows }, null, 2));
      io.renameSync(tmp, path);
    },
  };
}

const defaultIo = { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync };

export function makeJobStore(path, { fs: io = defaultIo, maxJobs = DEFAULT_MAX_JOBS, now = () => new Date() } = {}) {
  const file = makeAtomicFile(path, io);
  const prune = (rows) => [...rows]
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, maxJobs);

  return {
    create(record) {
      const job = {
        id: record.id || randomUUID(),
        owner: record.owner || 'unknown',
        provider: record.provider,
        executionKind: record.executionKind || null,
        status: STATUS.QUEUED,
        params: record.params || {},
        quoteId: record.quoteId || null,
        createdAt: now().toISOString(),
        updatedAt: now().toISOString(),
        backendId: null,
        progress: { pct: 0, message: 'queued' },
        output: null,
        error: null,
        // Recorded at submit time so a later reconciliation knows whether a retry
        // would cost money. A hosted job must never be silently resubmitted.
        billed: record.billed === true,
        // Astra: the caller's ceiling can only REDUCE the server allowance, never
        // raise it. Stored so the refusal message can name which of the two bound.
        maxCostUsd: record.maxCostUsd ?? null,
        estimateUsd: record.estimateUsd ?? null,
      };
      const rows = prune([...file.read('jobs'), job]);
      // The record just created MUST survive its own prune. `prune` sorts newest-first,
      // and when `createdAt` ties — a coarse clock, an injected `now`, a burst — a
      // stable sort keeps insertion order, which puts the NEW job last, exactly where
      // the slice cuts. A full store then acknowledged a 202 for a job it discarded,
      // and the caller's next `GET /v1/jobs/:id` was a 404 for work that was running.
      const kept = rows.some(j => j.id === job.id)
        ? rows
        : [...rows.slice(0, Math.max(0, maxJobs - 1)), job];
      file.write('jobs', kept);
      return job;
    },
    get(id) { return file.read('jobs').find(j => j.id === id) || null; },
    list() { return file.read('jobs'); },
    update(id, patch) {
      const rows = file.read('jobs');
      const i = rows.findIndex(j => j.id === id);
      if (i < 0) return null;
      rows[i] = { ...rows[i], ...patch, updatedAt: now().toISOString() };
      file.write('jobs', prune(rows));
      return rows[i];
    },
    /**
     * On boot: any non-terminal job belonged to a process that no longer exists.
     * Marked, named, and NOT retried. See the header note on what this gives up.
     */
    reconcileOrphans(reason = 'gateway restarted while this job was non-terminal') {
      const rows = file.read('jobs');
      const orphans = rows.filter(j => !isTerminal(j.status));
      if (orphans.length === 0) return [];
      for (const j of orphans) {
        j.status = STATUS.FAILED;
        j.error = { code: 'E_ORPHANED', message: reason, retryable: false };
        j.updatedAt = now().toISOString();
      }
      file.write('jobs', prune(rows));
      return orphans.map(j => j.id);
    },
  };
}

/**
 * Quotes. Astra's D-A makes a quote the ONLY way to reach a job:
 *
 *   "Job admission rechecks provider enablement, credentials, price version, licence,
 *    preview evidence, profile hash and available budget. A quote is neither a
 *    reservation nor permission to execute indefinitely."
 *
 * A quote is therefore a SHORT-LIVED, FROZEN record of a decision already made — not
 * a cached price. It carries the licence decision and the pricing basis so the job
 * step can prove what was authorised rather than re-deriving it from a catalogue that
 * may have changed in between.
 */
export function makeQuoteStore(path, { fs: io = defaultIo, ttlMs = DEFAULT_QUOTE_TTL_MS, now = () => new Date() } = {}) {
  const file = makeAtomicFile(path, io);

  return {
    create(record) {
      const created = now();
      const quote = {
        id: randomUUID(),
        owner: record.owner || 'unknown',
        createdAt: created.toISOString(),
        expiresAt: new Date(created.getTime() + ttlMs).toISOString(),
        // The frozen decision. Everything the job step needs to prove what was
        // authorised, so it never has to re-derive it from a mutable catalogue.
        provider: record.provider,
        executionKind: record.executionKind,
        params: record.params,
        licenceDecision: record.licenceDecision,
        pricing: record.pricing,
        requirements: record.requirements || [],
        admitted: record.admitted === true,
      };
      // Expired quotes are dropped on every write, so the store cannot grow without
      // bound and cannot resurrect a stale authorisation.
      const live = file.read('quotes').filter(q => Date.parse(q.expiresAt) > created.getTime());
      file.write('quotes', [...live, quote]);
      return quote;
    },
    get(id) {
      const q = file.read('quotes').find(x => x.id === id) || null;
      if (!q) return null;
      // Expiry is evaluated on READ, not only on write — a quote that outlives its
      // window must be unusable even if nothing else has been written since.
      return Date.parse(q.expiresAt) > now().getTime() ? q : { ...q, expired: true };
    },
    list() { return file.read('quotes'); },
  };
}
