#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/registry-write-guard.mjs
 * PURPOSE: What a catalog write says when it REFUSES.
 * PART OF: Creator Brains — SS-PT acquisition engine (S1-H12 / Astra r1)
 * ADDED: 2026-09-23
 * ============================================================================
 *
 * EXTRACTED FROM `registry.mjs` AT THE SEAM, NOT TRIMMED TO FIT (Rule 4). The
 * lock work pushed that file to 311 lines; Rule 4 says extract a coherent unit
 * rather than line-golf comments, and the unit here is real: every refusal a
 * catalog write can produce, said in ONE place. `registry.mjs` keeps the reads
 * and the mutations; this keeps what they say when they decline to run.
 *
 * The release policy that used to live here has moved to `lock-release.mjs` —
 * it is a lock concern, and `subs-apply.mjs` needs the same one.
 *
 * @module creator-brains/registry-write-guard
 */

import { describeRead } from './store.mjs';

/** The refusal a damaged catalog earns, said ONCE so the pre-flight read and the
 *  locked re-read cannot drift into two different sentences. */
export function damagedRefusal(read) {
  return `registry.json is ${describeRead(read)} — refusing to write over the creator catalog. `
    + 'Restore it from a backup, or move it aside deliberately to start a new catalog.';
}

/**
 * The refusal a SECOND writer earns, and the reason `locked` exists as a field.
 *
 * A held lock means the mutation was NEVER ATTEMPTED. That is a different fact
 * from the engine having considered a ref and declined it, so the console must
 * be able to answer 409 rather than 422 — the same distinction S1-H12 drew when
 * it made a dead resolver a 503 instead of a 422.
 *
 * Wording is shared by all THREE mutation paths (`addCreator`, `setEnabled`,
 * `commitSnapshot`) so the three cannot be told apart by their prose. That is
 * not tidiness: a caller that branches on the sentence rather than on the code
 * is a bug waiting for the first reword, and `commitSnapshot` had grown its own
 * third copy of this exact string before it was folded back in.
 */
export function lockedRefusal(lock) {
  return `the store is locked by another run (${lock.reason}) — refusing to write the creator catalog `
    + 'while another writer owns it. Nothing was changed; retry when the run finishes.';
}
