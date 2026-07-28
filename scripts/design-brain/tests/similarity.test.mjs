/**
 * similarity.test.mjs — pins the corroboration matcher's calibration (Kimi design §3).
 * Run: node --test scripts/design-brain/tests/similarity.test.mjs
 *
 * These tests encode the deliberate ASYMMETRY: near-verbatim rewordings must score in the AUTO band
 * (≥0.85, so accepted-claim corroboration can fire); true disjoint-vocabulary paraphrase must score
 * FRESH (<0.55, so it becomes a new claim Sean merges by hand). False corroboration is the expensive
 * failure; a missed near-match costs one letter. The thresholds are set on the expensive side.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scorePair, contentTokens, stem, trigramDice, bestMatches } from '../src/similarity.mjs';

const CFG = dirname(dirname(fileURLToPath(import.meta.url)));
const stopwords = new Set(JSON.parse(readFileSync(join(CFG, 'config', 'stopwords.json'), 'utf8')).words);
const tuning = JSON.parse(readFileSync(join(CFG, 'config', 'tuning.json'), 'utf8'));
const opts = { stopwords, weights: tuning.weights };
const AUTO = tuning.auto.S;          // 0.85
const FRESH = tuning.mergeBand.low;  // 0.55

test('stem: 5 rules, short tokens untouched', () => {
  assert.equal(stem('sets'), 'set');
  assert.equal(stem('logging'), 'logg');
  assert.equal(stem('completed'), 'complet');
  assert.equal(stem('summaries'), 'summary');
  assert.equal(stem('row'), 'row');
});

test('contentTokens: stopwords + short tokens dropped, stemmed', () => {
  const t = contentTokens('Log a completed set inline at the exercise row', stopwords);
  assert.ok(t.includes('log') && t.includes('inline') && t.includes('row') && t.includes('exercise'));
  assert.ok(!t.includes('a') && !t.includes('the') && !t.includes('at'), 'stopwords gone');
});

test('CALIBRATION: near-verbatim rewording lands in AUTO band (≥0.85)', () => {
  const s = scorePair(
    'Log a completed set inline at the exercise row, not on a separate screen',
    'Log sets inline at the exercise row',
    opts,
  );
  assert.ok(s.S >= AUTO, `expected ≥${AUTO}, got ${s.S.toFixed(3)}`);
  assert.ok(s.O >= tuning.auto.O, `overlap ${s.O.toFixed(3)} should clear ${tuning.auto.O}`);
});

test('CALIBRATION: subset phrasing is caught by overlap coefficient', () => {
  const s = scorePair('log sets inline at row', 'log a set inline at the exercise row', opts);
  assert.ok(s.O >= 0.9, `subset overlap should be near 1, got ${s.O.toFixed(3)}`);
  assert.ok(s.S >= AUTO, `subset pair should be AUTO band, got ${s.S.toFixed(3)}`);
});

test('CALIBRATION: disjoint-vocabulary paraphrase is FRESH (<0.55) — the honest K5 residual', () => {
  const s = scorePair(
    'Log a completed set inline at the exercise row',
    'Enter weight and reps directly beneath the movement name',
    opts,
  );
  assert.ok(s.S < FRESH, `true paraphrase must stay FRESH so Sean merges by hand; got ${s.S.toFixed(3)}`);
});

test('CALIBRATION: genuinely different principles score low', () => {
  const s = scorePair(
    'Completion renders a branded shareable stat card as a proof artifact',
    'Personalize the program only after collecting real constraints from the client',
    opts,
  );
  assert.ok(s.S < FRESH, `distinct principles must be FRESH, got ${s.S.toFixed(3)}`);
});

test('DETERMINISM: identical input yields byte-identical scores', () => {
  const a = 'surface personal records immediately after workout completion';
  const b = 'show PRs right after finishing the session';
  const s1 = scorePair(a, b, opts);
  const s2 = scorePair(a, b, opts);
  assert.deepEqual(s1, s2);
});

test('trigramDice: identical strings = 1, disjoint ≈ 0', () => {
  assert.equal(trigramDice('hello world', 'hello world'), 1);
  assert.ok(trigramDice('abcdef', 'zyxwvu') < 0.1);
});

test('bestMatches: sorted descending, self-match tops', () => {
  const target = 'Log a completed set inline at the exercise row';
  const candidates = [
    { claimId: 'CLM-1', principle: 'Personalize after collecting constraints' },
    { claimId: 'CLM-2', principle: 'Log sets inline at the exercise row' },
    { claimId: 'CLM-3', principle: 'Show progress trends from week to year' },
  ];
  const m = bestMatches(target, candidates, opts);
  assert.equal(m[0].claimId, 'CLM-2', 'the near-match ranks first');
  assert.ok(m[0].S >= m[1].S && m[1].S >= m[2].S, 'descending');
});
