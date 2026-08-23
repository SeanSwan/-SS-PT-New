#!/usr/bin/env node
/**
 * review-debt.mjs — the emitter for rules 46 / 74 / 82.
 *
 * WHY THIS EXISTS
 *   Three rules already said a review must happen (46: Kimi is the commit gate), that you may not
 *   claim "done" without one (74: Proof-Before-Done), and that it must be full-spectrum (82). All
 *   three were procedurally correct. All three had NO EMITTER — nothing anywhere held the state
 *   "a review is owed." The forensics corpus measured the result: `panel deferred` ×3,
 *   "the owed panel is now deferred six times", `unprompted Linear-sync deferred` ×3. Fable 5's
 *   Final-Decider ruling (2026-08-23): merge them into ONE tracked debt with ONE emitter, because
 *   three untethered mandatory rules produced six deferrals and one tethered rule produces zero.
 *
 * THE MODEL
 *   A debt is opened the moment a review is owed and closed only by naming the artifact that
 *   discharged it — or by an explicit, recorded waiver. The closeout gate reads open debts and
 *   blocks a build-shaped turn that carries any. Deferral becomes visible instead of silent.
 *
 * ONE FILE PER DEBT, never a shared list. Same reasoning as the Hermes inbox: concurrent agents
 * appending to one file clobber each other, and this repo has had three agents live at once.
 *
 * STORAGE  .ai-workflow/review-debt/open/<id>.json   -> outstanding
 *          .ai-workflow/review-debt/closed/<id>.json -> discharged (kept; Rule 34, never deleted)
 *
 * USAGE
 *   node scripts/review-debt.mjs open  --topic "<what>" --reason "<why a review is owed>"
 *                                      [--seats kimi,glm] [--by <agent>]
 *   node scripts/review-debt.mjs close --id <id> --artifact <path-to-review-output>
 *   node scripts/review-debt.mjs waive --id <id> --reason "<why no review is needed>"
 *   node scripts/review-debt.mjs list  [--json]
 *
 * Privacy (Rule 8/44/59): topics and reasons are IDs/roles only. This file never reads secrets.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DEBT_DIR = join(REPO_ROOT, '.ai-workflow', 'review-debt');
const OPEN_DIR = join(DEBT_DIR, 'open');
const CLOSED_DIR = join(DEBT_DIR, 'closed');

const argv = process.argv.slice(2);
const cmd = argv[0];
const arg = (flag, fallback = '') => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback;
};

/**
 * List open debts. Exported and defensive: the closeout gate calls this, and a gate that throws
 * wedges the session. Any problem -> empty list -> the gate never blocks on a broken ledger.
 */
export function openDebts(dir = OPEN_DIR, closedDir = CLOSED_DIR) {
  try {
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      // SELF-HEALING (Qwen hostile review, 2026-08-23, finding #1 CRITICAL). settle() writes
      // closed/ then unlinks open/ — two non-atomic steps. A crash, OOM, or full disk between them
      // leaves the debt in BOTH directories, and since it is still in open/ it blocks closeout
      // forever with no way to settle it again. An agent's only escape would be deleting the file
      // by hand, destroying the audit trail. Treating "already settled in closed/" as not-open
      // makes the crash window harmless and needs no repair command: the closed record is written
      // FIRST precisely so it is the authoritative one.
      .filter((f) => !existsSync(join(closedDir, f)))
      .map((f) => {
        try {
          return { ...JSON.parse(readFileSync(join(dir, f), 'utf8')), _file: f };
        } catch {
          return null; // unparseable entry is not a reason to block work
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** Stable, collision-resistant id without pulling in a uuid dependency. */
function newId(topic) {
  const slug = String(topic).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
  const t = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  return `${t}-${slug || 'review'}`;
}

function die(msg) {
  console.error(`review-debt: ${msg}`);
  process.exit(2);
}

function open() {
  const topic = arg('--topic');
  const reason = arg('--reason');
  if (!topic) die('open requires --topic');
  if (!reason) die('open requires --reason (why a review is owed)');
  mkdirSync(OPEN_DIR, { recursive: true });
  const id = newId(topic);
  const rec = {
    id,
    topic,
    reason,
    seats: arg('--seats', '') || null,
    opened_by: arg('--by', process.env.SWAN_AGENT_SURFACE || 'unknown'),
    opened_at: new Date().toISOString(),
    status: 'open',
  };
  writeFileSync(join(OPEN_DIR, `${id}.json`), JSON.stringify(rec, null, 2), 'utf8');
  console.log(`review-debt OPENED  ${id}`);
  console.log(`  topic : ${topic}`);
  console.log(`  reason: ${reason}`);
  console.log('  This now BLOCKS closeout until discharged with `close --artifact <path>` or');
  console.log('  explicitly waived with `waive --reason "<why>"`. Deferral is no longer silent.');
}

function settle(kind) {
  const id = arg('--id');
  if (!id) die(`${kind} requires --id (see \`list\`)`);
  const src = join(OPEN_DIR, `${id}.json`);
  if (!existsSync(src)) die(`no OPEN debt with id ${id}`);

  const rec = JSON.parse(readFileSync(src, 'utf8'));
  if (kind === 'close') {
    const artifact = arg('--artifact');
    if (!artifact) die('close requires --artifact (the review output that discharged this debt)');
    // A debt closed without a real artifact is the deferral it was built to prevent, wearing a
    // different hat. Require the path to exist.
    const abs = join(REPO_ROOT, artifact);
    if (!existsSync(artifact) && !existsSync(abs)) {
      die(`--artifact does not exist: ${artifact}\n  A debt may only be closed by naming real review output.`);
    }
    rec.status = 'closed';
    rec.artifact = artifact;
  } else {
    const reason = arg('--reason');
    if (!reason) die('waive requires --reason (recorded permanently)');
    rec.status = 'waived';
    rec.waived_reason = reason;
  }
  rec.settled_at = new Date().toISOString();
  rec.settled_by = arg('--by', process.env.SWAN_AGENT_SURFACE || 'unknown');

  // Write the UPDATED record to closed/, then remove the open copy. An earlier draft wrote
  // closed/ and then renamed open/ over it — which would have overwritten the settled record with
  // the stale pre-settlement one, leaving a debt that looked closed but carried no artifact.
  // Order matters: closed/ is written first, so a crash between the two steps loses nothing.
  mkdirSync(CLOSED_DIR, { recursive: true });
  writeFileSync(join(CLOSED_DIR, `${id}.json`), JSON.stringify(rec, null, 2), 'utf8');
  try {
    unlinkSync(src);
  } catch {
    die(`settled record written to closed/ but could NOT remove open/${id}.json — the debt will ` +
        'still block closeout. Remove it by hand.');
  }
  console.log(`review-debt ${rec.status.toUpperCase()}  ${id}`);
}

function list() {
  const debts = openDebts();
  if (arg('--json') || argv.includes('--json')) {
    console.log(JSON.stringify(debts, null, 2));
    return;
  }
  if (!debts.length) {
    console.log('review-debt: no outstanding reviews. Closeout is unblocked.');
    return;
  }
  console.log(`review-debt: ${debts.length} OUTSTANDING — closeout is blocked\n`);
  for (const d of debts) {
    console.log(`  ${d.id}`);
    console.log(`    topic : ${d.topic}`);
    console.log(`    reason: ${d.reason}`);
    console.log(`    opened: ${d.opened_at} by ${d.opened_by}${d.seats ? ` (seats: ${d.seats})` : ''}`);
  }
}

const isMain = process.argv[1] && process.argv[1].endsWith('review-debt.mjs');
if (isMain) {
  if (cmd === 'open') open();
  else if (cmd === 'close') settle('close');
  else if (cmd === 'waive') settle('waive');
  else if (cmd === 'list') list();
  else {
    console.error('usage: review-debt.mjs <open|close|waive|list> [flags]  (see header)');
    process.exit(2);
  }
}
