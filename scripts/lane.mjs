#!/usr/bin/env node
/**
 * lane.mjs — the cross-agent Coordination Ledger engine (Rule 67 v2)
 * ==================================================================
 * Replaces cwd-relative, agent-name-keyed lane files with a SINGLE canonical
 * ledger addressed by SESSION identity, so N parallel agents (and N worktrees)
 * can publish without erasing each other.
 *
 * WHY v2 (hostile review, Kimi K3 + Tencent HY3, 2026-08-11):
 *  - v1 resolved the ledger from `process.cwd()`. With 184 worktrees that forked
 *    the ledger silently — 9 published lane files sat in worktree-local dirs no
 *    other agent could ever read. Coordination was believed, and void.
 *  - The obvious fix (centralize on `<git-common-dir>/..`) is a REGRESSION on its
 *    own: every Claude session writes `claude.lane.md`, so last-writer-wins and a
 *    live agent's locks vanish. Both reviewers independently called that a
 *    "false-negative collision detector" — worse than the fork it replaces.
 *    => Identity is `<agent>--<worktree-slug>`, one file per SESSION, never shared.
 *  - Locks here are ADVISORY BROADCAST, not exclusion. The reviewed evidence is
 *    that visibility is what has ever paid ("they cannot correct what they cannot
 *    see"); exclusion has never prevented a single collision. Nothing in this file
 *    blocks an edit.
 *
 * Writes are atomic (tmp + rename); appends use O_APPEND. Never writes another
 * session's lane. Never deletes anything (Rule 34) — `doctor` reports only.
 *
 * Usage:
 *   node scripts/lane.mjs claim   --task "<one line>" [--files "a,b,c"] [--next "..."] [--notes "..."]
 *   node scripts/lane.mjs release [--outcome "<one line>"]
 *   node scripts/lane.mjs digest  [--json]     # DELTA orientation, capped — for SessionStart
 *   node scripts/lane.mjs doctor  [--json]     # hygiene: orphan ledgers, stale lanes, rot
 *   node scripts/lane.mjs whoami
 *
 * Exit codes: 0 ok · 2 not a git repo. Never fails on findings.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync, appendFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const ARGV = process.argv.slice(2);
const CMD = ARGV[0] ?? 'digest';
const JSON_MODE = ARGV.includes('--json');
const flag = (name, dflt = '') => {
  const i = ARGV.indexOf(`--${name}`);
  return i >= 0 && ARGV[i + 1] && !ARGV[i + 1].startsWith('--') ? ARGV[i + 1] : dflt;
};

const sh = (cmd, cwd = process.cwd()) => {
  try { return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return ''; }
};

/* ── 1. Canonical ledger — identical from every worktree ────────────────────
 * `--path-format=absolute` needs git >= 2.31; fall back to resolving the plain
 * form against cwd (HY3 flagged that the plain form can be RELATIVE for linked
 * worktrees on older git — it returns absolute on this machine, but resolving
 * defensively is free and correct in both cases). */
function resolveLedger() {
  let common = sh('git rev-parse --path-format=absolute --git-common-dir');
  if (!common) common = sh('git rev-parse --git-common-dir');
  if (!common) return null;
  return resolve(common, '..', '.ai-workflow', 'coordination');
}

const LEDGER = resolveLedger();
if (!LEDGER) {
  console.error('[lane] not a git repository — no ledger.');
  process.exit(2);
}
const LANES_GLOB = () => (existsSync(LEDGER) ? readdirSync(LEDGER).filter((f) => f.endsWith('.lane.md')) : []);

/* ── 2. Session identity — agent + worktree, never a bare agent name ──────── */
const AGENT = process.env.SWAN_AGENT_SURFACE || process.env.CLAUDE_AGENT || 'vs-claude';
const WORKTREE = basename(sh('git rev-parse --show-toplevel') || process.cwd());
const IS_MAIN = resolve(sh('git rev-parse --show-toplevel') || '.') === resolve(LEDGER, '..', '..');
const SLUG = IS_MAIN ? 'main' : WORKTREE;
const LANE_NAME = `${AGENT}--${SLUG}.lane.md`;
const LANE_PATH = resolve(LEDGER, LANE_NAME);

/* ── 3. Delivery state — COMPUTED from git, never asserted by the agent ─────
 * The v1 schema could only say "Last commit: <sha>", so the committed-vs-pushed-
 * vs-merged confusion that caused the 2026-08-11 incident was unrepresentable and
 * therefore uncheckable. This computes it fresh on every read. */
function deliveryState() {
  const branch = sh('git rev-parse --abbrev-ref HEAD');
  if (!branch || branch === 'HEAD') return { branch: branch || 'detached', state: 'detached', ahead: 0, unpushed: [] };
  const onRemote = sh(`git rev-parse --verify --quiet origin/${branch}`);
  const mergedMain = sh(`git branch --remotes --contains HEAD --list origin/main`);
  const ahead = Number(sh(`git rev-list --count origin/main..HEAD`) || 0);
  const unpushed = onRemote
    ? sh(`git rev-list --count origin/${branch}..HEAD`)
    : sh('git rev-list --count origin/main..HEAD');
  let state = 'local-commit';
  if (mergedMain) state = 'merged-to-main';
  else if (onRemote && Number(unpushed) === 0) state = 'pushed-branch';
  return { branch, state, ahead, unpushed: Number(unpushed) || 0, onRemote: Boolean(onRemote) };
}

/* ── 4. Read every lane. Freshness comes from file mtime, NOT the agent-authored
 * `Updated:` line — a model can hallucinate prose; it cannot fake an mtime. */
function readLanes() {
  return LANES_GLOB().map((file) => {
    const path = resolve(LEDGER, file);
    const src = readFileSync(path, 'utf8');
    const mtime = statSync(path).mtimeMs;
    const section = src.split(/EDITING NOW/i)[1]?.split(/\n#{1,3}\s/)[0] ?? '';
    const locks = section.split('\n').map((l) => l.trim())
      .filter((l) => l.startsWith('- ') && !/^-\s*(nothing|none|_)/i.test(l))
      .map((l) => l.replace(/^-\s*/, '').replace(/`/g, ''));
    const task = (src.match(/^Task:\s*(.+)$/m) || [])[1] || (src.match(/^##\s+(.+)$/m) || [])[1] || '';
    return { file, self: file === LANE_NAME, ageMin: Math.round((Date.now() - mtime) / 60000), locks, task: task.slice(0, 90) };
  });
}

/* ── 5. Commands ───────────────────────────────────────────────────────────── */
function atomicWrite(path, body) {
  const tmp = `${path}.tmp-${process.pid}`;
  writeFileSync(tmp, body, 'utf8');
  renameSync(tmp, path); // atomic on same filesystem — no torn reads
}

function logActivity(line) {
  try { appendFileSync(resolve(LEDGER, 'activity.log.md'), `${line}\n`, 'utf8'); } catch { /* non-fatal */ }
}

function claim() {
  if (!existsSync(LEDGER)) mkdirSync(LEDGER, { recursive: true });
  const task = flag('task', '(unstated)');
  const files = flag('files').split(',').map((s) => s.trim()).filter(Boolean);
  const d = deliveryState();
  const body = `# ${AGENT} — Live Lane (session: ${SLUG})
Updated: ${new Date().toISOString()}
Status: in-progress
Agent: ${AGENT}
Worktree: ${WORKTREE}${IS_MAIN ? ' (MAIN TREE)' : ''}
Branch: ${d.branch}
Delivery: ${d.state}${d.unpushed ? ` (${d.unpushed} unpushed commit${d.unpushed === 1 ? '' : 's'})` : ''}
Task: ${task}

## EDITING NOW
${files.length ? files.map((f) => `- ${f}`).join('\n') : '- (none declared yet)'}

Next intent: ${flag('next', '—')}
Notes for other agents: ${flag('notes', '—')}
`;
  atomicWrite(LANE_PATH, body);
  logActivity(`${new Date().toISOString()} CLAIM ${AGENT}@${SLUG} :: ${task} :: ${files.length} file(s)`);
  console.log(`[lane] claimed → ${LANE_NAME}\n[lane] ledger: ${LEDGER}\n[lane] delivery: ${d.state}`);
}

function release() {
  if (!existsSync(LANE_PATH)) { console.log('[lane] no lane to release.'); return; }
  const d = deliveryState();
  const src = readFileSync(LANE_PATH, 'utf8')
    .replace(/^Status: .*$/m, 'Status: idle')
    .replace(/^Updated: .*$/m, `Updated: ${new Date().toISOString()}`)
    .replace(/^Delivery: .*$/m, `Delivery: ${d.state}${d.unpushed ? ` (${d.unpushed} unpushed)` : ''}`)
    .replace(/## EDITING NOW\n[\s\S]*?(?=\nNext intent:)/, '## EDITING NOW\n- (released)\n');
  atomicWrite(LANE_PATH, `${src}\nOutcome: ${flag('outcome', '—')}\n`);
  logActivity(`${new Date().toISOString()} RELEASE ${AGENT}@${SLUG} :: ${flag('outcome', '—')} :: delivery=${d.state}`);
  console.log(`[lane] released. delivery: ${d.state}`);
}

/* DELTA digest — capped. Both reviewers: a digest that reports EVERYTHING trains
 * readers to skim NOTHING. Show only live lanes, their locks, and my delivery. */
const FRESH_MIN = 120;
function digest() {
  const lanes = readLanes();
  const live = lanes.filter((l) => !l.self && l.ageMin <= FRESH_MIN && l.locks.length);
  const stale = lanes.filter((l) => !l.self && l.ageMin > FRESH_MIN && l.locks.length);
  const d = deliveryState();
  if (JSON_MODE) { console.log(JSON.stringify({ ledger: LEDGER, me: LANE_NAME, delivery: d, live, staleCount: stale.length }, null, 2)); return; }

  const out = [`[lane] ledger ${LEDGER}`, `[lane] me: ${AGENT}@${SLUG} · branch ${d.branch} · delivery ${d.state}${d.unpushed ? ` · ${d.unpushed} UNPUSHED` : ''}`];
  if (!existsSync(LANE_PATH)) out.push('[lane] ⚠ you have NOT published a lane this session — run: node scripts/lane.mjs claim --task "..." --files "..."');
  if (live.length) {
    out.push(`[lane] ${live.length} agent(s) hold locks right now — DO NOT edit these:`);
    for (const l of live.slice(0, 6)) {
      out.push(`   ${l.file.replace('.lane.md', '')} (${l.ageMin}m ago) — ${l.task}`);
      for (const f of l.locks.slice(0, 5)) out.push(`      🔒 ${f}`);
      if (l.locks.length > 5) out.push(`      … +${l.locks.length - 5} more`);
    }
  } else out.push('[lane] no fresh locks held by other agents.');
  if (stale.length) out.push(`[lane] ${stale.length} stale lane(s) still holding locks (>${FRESH_MIN}m) — treat as advisory; never silently seize (R5). \`node scripts/lane.mjs doctor\``);
  console.log(out.join('\n'));
}

/* Hygiene — REPORTS ONLY. Rule 34 forbids auto-deletion. */
function doctor() {
  const lanes = readLanes();
  const orphans = [];
  for (const line of sh('git worktree list --porcelain').split('\n')) {
    if (!line.startsWith('worktree ')) continue;
    const dir = line.slice(9).trim();
    const dirLedger = resolve(dir, '.ai-workflow', 'coordination');
    if (resolve(dirLedger) === resolve(LEDGER) || !existsSync(dirLedger)) continue;
    const strays = readdirSync(dirLedger).filter((f) => f.endsWith('.lane.md') || f === 'review-queue.md');
    if (strays.length) orphans.push({ dir, strays });
  }
  const rot = existsSync(LEDGER)
    ? readdirSync(LEDGER).filter((f) => !f.endsWith('.lane.md') && f !== 'README.md')
        .map((f) => ({ f, kb: Math.round(statSync(resolve(LEDGER, f)).size / 1024) })).filter((x) => x.kb > 128)
    : [];
  if (JSON_MODE) { console.log(JSON.stringify({ orphans, rot, lanes }, null, 2)); return; }
  console.log(`[lane doctor] canonical ledger: ${LEDGER}`);
  console.log(`[lane doctor] lanes present: ${lanes.length}`);
  if (orphans.length) {
    console.log(`[lane doctor] ⚠ ${orphans.length} ORPHANED worktree-local ledger(s) — published where no agent reads (report only, never auto-deleted):`);
    for (const o of orphans) console.log(`   ${o.dir} :: ${o.strays.join(', ')}`);
  } else console.log('[lane doctor] no orphaned worktree ledgers.');
  for (const r of rot) console.log(`[lane doctor] ⚠ oversized ledger artifact: ${r.f} (${r.kb} KB) — candidate for prune, pending approval.`);
}

({ claim, release, digest, doctor, whoami: () => console.log(`${AGENT}@${SLUG} → ${LANE_PATH}`) }[CMD] ?? digest)();
