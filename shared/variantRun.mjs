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

import { appendFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const RUN_DIR = '.ai-workflow/forge-runs';
export const LEDGER_FILE = join(RUN_DIR, 'runs.jsonl');

/** Bump when a field changes meaning, so old rows stay interpretable. */
export const RECORD_VERSION = 1;

export const STATUSES = Object.freeze(['ok', 'safety-reject', 'error']);

/** Tri-state, same discipline as provider capabilities. */
export const SEED_HONORED = Object.freeze(['unknown', 'yes', 'no']);

class RunError extends Error {
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

/**
 * Parse "16:9" into a number. Returns null for anything that is not a ratio,
 * rather than a plausible-looking wrong number — the lesson from a dimension
 * parser that read a JPEG with PNG offsets and reported 65536x4293722192
 * without complaint. A confident wrong answer is worse than an admitted gap.
 */
export function ratioToNumber(ratio) {
  const m = /^(\d{1,3}):(\d{1,3})$/.exec(String(ratio ?? '').trim());
  if (!m) return null;
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (!w || !h) return null;
  return w / h;
}

/**
 * Fractional difference between what was asked for and what came back.
 * Returns null when either side is unknown — an unmeasurable deviation must not
 * masquerade as a measured zero.
 */
export function aspectDeviation(requestedRatio, actualWidth, actualHeight) {
  const want = ratioToNumber(requestedRatio);
  if (!want || !actualWidth || !actualHeight) return null;
  const got = actualWidth / actualHeight;
  return Math.abs(got - want) / want;
}

/**
 * Deviation above this is worth telling a human about. Not an error.
 *
 * CALIBRATION, stated because it is not obvious: ordinary provider clamping sits
 * BELOW this line and is therefore recorded but not alarmed on. Gemini answering
 * a 16:9 request with 1376x768 is a measured 0.78% deviation — real, harmless,
 * and not worth a warning on every single generation. What this flag is for is
 * the wrong-SHAPE case: a 1024x1024 square returned for a cinematic brief is
 * 43.75% off, and that went undetected for an entire session because nothing
 * ever compared the request to the response.
 *
 * `actualWidth`/`actualHeight`/`actualAspect` are recorded unconditionally, so
 * sub-tolerance clamping is always visible to anyone who looks — it just does
 * not shout.
 */
export const ASPECT_TOLERANCE = 0.01;

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
function isBuilt(r) {
  return Boolean(r) && r.recordVersion === RECORD_VERSION
    && typeof r.promptSha === 'string' && ID_SHAPE.test(r.variantId ?? '');
}

/**
 * Derive a child variant from a winner. THE sanctioned way to build round N+1.
 *
 * Inherits only what identifies the lineage and the setup (brief, provider,
 * model, serializer) and deliberately does NOT inherit per-generation facts —
 * cost, latency, measured dimensions, status, safety events. Those describe an
 * image that has not been made yet, and copying them forward would let a child
 * inherit its parent's evidence.
 */
export function refine(parent, changes = {}) {
  if (!isBuilt(parent)) {
    throw new RunError('E_RUN_INVALID',
      'refine() needs a built parent record with a valid variantId — pass the winner from readRuns(), not raw input.');
  }
  return buildRecord({
    briefId: parent.briefId,
    runId: parent.runId,
    provider: parent.provider,
    model: parent.model,
    brainVersion: parent.brainVersion,
    serializer: parent.serializer,
    // Inherited so a plain re-roll (same prompt, new seed) is one call. Pass
    // `promptText` in `changes` to actually change the wording.
    promptText: parent.promptText,
    ...changes,
    parentVariantId: parent.variantId,
    variantId: undefined,      // always a fresh identity
    createdAt: changes.createdAt,
  });
}

export function buildRecord(input = {}) {
  const {
    briefId, runId = null, parentVariantId = null,
    provider, model, brainVersion = null,
    serializer, promptText = '', seedRequested = null,
    seedHonored = 'unknown',
    aspectRequested = null, actualWidth = null, actualHeight = null,
    costUsd = null, wallMs = null, status,
    safetyEvents = [], outputPath = null, notes = null,
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
    serializer,
    // THE PROMPT ITSELF, not only its hash. Storing `promptSha` alone let the
    // ledger identify a winner and never re-issue it — seed without prompt is
    // half a reproduction. Safe to keep: prompts are design language, the ledger
    // is gitignored, and it is never transmitted. Hash retained for grouping.
    promptText: String(promptText ?? ''),
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
    outputPath,
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

export { RunError };
