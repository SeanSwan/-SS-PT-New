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
const CONFIG = join(ROOT, '.ai-workflow', 'gate-mode.json');
const TELEMETRY = join(ROOT, '.ai-workflow', 'gate-telemetry.jsonl');

/**
 * Is this hook currently in shadow mode?
 *
 * Returns false for every ambiguous case. The only path to `true` is a well-formed
 * config that names this hook AND carries an `until` date still in the future.
 */
export function isShadowed(hookName, now = new Date()) {
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
  const wouldBlock = Boolean(reason && String(reason).trim());
  let shadowed = false;
  try {
    shadowed = wouldBlock && isShadowed(hookName);
  } catch {
    shadowed = false; // any surprise -> behave exactly as before
  }

  record({
    ts: new Date().toISOString(),
    hook: hookName,
    fired: wouldBlock,
    would_block: wouldBlock,
    blocked: wouldBlock && !shadowed,
    shadowed,
    latency_ms: opts.startedAt ? Date.now() - opts.startedAt : null,
    // The reason is what a human classifies later as real-catch vs wrongful-block, so it
    // is kept — truncated, because some gate messages are several hundred lines.
    reason: wouldBlock ? String(reason).slice(0, 400) : null,
  });

  if (!wouldBlock) return;

  if (shadowed) {
    process.stderr.write(
      `[${hookName}] SHADOW MODE — this would have blocked the turn. Not blocking.\n` +
      `  Logged to .ai-workflow/gate-telemetry.jsonl for the retire/keep decision.\n` +
      `  Reason: ${String(reason).split('\n')[0].slice(0, 160)}\n`
    );
    return;
  }
  process.stdout.write(JSON.stringify({ decision: 'block', reason }));
}
