import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildRecord, appendRun, readRuns, lineage, newVariantId,
  ratioToNumber, aspectDeviation, promptSha,
  RunError, RECORD_VERSION, ASPECT_TOLERANCE, RUN_DIR, LEDGER_FILE, refine,
} from '../../../shared/variantRun.mjs';

const BASE = Object.freeze({
  briefId: 'b_hero_01', provider: 'openai/gpt-5.4-image-2',
  model: 'openai/gpt-5.4-image-2', serializer: 'sentence', status: 'ok',
});

function tmpRoot() {
  return mkdtempSync(join(tmpdir(), 'forge-runs-'));
}

test('a record with the required fields validates and is fully shaped', () => {
  const r = buildRecord({ ...BASE, promptText: 'a frozen lake', createdAt: '2026-08-12T00:00:00.000Z' });
  assert.equal(r.recordVersion, RECORD_VERSION);
  assert.equal(r.briefId, 'b_hero_01');
  assert.equal(r.parentVariantId, null);
  assert.match(r.variantId, /^v_[0-9a-f]{16}$/);
  assert.equal(r.promptSha, promptSha('a frozen lake'));
  assert.equal(r.promptChars, 13);
  assert.equal(r.seedHonored, 'unknown');   // never assumed
});

test('EVERY required field is enforced — a nameless variant cannot enter the ledger', () => {
  for (const missing of ['briefId', 'provider', 'model', 'serializer']) {
    const input = { ...BASE };
    delete input[missing];
    assert.throws(() => buildRecord(input), (e) => e instanceof RunError && e.code === 'E_RUN_INVALID',
      `expected ${missing} to be required`);
  }
});

test('status and seedHonored are closed enumerations, not free text', () => {
  assert.throws(() => buildRecord({ ...BASE, status: 'fine' }), /status must be one of/);
  assert.throws(() => buildRecord({ ...BASE, status: undefined }), /status must be one of/);
  assert.throws(() => buildRecord({ ...BASE, seedHonored: true }), /seedHonored must be one of/);
  for (const s of ['ok', 'safety-reject', 'error']) {
    assert.equal(buildRecord({ ...BASE, status: s }).status, s);
  }
});

test('a MALFORMED parentVariantId is refused — lineage is the one thing this record exists to keep', () => {
  assert.throws(() => buildRecord({ ...BASE, parentVariantId: 'nope' }), /parentVariantId/);
  assert.throws(() => buildRecord({ ...BASE, parentVariantId: '' }), /parentVariantId/);
  assert.throws(() => buildRecord({ ...BASE, parentVariantId: 123 }), /parentVariantId/);
  const parent = newVariantId();
  assert.equal(buildRecord({ ...BASE, parentVariantId: parent }).parentVariantId, parent);
});

test('aspect deviation is MEASURED, and an unmeasurable one is null — never a fake zero', () => {
  // GPT returns 1536x864 for a 16:9 request: exact.
  const exact = buildRecord({ ...BASE, aspectRequested: '16:9', actualWidth: 1536, actualHeight: 864 });
  assert.equal(exact.actualAspect, 1.7778);
  assert.equal(exact.aspectDeviation, 0);
  assert.equal(exact.aspectOutOfTolerance, false);

  // Gemini clamps a 16:9 request to 1376x768 = 1.792. MEASURED deviation: 0.78%,
  // which sits just UNDER the 1% tolerance — so ordinary provider clamping is
  // recorded but deliberately not alarmed on. Pinning the real number here
  // because the first version of this test asserted my assumption (">1%") rather
  // than the measurement, and the assumption was wrong.
  const clamped = buildRecord({ ...BASE, aspectRequested: '16:9', actualWidth: 1376, actualHeight: 768 });
  assert.equal(clamped.aspectDeviation, 0.0078);
  assert.equal(clamped.aspectOutOfTolerance, false);
  assert.equal(clamped.actualAspect, 1.7917);   // recorded regardless — visibility is the point

  // THE CASE THIS FLAG EXISTS FOR: a square returned for a 16:9 request. That is
  // exactly what the wrong endpoint did for an entire session — 1024x1024 for
  // every cinematic brief — and nothing in the system noticed.
  const square = buildRecord({ ...BASE, aspectRequested: '16:9', actualWidth: 1024, actualHeight: 1024 });
  assert.equal(square.aspectDeviation, 0.4375);
  assert.ok(square.aspectDeviation > ASPECT_TOLERANCE);
  assert.equal(square.aspectOutOfTolerance, true);

  // No dimensions read (URL delivery, unknown format): null, NOT zero. A silent
  // zero would read as "verified exact" — the precise lie this field prevents.
  const unknown = buildRecord({ ...BASE, aspectRequested: '16:9' });
  assert.equal(unknown.actualAspect, null);
  assert.equal(unknown.aspectDeviation, null);
  assert.equal(unknown.aspectOutOfTolerance, null);
});

test('ratioToNumber refuses anything that is not a ratio', () => {
  assert.equal(ratioToNumber('16:9'), 16 / 9);
  assert.equal(ratioToNumber('1:1'), 1);
  for (const junk of ['cinematic', '', null, undefined, '16:0', '0:9', '16-9', 'a:b', '1:2:3']) {
    assert.equal(ratioToNumber(junk), null, `expected null for ${JSON.stringify(junk)}`);
  }
});

test('aspectDeviation returns null when either side is unknown', () => {
  assert.equal(aspectDeviation('16:9', null, 864), null);
  assert.equal(aspectDeviation('16:9', 1536, 0), null);
  assert.equal(aspectDeviation('nonsense', 1536, 864), null);
});

test('the ledger round-trips through disk', () => {
  const root = tmpRoot();
  try {
    const written = appendRun({ ...BASE, promptText: 'one' }, root);
    appendRun({ ...BASE, promptText: 'two' }, root);
    const { runs, skipped } = readRuns(root);
    assert.equal(runs.length, 2);
    assert.equal(skipped, 0);
    assert.equal(runs[0].variantId, written.variantId);
    assert.equal(runs[0].promptSha, promptSha('one'));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('appendRun VALIDATES — a bad record cannot reach the ledger through the writer', () => {
  const root = tmpRoot();
  try {
    assert.throws(() => appendRun({ ...BASE, status: 'whatever' }, root), /status must be one of/);
    assert.equal(readRuns(root).runs.length, 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('a CORRUPT line is skipped and COUNTED, not thrown on', () => {
  // An interrupted run leaves a half-written final line. That must not make the
  // entire history unreadable — but the damage has to be visible, not swallowed.
  const root = tmpRoot();
  try {
    appendRun({ ...BASE }, root);
    mkdirSync(join(root, RUN_DIR), { recursive: true });
    writeFileSync(join(root, LEDGER_FILE), `${JSON.stringify(buildRecord(BASE))}\n{"half-writt`, { flag: 'a' });
    const { runs, skipped } = readRuns(root);
    assert.equal(runs.length, 2);
    assert.equal(skipped, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('a prompt containing NEWLINES cannot split one record into two ledger rows', () => {
  // JSONL integrity: readRuns splits on '\n', so an unescaped newline inside a
  // field would silently become a second, corrupt row. JSON.stringify escapes
  // it — but this is the assumption the whole storage format rests on, so it is
  // asserted rather than trusted.
  const root = tmpRoot();
  try {
    const nasty = 'line one\nline two\r\n{"fake":"row"}\nline four';
    appendRun({ ...BASE, promptText: nasty, notes: 'a\nb' }, root);
    const { runs, skipped } = readRuns(root);
    assert.equal(runs.length, 1, 'exactly one row, not four');
    assert.equal(skipped, 0);
    assert.equal(runs[0].promptText, nasty, 'and it round-trips byte-for-byte');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('readRuns on a missing ledger is empty, not an error', () => {
  const root = tmpRoot();
  try {
    assert.deepEqual(readRuns(root), { runs: [], skipped: 0 });
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('LINEAGE walks a refinement chain back to its root', () => {
  // This is the whole reason parentVariantId exists: round 2 is a refinement of
  // round 1's winner, not a fresh lottery, and the chain proves which.
  const root = buildRecord({ ...BASE, promptText: 'round1' });
  const mid = buildRecord({ ...BASE, promptText: 'round2', parentVariantId: root.variantId });
  const leaf = buildRecord({ ...BASE, promptText: 'round3', parentVariantId: mid.variantId });
  const sibling = buildRecord({ ...BASE, promptText: 'other', parentVariantId: root.variantId });

  const chain = lineage(leaf.variantId, [root, mid, leaf, sibling]);
  assert.deepEqual(chain.map((r) => r.variantId), [leaf.variantId, mid.variantId, root.variantId]);
  assert.equal(lineage(root.variantId, [root, mid, leaf]).length, 1);
  assert.deepEqual(lineage('v_0000000000000000', [root]), []);
});

test('lineage is CYCLE-GUARDED — a malformed ledger must not hang a caller', () => {
  const a = buildRecord({ ...BASE, promptText: 'a' });
  const b = buildRecord({ ...BASE, promptText: 'b', parentVariantId: a.variantId });
  const cyclic = [{ ...a, parentVariantId: b.variantId }, b];   // a -> b -> a
  const chain = lineage(a.variantId, cyclic);
  assert.equal(chain.length, 2);
});

test('safetyEvents must be an array, and a rejection is a first-class recorded outcome', () => {
  assert.throws(() => buildRecord({ ...BASE, safetyEvents: 'rejected' }), /safetyEvents must be an array/);
  const r = buildRecord({
    ...BASE, serializer: 'tag', status: 'safety-reject',
    safetyEvents: [{ code: 'E_PROVIDER_SAFETY_REJECT', httpStatus: 400 }],
  });
  assert.equal(r.status, 'safety-reject');
  assert.equal(r.safetyEvents.length, 1);
  // The measured 60% tag-rejection rate becomes queryable state instead of a
  // paragraph in a review document that nobody can filter on.
  assert.equal(r.serializer, 'tag');
});

test('a BUILT record is re-validated on append — the version stamp is not a trust token', () => {
  // Found by an adversarial pass on this very file: appendRun trusted anything
  // carrying `recordVersion: 1` and skipped every check, so a hand-assembled row
  // with a garbage status reached the ledger untouched. A fail-closed validator
  // with a trust-the-stamp bypass is not fail-closed.
  const root = tmpRoot();
  try {
    const good = buildRecord({ ...BASE, promptText: 'real prompt' });
    assert.throws(() => appendRun({ ...good, status: 'garbage' }, root), /status must be one of/);
    assert.throws(() => appendRun({ ...good, parentVariantId: 'bogus' }, root), /parentVariantId/);
    assert.throws(() => appendRun({ ...good, briefId: '' }, root), /briefId is required/);
    assert.equal(readRuns(root).runs.length, 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('re-appending a BUILT record preserves its promptSha instead of rehashing nothing', () => {
  // The reason appendRun re-validates rather than re-builds: a built record has
  // `promptSha` but no `promptText`, so rebuilding would replace a real hash
  // with the hash of an empty string and nothing would ever notice.
  const root = tmpRoot();
  try {
    const built = buildRecord({ ...BASE, promptText: 'a frozen lake seen through cracked ice' });
    appendRun(built, root);
    const { runs } = readRuns(root);
    assert.equal(runs[0].promptSha, promptSha('a frozen lake seen through cracked ice'));
    assert.notEqual(runs[0].promptSha, promptSha(''));
    assert.equal(runs[0].variantId, built.variantId);
    assert.equal(runs[0].createdAt, built.createdAt);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('refine() derives a child that inherits SETUP but never its parent EVIDENCE', () => {
  const parent = buildRecord({
    ...BASE, promptText: 'round one', createdAt: '2026-01-01T00:00:00.000Z',
    costUsd: 0.0044, wallMs: 19_900, actualWidth: 1536, actualHeight: 864,
    aspectRequested: '16:9', safetyEvents: [{ code: 'x' }], status: 'ok',
  });
  const child = refine(parent, { promptText: 'round two, warmer', status: 'ok' });

  // inherited: what identifies the lineage and the setup
  assert.equal(child.briefId, parent.briefId);
  assert.equal(child.provider, parent.provider);
  assert.equal(child.serializer, parent.serializer);
  assert.equal(child.parentVariantId, parent.variantId);

  // NOT inherited: facts about an image that has not been generated yet.
  // Copying these forward would let a child inherit its parent's evidence.
  assert.equal(child.costUsd, null);
  assert.equal(child.wallMs, null);
  assert.equal(child.actualWidth, null);
  assert.equal(child.actualAspect, null);
  assert.deepEqual(child.safetyEvents, []);
  assert.notEqual(child.variantId, parent.variantId);
  assert.notEqual(child.createdAt, parent.createdAt);
  assert.equal(child.promptSha, promptSha('round two, warmer'));
});

test('THE LEDGER CAN REPRODUCE A WINNER — prompt and seed both survive the round trip', () => {
  // The point of the whole record. An earlier version stored only promptSha, so
  // a winner could be identified and never re-issued — seed without prompt is
  // half a reproduction, and a tournament you cannot replay is a casino.
  const root = tmpRoot();
  try {
    const prompt = "A photograph: Hiroshi Sugimoto's long-exposure seascape depicting a frozen lake.";
    appendRun({ ...BASE, promptText: prompt, seedRequested: 424242 }, root);
    const [winner] = readRuns(root).runs;
    assert.equal(winner.promptText, prompt);
    assert.equal(winner.seedRequested, 424242);
    assert.equal(winner.promptSha, promptSha(prompt));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('refine() with no new wording is a RE-ROLL — same prompt, fresh identity', () => {
  const parent = buildRecord({ ...BASE, promptText: 'a frozen lake', status: 'ok' });
  const reroll = refine(parent, { seedRequested: 99, status: 'ok' });
  assert.equal(reroll.promptText, 'a frozen lake');
  assert.equal(reroll.promptSha, parent.promptSha);
  assert.notEqual(reroll.variantId, parent.variantId);
  assert.equal(reroll.parentVariantId, parent.variantId);
});

test('refine() REFUSES raw input — a child of nothing is not a lineage', () => {
  assert.throws(() => refine({ ...BASE }), /refine\(\) needs a built parent/);
  assert.throws(() => refine(null), /refine\(\) needs a built parent/);
  assert.throws(() => refine({ ...buildRecord(BASE), variantId: 'bogus' }), /refine\(\) needs a built parent/);
});

test('variantIds do not collide across a realistic tournament', () => {
  const ids = new Set(Array.from({ length: 5000 }, () => newVariantId()));
  assert.equal(ids.size, 5000);
});
