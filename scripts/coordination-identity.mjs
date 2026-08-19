#!/usr/bin/env node
/**
 * coordination-identity.mjs — give every agent session a stable, self-proving ID.
 *
 * WHY (Sean, 2026-08-19): two sessions both running as "claude" shared ONE lane file and
 * clobbered each other's claim. Worse, when a destructive command wiped backend/node_modules
 * there was no way to tell WHICH session did it — the lane said "vs-claude" and so did mine.
 * An identity you cannot distinguish is not an identity, and an incident you cannot attribute
 * cannot be prevented from recurring.
 *
 * WHAT IT GIVES YOU: a per-session ID derived from facts the session cannot fake about itself,
 * printed with everything a reader needs to know WHO is claiming a lane:
 *
 *     vs-claude/opus-5@a3f19c2b  (pid 51820, cwd SS-PT, branch wip/comms..., started 00:41Z)
 *
 * The short hash is stable for the life of the session and different for every session, so two
 * "claude" agents can never silently occupy the same lane again.
 *
 * DESIGN NOTE — why not a random UUID: a random ID proves nothing and is trivially copied into a
 * lane file by a session that is not the one holding it. Deriving from pid + cwd + start time +
 * branch means the ID *describes* the session; a mismatch is detectable rather than merely
 * unlikely.
 *
 * USAGE
 *   node scripts/coordination-identity.mjs            # print this session's identity block
 *   node scripts/coordination-identity.mjs --lane      # print the lane FILENAME to use
 *   node scripts/coordination-identity.mjs --json      # machine-readable
 *
 * READ-ONLY. Prints; never writes a lane file for you (claiming is a deliberate act).
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { basename } from 'node:path';

const args = process.argv.slice(2);

function safe(fn, fallback) {
  try { return fn(); } catch { return fallback; }
}

const cwd = process.cwd();
const branch = safe(
  () => execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).trim(),
  'no-git',
);
const head = safe(
  () => execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(),
  'unknown',
);

// SWAN_AGENT_SURFACE is set by the launch environment (vs-claude / vs-codex / tg-claude / ...).
// It says WHERE the agent runs. It does NOT identify the session — that is the bug being fixed.
const surface = process.env.SWAN_AGENT_SURFACE || 'unknown-surface';
const model = process.env.SWAN_AGENT_MODEL || 'unknown-model';

// SESSION ANCHOR. First version fingerprinted pid + process start time and produced a
// DIFFERENT id on every invocation — each `node` run is a new process, so the "identity" changed
// every time it was asked. An id that is not stable across calls is not an identity at all.
// The harness exposes a real per-session id; use it, and fall back only if it is absent.
const sessionId = process.env.CLAUDE_CODE_SESSION_ID
  || process.env.SWAN_AGENT_SESSION_ID
  || '';

const startedMs = Date.now() - Math.floor(process.uptime() * 1000);
const startedIso = new Date(startedMs).toISOString().replace(/\.\d+Z$/, 'Z');

// Same session -> same hash, always. Different session -> different hash.
// cwd is included so one session working two worktrees claims two distinct lanes, which is
// correct: the lane describes a working tree, not just a person.
const anchored = Boolean(sessionId);
const fingerprint = anchored
  ? [surface, model, sessionId, cwd].join('|')
  : [surface, model, String(process.pid), cwd, startedIso].join('|'); // UNSTABLE — see warning
const id = createHash('sha256').update(fingerprint).digest('hex').slice(0, 8);

const laneFile = `${surface}--${basename(cwd)}--${id}.lane.md`;

const identity = {
  id,
  surface,
  model,
  pid: process.pid,
  cwd,
  repo: basename(cwd),
  branch,
  head,
  startedIso,
  anchored,
  laneFile,
  display: `${surface}/${model}@${id}`,
};

if (args.includes('--json')) {
  console.log(JSON.stringify(identity, null, 2));
} else if (args.includes('--lane')) {
  console.log(laneFile);
} else {
  console.log('');
  console.log(`  AGENT IDENTITY   ${identity.display}`);
  console.log('  ' + '-'.repeat(16 + identity.display.length));
  console.log(`  lane file  : ${laneFile}`);
  console.log(`  surface    : ${surface}${surface === 'unknown-surface' ? '   <- SWAN_AGENT_SURFACE is unset' : ''}`);
  console.log(`  model      : ${model}${model === 'unknown-model' ? '   <- SWAN_AGENT_MODEL is unset' : ''}`);
  console.log(`  pid / cwd  : ${process.pid}  ${cwd}`);
  console.log(`  branch/head: ${branch} @ ${head}`);
  console.log(`  started    : ${startedIso}`);
  console.log(`  anchor     : ${anchored ? "session-id (stable across calls)" : "pid+start  <- UNSTABLE, id changes per call"}`);
  console.log('');
  console.log('  Put the identity line at the TOP of your lane file and in every review-queue');
  console.log('  entry you write. Claim ONLY your own lane filename above — never a shared one.');
  console.log('');
}
