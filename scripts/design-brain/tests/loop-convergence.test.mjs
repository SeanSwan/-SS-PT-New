/**
 * loop-convergence.test.mjs — END-TO-END tests over the REAL CLI entrypoints.
 * =============================================================================
 * Why this file exists (2026-09-18):
 *
 * `hostile-regressions.test.mjs` tests the PURE CORES — `renderPacket` given an `adjudicatedIds`
 * set, `corroborateBatch` given a `grownProposed` array. Mutation testing proved that is not enough:
 * reverting the F1 fix in `packet.mjs` main() (dropping `adjudicatedIds` from the call) left the
 * whole suite GREEN at 55/55. The unit tests pin the function; nothing pinned the WIRING — and the
 * wiring is where F1 and F2 actually lived.
 *
 * So these tests drive the documented workflow exactly as Sean does — `node src/<step>.mjs --root …`
 * as separate processes, editing the batch file by hand — and assert on the artifacts. They fail if
 * a step stops being called, stops passing its arguments, or stops converging.
 *
 * The lesson they encode: a suite that is green while the loop does not converge is the defect, not
 * the proof. Drive the loop at least twice.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SRC = dirname(dirname(fileURLToPath(import.meta.url)));
const NODE = process.execPath;
const DAY = new Date().toISOString().slice(0, 10);

const P1 = 'log sets inline without leaving the active workout screen';

function run(root, script, ...args) {
  const r = spawnSync(NODE, [join(SRC, 'src', script), '--root', root, ...args], { encoding: 'utf8' });
  return r;
}

function logReceipt(root, { id, product, principle, domain = 'D01' }) {
  const receipt = {
    receiptId: id, domainId: domain, product, refType: 'screen', surface: 'Logger', platform: 'ios',
    stepCount: 4,
    hierarchyNotes: 'Primary action is thumb-reachable and the logger never unmounts mid-set; flat hierarchy.',
    principleCandidates: [principle],
    inspectorActorId: 'sean', openedAtUtc: '2026-09-18T20:00:00.000Z',
  };
  const r = spawnSync(NODE, [join(SRC, 'src', 'log-receipt.mjs'), '--root', root],
    { input: JSON.stringify(receipt), encoding: 'utf8' });
  assert.equal(r.status, 0, `log-receipt failed: ${r.stderr}`);
  return receipt;
}

function claimsIn(root) {
  const p = join(root, 'claims.jsonl');
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

/** Fold claims.jsonl to latest rev per id, the way loadClaims does. */
function folded(root) {
  const m = new Map();
  for (const c of claimsIn(root)) {
    const prev = m.get(c.claimId);
    if (!prev || (c.rev ?? 1) >= (prev.rev ?? 1)) m.set(c.claimId, c);
  }
  return [...m.values()];
}

function runPacket(root) {
  const r = run(root, 'packet.mjs');
  assert.equal(r.status, 0, `packet failed: ${r.stderr}`);
  // Trust the CLI's own report of where it wrote — do NOT guess the filename. A lexicographic
  // sort of the batches dir picks BATCH-<day>.md over BATCH-<day>-<hhmm>.md ('-' < '.'), i.e. the
  // STALE file, which made an earlier version of this test read the wrong artifact entirely.
  const m = r.stdout.match(/packet -> (.+?)\s*$/m);
  assert.ok(m, `could not read the packet path from stdout: ${r.stdout}`);
  const file = m[1].trim();
  return { file, md: readFileSync(file, 'utf8'), claims: packetClaimsIn(file) };
}

function packetClaimsIn(file) {
  const md = readFileSync(file, 'utf8');
  return [...md.matchAll(/^### (CLM-[A-Za-z0-9-]+)/gm)].map((m) => m[1]);
}

/** Accept every claim in the given batch, the way Sean edits it by hand. */
function acceptAll(file) {
  writeFileSync(file, readFileSync(file, 'utf8').replace(/^DECIDE: _/gm, 'DECIDE: a'));
  return file;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE convergence test. This is the one that would have caught F1.
// ─────────────────────────────────────────────────────────────────────────────
test('CONVERGENCE: after adjudication, later cycles present ZERO claims to adjudicate', () => {
  const root = mkdtempSync(join(tmpdir(), 'db-conv-'));
  try {
    logReceipt(root, { id: 'RCP-0001', product: 'Hevy', principle: P1 });
    logReceipt(root, { id: 'RCP-0002', product: 'Strong', principle: P1 });

    // cycle 1 — the real documented loop
    assert.equal(run(root, 'synthesize.mjs').status, 0);
    assert.equal(run(root, 'corroborate.mjs').status, 0);
    const c1 = runPacket(root);
    assert.equal(c1.claims.length, 1, 'cycle 1 should present the one converged claim');

    const batch = acceptAll(c1.file);
    const adj = run(root, 'adjudicate.mjs', '--batch', batch);
    assert.equal(adj.status, 0, `adjudicate failed: ${adj.stderr}`);
    assert.equal(folded(root).filter((c) => c.status === 'accepted').length, 1);

    // cycle 2 — NO new receipts. The loop must converge.
    assert.equal(run(root, 'synthesize.mjs').status, 0);
    assert.equal(run(root, 'corroborate.mjs').status, 0);
    const c2 = runPacket(root);
    assert.deepEqual(c2.claims, [], `cycle 2 must present 0 claims, got ${JSON.stringify(c2.claims)}`);
    assert.match(c2.md, /already adjudicated and withheld/, 'the packet must say WHY the claim is withheld');

    // cycle 3 — idempotent, still zero
    assert.equal(run(root, 'synthesize.mjs').status, 0);
    assert.equal(run(root, 'corroborate.mjs').status, 0);
    assert.deepEqual(runPacket(root).claims, [], 'cycle 3 must also present 0 claims');

    // and the ledger did not accumulate duplicates
    assert.equal(claimsIn(root).length, 1, 'exactly one claim row — no re-import drift');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// F1's other half, end to end: a letter aimed at a decided claim must be LOUD.
// ─────────────────────────────────────────────────────────────────────────────
test('CONVERGENCE: re-adjudicating a decided claim reports it and exits 5, never a bare "0"', () => {
  const root = mkdtempSync(join(tmpdir(), 'db-conv2-'));
  try {
    logReceipt(root, { id: 'RCP-0001', product: 'Hevy', principle: P1 });
    logReceipt(root, { id: 'RCP-0002', product: 'Strong', principle: P1 });
    run(root, 'synthesize.mjs');
    run(root, 'corroborate.mjs');
    const c1 = runPacket(root);
    const batch = acceptAll(c1.file);
    assert.equal(run(root, 'adjudicate.mjs', '--batch', batch).status, 0);

    // Reproduce the REAL cycle: synthesize regenerates the claim back into claims-proposed (with
    // status proposed), which is exactly how a decided claim reappeared. Without this step the
    // batch is simply stale and a silent 0 is correct.
    assert.equal(run(root, 'synthesize.mjs').status, 0);

    // re-run the SAME batch: its letters now point at an already-decided claim
    const again = run(root, 'adjudicate.mjs', '--batch', batch);
    assert.equal(again.status, 5, 'must exit non-zero so a script cannot read this as success');
    assert.match(again.stderr, /IGNORED/);
    assert.match(again.stderr, /already adjudicated/);
    assert.equal(claimsIn(root).length, 1, 'must not double-import');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// F2's WIRING, end to end: runCorroborate must compute grownProposed itself.
// The unit test passes grownProposed in; nothing checked that the CLI derives it.
// ─────────────────────────────────────────────────────────────────────────────
test('CONVERGENCE: a byte-identical restatement from new products reaches the ASSET via the CLI', () => {
  const root = mkdtempSync(join(tmpdir(), 'db-conv3-'));
  try {
    logReceipt(root, { id: 'RCP-0001', product: 'Hevy', principle: P1 });
    logReceipt(root, { id: 'RCP-0002', product: 'Strong', principle: P1 });
    run(root, 'synthesize.mjs');
    run(root, 'corroborate.mjs');
    const c1 = runPacket(root);
    const batch = acceptAll(c1.file);
    assert.equal(run(root, 'adjudicate.mjs', '--batch', batch).status, 0);

    const claimId = folded(root)[0].claimId;
    assert.deepEqual(folded(root)[0].products.sort(), ['Hevy', 'Strong']);

    // five NEW products restate the accepted principle byte-identically
    for (const [i, p] of ['Fitbod', 'Jefit', 'Liftin', 'Gymshark', 'RP'].entries()) {
      logReceipt(root, { id: `RCP-100${i + 1}`, product: p, principle: P1 });
    }
    assert.equal(run(root, 'synthesize.mjs').status, 0);
    const corr = run(root, 'corroborate.mjs');
    assert.equal(corr.status, 0, corr.stderr);
    assert.match(corr.stdout, /1 with grown evidence/, 'the CLI must report that it found grown evidence');

    const after = folded(root).find((c) => c.claimId === claimId);
    assert.deepEqual(
      after.products.sort(),
      ['Fitbod', 'Gymshark', 'Hevy', 'Jefit', 'Liftin', 'RP', 'Strong'],
      'the ASSET must absorb all five new products',
    );
    assert.equal(after.confidence.level, 'high', '7 independent products => high');
    assert.equal(after.rev, 2, 'the change must be an append with rev+1');
    assert.ok(after.autoUpdate, 'the change must be auditable');

    // no orphaned receipts: every logged receipt is linked to a claim
    const referenced = new Set(folded(root).flatMap((c) => c.receiptRefs));
    const logged = readFileSync(join(root, 'receipts.jsonl'), 'utf8').trim().split('\n')
      .map((l) => JSON.parse(l).receiptId);
    const orphans = logged.filter((r) => !referenced.has(r));
    assert.deepEqual(orphans, [], `orphaned receipts: ${orphans.join(', ')}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// F8's WIRING: the packet must not clobber an edited batch.
// ─────────────────────────────────────────────────────────────────────────────
test('CONVERGENCE: a second packet run preserves the edited batch and writes a sibling', () => {
  const root = mkdtempSync(join(tmpdir(), 'db-conv4-'));
  try {
    logReceipt(root, { id: 'RCP-0001', product: 'Hevy', principle: P1 });
    run(root, 'synthesize.mjs');
    run(root, 'corroborate.mjs');
    const c1 = runPacket(root);
    const first = c1.file;
    writeFileSync(first, readFileSync(first, 'utf8').replace(/^DECIDE: _/gm, 'DECIDE: a'));

    const second = run(root, 'packet.mjs');
    assert.equal(second.status, 0);
    assert.match(second.stdout, /preserved/, 'the CLI must announce the preservation');
    assert.match(readFileSync(first, 'utf8'), /DECIDE: a/, 'the human edit must survive');

    const files = readdirSync(join(root, 'batches')).filter((f) => f.endsWith('.md'));
    assert.equal(files.length, 2, `expected a timestamped sibling, got ${files.join(', ')}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
