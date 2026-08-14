/**
 * receiptV1.mjs — allowlisted, structured audit record for the CONSULT lane (S0 of the flywheel).
 * ===============================================================================================
 * WHY THIS EXISTS, AND WHY IT IS NOT `receipt.mjs`:
 * `writeReceipt` (receipt.mjs) serves the PACKET lane — it needs a real manifest (question, headSha,
 * per-window tier/sha/line-ranges) and a citation audit. The consult lane has neither: it builds a
 * `pseudoManifest` of `{id, path}` only, and never audits citations. Passing that to `writeReceipt`
 * emits `undefined` for every window field and throws on `audit.invalid.length`. That mismatch is
 * producer/consumer schema drift, so the consult lane gets its own record type instead of a forced
 * reuse. (Diagnosed 2026-08-13; the two lanes stay separate on purpose.)
 *
 * ALLOWLIST — this is the security contract, enforced by construction in `buildReceiptV1`:
 *   RECORDED: provider/model/ceiling, effort, token counts, cost, wall time, spend estimate+cap,
 *             redaction COUNT and KIND LABELS, content SHA-256 + byte length, outcome + error code,
 *             event/attempt IDs, originating-model provenance tag.
 *   NEVER RECORDED: prompts, responses, model reasoning, document or seed CONTENT, free text of any
 *             kind, or absolute filesystem paths. The object is assembled field-by-field from an
 *             explicit list — a caller cannot widen it by passing extra keys.
 *
 * PATHS ARE DELIBERATELY NOT STORED VERBATIM. The consult lane accepts any `--document`, including
 * one outside the repo (e.g. a temp dir under a user's home), so a raw path can carry the OS
 * username — quasi-PII under Rule 8. `relativizePath` emits a repo-relative path when the file is
 * inside the repo and the literal `<external>` when it is not. Content identity is preserved by
 * `sha256` instead, which is what dedup and idempotency actually need.
 *
 * ONE FILE PER EVENT, never an appended log: concurrent consults (this repo runs three at once)
 * would interleave or truncate a shared JSONL. A fresh filename per event is atomic on every OS and
 * aggregates trivially.
 *
 * THIS STORE IS APPEND-ONLY, NOT DEDUPLICATED. `eventId` distinguishes concurrent or differently-
 * parameterized calls that share a wall-clock second; it does NOT collapse retries. `stamp` is part
 * of the hash and advances every run, so a retry minutes later is a SEPARATE record — which is the
 * right behaviour for an audit log (you want both attempts) but is NOT idempotency. An earlier
 * version of this header claimed "a retry of the SAME attempt overwrites its own record"; that was
 * false, and `attempt` was never wired by any caller. Removed rather than half-implemented — the
 * commit that added this module exists to delete exactly that class of untrue doc claim (Rule 75).
 * `attempt` remains an optional caller-supplied field for when retries are genuinely automated;
 * today every production caller leaves it at 1.
 *
 * PURE + CALLER-STAMPED: no `Date.now()` here (matching receipt.mjs) so the writer stays
 * deterministic and testable; the caller supplies `stamp`.
 *
 * @module context-gateway/receiptV1
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { relativizePath } from './paths.mjs';

export const RECEIPT_SCHEMA = 'ReceiptV1';

/** Outcome enum — bounded on purpose; anything unrecognized normalizes to 'error'. */
export const OUTCOMES = Object.freeze(['ok', 'refused', 'error']);

/**
 * Error-code enum. It covers ProviderError, consult-lane exits, and panel schema/abort failures.
 * Unknown input normalizes to 'UNKNOWN'.
 */
export const ERROR_CODES = Object.freeze([
  'UNKNOWN_PROVIDER', 'CEILING', 'SPEND_CAP', 'NO_CAP', 'NO_KEY', 'TRANSPORT',
  // DENY_PATH has no ProviderError equivalent: that branch exits directly from consult.mjs rather
  // than throwing, so it is recorded at the call site. It is the secret-bearing-path jail firing.
  'DENY_PATH', 'BAD_OUTPUT', 'TRUNCATED', 'PANEL_ABORT', 'ADJUDICATION_INCOMPLETE', 'UNKNOWN',
]);

const PANEL_STAGES = Object.freeze(['opus-first', 'fanout', 'adjudication', 'opus-verify']);

/**
 * Redaction class labels egress.mjs can emit. The header calls these "a bounded class name"; this
 * enum makes that true BY CONSTRUCTION rather than by trusting the caller, matching how OUTCOMES and
 * ERROR_CODES are already handled. An unrecognized label normalizes to 'OTHER' — so a future rule
 * added to egress.mjs degrades to a safe bucket instead of writing an arbitrary string into the
 * record. Deliberately labels only: a KIND is a category, never the matched value.
 */
export const REDACTION_KINDS = Object.freeze([
  'JWT', 'PRIVATE_KEY', 'STRIPE', 'STRIPE_WHSEC', 'OPENAI', 'GOOGLE', 'SLACK', 'TELEGRAM',
  'DB_URL', 'HTTP_AUTH_URL', 'AWS_AKID', 'GITHUB', 'GITHUB_PAT', 'ANTHROPIC', 'EMAIL', 'SSN', 'OTHER',
]);

export const sha256 = (s) => createHash('sha256').update(String(s ?? ''), 'utf8').digest('hex');

// Re-exported from paths.mjs so this module's public surface is unchanged for existing callers and
// tests, while the escape policy lives in exactly ONE place. Previously this file used a blunt
// `startsWith('..')` while consult.mjs used a precise separator-aware check — two policies for one
// threat, which is how a fix lands in only one of them (Kimi round 6, S6).
export { relativizePath } from './paths.mjs';

const num = (v) => (Number.isFinite(v) ? v : null);
const oneOf = (list, v, fallback) => (list.includes(v) ? v : fallback);

/**
 * Build the allowlisted record. Pure — no I/O, no clock. Every field is copied explicitly, so an
 * unexpected key on any input object (a whole prompt hiding on `result.text`, for instance) cannot
 * reach the output.
 */
export function buildReceiptV1({
  stamp, root, providerName, provider = {}, result = {}, spend = {}, effort = null,
  maxTokens = null, docPath = null, seedPath = null, docSha = null, docBytes = null,
  redactions = 0, redactionKinds = [], outcome = 'ok', errorCode = null,
  originatingModel = null, attempt = 1, panelRunId = null, panelStage = null,
  findingsRaised = null, findingsUpheld = null,
}) {
  const normalizedOutcome = oneOf(OUTCOMES, outcome, 'error');
  const normalizedError = errorCode == null ? null : oneOf(ERROR_CODES, errorCode, 'UNKNOWN');
  const docRel = relativizePath(root, docPath);
  const seedRel = relativizePath(root, seedPath);

  // Distinguishes calls that share a wall-clock second. The stamp is only second-granular, so two
  // GENUINELY different calls (same doc, same provider, different --effort) inside one second would
  // otherwise collide on eventId AND filename, silently losing one record. This is collision
  // avoidance, NOT deduplication — see the append-only note in the module header.
  const eventId = sha256(
    [stamp, providerName, docSha ?? '', String(attempt), effort ?? '', String(maxTokens ?? ''),
      normalizedOutcome, panelRunId ?? '', panelStage ?? ''].join('|'),
  ).slice(0, 16);

  return {
    schema: RECEIPT_SCHEMA,
    eventId,
    attempt: num(attempt) ?? 1,
    stamp,
    lane: 'consult',
    provider: providerName ?? null,
    model: result.model ?? provider.model ?? null,
    ceiling: provider.ceiling ?? null,
    effort: effort ?? null,
    maxTokens: num(maxTokens),
    outcome: normalizedOutcome,
    errorCode: normalizedError,
    finishReason: result.finishReason ?? null,
    inTok: num(result.inTok),
    outTok: num(result.outTok),
    costUsd: num(result.cost),
    wallMs: num(result.wallMs),
    spendEstimateUsd: num(spend.estimate),
    spendCapUsd: num(spend.cap),
    redactions: num(redactions) ?? 0,
    // Kind LABELS only ('EMAIL', 'JWT') — a bounded class name, never the matched value. Normalized
    // against REDACTION_KINDS so an unknown label becomes 'OTHER' rather than arbitrary caller text.
    redactionKinds: Array.isArray(redactionKinds)
      ? [...new Set(redactionKinds.map((k) => oneOf(REDACTION_KINDS, String(k), 'OTHER')))]
      : [],
    docPath: docRel,
    seedPath: seedRel,
    docSha: docSha ?? null,
    docBytes: num(docBytes),
    originatingModel: originatingModel ?? null,
    panelRunId: /^[a-f0-9]{16,64}$/i.test(String(panelRunId ?? '')) ? panelRunId : null,
    panelStage: oneOf(PANEL_STAGES, panelStage, null),
    findingsRaised: num(findingsRaised),
    findingsUpheld: num(findingsUpheld),
  };
}

/** Filename segments are sanitized, not trusted: this is exported public API, so a provider name
 * or stamp containing `../` must never escape the receipts directory. Today's only caller passes
 * safe values; the guard makes that independent of the caller. */
const safeSeg = (s) => String(s ?? '').replaceAll(/[^A-Za-z0-9_-]/g, '') || 'unknown';

/** Write one JSON record. Returns its path. Directory matches the packet lane's receipts store. */
export function writeReceiptV1(record, root) {
  const dir = join(root, '.ai-workflow', 'context-gateway', 'receipts');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${safeSeg(record.stamp)}-${safeSeg(record.provider)}-${safeSeg(record.eventId)}.json`);
  writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`, 'utf-8');
  return file;
}

/**
 * Build + write in one call. NEVER throws: a telemetry failure must not take down a consult that
 * already succeeded and already cost money. Returns the path, or null when recording failed.
 */
export function recordConsult(args) {
  try {
    return writeReceiptV1(buildReceiptV1(args), args.root);
  } catch (e) {
    // Never throw — but never fail INVISIBLY either. A schema regression or a permissions change on
    // the store would otherwise produce zero receipts and zero signal, and "no data" would read as
    // "no events" — the same absence-is-not-a-fact trap this whole slice exists to close (r4 N3).
    // Class only: an error message can embed filesystem paths, and Rule 59 applies to telemetry too.
    console.error(`[receiptV1] record failed (${e?.constructor?.name ?? 'Error'}) — consult unaffected`);
    return null;
  }
}
