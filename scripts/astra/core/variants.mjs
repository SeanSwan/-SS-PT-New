/**
 * variants.mjs — the store boundary. Astra's read of the variant store, and the BRIEF STORE.
 *
 * TWO JOBS THAT BELONG TOGETHER BECAUSE BOTH ARE "TALK TO A STORE":
 *
 *   1. **The variant store** — read through its own API (`shared/variantRun.mjs`), never by
 *      parsing `.ai-workflow/forge-runs/runs.jsonl` directly. That is A0 §5's `U2`, and the
 *      reason is not style: `readRuns()` skips a corrupt line and REPORTS the skip, while a
 *      hand-rolled `JSON.parse` loop would either throw on a half-written final row or
 *      silently drop it. The store already solved this; a second parser would re-solve it
 *      differently.
 *   2. **The brief store** — Astra's own, and its SECOND write path. `AC3.1`'s persistence
 *      half: *"persisted `text` byte-identical for a `briefId`"*. `paths.mjs` names the path;
 *      see that file's header for why it lives outside the prunable artifact root.
 *
 * THE BRIEF IS IMMUTABLE, AND THAT IS A GUARD RATHER THAN A COMMENT. `03-INTERFACE.md` §6.1's
 * ERD annotates `BRIEF.text` with the literal word **IMMUTABLE**. A brief that could be edited
 * in place would make every compile recorded against it unattributable — the compile says
 * "compiled from brief b_7", and if b_7's text can change afterwards, that sentence stops
 * being true and nothing records that it stopped. So `saveBrief()` refuses a second write with
 * different text (`E_BRIEF_IMMUTABLE`), and is idempotent when the text is byte-identical.
 * A refiner writes a NEW brief that points at the old one; it does not edit history.
 *
 * WHY JSON-PER-LINE AND NOT A PRETTY FILE. A brief is arbitrary operator text: it contains
 * quotes, angle brackets, ampersands and newlines. `JSON.stringify` escapes a newline as the
 * two characters `\` `n`, so one brief is always exactly one line and the file stays
 * line-addressable and crash-recoverable — a truncated final line loses ONE brief, not the
 * file. A pretty-printed JSON array would lose everything on the same crash.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { BRIEF_STORE_PATH, REPO_ROOT } from './paths.mjs';
import { readRuns } from '../../../shared/variantRun.mjs';

/**
 * The record shape. `briefId` and `text` are the two fields `AC3.1` is about; the rest are the
 * compose pane's own fields, carried so a persisted brief is enough to recompile from without
 * a second lookup.
 */
export const BRIEF_FIELDS = Object.freeze(['briefId', 'text', 'surfaceClass', 'intent', 'aspect', 'savedAt']);

/** Ids are opaque, but they must be one line and non-empty or the store cannot address them. */
const ID_SHAPE = /^[A-Za-z0-9_.:-]{1,128}$/;

/** A brief that cannot be addressed cannot be read back, which is the whole point of storing it. */
export function assertBrief(brief) {
  const id = brief?.briefId;
  if (typeof id !== 'string' || !ID_SHAPE.test(id)) {
    throw named('E_BRIEF_ID_INVALID',
      `briefId must match ${ID_SHAPE} — got ${JSON.stringify(id ?? null)}. `
      + 'An unaddressable brief cannot be read back, so it is refused rather than stored.');
  }
  if (typeof brief.text !== 'string') {
    throw named('E_BRIEF_TEXT_INVALID',
      `brief.text must be a string — got ${typeof brief.text}. Persisting a non-string would `
      + 'make the byte-identity claim meaningless.');
  }
  return true;
}

function named(code, message) {
  const e = new Error(`${code}: ${message}`);
  e.code = code;
  return e;
}

/**
 * Read the store. Never throws on a bad line — a corrupt row is COUNTED and reported, because
 * a store that silently drops a brief is worse than one that admits it cannot read one.
 *
 * @returns {{records: object[], byId: Map<string, object[]>, skipped: number, duplicateIds: string[]}}
 */
export function readBriefStore({ path = BRIEF_STORE_PATH } = {}) {
  if (!existsSync(path)) return { records: [], byId: new Map(), skipped: 0, duplicateIds: [] };
  const records = [];
  let skipped = 0;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line);
      if (row && typeof row.briefId === 'string') records.push(row);
      else skipped += 1;
    } catch { skipped += 1; }
  }
  const byId = new Map();
  for (const r of records) {
    if (!byId.has(r.briefId)) byId.set(r.briefId, []);
    byId.get(r.briefId).push(r);
  }
  const duplicateIds = [...byId.entries()].filter(([, v]) => v.length > 1).map(([k]) => k).sort();
  return { records, byId, skipped, duplicateIds };
}

/**
 * Persist a brief. The ONE writer of `BRIEF_STORE_PATH`.
 *
 * @returns {{written: boolean, briefId: string, reason: string|null, bytes: number}}
 * @throws E_BRIEF_IMMUTABLE when the id exists and the text differs
 */
export function saveBrief(brief, { path = BRIEF_STORE_PATH, now = () => new Date().toISOString() } = {}) {
  assertBrief(brief);
  const { byId } = readBriefStore({ path });
  const existing = byId.get(brief.briefId)?.[0];

  if (existing) {
    if (existing.text === brief.text) {
      // Idempotent: a retry, or the same brief submitted twice, must not append a second row.
      // A duplicate here would inflate the store and make "how many briefs" a count of writes
      // rather than a count of briefs.
      return { written: false, briefId: brief.briefId, reason: 'identical text already stored', bytes: 0 };
    }
    throw named('E_BRIEF_IMMUTABLE',
      `brief ${brief.briefId} already exists with different text (stored ${existing.text.length} chars, `
      + `offered ${brief.text.length}). A brief is IMMUTABLE (03-INTERFACE §6.1) — write a new briefId `
      + 'that refines it. Editing history in place would make every compile recorded against it unattributable.');
  }

  const record = {
    briefId: brief.briefId,
    text: brief.text,
    surfaceClass: brief.surfaceClass ?? null,
    intent: brief.intent ?? null,
    aspect: brief.aspect ?? null,
    savedAt: now(),
  };
  const line = `${JSON.stringify(record)}\n`;
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, line, 'utf8');
  // `bytes` is the encoded length of the RECORD, not of the text — the caller can compare it
  // against the file's growth to see the write really happened, which is what stops an
  // immutability test from passing over a no-op.
  return { written: true, briefId: brief.briefId, reason: null, bytes: Buffer.byteLength(line, 'utf8') };
}

/** The persisted brief, or `null`. Byte-identical to what `saveBrief` was given. */
export function readBrief(briefId, { path = BRIEF_STORE_PATH } = {}) {
  const { byId } = readBriefStore({ path });
  return byId.get(briefId)?.[0] ?? null;
}

/** Newest first, for the pane's list. Text is included: the store is the operator's own. */
export function listBriefs({ path = BRIEF_STORE_PATH } = {}) {
  const { records, skipped, duplicateIds } = readBriefStore({ path });
  return {
    briefs: records.slice().reverse().map((r) => ({
      briefId: r.briefId, text: r.text, surfaceClass: r.surfaceClass ?? null,
      intent: r.intent ?? null, aspect: r.aspect ?? null, savedAt: r.savedAt ?? null,
      chars: typeof r.text === 'string' ? r.text.length : 0,
    })),
    count: records.length,
    skipped,
    duplicateIds,
  };
}

/**
 * The variant store, read through its own API. `error` is a NAMED state rather than an empty
 * list: "no generations yet" and "the ledger could not be read" are different facts, and only
 * one of them means the numbers are complete.
 */
export function variantRuns(root = REPO_ROOT) {
  try {
    const { runs, skipped } = readRuns(root);
    return { runs, skipped, error: null };
  } catch (e) {
    return {
      runs: [], skipped: 0,
      error: { code: e.code ?? 'E_VARIANT_STORE_UNREADABLE', message: e.message },
    };
  }
}
