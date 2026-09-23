import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { appendRun, readRuns, RunError } from '../../../shared/variantRun.mjs';
import { markWinner } from '../../../shared/variantVerdict.mjs';
import { compileImage } from '../../../shared/swanPromptCompiler.mjs';
import { capabilities } from '../../../shared/providers/openrouterModels.mjs';

const BASE = Object.freeze({
  briefId: 'b_w', provider: 'openai/gpt-5.4-image-2',
  model: 'openai/gpt-5.4-image-2', serializer: 'sentence', status: 'ok',
});
const tmpRoot = () => mkdtempSync(join(tmpdir(), 'forge-winner-'));

/* ---------------- Slice 6: the human's verdict is RECORDED ---------------- */

test('markWinner records a pick and UNMARKS its siblings in the same run', () => {
  // `pick` used to only print. The one quality signal this system has is Sean's
  // eye, and it evaporated the moment the terminal scrolled.
  const root = tmpRoot();
  try {
    const a = appendRun({ ...BASE, runId: 'r1', promptText: 'a' }, root);
    const b = appendRun({ ...BASE, runId: 'r1', promptText: 'b' }, root);
    const other = appendRun({ ...BASE, runId: 'r2', promptText: 'c' }, root);

    assert.equal(a.winner, false, 'nothing is a winner until a human says so');
    markWinner(b.variantId, root);

    const rows = Object.fromEntries(readRuns(root).runs.map((r) => [r.variantId, r]));
    assert.equal(rows[b.variantId].winner, true);
    assert.equal(rows[a.variantId].winner, false, 'a sibling in the same run lost');
    assert.equal(rows[other.variantId].winner, false, 'a different run is untouched by default');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('re-picking moves the crown rather than creating two winners', () => {
  const root = tmpRoot();
  try {
    const a = appendRun({ ...BASE, runId: 'r1', promptText: 'a' }, root);
    const b = appendRun({ ...BASE, runId: 'r1', promptText: 'b' }, root);
    markWinner(a.variantId, root);
    markWinner(b.variantId, root);
    const winners = readRuns(root).runs.filter((r) => r.winner);
    assert.equal(winners.length, 1, 'exactly one winner per run');
    assert.equal(winners[0].variantId, b.variantId);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('marking ANNOTATES — it never appends a row or loses one', () => {
  // A verdict is not a generation. Appending would inflate a ledger whose whole
  // purpose is reconstructing real spend.
  const root = tmpRoot();
  try {
    const a = appendRun({ ...BASE, runId: 'r1', promptText: 'a', costUsd: 0.004 }, root);
    appendRun({ ...BASE, runId: 'r1', promptText: 'b', costUsd: 0.004 }, root);
    markWinner(a.variantId, root);
    const { runs, skipped } = readRuns(root);
    assert.equal(runs.length, 2, 'no new row');
    assert.equal(skipped, 0, 'and the file is still valid JSONL');
    assert.equal(runs.reduce((s, r) => s + r.costUsd, 0), 0.008, 'spend unchanged');
    assert.equal(runs[0].promptText, 'a', 'the rest of the row survives rewriting');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('markWinner refuses an unknown id rather than silently doing nothing', () => {
  const root = tmpRoot();
  try {
    appendRun({ ...BASE, promptText: 'a' }, root);
    assert.throws(() => markWinner('v_0000000000000000', root),
      (e) => e instanceof RunError && /No variant/.test(e.message));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

/* ------- Slice 5: a dead capability is unrepresentable, and asking throws ---- */

const BRIEF = { briefId: 'b_c', text: 'a frozen lake at dawn', intent: 'hero', aspect: '16:9' };

test('asking for a QUARANTINED capability throws instead of silently no-opping', () => {
  // Both parameters are accepted, BILLED, and inert on this provider. Quietly
  // ignoring the request is how a caller believes they got reproducibility they
  // never had — the same class of lie as an unchecked aspect ratio.
  const caps = capabilities();
  assert.throws(() => compileImage({ ...BRIEF, requireSeed: true }, caps),
    (e) => e.code === 'E_CAPABILITY_UNAVAILABLE' && /replaying the exact prompt/.test(e.message));
  assert.throws(() => compileImage({ ...BRIEF, initImage: 'data:image/png;base64,AAA' }, caps),
    (e) => e.code === 'E_CAPABILITY_UNAVAILABLE' && /billed more/.test(e.message));
});

test('an ordinary brief is unaffected by the capability guard', () => {
  const c = compileImage(BRIEF, capabilities());
  assert.ok(c.promptText.length > 20);
  assert.equal(c.params.seed, undefined, 'and no seed is transmitted');
});

test('the guard reports EVERY unavailable capability at once, not just the first', () => {
  assert.throws(
    () => compileImage({ ...BRIEF, requireSeed: true, initImage: 'x' }, capabilities()),
    (e) => /seed/.test(e.message) && /image-init/.test(e.message),
  );
});
