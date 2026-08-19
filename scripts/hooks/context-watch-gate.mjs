/**
 * context-watch-gate.mjs — deterministic Stop hook enforcing the handoff half of Rule 83.
 *
 * WHY (Sean, 2026-08-17): "I already have this skill, but it's not doing nothing. It's not
 * firing. It's like, just in the CLAUDE.md and the AGENTS.md, but it needs to be a skill
 * that forces, like, a hook to happen — so if we guarantee that this is going to happen."
 *
 * He is describing the exact failure mode Rule 57 hit, and the Hermes outbox hit at n=443:
 * a duty enforced only by the model remembering is a duty that will eventually be dropped.
 * Prose in a constitution does not fire. A Stop hook fires.
 *
 * WHAT IT IS FOR: a long chat costs more per turn and eventually compacts, and compaction
 * silently drops context. Sean's ask is to catch the session at a chosen sweet spot (~70%)
 * and convert it into a clean handoff + fresh session, so the subscription is spent on work
 * rather than on re-reading a bloated transcript.
 *
 * CONTRACT (Claude Code Stop hook, type "command" — same shape as dual-tier-gate):
 *   stdin  = { stop_hook_active, transcript_path, session_id, ... }
 *   allow  = exit 0, no output;  block = exit 0 + stdout {decision:"block", reason}
 *
 * DECISION RULES:
 *   1. stop_hook_active                    -> allow (no-loop guard)
 *   2. transcript unreadable / no usage    -> allow (FAIL-OPEN; a broken gate must never
 *                                             wedge a session — same doctrine as the others)
 *   3. usage below the advise threshold    -> allow
 *   4. already fired at this tier          -> allow (escalate, never nag)
 *   5. otherwise                           -> BLOCK with the handoff instruction
 *
 * WINDOW DETECTION IS SELF-CALIBRATING, deliberately. The transcript records the model as
 * `claude-opus-5` with no `[1m]` suffix, so the context window cannot be read directly, and
 * guessing wrong is the one failure that matters: assuming 200k on a 1M session would scream
 * "you are at 174%" and demand a handoff every single turn. So infer the window as the
 * smallest standard window the observed usage actually fits in. Underclaiming the window can
 * only DELAY a handoff; overclaiming would spam one. Delay is the safe error.
 * `SWAN_CONTEXT_WINDOW` overrides when you know better.
 *
 * Two tiers so the reminder escalates rather than repeats: ADVISE at 70%, URGENT at 85%.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

export const STANDARD_WINDOWS = [200_000, 1_000_000];
export const ADVISE_PCT = Number(process.env.SWAN_CONTEXT_ADVISE_PCT || 70);
export const URGENT_PCT = Number(process.env.SWAN_CONTEXT_URGENT_PCT || 85);
const STATE_DIR = '.ai-workflow/context-watch';

/**
 * Last assistant usage IS the current context size: prompt + both cache legs.
 * Walks backwards so the newest wins; tolerates malformed lines.
 */
export function currentUsage(text) {
  if (!text) return null;
  const lines = text.split('\n');
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i].trim();
    if (!line || !line.includes('"usage"')) continue;
    try {
      const u = JSON.parse(line)?.message?.usage;
      if (!u) continue;
      const used = (u.input_tokens || 0)
        + (u.cache_creation_input_tokens || 0)
        + (u.cache_read_input_tokens || 0);
      if (used > 0) return used;
    } catch { /* skip malformed line */ }
  }
  return null;
}

export function inferWindow(used, override = Number(process.env.SWAN_CONTEXT_WINDOW || 0)) {
  if (override > 0) return override;
  for (const w of STANDARD_WINDOWS) if (used < w * 0.95) return w;
  return STANDARD_WINDOWS[STANDARD_WINDOWS.length - 1];
}

/** Pure decision: returns null to allow, or {tier, pct, used, window} to block. */
export function decide({ used, window, alreadyFired = [] }) {
  if (!used || !window) return null;
  const pct = Math.round((used / window) * 1000) / 10;
  const tier = pct >= URGENT_PCT ? 'urgent' : pct >= ADVISE_PCT ? 'advise' : null;
  if (!tier || alreadyFired.includes(tier)) return null;
  return { tier, pct, used, window };
}

export function reasonFor({ tier, pct, used, window }) {
  const k = (n) => `${Math.round(n / 1000)}k`;
  const head = tier === 'urgent'
    ? `CONTEXT ${pct}% of ~${k(window)} — URGENT. Compaction is close, and compaction silently drops context.`
    : `CONTEXT ${pct}% of ~${k(window)} (${k(used)} used) — the handoff sweet spot Sean set (~${ADVISE_PCT}%).`;
  return `${head}\n\n`
    + 'Rule 83 / the `handoff` skill: do NOT let this session drift into a compaction that loses '
    + 'the early context. Right now, in this turn:\n'
    + '  1. Finish or safely park the slice in flight — never abandon it mid-edit.\n'
    + '  2. Load the `handoff` skill and produce the cold-start handoff: harvest the WHOLE '
    + "conversation (first message forward, not the tail), RE-DERIVE every number from a live "
    + "command, gap-analyse against Sean's vision, and end with the paste-ready agent prompt.\n"
    + '  3. Tell Sean plainly that it is time to start a fresh session, and give him the file path.\n\n'
    + 'If a handoff for this work already exists and is current, say so in one line and stop — '
    + 'this gate fires once per tier per session, so it will not nag you again at this level.';
}

function statePath(sessionId) {
  return join(STATE_DIR, `${String(sessionId || 'unknown').replace(/[^\w.-]/g, '_')}.json`);
}

function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return; // fail-open
  }
  if (!input || input.stop_hook_active) return;

  let text = null;
  try {
    text = readFileSync(input.transcript_path, 'utf8');
  } catch {
    return; // fail-open
  }

  const used = currentUsage(text);
  if (!used) return;
  const window = inferWindow(used);

  const sp = statePath(input.session_id);
  let state = { fired: [] };
  try { state = JSON.parse(readFileSync(sp, 'utf8')); } catch { /* first fire */ }

  const verdict = decide({ used, window, alreadyFired: state.fired || [] });
  if (!verdict) return;

  try {
    mkdirSync(dirname(sp), { recursive: true });
    writeFileSync(sp, JSON.stringify({ fired: [...(state.fired || []), verdict.tier], ...verdict }));
  } catch { /* state is best-effort; never block on it */ }

  process.stdout.write(JSON.stringify({ decision: 'block', reason: reasonFor(verdict) }));
}

// Only run when invoked directly, so the test can import the pure parts.
if (process.argv[1] && process.argv[1].endsWith('context-watch-gate.mjs')) main();
