#!/usr/bin/env node
/**
 * closeout-gate.mjs — ONE turn boundary instead of seven.
 * =====================================================================
 * WHY THIS EXISTS. Seven separate Stop hooks were registered, each able to
 * block independently and each blocking ONE AT A TIME. A heavy working turn
 * therefore ended like this: finish work -> blocked, write a Linear sync ->
 * blocked, write a Hermes memo -> blocked, write a dual-tier summary ->
 * blocked, ... Every block costs a full model turn, so the agent spent its
 * last several turns writing memos about work instead of doing work. That is
 * the mechanical form of "the agent steps on its own toes" (Fable, 2026-08-26,
 * from a 40-session transcript census; the seven registrations were then
 * confirmed in .claude/settings.json on origin/main).
 *
 * WHAT THIS CHANGES: nothing about any gate's logic. Each child gate keeps its
 * own rules, its own tests, and its own verdict. This runs all of them against
 * the SAME stdin payload, collects every verdict, and emits ONE block listing
 * everything that is missing. The agent then fixes all of it in a single turn.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO: it does not soften, waive, merge or
 * re-implement any check. A turn that would have been blocked seven times is
 * still blocked — once, with seven reasons.
 *
 * CONTRACT (Claude Code Stop hook, type "command"):
 *   stdin  = { stop_hook_active, transcript_path, ... }
 *   allow  = exit 0, no output
 *   block  = exit 0 + stdout {decision:"block", reason}
 *
 * FAIL POSTURE — the asymmetry is load-bearing:
 *   privacy-boundary-gate is FAIL-CLOSED (its own R8-1: a gate that cannot
 *   scan cannot allow). If it errors, times out, or cannot be spawned, this
 *   gate BLOCKS. Every other child is FAIL-OPEN: an error, a timeout or a
 *   crash is treated as allow, because a broken gate must never wedge a
 *   session. Collapsing seven hooks into one must not quietly convert a
 *   fail-closed gate into a fail-open one.
 *
 * CHILDREN RUN IN PARALLEL. They are independent readers of the same
 * transcript; running them concurrently is what makes one boundary cheap.
 *
 * ROLLBACK: restore the seven-entry "Stop" array in .claude/settings.json
 * (each child is still present and still individually runnable) and delete
 * this registration. No child was modified.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Test seam: point the child lookup at a fixture directory. Never set in prod.
const HOOK_DIR = process.env.SWAN_CLOSEOUT_HOOK_DIR || dirname(fileURLToPath(import.meta.url));

/** name, timeout ms, failClosed — mirrors the registrations this replaces. */
const CHILDREN = [
  { name: 'privacy-boundary-gate', timeout: 30_000, failClosed: true },
  { name: 'hermes-closeout-gate', timeout: 30_000, failClosed: false },
  { name: 'linear-sync-gate', timeout: 30_000, failClosed: false },
  { name: 'dual-tier-gate', timeout: 30_000, failClosed: false },
  { name: 'backup-after-work', timeout: 15_000, failClosed: false },
  { name: 'lesson-recall-gate', timeout: 30_000, failClosed: false },
  { name: 'context-watch-gate', timeout: 30_000, failClosed: false },
];

/** Test seam: SWAN_CLOSEOUT_CHILDREN=name:timeoutMs:failClosed,... */
function resolveChildren() {
  const override = process.env.SWAN_CLOSEOUT_CHILDREN;
  if (!override) return CHILDREN;
  return override.split(',').filter(Boolean).map((entry) => {
    const [name, timeout, failClosed] = entry.split(':');
    return {
      name: name.replace(/\.mjs$/, ''),
      timeout: Number(timeout) || 30_000,
      failClosed: failClosed === '1',
    };
  });
}

function readStdin() {
  return new Promise((resolve) => {
    let raw = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => { raw += c; });
    process.stdin.on('end', () => resolve(raw));
    process.stdin.on('error', () => resolve(raw));
  });
}

/**
 * Run one child. Resolves to { name, blocked, reason?, note? }.
 * `note` is set only when the child misbehaved, so a broken gate is visible
 * in the output rather than silently swallowed.
 */
function runChild(child, payload) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (r) => {
      if (settled) return;
      settled = true;
      resolve({ name: child.name, ...r });
    };
    const degraded = (note, why) => done(child.failClosed
      ? { blocked: true, reason: `${child.name}: ${why} and this gate is fail-closed.`, note }
      : { blocked: false, note });

    const script = join(HOOK_DIR, `${child.name}.mjs`);
    // A registration pointing at a file that does not exist is exactly the
    // defect found in Rule 73 (a rule citing a deleted hook). Say so loudly.
    if (!existsSync(script)) return degraded('missing', 'hook file is MISSING');

    const proc = spawn(process.execPath, [script], { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';

    const timer = setTimeout(() => {
      proc.kill();
      degraded('timeout', `timed out after ${child.timeout}ms`);
    }, child.timeout);

    proc.stdout.on('data', (c) => { out += c; });

    proc.on('error', () => {
      clearTimeout(timer);
      degraded('spawn-error', 'failed to spawn');
    });

    proc.on('close', () => {
      clearTimeout(timer);
      const trimmed = out.trim();
      if (!trimmed) return done({ blocked: false });
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed?.decision === 'block') {
          return done({ blocked: true, reason: String(parsed.reason ?? '(no reason given)') });
        }
        return done({ blocked: false });
      } catch {
        return degraded('unparseable', `emitted unparseable output (${trimmed.slice(0, 120)})`);
      }
    });

    try {
      proc.stdin.write(payload);
      proc.stdin.end();
    } catch { /* a child that does not read stdin is fine */ }
  });
}

function buildReason(blocked, notes) {
  const head = blocked.length === 1
    ? 'CLOSEOUT GATE — 1 requirement is unmet. Fix it, then finish the turn:'
    : `CLOSEOUT GATE — ${blocked.length} requirements are unmet. Fix ALL of them in THIS turn, then finish:`;
  const body = blocked.map((b, i) => `${i + 1}. [${b.name}] ${b.reason}`).join('\n\n');
  const tail = notes.length
    ? `\n\n(gates that did not report cleanly: ${notes.map((n) => `${n.name}=${n.note}`).join(', ')})`
    : '';
  return `${head}\n\n${body}${tail}`;
}

async function main() {
  const payload = await readStdin();
  const results = await Promise.all(resolveChildren().map((c) => runChild(c, payload)));

  const blocked = results.filter((r) => r.blocked);
  const notes = results.filter((r) => r.note);

  if (blocked.length === 0) process.exit(0);

  process.stdout.write(JSON.stringify({ decision: 'block', reason: buildReason(blocked, notes) }));
  process.exit(0);
}

main().catch(() => process.exit(0)); // the unifier itself must never wedge a session
