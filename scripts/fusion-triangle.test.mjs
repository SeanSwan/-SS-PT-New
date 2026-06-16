/**
 * Tests for the Fusion Triangle launcher core (no real CLIs, no real waiting).
 * Run: node --test scripts/fusion-triangle.test.mjs
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stripPreamble, brainPrompt, runTriangle, AGENT_CMD, geminiModelChain, looksLikeGeminiError } from './fusion-triangle.mjs';

let ROOT;
before(() => { ROOT = mkdtempSync(join(tmpdir(), 'fusion-triangle-')); });
after(() => { rmSync(ROOT, { recursive: true, force: true }); });

// A clock that advances fast so the codex poll times out instantly.
const fastClock = () => { let t = 0; return () => { const v = t; t += 10_000; return v; }; };
const noSleep = async () => {};

// Brain answers for the two CLI agents; synthesis when the judge prompt arrives.
const judgey = (prompt) => /NOT a participant/.test(prompt);

test('stripPreamble removes the gemini credentials banner only', () => {
  assert.equal(stripPreamble('gemini', 'Loaded cached credentials.\nReal answer here'), 'Real answer here');
  assert.equal(stripPreamble('claude', 'plain answer'), 'plain answer');
});

test('brainPrompt carries the task and the independence instruction', () => {
  const p = brainPrompt('Cache strategy?', 'SwanStudios');
  assert.match(p, /Cache strategy\?/);
  assert.match(p, /INDEPENDENTLY/);
  assert.match(p, /SwanStudios/);
});

test('AGENT_CMD has claude + gemini but NOT codex (no CLI)', () => {
  assert.ok(AGENT_CMD.claude && AGENT_CMD.gemini);
  assert.equal(AGENT_CMD.codex, undefined);
});

test('runTriangle: 2 CLI brains answer, codex times out, judge synthesizes', async () => {
  const invoke = async (agent, prompt) => (judgey(prompt)
    ? { ok: true, text: '## Fused Recommendation\nDo the thing.' }
    : { ok: true, text: `${agent} independent take` });

  const res = await runTriangle({
    root: ROOT, runId: 'tri-ok', task: 'Q?', context: 'C',
    cliAgents: ['claude', 'gemini'], codexAgents: ['codex'],
    invoke, log: () => {},
    pollTimeoutMs: 100, pollIntervalMs: 1, pollNowFn: fastClock(), pollSleepFn: noSleep,
    createdAt: '2026-06-15T00:00:00Z',
  });

  assert.equal(res.synthesized, true);
  assert.deepEqual(res.ready.sort(), ['claude', 'gemini']);
  assert.deepEqual(res.timedOut, ['codex']);
  assert.ok(existsSync(res.synthesisPath));
  assert.ok(existsSync(join(res.dir, 'answers', 'gemini.md')));
});

test('runTriangle: fewer than 2 answers -> no synthesis', async () => {
  const invoke = async (agent, prompt) => {
    if (judgey(prompt)) return { ok: true, text: 'should not be called' };
    if (agent === 'gemini') return { ok: false, text: 'gemini boom' };
    return { ok: true, text: `${agent} take` };
  };

  const res = await runTriangle({
    root: ROOT, runId: 'tri-thin', task: 'Q?',
    cliAgents: ['claude', 'gemini'], codexAgents: ['codex'],
    invoke, log: () => {},
    pollTimeoutMs: 100, pollIntervalMs: 1, pollNowFn: fastClock(), pollSleepFn: noSleep,
    createdAt: '2026-06-15T00:00:00Z',
  });

  assert.equal(res.synthesized, false);
  assert.deepEqual(res.ready, ['claude']);
});

test('runTriangle requires runId and task', async () => {
  await assert.rejects(() => runTriangle({ root: ROOT, task: 'x' }), /runId and task are required/);
  await assert.rejects(() => runTriangle({ root: ROOT, runId: 'r' }), /runId and task are required/);
});

test('geminiModelChain: Pro-first default, env overrides', () => {
  const saved = { one: process.env.SWAN_FUSION_GEMINI_MODEL, many: process.env.SWAN_FUSION_GEMINI_MODELS };
  delete process.env.SWAN_FUSION_GEMINI_MODEL; delete process.env.SWAN_FUSION_GEMINI_MODELS;
  assert.deepEqual(geminiModelChain(), ['gemini-3.1-pro-preview', 'gemini-2.5-pro', 'gemini-2.5-flash']);
  assert.equal(geminiModelChain()[0], 'gemini-3.1-pro-preview', 'best Pro is first, not flash');

  process.env.SWAN_FUSION_GEMINI_MODEL = 'gemini-x';
  assert.deepEqual(geminiModelChain(), ['gemini-x']);
  delete process.env.SWAN_FUSION_GEMINI_MODEL;

  process.env.SWAN_FUSION_GEMINI_MODELS = 'a, b ,c';
  assert.deepEqual(geminiModelChain(), ['a', 'b', 'c']);
  delete process.env.SWAN_FUSION_GEMINI_MODELS;

  if (saved.one !== undefined) process.env.SWAN_FUSION_GEMINI_MODEL = saved.one;
  if (saved.many !== undefined) process.env.SWAN_FUSION_GEMINI_MODELS = saved.many;
});

test('looksLikeGeminiError flags capacity/API/empty, passes real answers', () => {
  assert.equal(looksLikeGeminiError('You have exhausted your capacity on this model.'), true);
  assert.equal(looksLikeGeminiError('Error when talking to Gemini API'), true);
  assert.equal(looksLikeGeminiError('[API Error: ...]'), true);
  assert.equal(looksLikeGeminiError(''), true);
  assert.equal(looksLikeGeminiError('The biggest risk is X; mitigate with Y.'), false);
});
