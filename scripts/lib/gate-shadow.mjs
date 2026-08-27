/**
 * gate-shadow.mjs — turn a blocking gate into a measuring gate, for a fixed window.
 * ================================================================================
 * WHY THIS EXISTS. Four hostile seats reviewed why this repo's agent hedges instead of
 * shipping. Round 1 agreed: instrument the gates, then cut with data. In round 2 the
 * lead seat refused its own consensus —
 *
 *   "pure instrument-then-cut is itself becoming a procrastination mechanism, and
 *    several cuts need zero telemetry."                              — ox-alpha
 *
 * — and then dissolved the disagreement rather than picking a side. GLM wanted the
 * closeout gates retired now; DeepSeek warned that two of them catch real defects and
 * removal would be blind. SHADOW MODE gives both: the gate still runs, still evaluates,
 * still records what it WOULD have blocked — it just stops blocking. DeepSeek gets the
 * true-positive data. Sean gets his turns back today.
 *
 * THE EXPIRY IS THE POINT. This repo's defining failure is that nothing is ever retired:
 * 73 rules, 103 KB of them, a repealed tombstone still loaded into every turn. A shadow
 * window with no end date would become another permanent un-retired thing — so the
 * window carries a date, and past it the gates BLOCK AGAIN ON THEIR OWN. Extending is a
 * deliberate act with a diff, not a default.
 *
 * FAIL-CLOSED-TO-NORMAL, deliberately. Every failure path in this file falls back to the
 * gate's ORIGINAL blocking behaviour. A telemetry helper that accidentally disables a
 * gate would be the worst possible bug here: silent un-protection, which is the exact
 * class this project keeps rediscovering. If config is missing, unreadable, malformed,
 * expired, or the clock is unreadable — the gate blocks, as it did before this file.
 */
import { readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Config and telemetry paths are OVERRIDABLE, and the reason is a self-inflicted wound.
 *
 * The first test suite for this module swapped the LIVE `.ai-workflow/gate-mode.json`
 * in and out to exercise each config shape. One restore failed on Windows and left the
 * repo's real enforcement config as a leftover test fixture — `until: 99999999999999`,
 * a shadow window lasting until the year 5138. A test that mutates live enforcement
 * state is a worse defect than the gap it was written to close.
 *
 * Overriding the path costs nothing in safety: the SHADOWABLE allowlist lives in CODE,
 * so pointing at a different config grants no power that editing the real one would not
 * already grant. It buys hermetic tests, which is the whole point.
 */
const CONFIG = process.env.SWAN_GATE_CONFIG || join(ROOT, '.ai-workflow', 'gate-mode.json');
const TELEMETRY = process.env.SWAN_GATE_TELEMETRY || join(ROOT, '.ai-workflow', 'gate-telemetry.jsonl');

/**
 * The ONLY hooks that may ever be shadowed. An allowlist, in code, on purpose.
 *
 * Found by attacking this module's first version: adding one line to
 * `.ai-workflow/gate-mode.json` made `isShadowed('egress-privacy-gate')` return true —
 * a JSON edit that could switch off the Rule 8 PII gate. It was not exploitable that
 * day, because only the three closeout gates route through `emit()` and the PII gate
 * still returned rc 2 with itself shadow-listed. It was a landmine, not a hole: the
 * moment anyone routes a compliance gate through `emit()` — an entirely natural
 * refactor — the config silently gains the power to disable it.
 *
 * The first version "prevented" this with a sentence in the config file explaining
 * that compliance gates must not be shadowed. That is lore. This is the mechanism.
 *
 * The property that matters: **shadowing now requires a CODE change, reviewed in a
 * diff, not merely a config edit.** The config selects from this list; it cannot
 * extend it. A gate not named here is unshadowable no matter what any file says.
 *
 * Compliance gates — PII egress, spend, secrets, destructive-git, blast-radius —
 * are deliberately absent and must stay absent.
 */
export const SHADOWABLE = new Set([
  'dual-tier-gate',
  'hermes-closeout-gate',
  'linear-sync-gate',
  'backup-after-work',
]);

/**
 * Is this hook currently in shadow mode?
 *
 * Returns false for every ambiguous case. The only path to `true` is a hook on the
 * SHADOWABLE allowlist, named by a well-formed config, whose `until` is in the future.
 */
export function isShadowed(hookName, now = new Date()) {
  // Allowlist first, before any file is read. A gate that is not shadowable cannot be
  // made shadowable by anything on disk.
  if (!SHADOWABLE.has(hookName)) return false;

  // ESCAPE HATCH FOR TESTS, and the reason it exists.
  //
  // Shadowing is read from a config file, so the moment it went live a test that spawns
  // the real hook and asserts on its block output started failing — it was suddenly
  // measuring operational config rather than gate logic. A test whose verdict changes
  // when someone edits a JSON file is not a test of the gate.
  //
  // Suites set SWAN_GATE_FORCE_NORMAL=1 to pin the ORIGINAL blocking behaviour. It only
  // ever makes a gate stricter, so it cannot be used to sneak past one.
  if (process.env.SWAN_GATE_FORCE_NORMAL === '1') return false;

  let cfg;
  try {
    cfg = JSON.parse(readFileSync(CONFIG, 'utf-8'));
  } catch {
    return false; // absent or malformed -> normal blocking behaviour
  }
  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) return false;
  if (!Array.isArray(cfg.shadow) || !cfg.shadow.includes(hookName)) return false;

  // An undated window is a permanent window. Refuse it.
  const until = Date.parse(cfg.until);
  if (!Number.isFinite(until)) return false;
  return now.getTime() < until;
}

/**
 * Record what happened. Never throws, never blocks the turn.
 *
 * `would_block` is the field the whole exercise exists to produce: at the end of the
 * window, a hook with zero `would_block: true` entries has never fired in anger and can
 * be retired on evidence rather than on argument.
 */
export function record(entry) {
  try {
    mkdirSync(dirname(TELEMETRY), { recursive: true });
    appendFileSync(TELEMETRY, JSON.stringify(entry) + '\n', 'utf-8');
  } catch { /* telemetry must never be the reason a turn fails */ }
}

/** Alias used by emit(), which supplies its own outer guard. */
const recordSafe = record;

/**
 * Strip anything that must never reach an LLM from a telemetry reason string.
 *
 * Measured before writing this: 112 records, 45 with reasons, 8 distinct prefixes,
 * 0 PII hits — the reasons ARE static gate templates today. This is not a response to
 * a leak; it is the enforcement that was missing behind an assumption. The telemetry
 * store is gitignored but exists to be read later, plausibly by a model, and the
 * zero-PII-to-LLMs rule is binding regardless of how clean today's sample looks.
 *
 * Patterns match REAL values, not the pattern-source that legitimately appears in
 * de-identification code. Repo-relative paths are deliberately preserved — they carry
 * no personal data and are the most useful part of a reason when classifying a fire.
 */
export function redact(text) {
  return String(text)
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.(com|net|org|io|co|edu|gov|ca|uk)\b/g, '<redacted-email>')
    .replace(/(?:\+1[-.\s]?)?(?:\(\d{3}\)\s?|\b\d{3}[-.])\d{3}[-.]\d{4}\b/g, '<redacted-phone>')
    .replace(/\b(sk-[A-Za-z0-9]{20,}|[rs]k_(?:live|test)_[A-Za-z0-9]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|xox[baprs]-[0-9A-Za-z-]{10,}|AIza[0-9A-Za-z_-]{30,})/g, '<redacted-key>')
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '<redacted-jwt>')
    .replace(/\b[A-Z]:[\\/]Users[\\/][A-Za-z0-9._-]+/g, '<redacted-userpath>')
    .replace(/\/(?:home|Users)\/[A-Za-z0-9._-]{2,}/g, '<redacted-userpath>');
}

/**
 * The single call a gate makes when it has decided to block.
 *
 * Normal mode  -> writes the harness block JSON to stdout (unchanged behaviour).
 * Shadow mode  -> writes NOTHING to stdout, so the turn proceeds; the reason goes to
 *                 stderr as a visible notice, and the event is logged.
 *
 * Passing a falsy `reason` means the gate decided to ALLOW; that is recorded too, so the
 * denominator (how often each gate ran without firing) is measurable rather than assumed.
 *
 * @param {string} hookName  e.g. 'dry-loop-gate'
 * @param {string|null} reason  block reason, or null/'' when allowing
 * @param {{startedAt?: number}} opts
 */
export function emit(hookName, reason, opts = {}) {
  // THE BLOCK WRITE MUST BE UNCONDITIONALLY REACHABLE.
  //
  // Every caller wraps this function in `try { emit(...) } catch { /* fail-open */ }`.
  // That catch predates shadow mode and is correct for a gate — but it means ANY throw
  // inside this function converts a gate that decided to BLOCK into a silent pass. The
  // first version of this file carried a comment promising "any failure inside the
  // emitter falls back to blocking exactly as before." That comment was false: the
  // enclosing catch fails OPEN, so a throw here allowed the turn.
  //
  // Found by ox-alpha reasoning from the design alone, without seeing the code. It was
  // right, and the comment asserting the opposite is exactly the kind of confident
  // documentation this repo keeps mistaking for a mechanism.
  //
  // Structure now guarantees the contract: everything that can throw runs inside its
  // own guard, and the stdout write is the LAST statement, reached even if all of the
  // prelude fails. Shadow mode can only ever suppress the block on a path that
  // completed successfully.
  let wouldBlock = false;
  try {
    wouldBlock = Boolean(reason && String(reason).trim());
  } catch {
    // A reason that cannot even be stringified (a Symbol, a throwing toString) is
    // still a decision to block. Treat it as one.
    wouldBlock = true;
  }

  let shadowed = false;
  try {
    shadowed = wouldBlock && isShadowed(hookName);
  } catch {
    shadowed = false; // any surprise -> behave exactly as before
  }

  try {
    recordSafe({
    ts: new Date().toISOString(),
    hook: hookName,
    fired: wouldBlock,
    would_block: wouldBlock,
    blocked: wouldBlock && !shadowed,
    shadowed,
      latency_ms: opts.startedAt ? Date.now() - opts.startedAt : null,
      // The reason is what a human classifies later as real-catch vs wrongful-block,
      // so it is kept — truncated, and REDACTED. Gate reasons are static guidance
      // templates today (measured: 112 records, 8 distinct prefixes, 0 PII hits), but
      // some interpolate turn-derived values such as file paths, and nothing enforced
      // that they stay clean. This store is gitignored yet may later be summarised by
      // an LLM, which would violate the binding zero-PII-to-LLMs rule. Redacting at
      // WRITE time is the only point where that is guaranteed.
      reason: wouldBlock ? redact(String(reason).slice(0, 400)) : null,
    });
  } catch { /* telemetry must never be the reason a turn fails */ }

  if (!wouldBlock) return;

  if (shadowed) {
    try {
      process.stderr.write(
        `[${hookName}] SHADOW MODE — this would have blocked the turn. Not blocking.\n` +
        `  Logged to .ai-workflow/gate-telemetry.jsonl for the retire/keep decision.\n` +
        `  Reason: ${String(reason).split('\n')[0].slice(0, 160)}\n`
      );
    } catch { /* a failed notice must not resurrect the block */ }
    return;
  }

  // LAST STATEMENT, deliberately. Reached even if every guard above failed.
  process.stdout.write(JSON.stringify({ decision: 'block', reason }));
}
