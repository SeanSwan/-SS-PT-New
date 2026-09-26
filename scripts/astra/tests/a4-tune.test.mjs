/**
 * a4-tune.test.mjs — the Tune pane's contract: stage, preview, atomic commit, byte-exact revert.
 *
 * EVERY TEST WRITES TO A TEMP COPY, NEVER TO `config/tuning.json`. The real config is a
 * hand-formatted file whose `$comment` explains why the thresholds hold their values, and a
 * test suite that mutated it would be a test suite that can corrupt the engine's tuning.
 * The copy is made per test and removed in `finally`.
 *
 * `T-M-07` IS THE REASON THIS SLICE IS A TEXT EDIT AND NOT A JSON ROUND-TRIP. "Byte-for-byte
 * preservation of the untouched regions" cannot be satisfied by parse → stringify: that
 * reformats the file, destroys the `$comment` paragraph, and normalises line endings. The
 * test below measures the changed byte SPAN, not just the changed value.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, copyFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { TUNING_PATH } from '../core/paths.mjs';
import { readTuning, flattenTuning, tuningView } from '../core/tuning.mjs';
import {
  commitStaged, revertLast, applyPatch, surgicalPatch, detectEol, atomicWrite, readPrior, sha,
} from '../core/tuningStage.mjs';
import { previewStaged, readPairs } from '../core/tuningPreview.mjs';

const ORIGINAL = readFileSync(TUNING_PATH, 'utf8');

/** A scratch dir holding a private copy of the config. Removed by the caller. */
function scratch(cfgText = ORIGINAL, name = 'tuning.json') {
  const dir = mkdtempSync(join(tmpdir(), 'astra-a4-'));
  const cfg = join(dir, name);
  writeFileSync(cfg, cfgText, 'utf8');
  return { dir, cfg, prior: `${cfg}.prior.jsonl`, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

const NOTE = 'a4 test note, long enough to pass the minimum';

/**
 * The expected text after changing ONE value — and it must target the VALUE, not the first
 * occurrence of the string.
 *
 * `ORIGINAL.replace('0.82', '0.75')` hits the `$comment` paragraph, which contains the
 * sentence "AUTO.S to 0.82 because …". A test written that way asserts that the commit
 * rewrote the file's PROSE, which is the opposite of what the surgical patch must do. This
 * helper locates `"S": 0.82` and leaves the comment alone — and the tests below assert that
 * the comment still carries the OLD number, because prose about history must not be edited.
 */
const withValue = (text, leaf, from, to) => {
  const re = new RegExp(`("${leaf}"\\s*:\\s*)${String(from).replace('.', '\\.')}`);
  assert.match(text, re, `the fixture text must contain "${leaf}": ${from}`);
  return text.replace(re, `$1${to}`);
};

// ---------------------------------------------------------------------------
// T-M-07 — byte-for-byte preservation of the untouched regions
// ---------------------------------------------------------------------------

test('T-M-07 a commit changes ONLY the target value\'s bytes — CRLF and $comment survive', () => {
  const s = scratch();
  try {
    assert.equal(detectEol(ORIGINAL), 'crlf', 'the real config is CRLF; the test depends on it');
    commitStaged({ staged: { 'auto.S': 0.75 }, note: NOTE, path: s.cfg, priorPath: s.prior });

    const after = readFileSync(s.cfg, 'utf8');
    assert.equal(detectEol(after), 'crlf', 'line endings must be preserved, not normalised');
    assert.match(after, /\$comment/, 'the $comment paragraph must survive — it is the file\'s own why');
    assert.equal(after.length, ORIGINAL.length, '"0.82" and "0.75" are the same width, so length must match');

    // Measure the byte SPAN that differs. Two bytes is "82" -> "75" and nothing else.
    let first = -1; let last = -1;
    for (let i = 0; i < ORIGINAL.length; i++) {
      if (ORIGINAL[i] !== after[i]) { if (first < 0) first = i; last = i; }
    }
    assert.ok(first >= 0, 'something must have changed');
    assert.equal(last - first + 1, 2, `expected a 2-byte change, got ${last - first + 1} bytes at ${first}`);
    assert.equal(ORIGINAL.slice(first, last + 1), '82');
    assert.equal(after.slice(first, last + 1), '75');
  } finally { s.cleanup(); }
});

test('T-M-07 an LF config stays LF — the edit does not impose the platform\'s ending', () => {
  const s = scratch(ORIGINAL.split('\r\n').join('\n'));
  try {
    assert.equal(detectEol(readFileSync(s.cfg, 'utf8')), 'lf');
    commitStaged({ staged: { 'auto.S': 0.75 }, note: NOTE, path: s.cfg, priorPath: s.prior });
    const after = readFileSync(s.cfg, 'utf8');
    assert.equal(detectEol(after), 'lf', 'an LF file must not come back CRLF');
    assert.doesNotMatch(after, /\r/, 'no carriage return may be introduced');
  } finally { s.cleanup(); }
});

test('T-M-07 formatting is preserved: the nested objects stay on one line', () => {
  const s = scratch();
  try {
    const before = /"auto":\s*\{[^}]*\}/.exec(ORIGINAL)[0];
    commitStaged({ staged: { 'auto.S': 0.75 }, note: NOTE, path: s.cfg, priorPath: s.prior });
    const after = /"auto":\s*\{[^}]*\}/.exec(readFileSync(s.cfg, 'utf8'))[0];
    assert.equal(after.split('\n').length, 1, 'a JSON round-trip would have re-indented this object');
    assert.equal(before.split('\n').length, 1);
    assert.equal(after, before.replace('0.82', '0.75'), 'only the value may differ');
  } finally { s.cleanup(); }
});

// ---------------------------------------------------------------------------
// T-M-01 / T-M-02 — a corrupt config is refused; an unknown key is never dropped
// ---------------------------------------------------------------------------

test('T-M-01 a truncated config is a NAMED error, and NOTHING is written', () => {
  const truncated = ORIGINAL.slice(0, Math.floor(ORIGINAL.length / 2));
  const s = scratch(truncated);
  try {
    const beforeBytes = readFileSync(s.cfg, 'utf8');
    assert.throws(
      () => commitStaged({ staged: { 'auto.S': 0.75 }, note: NOTE, path: s.cfg, priorPath: s.prior }),
      (e) => {
        assert.equal(e.code, 'E_TUNING_INVALID', `expected E_TUNING_INVALID, got ${e.code}`);
        return true;
      },
    );
    assert.equal(readFileSync(s.cfg, 'utf8'), beforeBytes, 'the corrupt file must be untouched');
    assert.ok(!existsSync(s.prior), 'no prior record may be written for a refused commit');
    assert.ok(!existsSync(`${s.cfg}.tmp`), 'no temp file may be left behind');
  } finally { s.cleanup(); }
});

test('T-M-02 an unknown key survives the commit — it is preserved, never dropped', () => {
  // A key the engine does not know: someone's local experiment, or a knob from a newer
  // engine. Dropping it would silently delete a stranger's configuration.
  const withUnknown = ORIGINAL.replace('"mergeBand"', '"experimentalFutureKnob": { "thing": 42 },\n  "mergeBand"');
  const s = scratch(withUnknown);
  try {
    commitStaged({ staged: { 'auto.S': 0.75 }, note: NOTE, path: s.cfg, priorPath: s.prior });
    const after = readFileSync(s.cfg, 'utf8');
    assert.match(after, /experimentalFutureKnob/, 'the unknown key must still be present');
    assert.match(after, /"thing": 42/, 'and its value must be intact');
    assert.equal(JSON.parse(after).experimentalFutureKnob.thing, 42);
    assert.equal(JSON.parse(after).auto.S, 0.75, 'the intended change still happened');
  } finally { s.cleanup(); }
});

// ---------------------------------------------------------------------------
// T-I-02 / T-I-05 — staged, previewed, then committed; and why
// ---------------------------------------------------------------------------

test('T-I-02 stage → preview → commit are three distinct observable states', () => {
  const s = scratch();
  try {
    const staged = { 'auto.S': 0.75 };
    // 1. STAGED: nothing written yet.
    const before = readFileSync(s.cfg, 'utf8');
    // 2. PREVIEW: what it WOULD do, and it must not write.
    const p = previewStaged({ staged });
    assert.equal(p.wrote, false, 'a preview that wrote would make the commit step meaningless');
    assert.equal(readFileSync(s.cfg, 'utf8'), before, 'the preview must leave the file alone');
    assert.equal(p.current.bands.auto, 1);
    // LOWERING the gate makes it LOOSER, so the auto count must RISE. Getting this
    // backwards is easy and the fixture is what makes it checkable.
    assert.ok(p.staged.bands.auto > p.current.bands.auto,
      `lowering auto.S from 0.82 to 0.75 must admit MORE pairs, got ${p.staged.bands.auto} vs ${p.current.bands.auto}`);
    assert.ok(p.moves.length >= 1, 'the preview must name the pairs that move');
    // 3. COMMIT: now it writes, and the preview predicted it.
    const c = commitStaged({ staged, note: NOTE, path: s.cfg, priorPath: s.prior });
    assert.notEqual(c.hashBefore, c.hashAfter);
    assert.equal(readFileSync(s.cfg, 'utf8'), withValue(ORIGINAL, 'S', '0.82', '0.75'));
    // The prose still says 0.82: the $comment records WHY the value was 0.82, and rewriting
    // it would be falsifying the file's own history.
    assert.match(readFileSync(s.cfg, 'utf8'), /AUTO\.S to 0\.82 because/,
      'the $comment must still carry the old value — prose is history, not a knob');
  } finally { s.cleanup(); }
});

test('T-I-05 the blast radius NAMES the auto-corroboration gate, and a bare commit is refused', () => {
  const s = scratch();
  try {
    const p = previewStaged({ staged: { 'auto.S': 0.75 } });
    const families = p.blastRadius.map((b) => b.family);
    assert.ok(families.includes('auto.'), `auto.S must name the auto. family, got ${families.join(',')}`);
    assert.equal(p.blastRadius.find((b) => b.family === 'auto.').gate, true,
      'auto.S feeds the ONE automated write to canon-adjacent state');
    assert.match(p.blastRadius[0].affects, /auto-corroboration/i, 'the consequence must be stated, not implied');

    // A commit with no note is refused — T-I-05's "a commit with an empty note" half.
    assert.throws(() => commitStaged({ staged: { 'auto.S': 0.75 }, note: '', path: s.cfg, priorPath: s.prior }),
      (e) => e.code === 'E_NOTE_REQUIRED');
    assert.throws(() => commitStaged({ staged: { 'auto.S': 0.75 }, note: '   ', path: s.cfg, priorPath: s.prior }),
      (e) => e.code === 'E_NOTE_REQUIRED');
    assert.equal(readFileSync(s.cfg, 'utf8'), ORIGINAL, 'a refused commit writes nothing');
  } finally { s.cleanup(); }
});

// ---------------------------------------------------------------------------
// T-I-03 / T-M-06 — atomicity, measured rather than asserted
// ---------------------------------------------------------------------------

test('T-M-06 a commit interrupted mid-write leaves the OLD file whole, never a partial', () => {
  const s = scratch();
  try {
    assert.throws(
      () => commitStaged({
        staged: { 'auto.S': 0.75 }, note: NOTE, path: s.cfg, priorPath: s.prior, crashAfterTemp: true,
      }),
      (e) => e.code === 'E_COMMIT_INTERRUPTED',
    );
    // The temp file exists (the crash happened after it was written)...
    assert.ok(existsSync(`${s.cfg}.tmp`), 'the interrupted temp file should be observable');
    // ...and the TARGET is still the old bytes, byte for byte.
    assert.equal(readFileSync(s.cfg, 'utf8'), ORIGINAL, 'the target must be untouched by an interrupted commit');
    assert.equal(sha(readFileSync(s.cfg, 'utf8')), sha(ORIGINAL));
    assert.ok(!existsSync(s.prior), 'an interrupted commit writes no prior record');
    // And the config is still PARSEABLE, which is the property that matters.
    assert.equal(readTuning(s.cfg).auto.S, 0.82);
  } finally { s.cleanup(); }
});

test('T-I-03 a reader during a commit sees the old bytes or the new bytes, never a mix', () => {
  const s = scratch();
  try {
    // The interruption point sits exactly between temp-write and rename, which is the only
    // window in which a torn read is possible. If the reader sees anything, it must be old.
    const seen = [];
    try {
      commitStaged({ staged: { 'auto.S': 0.75 }, note: NOTE, path: s.cfg, priorPath: s.prior, crashAfterTemp: true });
    } catch { /* expected */ }
    seen.push(readFileSync(s.cfg, 'utf8'));

    // Now let a real commit complete and read again.
    commitStaged({ staged: { 'auto.S': 0.75 }, note: NOTE, path: s.cfg, priorPath: s.prior });
    seen.push(readFileSync(s.cfg, 'utf8'));

    assert.equal(seen[0], ORIGINAL, 'mid-commit read must be the complete OLD file');
    assert.equal(seen[1], withValue(ORIGINAL, 'S', '0.82', '0.75'),
      'post-commit read must be the complete NEW file');
    for (const text of seen) {
      assert.doesNotThrow(() => JSON.parse(text), 'every observed state must be valid JSON');
    }
  } finally { s.cleanup(); }
});

// ---------------------------------------------------------------------------
// T-I-04 — byte-exact revert
// ---------------------------------------------------------------------------

test('T-I-04 commit then revert restores the pre-commit hash EXACTLY', () => {
  const s = scratch();
  try {
    const hashBefore = sha(readFileSync(s.cfg, 'utf8'));
    const c = commitStaged({ staged: { 'auto.S': 0.75, 'weights.trigram': 0.2 }, note: NOTE, path: s.cfg, priorPath: s.prior });
    assert.equal(c.changedKeys.length, 2);
    assert.notEqual(sha(readFileSync(s.cfg, 'utf8')), hashBefore);

    const r = revertLast({ path: s.cfg, priorPath: s.prior });
    assert.equal(r.hash, hashBefore, 'the revert hash must equal the pre-commit hash');
    assert.equal(sha(readFileSync(s.cfg, 'utf8')), hashBefore);
    assert.equal(readFileSync(s.cfg, 'utf8'), ORIGINAL, 'byte-exact means byte-exact');
    // Reverting twice is refused rather than silently rewriting the same bytes.
    assert.throws(() => revertLast({ path: s.cfg, priorPath: s.prior }), (e) => e.code === 'E_ALREADY_REVERTED');
  } finally { s.cleanup(); }
});

test('T-I-04 a revert with no history is a NAMED refusal, not a silent no-op', () => {
  const s = scratch();
  try {
    assert.throws(() => revertLast({ path: s.cfg, priorPath: s.prior }), (e) => e.code === 'E_NOTHING_TO_REVERT');
  } finally { s.cleanup(); }
});

// ---------------------------------------------------------------------------
// T-U-09 / the refusals that keep a write from landing in the wrong knob
// ---------------------------------------------------------------------------

test('T-U-09 the view reads the LIVE file — mutate it and the view follows with no code change', () => {
  const s = scratch();
  try {
    assert.equal(tuningView(s.cfg).current['auto.S'], 0.82);
    commitStaged({ staged: { 'auto.S': 0.91 }, note: NOTE, path: s.cfg, priorPath: s.prior });
    const v = tuningView(s.cfg);
    assert.equal(v.current['auto.S'], 0.91, 'the view must re-read, not serve a cached default');
    assert.equal(flattenTuning(readTuning(s.cfg))['auto.S'], 0.91);
  } finally { s.cleanup(); }
});
