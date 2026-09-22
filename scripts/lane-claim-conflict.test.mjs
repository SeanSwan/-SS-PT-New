#!/usr/bin/env node
/**
 * lane-claim-conflict.test.mjs — S3 acceptance for the F11 claim conflict check
 * ==========================================================================
 * Purpose: prove that `claim` REPORTS a collision with another seat's lock, and
 * that reporting it never blocks the claim. Boundary: fixtures only — a real temp
 * git repo with a real coordination ledger, so the real `readLanes`/`lockMatches`
 * path is exercised. The live ledger is never touched.
 *
 * WHY THIS FILE EXISTS (Astra hostile review, 2026-09-20 — F11):
 *   The protocol's prose implied mutual exclusion while `claim()` read no other
 *   lane at all, so two seats could both inspect an apparently clear target and
 *   both claim it. Astra's prescribed fix is NOT an atomic lock service — the
 *   blueprint forbids that within this discovery-only scope, and the module's own
 *   doctrine is that locks are ADVISORY BROADCAST. It is to make the collision
 *   VISIBLE at the moment it is created. These cases are what make "the collision
 *   is visible" a measurement:
 *
 *     - a colliding claim WARNS and still exits 0 (the claim must land);
 *     - a clean claim stays quiet (or the warning becomes noise and gets ignored);
 *     - a STALE peer lock is reported AS stale, not omitted (R5: a stale claim is
 *       still a claim — the check must mirror that rule, not reinterpret it);
 *     - a failed lane read is announced, never silently skipped.
 *
 * That last case is the one that makes the check trustworthy. A guard that cannot
 * report its own failure reports on itself, and a silent skip is indistinguishable
 * from "no collision" — the exact confusion F11 is about.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, utimesSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, join, sep, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LANE_CLI = join(REPO, 'scripts', 'lane.mjs');

/** A real temp checkout with a real ledger directory. `claim` needs a git repo to
 *  resolve the ledger and the delivery state, so this is a genuine integration
 *  fixture rather than a mocked one. */
function makeRepo() {
  const parent = mkdtempSync(resolve(tmpdir(), 'lane-claim-'));
  const root = join(parent, 'repo');
  mkdirSync(root, { recursive: true });
  const git = (args) => execFileSync('git', args, { cwd: root, stdio: 'ignore' });
  git(['init', '-q']);
  git(['config', 'user.email', 'fixture@test']);
  git(['config', 'user.name', 'fixture']);
  mkdirSync(join(root, '.ai-workflow', 'coordination'), { recursive: true });
  writeFileSync(join(root, 'seed.txt'), 'seed\n');
  git(['add', '--', 'seed.txt']);
  git(['commit', '-q', '-m', 'seed']);
  return { parent, root, ledger: join(root, '.ai-workflow', 'coordination') };
}

function writePeerLane(ledger, name, locks, { ageMinutes = 0 } = {}) {
  const path = join(ledger, name);
  writeFileSync(path, [
    `# peer — Live Lane (session: ${name.replace('.lane.md', '')})`,
    `Updated: ${new Date(Date.now() - ageMinutes * 60000).toISOString()}`,
    'Status: in-progress',
    'Task: holding files',
    '',
    '## EDITING NOW',
    ...locks.map((l) => `- ${l}`),
    '',
  ].join('\n'));
  if (ageMinutes > 0) {
    const t = (Date.now() - ageMinutes * 60000) / 1000;
    utimesSync(path, t, t);
  }
  return path;
}

function claim(root, files) {
  /* BOTH streams. The claim succeeds (exit 0) and prints its confirmation on
   * stdout, while the COLLISION warning goes to stderr — so a success-only read of
   * stdout would see a clean run and this suite would pass against a broken check.
   * Measured: the first revision of this file did exactly that and failed on the
   * warning cases for a reason that had nothing to do with the code under test. */
  try {
    const res = spawnSync(process.execPath, [
      LANE_CLI, 'claim', '--task', 'fixture claim', '--files', files.join(','),
    ], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, SWAN_AGENT_SURFACE: 'fixture-agent' },
    });
    return { code: res.status ?? 1, out: `${res.stdout ?? ''}${res.stderr ?? ''}` };
  } catch (err) {
    return { code: err.status ?? 1, out: `${err.stdout ?? ''}${err.stderr ?? ''}` };
  }
}

function cleanup({ parent, root }) {
  assert.ok(resolve(root).startsWith(resolve(tmpdir()) + sep), 'refusing cleanup outside tmp');
  assert.ok(resolve(root).startsWith(resolve(parent) + sep), 'refusing cleanup outside its own parent');
  rmSync(parent, { recursive: true, force: true });
}

test('a colliding claim warns loudly and still lands', () => {
  const fx = makeRepo();
  try {
    writePeerLane(fx.ledger, 'peer--other-s1111111.lane.md', ['scripts/lane.mjs']);
    const { code, out } = claim(fx.root, ['scripts/lane.mjs']);
    assert.equal(code, 0, 'the claim must land — reporting a collision must not block it');
    assert.match(out, /COLLISION/);
    assert.match(out, /peer--other-s1111111\.lane\.md/, 'the colliding lane must be named');
    assert.match(out, /scripts\/lane\.mjs/, 'the colliding path must be named');
  } finally {
    cleanup(fx);
  }
});

test('a clean claim stays quiet', () => {
  const fx = makeRepo();
  try {
    writePeerLane(fx.ledger, 'peer--other-s1111111.lane.md', ['scripts/lane.mjs']);
    const { code, out } = claim(fx.root, ['docs/unrelated.md']);
    assert.equal(code, 0);
    assert.doesNotMatch(out, /COLLISION/, 'a clean claim must not warn, or the warning becomes noise');
    assert.match(out, /no other seat's lock matches/);
  } finally {
    cleanup(fx);
  }
});

test('a lock matching by exact path and by basename both collide', () => {
  const fx = makeRepo();
  try {
    writePeerLane(fx.ledger, 'peer--a-s1111111.lane.md', ['scripts/lib/lane-discovery.mjs']);
    assert.match(claim(fx.root, ['scripts/lib/lane-discovery.mjs']).out, /COLLISION/);
  } finally {
    cleanup(fx);
  }
});

test('a stale peer lock is reported AS stale, never omitted', () => {
  const fx = makeRepo();
  try {
    // 20 days old: far past the 30-minute advisory threshold. R5 says a stale
    // claim is STILL A CLAIM, so the check must surface it and label it — not
    // treat age as a release, which would be the check disagreeing with the rule.
    writePeerLane(fx.ledger, 'peer--old-s1111111.lane.md', ['scripts/lane.mjs'], { ageMinutes: 20 * 24 * 60 });
    const { out } = claim(fx.root, ['scripts/lane.mjs']);
    assert.match(out, /COLLISION/);
    assert.match(out, /STALE/);
    assert.match(out, /still a claim/, 'the stale label must say the claim still stands');
  } finally {
    cleanup(fx);
  }
});

test('the claim is recorded on disk even when a collision is reported', () => {
  const fx = makeRepo();
  try {
    writePeerLane(fx.ledger, 'peer--other-s1111111.lane.md', ['scripts/lane.mjs']);
    claim(fx.root, ['scripts/lane.mjs']);
    const mine = readLaneFiles(fx.ledger).find((n) => n.startsWith('fixture-agent'));
    assert.ok(mine, `the claiming seat's lane file must exist, found: ${readLaneFiles(fx.ledger).join(', ')}`);
    const body = readFileSync(join(fx.ledger, mine), 'utf8');
    assert.match(body, /scripts\/lane\.mjs/, 'the claim must list the colliding file');
    assert.match(body, /Status: in-progress/);
  } finally {
    cleanup(fx);
  }
});

test('a claim with no --files performs no check and does not warn', () => {
  const fx = makeRepo();
  try {
    writePeerLane(fx.ledger, 'peer--other-s1111111.lane.md', ['scripts/lane.mjs']);
    const { code, out } = claim(fx.root, []);
    assert.equal(code, 0);
    assert.doesNotMatch(out, /COLLISION/, 'nothing was claimed, so nothing can collide');
  } finally {
    cleanup(fx);
  }
});

// imported late so the module list stays readable above
function readLaneFiles(ledger) {
  return readdirSync(ledger).filter((f) => f.endsWith('.lane.md'));
}
