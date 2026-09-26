/**
 * session.mjs — the compile registry. Astra's ONLY in-memory truth.
 *
 * WHY THIS EXISTS. `brain.explain(compileId)` and `brain.reject(compileId)` both
 * address a compile BY ID, so something has to hand out ids and remember what
 * they point at. The packet's ERD models COMPILE as an entity; this is it.
 *
 * WHY IT DOES NOT PERSIST. `02-BLUEPRINT.md` §6: *"Astra's own persistence is one
 * file: the staged tuning draft. Nothing else survives a restart except what it
 * wrote through a dial."* A compile is not truth — it is a deterministic function
 * of a brief and a capability set, both of which the caller still has. Persisting
 * it would create a second copy of the brain's output that could disagree with the
 * brain, which is the drift the whole design exists to kill.
 *
 * The honest consequence: an id from a previous process is UNKNOWN, and
 * `getCompile` says so with a named error rather than guessing or re-deriving.
 * A console that silently recompiled a stale id would show reasoning for a run
 * that never happened.
 *
 * ID SHAPE. `cmp-<sha256(brief+caps)[0:8]>-<n>` — the hash makes the id a
 * function of the inputs, and the counter disambiguates two identical compiles so
 * a `reject` can never land on the wrong one. A pure hash would collapse them.
 */

import { createHash } from 'node:crypto';
import { compileAndExplain } from './brain.mjs';

const registry = new Map();
let counter = 0;

function idFor(brief, caps) {
  const seedMaterial = JSON.stringify({ brief, caps });
  const digest = createHash('sha256').update(seedMaterial).digest('hex').slice(0, 8);
  counter += 1;
  return `cmp-${digest}-${counter}`;
}

/**
 * Compile a brief, explain it, and register the pair under a new id.
 *
 * A BLOCKED compile is still registered. That is deliberate: `E_LAW_VIOLATION` is
 * a REPORTED outcome the operator must be able to revisit, not an error to be
 * discarded. The entry carries `ok: false` and the ExplainView's `partial` flag,
 * so nothing downstream can mistake it for a successful compile.
 *
 * @returns {{compileId: string, ok: boolean, compile: object|null, view: object, error: Error|null}}
 */
export function compileAndRecord(brief = {}, caps = {}) {
  const result = compileAndExplain(brief, caps);
  const compileId = idFor(brief, caps);
  registry.set(compileId, {
    compileId,
    brief,
    caps,
    ok: result.ok,
    compile: result.compile || null,
    view: result.view,
    error: result.error || null,
    // Recorded so the Ledger can show drift against a real timestamp rather than
    // inventing one at read time.
    createdAt: new Date().toISOString(),
    outcome: 'pending',
  });
  return { compileId, ...result };
}

/**
 * Look a compile up by id.
 *
 * Throws `E_COMPILE_UNKNOWN` rather than returning `undefined`, because every
 * caller here is a surface or a tool that would otherwise render `undefined` as a
 * blank pane — the exact failure `doctrine.mjs` records as round-11 finding F17
 * (*a missing value displayed as a value*).
 */
export function getCompile(compileId) {
  const entry = registry.get(compileId);
  if (!entry) {
    const err = new Error(
      `E_COMPILE_UNKNOWN: no compile ${JSON.stringify(compileId ?? null)} in this session. `
      + 'Compiles are not persisted across restarts — recompile the brief.',
    );
    err.code = 'E_COMPILE_UNKNOWN';
    throw err;
  }
  return entry;
}

export function hasCompile(compileId) {
  return registry.has(compileId);
}

/** Most recent first. The surface lists compiles in reverse creation order. */
export function listCompiles() {
  return [...registry.values()].reverse().map((e) => ({
    compileId: e.compileId,
    briefId: e.brief?.briefId ?? null,
    ok: e.ok,
    outcome: e.outcome,
    createdAt: e.createdAt,
    brainVersion: e.view?.brainVersion ?? null,
    provider: e.view?.provider ?? null,
    promptText: e.view?.promptText ?? '',
  }));
}

/** Record an outcome on a compile. Only the Ledger's own dial calls this. */
export function setOutcome(compileId, outcome) {
  const entry = getCompile(compileId);
  entry.outcome = outcome;
  return entry;
}

/** Test seam. Never called by a surface. */
export function resetRegistry() {
  registry.clear();
  counter = 0;
}
