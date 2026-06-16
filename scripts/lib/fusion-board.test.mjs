/**
 * Tests for the Fusion Board polling blackboard.
 * Run: node --test scripts/lib/fusion-board.test.mjs
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  initBoard, readBoard, postContribution, othersView, boardStatus,
  allReady, pollUntilReady, sealBoard, boardPath, DEFAULT_POLL_MS,
} from './fusion-board.mjs';

let ROOT;
before(() => { ROOT = mkdtempSync(join(tmpdir(), 'fusion-board-')); });
after(() => { rmSync(ROOT, { recursive: true, force: true }); });

const AGENTS = ['claude', 'codex', 'gemini'];

test('initBoard scaffolds run + board.json with all agents pending', () => {
  const b = initBoard({ root: ROOT, runId: 'b1', task: 'Q?', context: 'C', agents: AGENTS, createdAt: '2026-06-15T00:00:00Z' });
  assert.ok(existsSync(boardPath(b.dir)));
  assert.ok(existsSync(b.requestPath));
  const board = readBoard(b.dir);
  assert.deepEqual(Object.keys(board.agents).sort(), ['claude', 'codex', 'gemini']);
  assert.equal(board.agents.gemini.status, 'pending');
});

test('postContribution flips an agent to done and allReady gates on all three', () => {
  const b = initBoard({ root: ROOT, runId: 'b2', task: 'Q?', agents: AGENTS, createdAt: '2026-06-15T00:00:00Z' });
  assert.equal(allReady(b.dir, { agents: AGENTS }), false);
  postContribution(b.dir, 'claude', 'claude take', { now: '2026-06-15T00:01:00Z' });
  postContribution(b.dir, 'gemini', 'gemini take', { now: '2026-06-15T00:01:30Z' });
  assert.equal(allReady(b.dir, { agents: AGENTS }), false, 'codex still pending');
  postContribution(b.dir, 'codex', 'codex take', { now: '2026-06-15T00:02:00Z' });
  assert.equal(allReady(b.dir, { agents: AGENTS }), true);
  assert.equal(readBoard(b.dir).agents.codex.status, 'done');
});

test('two-phase barrier: othersView is blind until sealed, visible after', () => {
  const b = initBoard({ root: ROOT, runId: 'b3', task: 'Q?', agents: AGENTS, createdAt: '2026-06-15T00:00:00Z' });
  assert.equal(readBoard(b.dir).phase, 'answer');
  postContribution(b.dir, 'claude', 'C take', {});
  postContribution(b.dir, 'gemini', 'G take', {});

  // ANSWER phase: no peeking — enforces independence (anti-contamination)
  assert.deepEqual(othersView(b.dir, 'claude', { agents: AGENTS }), []);

  // seal -> synthesis phase
  const sealed = sealBoard(b.dir, { now: '2026-06-15T00:05:00Z' });
  assert.equal(sealed.phase, 'synthesis');
  assert.equal(readBoard(b.dir).phase, 'synthesis');

  const view = othersView(b.dir, 'claude', { agents: AGENTS });
  assert.deepEqual(view.map((v) => v.name).sort(), ['codex', 'gemini']);
  assert.equal(view.find((v) => v.name === 'gemini').text, 'G take');
  assert.equal(view.find((v) => v.name === 'codex').status, 'pending');
});

test('two-phase barrier: postContribution is rejected (no-op) after seal', () => {
  const b = initBoard({ root: ROOT, runId: 'b3b', task: 'Q?', agents: AGENTS, createdAt: '2026-06-15T00:00:00Z' });
  postContribution(b.dir, 'claude', 'first', {});
  sealBoard(b.dir, {});
  const late = postContribution(b.dir, 'codex', 'too late', {});
  assert.equal(late, null, 'late post returns null');
  assert.equal(readBoard(b.dir).agents.codex.status, 'pending', 'sealed board not mutated by a straggler');
});

test('boardStatus times out a non-responding agent (age from board open)', () => {
  const b = initBoard({ root: ROOT, runId: 'b4', task: 'Q?', agents: AGENTS, createdAt: '2026-06-15T00:00:00Z' });
  postContribution(b.dir, 'claude', 'C', { now: '2026-06-15T00:00:10Z' });
  // now = 10 minutes after the board opened; staleMs = 5 min.
  const nowMs = Date.parse('2026-06-15T00:10:00Z');
  const st = boardStatus(b.dir, { agents: AGENTS, staleMs: 5 * 60_000, now: nowMs });

  // claude is done -> never times out, age measured from its contribution
  const claude = st.find((s) => s.name === 'claude');
  assert.equal(claude.done, true);
  assert.equal(claude.timedOut, false);

  // gemini never posted -> age measured from board open (10 min) > 5 min stale -> timed out
  const gem = st.find((s) => s.name === 'gemini');
  assert.equal(gem.done, false);
  assert.equal(gem.ageMs, 10 * 60_000);
  assert.equal(gem.timedOut, true);
});

test('pollUntilReady resolves ready when all agents have posted (injected clock)', async () => {
  const b = initBoard({ root: ROOT, runId: 'b5', task: 'Q?', agents: AGENTS, createdAt: '2026-06-15T00:00:00Z' });
  for (const a of AGENTS) postContribution(b.dir, a, `${a} take`, {});
  const res = await pollUntilReady(b.dir, { agents: AGENTS, nowFn: () => 0, sleepFn: async () => {} });
  assert.equal(res.ready, true);
  assert.equal(res.timedOut, false);
});

test('pollUntilReady times out and reports missing agents', async () => {
  const b = initBoard({ root: ROOT, runId: 'b6', task: 'Q?', agents: AGENTS, createdAt: '2026-06-15T00:00:00Z' });
  postContribution(b.dir, 'claude', 'C', {});
  let t = 0;
  const res = await pollUntilReady(b.dir, {
    agents: AGENTS,
    intervalMs: 1,
    timeoutMs: 100,
    nowFn: () => { const v = t; t += 60; return v; }, // jumps 60ms per call -> exceeds 100ms fast
    sleepFn: async () => {},
  });
  assert.equal(res.ready, false);
  assert.equal(res.timedOut, true);
  assert.deepEqual(res.missing.sort(), ['codex', 'gemini']);
});

test('DEFAULT_POLL_MS is the ~20s cadence Sean asked for', () => {
  assert.equal(DEFAULT_POLL_MS, 20_000);
});
