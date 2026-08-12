/**
 * variantRun.mjs — the Forge's memory.
 *
 * WHY THIS EXISTS, in the reviewer's words: "a generation system with no
 * perceptual feedback loop is open-loop control." Kimi K3, round 4, naming the
 * three things the Forge cannot do — see, remember, iterate. This is *remember*.
 * Until now every measured fact about generation (the serializer A/B, the
 * safety-rejection rate, what an image cost) lived in a prose review document:
 * tribal knowledge, not queryable state. Re-answering "which serializer is
 * reliable" meant re-running the experiment or trusting a paragraph.
 *
 * THE ONE FIELD THAT MATTERS IS `parentVariantId`. It is what makes round two a
 * REFINEMENT of round one's winner rather than a fresh lottery, and it is the
 * seam image-to-image plugs into later. A tournament that records outputs but
 * not lineage is a casino: you can see what you got and never how you got there.
 * Retrofitting provenance after users are touching outputs is roughly triple the
 * work, so it is here before the first bracket exists.
 *
 * DESIGN
 * - `buildRecord()` is PURE and separately testable; `appendRun()` does the I/O.
 *   Every validation rule is exercisable without touching a disk.
 * - FAIL-CLOSED on shape. A malformed record is refused rather than written,
 *   because a ledger that silently accepts junk is worse than no ledger — it
 *   reads as evidence.
 * - Append-only JSONL. Greppable, `jq`-able, survives partial writes, and never
 *   rewrites history. Lives under gitignored `.ai-workflow/`, so generated
 *   artifacts never enter git.
 * - NOTHING here is asserted that was not observed. `seedHonored` starts
 *   'unknown' and only a probe may set it — the same tri-state discipline that
 *   keeps `supportsSeed: 'claimed'` from being read as a capability.
 */

import { appendFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
// Imported for LOCAL use (line ~256 reads ASPECT_TOLERANCE) and separately
// re-exported below. `export ... from` alone creates no local binding — the
// third time that has bitten this codebase, and the second time in one session.
import { aspectDeviation, ASPECT_TOLERANCE } from './aspect.mjs';

export const RUN_DIR = '.ai-workflow/forge-runs';
export const LEDGER_FILE = join(RUN_DIR, 'runs.jsonl');

/** Bump when a field changes meaning, so old rows stay interpretable. */
export const RECORD_VERSION = 2;

/**
 * Bounded prompt storage. The ledger is an unencrypted file on disk; a record
 * should not become an unbounded sink for whatever a caller hands it. The hash
 * is computed over the FULL text, so truncation never breaks equality.
 *
 * PROVENANCE: bounded because real compiled prompts are OBSERVED at 375-410
 * characters (measured across every generation in this ledger), and the provider
 * caps prompts at 4000. 1024 leaves ~2.5x headroom over anything actually sent
 * while keeping a 1000-row ledger near 1 MB rather than unbounded. Re-derive
 * from measured prompt lengths if the compiler grows.
 */
export const PROMPT_STORE_LIMIT = 1024;

export const STATUSES = Object.freeze(['ok', 'safety-reject', 'error']);

/** Tri-state, same discipline as provider capabilities. */
export const SEED_HONORED = Object.freeze(['unknown', 'yes', 'no']);

export class RunError extends Error {
  constructor(code, message) { super(message); this.name = 'RunError'; this.code = code; }
}

/** Stable short hash of the prompt, so identical prompts are detectable. */
export function promptSha(text) {
  return createHash('sha256').update(String(text ?? ''), 'utf8').digest('hex').slice(0, 12);
}

export function newVariantId() {
  return `v_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

const ID_SHAPE = /^v_[0-9a-f]{16}$/;

// Ratio maths lives in aspect.mjs — split at the 300-line cap, and so the
// provider can get geometry without importing the persistence layer.
export { ratioToNumber } from './aspect.mjs';
export { aspectDeviation, ASPECT_TOLERANCE };

/**
 * Build a validated run record. Pure — no clock unless you omit `createdAt`,
 * no disk, no randomness unless you omit `variantId`.
 *
 * Required: briefId, provider, model, serializer, status.
 * Everything else is optional but shape-checked when present.
 */
/**
 * The invariants, in ONE place, applied to both freshly-built and already-built
 * records. Extracted after an adversarial pass found that `appendRun` trusted
 * any object carrying the right `recordVersion` stamp and skipped every check —
 * so a hand-assembled row with `status: 'garbage'` reached the ledger untouched.
 * A fail-closed validator with a trust-the-stamp bypass is not fail-closed.
 */
function assertShape(r) {
  if (!r.briefId) throw new RunError('E_RUN_INVALID', 'briefId is required — a variant with no brief cannot be compared to its siblings.');
  if (!r.provider) throw new RunError('E_RUN_INVALID', 'provider is required.');
  if (!r.model) throw new RunError('E_RUN_INVALID', 'model is required.');
  if (!r.serializer) throw new RunError('E_RUN_INVALID', 'serializer is required — it is the variable the A/B measures.');
  if (!STATUSES.includes(r.status)) {
    throw new RunError('E_RUN_INVALID', `status must be one of ${STATUSES.join('|')}, got ${JSON.stringify(r.status)}`);
  }
  if (!SEED_HONORED.includes(r.seedHonored)) {
    throw new RunError('E_RUN_INVALID', `seedHonored must be one of ${SEED_HONORED.join('|')}, got ${JSON.stringify(r.seedHonored)}`);
  }
  if (r.parentVariantId !== null && !ID_SHAPE.test(r.parentVariantId ?? '')) {
    throw new RunError('E_RUN_INVALID',
      `parentVariantId must be a variantId or null, got ${JSON.stringify(r.parentVariantId)}. `
      + 'A malformed parent silently breaks lineage, which is the one thing this record exists to preserve.');
  }
  if (!Array.isArray(r.safetyEvents)) throw new RunError('E_RUN_INVALID', 'safetyEvents must be an array.');
  if (!ID_SHAPE.test(r.variantId ?? '')) {
    throw new RunError('E_RUN_INVALID', `variantId must match ${ID_SHAPE}, got ${JSON.stringify(r.variantId)}`);
  }
  return r;
}

/**
 * Is this already a built record, or raw input that needs constructing?
 *
 * The `variantId` check is load-bearing. Without it, the obvious way to write a
 * refinement — spread the parent, clear the id, set the parent pointer — still
 * carried `recordVersion` and `promptSha`, so it was classified as ALREADY BUILT
 * and rejected for having no id. Use `refine()` rather than a spread; the spread
 * also silently inherits the parent's `createdAt`, which would date a round-two
 * variant to round one.
 */
export function isBuilt(r) {
  return Boolean(r) && r.recordVersion === RECORD_VERSION
    && typeof r.promptSha === 'string' && ID_SHAPE.test(r.variantId ?? '');
}

export function buildRecord(input = {}) {
  const {
    briefId, runId = null, parentVariantId = null,
    provider, model, brainVersion = null,
    serializer, promptText = '', seedRequested = null,
    seedHonored = 'unknown',
    aspectRequested = null, actualWidth = null, actualHeight = null,
    costUsd = null, wallMs = null, status,
    safetyEvents = [], notes = null,
  } = input;

  const variantId = input.variantId || newVariantId();
  assertShape({
    briefId, provider, model, serializer, status, seedHonored,
    parentVariantId, safetyEvents, variantId,
  });

  const deviation = aspectDeviation(aspectRequested, actualWidth, actualHeight);

  return {
    recordVersion: RECORD_VERSION,
    variantId,
    parentVariantId,
    briefId,
    runId,
    provider,
    model,
    brainVersion,
    // WHY this row exists: 'root' (first generation), 'reroll' (same prompt,
    // new dice), 'refine' (changed wording), 'probe'. Without it a bracket of
    // three options and three refinements look identical in the ledger.
    intent: input.intent || (parentVariantId ? 'refine' : 'root'),
    serializer,
    // THE PROMPT ITSELF, not only its hash. Storing `promptSha` alone let the
    // ledger identify a winner and never re-issue it — seed without prompt is
    // half a reproduction. Safe to keep: prompts are design language, the ledger
    // is gitignored, and it is never transmitted. Hash retained for grouping.
    // CAPPED: the ledger is an unencrypted on-disk file, so it stores a bounded
    // amount of whatever a caller passes. The hash below is of the FULL text, so
    // truncation never breaks equality checks.
    promptText: String(promptText ?? '').slice(0, PROMPT_STORE_LIMIT),
    promptTruncated: String(promptText ?? '').length > PROMPT_STORE_LIMIT,
    promptSha: promptSha(promptText),
    promptChars: String(promptText ?? '').length,
    seedRequested,
    seedHonored,
    aspectRequested,
    actualWidth,
    actualHeight,
    // Recorded as a ratio number, not a "16:9" string: providers clamp to their
    // own tiers, so the returned shape frequently has no clean ratio name.
    actualAspect: (actualWidth && actualHeight) ? Number((actualWidth / actualHeight).toFixed(4)) : null,
    aspectDeviation: deviation === null ? null : Number(deviation.toFixed(4)),
    aspectOutOfTolerance: deviation === null ? null : deviation > ASPECT_TOLERANCE,
    costUsd,
    wallMs,
    status,
    safetyEvents,
    /**
     * WHERE THE IMAGE ACTUALLY IS. Without this the ledger is decorative: a UI
     * cannot render a row it has no artifact for, so whoever builds the Create
     * surface would invent their own provenance and bypass this record entirely.
     *
     * Every image generated before this field was populated — five of them,
     * about two cents — was hashed, measured, and thrown away. The system could
     * describe what it made and could not show it.
     */
    /**
     * THE HUMAN'S VERDICT. `pick` used to only PRINT — the loop described a
     * choice and never recorded one, so the one quality signal this system has
     * (Sean's eye) evaporated the moment the terminal scrolled. Marking it makes
     * "which options actually get chosen" a queryable fact, which is the only
     * honest path to knowing whether the law filter correlates with taste.
     */
    winner: input.winner === true,
    imageRef: input.imageRef ?? null,
    imageSha: input.imageSha ?? null,
    imageBytes: input.imageBytes ?? null,
    // `outputPath` was removed at RECORD_VERSION 2: it was populated by nothing
    // and `imageRef` supersedes it. Two fields naming one thing is how the
    // aspect-ratio defect started.
    notes,
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

/**
 * Append a validated record. Creates the ledger directory on first use.
 *
 * An already-built record is re-VALIDATED but not re-BUILT: rebuilding would
 * recompute `promptSha` from a `promptText` the built record no longer carries,
 * silently replacing a real hash with the hash of an empty string.
 */
export function appendRun(record, root = process.cwd()) {
  const valid = isBuilt(record) ? assertShape(record) : buildRecord(record);
  mkdirSync(join(root, RUN_DIR), { recursive: true });
  appendFileSync(join(root, LEDGER_FILE), `${JSON.stringify(valid)}\n`, 'utf8');
  return valid;
}

/**
 * Read the ledger. A corrupt line is SKIPPED and counted, never thrown on — a
 * half-written final row from an interrupted run must not make the whole history
 * unreadable. The skip count is returned so the damage is visible rather than
 * quietly swallowed.
 */
export function readRuns(root = process.cwd()) {
  const p = join(root, LEDGER_FILE);
  if (!existsSync(p)) return { runs: [], skipped: 0 };
  const runs = [];
  let skipped = 0;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { runs.push(JSON.parse(line)); } catch { skipped += 1; }
  }
  return { runs, skipped };
}

/**
 * Record a human's pick. Annotates an existing row rather than appending a new
 * one: a verdict is not a generation, and appending would inflate the spend
 * ledger with rows that cost nothing. Siblings in the same run are UNMARKED, so
 * "the winner" stays singular per run.
 */
export function markWinner(variantId, root = process.cwd()) {
  const p = join(root, LEDGER_FILE);
  if (!existsSync(p)) throw new RunError('E_RUN_INVALID', 'No ledger to mark.');
  const { runs } = readRuns(root);
  const target = runs.find((r) => r.variantId === variantId);
  if (!target) throw new RunError('E_RUN_INVALID', `No variant ${variantId}.`);

  const out = readFileSync(p, 'utf8').split('\n').map((line) => {
    if (!line.trim()) return line;
    try {
      const row = JSON.parse(line);
      if (row.variantId === variantId) return JSON.stringify({ ...row, winner: true });
      // Same run, different variant: it lost. Explicit, so a stale winner from
      // an earlier pick cannot linger beside the new one.
      if (target.runId && row.runId === target.runId) return JSON.stringify({ ...row, winner: false });
      return line;
    } catch { return line; }
  }).join('\n');
  writeFileSync(p, out, 'utf8');
  return { ...target, winner: true };
}

/**
 * Walk a variant back to its root. This is what `parentVariantId` buys: the
 * answer to "how did we get to this image", which a flat list of outputs cannot
 * give. Cycle-guarded — a malformed ledger must not hang a caller.
 */
export function lineage(variantId, runs) {
  const byId = new Map(runs.map((r) => [r.variantId, r]));
  const chain = [];
  const seen = new Set();
  let cur = byId.get(variantId);
  while (cur && !seen.has(cur.variantId)) {
    seen.add(cur.variantId);
    chain.push(cur);
    cur = cur.parentVariantId ? byId.get(cur.parentVariantId) : null;
  }
  return chain;
}


