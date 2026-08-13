import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { appendRun, readRuns } from '../../../shared/variantRun.mjs';
import { markWinner, annotateRun } from '../../../shared/variantVerdict.mjs';
import { IMAGE_DIR } from '../../../shared/bracket.mjs';
import { assertInsideArtifactRoot } from '../../../shared/forgeConfig.mjs';

/**
 * THE ONLY CODE IN THIS SUBSYSTEM THAT DELETES FILES, tested as such.
 *
 * "Dry-run by default" and "I exercised it in a throwaway root" were the entire
 * safety story for this script, and both are habits rather than controls. Then a
 * guard silently failed to install and a live run deleted two real images —
 * including the one a human had marked as the WINNER, which lineage protection
 * did not cover.
 *
 * So the protections are now asserted, not asserted-about: the survival of a
 * lineage parent and of a winner are FACTS this file proves, at the most
 * aggressive settings the script accepts.
 */

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'scripts', 'forge-prune.mjs');
const BASE = Object.freeze({
  briefId: 'b_p', runId: 'r_p', provider: 'p', model: 'm', serializer: 'sentence', status: 'ok',
});

function seedStore() {
  const root = mkdtempSync(join(tmpdir(), 'forge-prune-'));
  mkdirSync(join(root, IMAGE_DIR), { recursive: true });
  const mk = (extra = {}) => {
    // imageRef is set the way the bracket sets it. The first version of this
    // helper wrote the PNG but left imageRef null, which is how it discovered
    // that the pruner reported marking rows it had not marked.
    const rec = appendRun({ ...BASE, promptText: 'p', costUsd: 0.004, ...extra }, root);
    const ref = `${IMAGE_DIR.split(sep).join('/')}/${rec.variantId}.png`;
    writeFileSync(join(root, IMAGE_DIR, `${rec.variantId}.png`), Buffer.alloc(2048));
    return annotateRun(rec.variantId, { imageRef: ref }, root);
  };
  return { root, mk };
}

/** Run the pruner as a real subprocess — the way an operator invokes it. */
function prune(root, extra = []) {
  return execFileSync(process.execPath, [SCRIPT, '--root', root, ...extra], { encoding: 'utf8' });
}

test('THE MOST AGGRESSIVE SETTINGS still cannot delete a LINEAGE PARENT', () => {
  const { root, mk } = seedStore();
  try {
    const parent = mk();
    mk({ parentVariantId: parent.variantId });
    prune(root, ['--days', '0', '--max-mb', '0', '--apply', '--i-understand-this-deletes-files']);
    assert.ok(existsSync(join(root, IMAGE_DIR, `${parent.variantId}.png`)),
      'the ancestor of a live refinement chain survived');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('THE MOST AGGRESSIVE SETTINGS still cannot delete a WINNER', () => {
  // The gap a live accident exposed: lineage parents were protected, the image a
  // human had explicitly CHOSEN was not. A retention policy that discards the
  // one artifact a person picked destroys the signal the review loop collects.
  const { root, mk } = seedStore();
  try {
    mk();                                    // a plain sibling, expendable
    const chosen = mk();
    markWinner(chosen.variantId, root);
    prune(root, ['--days', '0', '--max-mb', '0', '--apply', '--i-understand-this-deletes-files']);
    assert.ok(existsSync(join(root, IMAGE_DIR, `${chosen.variantId}.png`)),
      'the image a human picked survived');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('--apply OUTSIDE a terminal refuses without the second acknowledgement', () => {
  // execFileSync gives the child no TTY, which is exactly the cron/agent case.
  const { root, mk } = seedStore();
  try {
    mk(); mk();
    let code = 0;
    let out = '';
    try {
      prune(root, ['--days', '0', '--max-mb', '0', '--apply']);
    } catch (e) { code = e.status; out = String(e.stderr || ''); }
    assert.equal(code, 2, 'must refuse, not proceed');
    assert.match(out, /--i-understand-this-deletes-files/);
    assert.equal(readRuns(root).runs.filter((r) => r.imagePruned).length, 0, 'and nothing was touched');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('DRY RUN is the default and deletes nothing', () => {
  const { root, mk } = seedStore();
  try {
    const a = mk(); mk();
    const out = prune(root, ['--days', '0', '--max-mb', '0']);
    assert.match(out, /DRY RUN/);
    assert.ok(existsSync(join(root, IMAGE_DIR, `${a.variantId}.png`)));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('the ROOT ALLOWLIST refuses a target outside the artifact directory', () => {
  // Not a flag — a code path that cannot be argued with. A mistyped --root must
  // not be able to aim deletion at an arbitrary folder.
  //
  // The guard lives in forgeConfig, NOT in the script, because the first version
  // of this test imported the script to reach it — and the script self-executes
  // and calls process.exit(). That killed the test runner after test 4 while
  // still reporting every completed test as passing. A false green is worse than
  // a red, so nothing here imports a self-executing script.
  const root = mkdtempSync(join(tmpdir(), 'forge-allow-'));
  try {
    assert.throws(() => assertInsideArtifactRoot(join(root, 'etc'), root), /outside the artifact root/);
    assert.throws(() => assertInsideArtifactRoot('/', root), /outside the artifact root/);
    assert.doesNotThrow(() => assertInsideArtifactRoot(join(root, IMAGE_DIR), root));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('a pruned row is MARKED, never removed, and spend survives', () => {
  const { root, mk } = seedStore();
  try {
    mk(); mk();
    prune(root, ['--days', '0', '--max-mb', '0', '--apply', '--i-understand-this-deletes-files']);
    const { runs, skipped } = readRuns(root);
    assert.equal(runs.length, 2, 'no row removed');
    assert.equal(skipped, 0, 'ledger still valid JSONL');
    assert.equal(runs.reduce((s, r) => s + r.costUsd, 0), 0.008, 'spend reconstructable after pruning');
    assert.equal(runs.filter((r) => r.imagePruned === true).length, 2,
      'BOTH deletions recorded — the script once reported marking rows it had not marked');
  } finally { rmSync(root, { recursive: true, force: true }); }
});
