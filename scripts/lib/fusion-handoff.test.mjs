/**
 * Tests for the Free Fusion file-handoff module.
 * Run: node --test scripts/lib/fusion-handoff.test.mjs
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildBrainRequest,
  createFusionRun,
  writeBrainAnswer,
  listAnswers,
  readyToSynthesize,
  buildHandoffJudgePrompt,
  writeFreeSynthesis,
  answerPath,
  atomicWrite,
  DEFAULT_BRAINS,
} from './fusion-handoff.mjs';

let ROOT;
before(() => { ROOT = mkdtempSync(join(tmpdir(), 'fusion-handoff-')); });
after(() => { rmSync(ROOT, { recursive: true, force: true }); });

test('buildBrainRequest stresses independence and names each brain answer file', () => {
  const req = buildBrainRequest({ topic: 'Pricing', task: 'Best tier structure?', context: 'SaaS', brains: ['claude', 'codex'] });
  assert.match(req, /INDEPENDENTLY/);
  assert.match(req, /answers\/claude\.md|answers\\claude\.md/);
  assert.match(req, /answers\/codex\.md|answers\\codex\.md/);
  assert.match(req, /Fused Recommendation/);
  assert.match(req, /Best tier structure\?/);
});

test('createFusionRun scaffolds request.md + answers dir + meta.json', () => {
  const run = createFusionRun({ root: ROOT, runId: 'r1', topic: 'T', task: 'Do X', context: 'C', createdAt: '2026-06-15T00:00:00Z' });
  assert.ok(existsSync(run.requestPath));
  assert.ok(existsSync(run.metaPath));
  const meta = JSON.parse(readFileSync(run.metaPath, 'utf-8'));
  assert.equal(meta.runId, 'r1');
  assert.equal(meta.tier, 'free-handoff');
  assert.deepEqual(meta.brains, DEFAULT_BRAINS);
});

test('createFusionRun rejects missing runId / task', () => {
  assert.throws(() => createFusionRun({ root: ROOT, task: 'x' }), /runId is required/);
  assert.throws(() => createFusionRun({ root: ROOT, runId: 'r' }), /task is required/);
});

test('answers progress from PENDING to SUCCESS as brains write', () => {
  const run = createFusionRun({ root: ROOT, runId: 'r2', topic: 'T', task: 'Do X' });
  let answers = listAnswers(run.dir);
  assert.equal(answers.every((a) => a.status === 'PENDING'), true);
  assert.equal(readyToSynthesize(run.dir), false);

  writeBrainAnswer(run.dir, 'claude', 'Claude says: ship it.');
  assert.equal(readyToSynthesize(run.dir), false, 'one answer is not enough');

  writeBrainAnswer(run.dir, 'codex', 'Codex says: harden first.');
  answers = listAnswers(run.dir);
  assert.equal(answers.filter((a) => a.status === 'SUCCESS').length, 2);
  assert.equal(readyToSynthesize(run.dir), true);
  assert.ok(existsSync(answerPath(run.dir, 'claude')));
});

test('empty answer file stays PENDING (whitespace-only does not count)', () => {
  const run = createFusionRun({ root: ROOT, runId: 'r3', topic: 'T', task: 'Do X' });
  writeBrainAnswer(run.dir, 'claude', '   \n  ');
  assert.equal(listAnswers(run.dir).find((a) => a.name === 'claude').status, 'PENDING');
});

test('buildHandoffJudgePrompt is null until panel ready, then contains both answers', () => {
  const run = createFusionRun({ root: ROOT, runId: 'r4', topic: 'Caching', task: 'Cache strategy?' });
  assert.equal(buildHandoffJudgePrompt(run.dir, { topic: 'Caching' }), null);

  writeBrainAnswer(run.dir, 'claude', 'Use cursor pagination.');
  writeBrainAnswer(run.dir, 'codex', 'Add an index first.');
  const prompt = buildHandoffJudgePrompt(run.dir, { topic: 'Caching', context: 'SwanStudios' });
  assert.match(prompt, /cursor pagination/);
  assert.match(prompt, /Add an index first/);
  assert.match(prompt, /NOT a participant/); // inherits the synthesis contract
});

test('atomicWrite writes complete content, replaces atomically, leaves no .tmp', () => {
  const p = join(ROOT, 'atomic-check.txt');
  atomicWrite(p, 'hello world');
  assert.equal(readFileSync(p, 'utf-8'), 'hello world');
  atomicWrite(p, 'second'); // atomic replace over existing (Windows + POSIX)
  assert.equal(readFileSync(p, 'utf-8'), 'second');
  assert.deepEqual(readdirSync(ROOT).filter((f) => f.includes('.tmp')), [], 'no temp files left behind');
});

test('writeFreeSynthesis persists synthesis.md', () => {
  const run = createFusionRun({ root: ROOT, runId: 'r5', topic: 'T', task: 'Do X' });
  const p = writeFreeSynthesis(run.dir, '# Fusion Synthesis\n\nFused answer here.');
  assert.ok(existsSync(p));
  assert.match(readFileSync(p, 'utf-8'), /Fused answer here/);
});
