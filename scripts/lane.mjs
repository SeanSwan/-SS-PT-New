#!/usr/bin/env node
/**
 * lane.mjs — the cross-agent Coordination Ledger CLI (Rule 67 v2.1)
 * ==================================================================
 * Parallel agents (Claude sessions, Codex, Fable, cloud agents) working one repo
 * publish what they are doing here so they do not step on each other. Locks are
 * ADVISORY BROADCAST, not exclusion — nothing in this file blocks an edit. The
 * reviewed evidence is that visibility is what has ever paid; exclusion has never
 * prevented a collision.
 *
 * v2   rebuilt after a design review (Kimi K3 + Tencent HY3) killed the
 *      cwd-relative ledger AND the agent-name-keyed lane that would have replaced it.
 * v2.1 hardened after a Kimi K3 IMPLEMENTATION review; shared logic moved to
 *      lib/lane-core.mjs because three drifted copies of it were the real defect.
 *
 * Writes are atomic (tmp + rename) and never touch another session's lane.
 * Nothing is ever deleted (Rule 34) — `doctor` reports only.
 *
 * Usage:
 *   node scripts/lane.mjs claim   --task "<one line>" [--files "a,b,c"] [--next "..."] [--notes "..."]
 *   node scripts/lane.mjs release [--outcome "<one line>"]
 *   node scripts/lane.mjs digest  [--json]   # DELTA orientation, capped — for SessionStart
 *   node scripts/lane.mjs doctor  [--json]   # hygiene: orphan ledgers, rot (report only)
 *   node scripts/lane.mjs whoami
 *
 * Exit codes: 0 ok · 2 not a git repo · 3 write failed · 4 unknown subcommand.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync, appendFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { FRESH_MIN, sh, normPath, samePath, ledgerDir, identity, safeRef, readLanes } from './lib/lane-core.mjs';

const ARGV = process.argv.slice(2);
const CMD = ARGV[0] ?? 'digest';
const JSON_MODE = ARGV.includes('--json');
const flag = (name, dflt = '') => {
  const i = ARGV.indexOf(`--${name}`);
  return i >= 0 && ARGV[i + 1] && !ARGV[i + 1].startsWith('--') ? ARGV[i + 1] : dflt;
};

const LEDGER = ledgerDir();
if (!LEDGER) {
  console.error('[lane] not a git repository — no ledger.');
  process.exit(2);
}
const ME = identity();
const LANE_PATH = resolve(LEDGER, ME.laneName);

/* ── Delivery state — COMPUTED from git, never asserted ─────────────────────
 * v1's schema could only say "Last commit: <sha>", so the committed-vs-pushed-vs-
 * merged confusion that caused the incident was unrepresentable and uncheckable. */
function deliveryState() {
  const branch = sh('git rev-parse --abbrev-ref HEAD');
  if (!branch || branch === 'HEAD') return { branch: branch || 'detached', state: 'detached', unpushed: 0 };
  const ref = safeRef(branch);
  if (!ref) return { branch, state: 'unknown (unsafe refname)', unpushed: 0 };
  const onRemote = Boolean(sh(`git rev-parse --verify --quiet origin/${ref}`));
  const mergedMain = Boolean(sh('git branch --remotes --contains HEAD --list origin/main'));
  /* `?? 0` here was the incident's own bug class landing on the field the incident
   * created: sh() returns null on FAILURE, and coercing that to 0 made a shallow
   * clone (no merge base) report `Delivery: pushed-branch` while HEAD was
   * arbitrarily far ahead. An agent reading that field to decide a branch is safe
   * to abandon would be reading a lie. Failure is `unknown`, never a count. */
  const rawCount = sh(`git rev-list --count ${onRemote ? `origin/${ref}` : 'origin/main'}..HEAD`);
  if (rawCount === null) return { branch, state: 'unknown (count unavailable)', unpushed: 0, onRemote };
  const unpushed = Number(rawCount) || 0;
  let state = 'local-commit';
  if (mergedMain) state = 'merged-to-main';
  else if (onRemote && unpushed === 0) state = 'pushed-branch';
  return { branch, state, unpushed, onRemote };
}

/* ── Writes ─────────────────────────────────────────────────────────────────── */
function atomicWrite(path, body) {
  const tmp = `${path}.tmp-${process.pid}`;
  try {
    writeFileSync(tmp, body, 'utf8');
    renameSync(tmp, path); // atomic on same filesystem — no torn reads
  } catch (err) {
    // Windows renameSync throws EPERM/EEXIST when the destination is held open by
    // antivirus, an indexer, or a concurrent reader. Retry once, then fail LOUDLY:
    // a silently lost claim is a lane nobody can see, which is the whole bug class.
    try {
      renameSync(tmp, path);
    } catch {
      try { if (existsSync(tmp)) unlinkSync(tmp); } catch { /* leave no litter */ }
      console.error(`[lane] FAILED to write ${path}: ${err.code || err.message}`);
      console.error('[lane] your claim was NOT published — other agents cannot see it. Retry.');
      process.exit(3);
    }
  }
}

const logActivity = (line) => {
  try { appendFileSync(resolve(LEDGER, 'activity.log.md'), `${line}\n`, 'utf8'); } catch { /* non-fatal */ }
};

function claim() {
  if (!existsSync(LEDGER)) mkdirSync(LEDGER, { recursive: true });
  const task = flag('task', '(unstated)');
  const files = flag('files').split(',').map((s) => s.trim()).filter(Boolean);
  const d = deliveryState();
  atomicWrite(LANE_PATH, `# ${ME.agent} — Live Lane (session: ${ME.slug})
Updated: ${new Date().toISOString()}
Status: in-progress
Agent: ${ME.agent}
Worktree: ${ME.top}${ME.isMain ? '  (MAIN TREE)' : ''}
Branch: ${d.branch}
Delivery: ${d.state}${d.unpushed ? ` (${d.unpushed} unpushed)` : ''}
Task: ${task}

## EDITING NOW
${files.length ? files.map((f) => `- ${f}`).join('\n') : '- (none declared yet)'}

Next intent: ${flag('next', '—')}
Notes for other agents: ${flag('notes', '—')}
`);
  logActivity(`${new Date().toISOString()} CLAIM ${ME.agent}@${ME.slug} :: ${task} :: ${files.length} file(s)`);
  console.log(`[lane] claimed → ${ME.laneName}\n[lane] ledger: ${LEDGER}\n[lane] delivery: ${d.state}`);
}

function release() {
  if (!existsSync(LANE_PATH)) { console.log('[lane] no lane to release.'); return; }
  const d = deliveryState();
  /* release() is a read-modify-write; tmp+rename makes each WRITE atomic but not
   * the sequence. A concurrent claim() landing between the read and the rename
   * would be silently overwritten — the new locks vanish while claim already
   * printed "claimed". Same-lane concurrency is real here (a Stop hook releasing
   * while the main loop re-claims), so re-stat before committing the write. */
  const mtimeAtRead = statSync(LANE_PATH).mtimeMs;
  const src = readFileSync(LANE_PATH, 'utf8');
  // CRLF-tolerant. A bare-\n pattern silently no-ops on a hand-edited CRLF lane,
  // leaving every lock in place while printing "released" — phantom locks for
  // FRESH_MIN minutes on a file other agents act on.
  const header = src
    .replace(/^Status: .*$/m, 'Status: idle')
    .replace(/^Updated: .*$/m, `Updated: ${new Date().toISOString()}`)
    .replace(/^Delivery: .*$/m, `Delivery: ${d.state}${d.unpushed ? ` (${d.unpushed} unpushed)` : ''}`);

  /* Line-wise, deliberately. The regex version used `$` inside a lookahead under
   * the /m flag — where `$` means end-of-LINE — so the lazy quantifier stopped at
   * the first newline and cleared only the FIRST lock, leaving the rest live while
   * printing "released". Verified on a CRLF lane. Clever beats readable right up
   * until it silently half-works on the operation other agents act on. */
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  const lines = header.split(/\r?\n/);
  const head = lines.findIndex((l) => /^#{1,6}\s.*EDITING NOW/i.test(l));
  let removed = 0;
  if (head !== -1) {
    let end = head + 1;
    while (end < lines.length && (lines[end].trim() === '' || lines[end].trim().startsWith('- '))) {
      if (lines[end].trim().startsWith('- ')) removed += 1;
      end += 1;
    }
    lines.splice(head + 1, end - (head + 1), '- (released)', '');
  }
  const cleared = lines.join(eol);
  const leftover = cleared.split(/\r?\n/)
    .slice(head + 1, head + 1 + removed + 2)
    .filter((l) => l.trim().startsWith('- ') && !/\(released\)/.test(l));
  if (head === -1 || leftover.length) {
    console.error('[lane] WARNING: lock list may not have cleared — verify the lane file by hand.');
  }
  if (statSync(LANE_PATH).mtimeMs !== mtimeAtRead) {
    console.error('[lane] ABORTED release: the lane changed while I was reading it — a concurrent');
    console.error('[lane] claim would have been erased. Nothing written. Re-run to release.');
    process.exit(3);
  }
  atomicWrite(LANE_PATH, `${cleared}\nOutcome: ${flag('outcome', '—')}\n`);
  logActivity(`${new Date().toISOString()} RELEASE ${ME.agent}@${ME.slug} :: ${flag('outcome', '—')} :: delivery=${d.state}`);
  console.log(`[lane] released. delivery: ${d.state}`);
}

/* ── DELTA digest — capped. A digest that reports EVERYTHING trains readers to
 * skim NOTHING; because it never blocks it would not be removed, it would be
 * ignored, which fails silently while everyone believes orientation happened. */
function digest() {
  const lanes = readLanes(LEDGER, ME.laneName);
  const live = lanes.filter((l) => !l.self && l.ageMin <= FRESH_MIN && l.locks.length);
  const staleCount = lanes.filter((l) => !l.self && l.ageMin > FRESH_MIN && l.locks.length).length;
  const d = deliveryState();
  if (JSON_MODE) {
    console.log(JSON.stringify({ ledger: LEDGER, me: ME.laneName, delivery: d, live, staleCount }, null, 2));
    return;
  }
  const out = [
    `[lane] ledger ${LEDGER}`,
    `[lane] me: ${ME.agent}@${ME.slug} · branch ${d.branch} · delivery ${d.state}${d.unpushed ? ` · ${d.unpushed} UNPUSHED` : ''}`,
  ];
  if (!existsSync(LANE_PATH)) {
    out.push('[lane] ⚠ you have NOT published a lane this session — run: node scripts/lane.mjs claim --task "..." --files "..."');
  }
  if (live.length) {
    out.push(`[lane] ${live.length} agent(s) hold locks right now — DO NOT edit these:`);
    for (const l of live.slice(0, 6)) {
      out.push(`   ${l.file.replace('.lane.md', '')} (${l.ageMin}m ago) — ${l.task}`);
      for (const f of l.locks.slice(0, 5)) out.push(`      🔒 ${f}`);
      if (l.locks.length > 5) out.push(`      … +${l.locks.length - 5} more`);
    }
    if (live.length > 6) out.push(`   … +${live.length - 6} more live lane(s)`);
  } else {
    out.push('[lane] no fresh locks held by other agents.');
  }
  if (staleCount) {
    out.push(`[lane] ${staleCount} stale lane(s) still holding locks (>${FRESH_MIN}m) — advisory; never silently seize (R5). \`node scripts/lane.mjs doctor\``);
  }
  console.log(out.join('\n'));
}

/* ── Hygiene — REPORTS ONLY. Rule 34 forbids auto-deletion. ─────────────────── */
function doctor() {
  const lanes = readLanes(LEDGER, ME.laneName);
  const orphans = [];
  for (const line of (sh('git worktree list --porcelain') ?? '').split('\n')) {
    if (!line.startsWith('worktree ')) continue;
    const dir = normPath(line.slice(9).trim());
    const dirLedger = resolve(dir, '.ai-workflow', 'coordination');
    if (samePath(dirLedger, LEDGER) || !existsSync(dirLedger)) continue;
    const strays = readdirSync(dirLedger).filter((f) => f.endsWith('.lane.md') || f === 'review-queue.md');
    if (strays.length) orphans.push({ dir, strays });
  }
  const rot = existsSync(LEDGER)
    ? readdirSync(LEDGER)
      .filter((f) => !f.endsWith('.lane.md') && f !== 'README.md')
      .map((f) => ({ f, kb: Math.round(statSync(resolve(LEDGER, f)).size / 1024) }))
      .filter((x) => x.kb > 128 || /\.tmp-\d+$/.test(x.f))
    : [];
  if (JSON_MODE) { console.log(JSON.stringify({ ledger: LEDGER, orphans, rot, lanes }, null, 2)); return; }
  console.log(`[lane doctor] canonical ledger: ${LEDGER}`);
  console.log(`[lane doctor] lanes present: ${lanes.length}`);
  if (orphans.length) {
    console.log(`[lane doctor] ⚠ ${orphans.length} ORPHANED worktree-local ledger(s) — published where no agent reads (report only, never auto-deleted):`);
    for (const o of orphans) console.log(`   ${o.dir} :: ${o.strays.join(', ')}`);
  } else console.log('[lane doctor] no orphaned worktree ledgers.');
  for (const r of rot) console.log(`[lane doctor] ⚠ ledger artifact: ${r.f} (${r.kb} KB) — candidate for prune, pending approval.`);
}

const COMMANDS = { claim, release, digest, doctor, whoami: () => console.log(`${ME.agent}@${ME.slug} → ${LANE_PATH}`) };
if (!COMMANDS[CMD]) {
  // A typo used to fall through to `digest` and exit 0 — the agent believed it had
  // published a claim nobody could see. Silent failure on the primary write path.
  console.error(`[lane] unknown subcommand '${CMD}'. Expected: ${Object.keys(COMMANDS).join(' | ')}`);
  process.exit(4);
}
COMMANDS[CMD]();