#!/usr/bin/env node
/**
 * lane-staged-guard.mjs — refuse a commit that stages files this agent never claimed.
 *
 * WHY THIS EXISTS
 *   Agents in this repo share ONE git index. `git add` by agent A followed by `git commit` by
 *   agent B puts A's files into B's commit. Observed three times in 24 hours:
 *     - 2026-08-22  this session's staged work swept into another agent's commit `f0b4d075b`
 *     - 2026-08-23  four of another agent's learning packets swept into `139437997` — by me,
 *                   the day after I documented the failure and named it in a memo
 *   Lane discipline cannot prevent this. It is not a protocol failure; it is a property of a
 *   shared index, and no amount of read-before-edit fixes it. ox-alpha's hostile review ranked it
 *   the single highest risk in the program: "gates on top of corrupt foundations produce confident
 *   wrong verdicts", and prescribed exactly this — a pre-commit assertion comparing the staged tree
 *   against the lane's claimed file set.
 *
 * WHAT IT DOES
 *   If this session has published a lane, every staged path must appear under that lane's
 *   `EDITING NOW` block. Anything else is a foreign file that arrived in the shared index from
 *   somebody else's work, and the commit is refused with the list.
 *
 * WHY IT IS OPT-IN BY CLAIMING
 *   No lane published -> ALLOW, with a notice. Forcing lane discipline onto every commit in the
 *   repo would make this the gate everyone disables, and a disabled gate protects nothing — the
 *   failure mode this repo records more than any other. Claiming a lane is what opts you in, and
 *   claiming is already the house rule (Rule 67).
 *
 * ESCAPE HATCH
 *   `git commit --no-verify` still works, and `--allow-foreign` is an explicit, greppable override
 *   for the legitimate case where you really are committing on someone's behalf.
 *
 * FAILS OPEN. A guard that cannot read the ledger must never block a commit.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ALLOW = (msg) => {
  if (msg) console.log(`[lane-staged] ${msg}`);
  process.exit(0);
};

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Normalise for comparison: forward slashes, no leading ./, lowercase (Windows is case-blind). */
export const norm = (p) =>
  String(p || '').replace(/\\/g, '/').replace(/^\.\//, '').trim().toLowerCase();

/**
 * Pull the claimed paths out of a lane file's `EDITING NOW` block.
 * Parsed directly rather than via lane-core internals: this guard must keep working even if the
 * lane tooling changes shape, and a guard that breaks when its dependency moves is a guard that
 * silently stops guarding.
 */
export function claimedFiles(laneText) {
  const text = String(laneText || '').replace(/\r\n/g, '\n');
  const start = text.search(/^#+\s*(?:🔒|🔓)?\s*EDITING NOW\b.*$/im);
  if (start < 0) return [];
  const rest = text.slice(start);
  const afterHeading = rest.slice(rest.indexOf('\n') + 1);
  const nextHeading = afterHeading.search(/^#+\s/m);
  const block = nextHeading < 0 ? afterHeading : afterHeading.slice(0, nextHeading);

  const out = [];
  for (const line of block.split('\n')) {
    const m = line.match(/^\s*[-*]\s+(.+?)\s*$/);
    if (!m) continue;
    let v = m[1].replace(/^`|`$/g, '').trim();
    if (!v || /^\(released\)$/i.test(v) || /^—$/.test(v)) continue;
    // A claim may carry a trailing note: "- scripts/x.mjs (restoring from origin/main)"
    v = v.replace(/\s*\(.*\)\s*$/, '').replace(/^`|`$/g, '').trim();
    if (v) out.push(norm(v));
  }
  return out;
}

/** A claim of `dir/**` or a bare directory covers everything beneath it. */
export function isCovered(stagedPath, claims) {
  const p = norm(stagedPath);
  return claims.some((c) => {
    const base = c.replace(/\/?\*+$/, '');
    return p === c || p === base || (base && p.startsWith(`${base}/`));
  });
}

function main() {
  const allowForeign = process.argv.includes('--allow-foreign');

  let staged = [];
  try {
    staged = execFileSync('git', ['diff', '--cached', '--name-only'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    })
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    ALLOW('could not read the index — allowing');
  }
  if (!staged.length) ALLOW();

  let lanePath = '';
  try {
    const out = execFileSync(process.execPath, [join(REPO_ROOT, 'scripts', 'lane.mjs'), 'whoami'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    lanePath = (out.split('→')[1] || '').trim();
  } catch {
    ALLOW('lane tooling unavailable — allowing');
  }

  if (!lanePath || !existsSync(lanePath)) {
    ALLOW('no lane published this session — not enforcing (claim one to opt in: node scripts/lane.mjs claim ...)');
  }

  let claims = [];
  try {
    claims = claimedFiles(readFileSync(lanePath, 'utf8'));
  } catch {
    ALLOW('lane unreadable — allowing');
  }
  if (!claims.length) ALLOW('lane published but claims nothing — not enforcing');

  const foreign = staged.filter((p) => !isCovered(p, claims));
  if (!foreign.length) {
    console.log(`[lane-staged] ${staged.length} staged file(s), all within your lane claim.`);
    process.exit(0);
  }

  if (allowForeign) {
    console.log(`[lane-staged] --allow-foreign: committing ${foreign.length} unclaimed file(s) deliberately.`);
    process.exit(0);
  }

  console.error(
    [
      '',
      '  LANE-STAGED GUARD — you are about to commit files you did not claim.',
      '',
      `  ${foreign.length} staged path(s) are outside your lane's EDITING NOW block:`,
      ...foreign.map((f) => `    ${f}`),
      '',
      '  Agents in this repo SHARE ONE GIT INDEX. Another agent staging work you then commit is',
      '  how their files end up in your commit under your name. This has happened three times in',
      '  24 hours, including once by this agent the day after documenting it.',
      '',
      '  FIX — pick one:',
      '    git restore --staged <path>              unstage what is not yours',
      '    node scripts/lane.mjs claim --files ...   claim it, if it IS yours',
      '    --allow-foreign                          deliberate, and greppable afterwards',
      '',
      '  Nothing was committed.',
      '',
    ].join('\n'),
  );
  process.exit(2);
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('lane-staged-guard.mjs')) {
  try {
    main();
  } catch (err) {
    console.error(`[lane-staged] guard error, failing open: ${err?.message}`);
    process.exit(0);
  }
}
