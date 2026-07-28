/**
 * swan-council-lib.test.mjs — unit tests for the swan-council backend.
 * Run: node --test scripts/mcp/swan-council-lib.test.mjs
 *
 * ZERO real API spend, ZERO real subprocesses — fetch and CLI probe are injected.
 * These lock the security-critical behaviors: cost math, $3 cap enforcement,
 * key redaction, backend selection order, and the Fable confirm-gate.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  BRAINS, DEFAULT_SESSION_CAP_USD, computeCost, redactKey, checkCap, recordSpend,
  readSpend, selectBackend, callOpenRouter, buildReviewPrompt, REMITS, loadOpenRouterKey,
  reserveSpend, settleReservation,
} from './swan-council-lib.mjs';
import { TOOLS, isSafeDiffRange } from './swan-council-server.mjs';

function tmpLedger() {
  const d = mkdtempSync(join(tmpdir(), 'swan-council-'));
  return { path: join(d, 'spend.json'), dir: d };
}

test('cap default is $3 (Sean 2026-07-22)', () => {
  assert.equal(DEFAULT_SESSION_CAP_USD, 3);
});

test('computeCost uses per-brain $/M pricing', () => {
  // Fable @ $10/M in, $50/M out: 1M in + 1M out = $60
  assert.equal(computeCost('fable', 1_000_000, 1_000_000), 60);
  // Kimi @ $3/$15: 100k in + 100k out = 0.3 + 1.5 = 1.8
  assert.ok(Math.abs(computeCost('kimi', 100_000, 100_000) - 1.8) < 1e-9);
  assert.equal(computeCost('nope', 1, 1), 0);
});

test('redactKey scrubs the live key, sk-or keys, and Bearer fragments', () => {
  const key = 'sk-or-v1-abc123def456ghi789';
  assert.ok(!redactKey(`oops ${key} leaked`, key).includes(key));
  assert.ok(!redactKey('Authorization: Bearer sk-or-v1-zzzzzzzzzzzz').includes('sk-or-v1-zzzz'));
  assert.equal(redactKey('clean text'), 'clean text');
});

test('checkCap blocks once spent >= cap', () => {
  const { path, dir } = tmpLedger();
  try {
    assert.equal(checkCap(path, 3).allowed, true);
    recordSpend(path, { brain: 'fable', model: 'x', costUsd: 3.0, inTok: 1, outTok: 1 });
    const gate = checkCap(path, 3);
    assert.equal(gate.allowed, false);
    assert.match(gate.reason, /cap \$3 reached/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('checkCap blocks a pre-estimate that would exceed remaining', () => {
  const { path, dir } = tmpLedger();
  try {
    recordSpend(path, { brain: 'kimi', model: 'x', costUsd: 2.9, inTok: 1, outTok: 1 });
    // $0.20 estimate, only $0.10 remaining → blocked BEFORE spending
    const gate = checkCap(path, 3, 0.2);
    assert.equal(gate.allowed, false);
    assert.match(gate.reason, /exceeds remaining/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('recordSpend accumulates a running total', () => {
  const { path, dir } = tmpLedger();
  try {
    recordSpend(path, { brain: 'kimi', model: 'x', costUsd: 0.1, inTok: 1, outTok: 1 });
    const total = recordSpend(path, { brain: 'kimi', model: 'x', costUsd: 0.16, inTok: 1, outTok: 1 });
    assert.ok(Math.abs(total - 0.26) < 1e-9);
    assert.equal(readSpend(path).calls.length, 2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('selectBackend: CLI present → cli; absent+key → openrouter; neither → none', async () => {
  const probeYes = async () => true;
  const probeNo = async () => false;
  assert.equal(await selectBackend('codex', { probe: probeYes, hasKey: true }), 'cli');
  assert.equal(await selectBackend('codex', { probe: probeNo, hasKey: true }), 'openrouter');
  assert.equal(await selectBackend('codex', { probe: probeNo, hasKey: false }), 'none');
  // Kimi has no CLI → openrouter when key present, none otherwise
  assert.equal(await selectBackend('kimi', { hasKey: true }), 'openrouter');
  assert.equal(await selectBackend('kimi', { hasKey: false }), 'none');
});

test('callOpenRouter puts the key ONLY in the Authorization header, never in the body', async () => {
  const key = 'sk-or-v1-secrettoken000';
  let seenAuth = null; let seenBody = null;
  const fakeFetch = async (_url, opts) => {
    seenAuth = opts.headers.Authorization;
    seenBody = opts.body;
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'hi' } }], usage: { prompt_tokens: 10, completion_tokens: 5 }, model: 'openai/gpt-5.5' }) };
  };
  const r = await callOpenRouter('codex', 'question', { apiKey: key, fetchImpl: fakeFetch });
  assert.equal(seenAuth, `Bearer ${key}`);
  assert.ok(!seenBody.includes(key), 'key must not be in the request body');
  assert.equal(r.text, 'hi');
  assert.equal(r.inTok, 10);
});

test('callOpenRouter error message is redacted', async () => {
  const key = 'sk-or-v1-leakyleaky12345';
  const fakeFetch = async () => ({ ok: false, status: 401, text: async () => `bad key ${key}` });
  await assert.rejects(
    () => callOpenRouter('codex', 'q', { apiKey: key, fetchImpl: fakeFetch }),
    (e) => { assert.ok(!e.message.includes(key), 'error must not leak the key'); return true; },
  );
});

test('buildReviewPrompt includes remit, diff, and question', () => {
  const p = buildReviewPrompt({ remit: REMITS.codex, files: [], diffText: 'DIFFHERE', question: 'is it safe?' });
  assert.ok(p.includes('Codex'));
  assert.ok(p.includes('DIFFHERE'));
  assert.ok(p.includes('is it safe?'));
});

test('fable_rule WITHOUT confirm returns an estimate and does NOT spend', async () => {
  const { path, dir } = tmpLedger();
  process.env.SWAN_COUNCIL_LEDGER = path;
  try {
    const out = await TOOLS.fable_rule.run({ document: 'a small plan' });
    assert.equal(out.ok, true);
    assert.match(out.text, /estimated ~\$/);
    assert.match(out.text, /confirm:true/);
    assert.equal(readSpend(path).totalUsd, 0, 'no spend without confirm');
  } finally { delete process.env.SWAN_COUNCIL_LEDGER; rmSync(dir, { recursive: true, force: true }); }
});

test('loadOpenRouterKey reads a CRLF .env without printing the value', () => {
  const { dir } = tmpLedger();
  try {
    writeFileSync(join(dir, '.env'), 'OPENROUTER_API_KEY=sk-or-v1-fromenv999\r\nOTHER=1\r\n');
    const env = {};
    const k = loadOpenRouterKey(dir, env);
    assert.equal(k, 'sk-or-v1-fromenv999');
    assert.equal(env.OPENROUTER_API_KEY, 'sk-or-v1-fromenv999');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('BRAINS registry has the three brains with pricing', () => {
  for (const b of ['codex', 'kimi', 'fable']) {
    assert.ok(BRAINS[b].model, `${b} has a model`);
    assert.ok(BRAINS[b].priceIn > 0 && BRAINS[b].priceOut > 0, `${b} has pricing`);
  }
  assert.equal(BRAINS.kimi.cli, null, 'kimi is OpenRouter-only');
});

// ─────────────────────────────────────────────────────────────────────────────
// Hostile-review regressions (findings #1, #2, #3 — 2026-07-22 dry-loop round 2)
// Each of these FAILS against the pre-fix code.
// ─────────────────────────────────────────────────────────────────────────────

test('REGRESSION #1: at an edge where only ONE call fits, two concurrent reserves → exactly one wins, no overshoot', async () => {
  const { path, dir } = tmpLedger();
  try {
    // Spent $2.80, $0.20 remaining. Each estimate is $0.15 — one fits, two do not.
    // Pre-fix (check-then-record) both read $2.80, both pass, ledger → $3.10 overshoot.
    // Post-fix (atomic reserve) the first holds $0.15 → second sees $2.95, its $0.15
    // would exceed the $0.05 remaining → refused. Exactly one wins.
    recordSpend(path, { brain: 'kimi', model: 'x', costUsd: 2.80, inTok: 1, outTok: 1 });
    const [a, b] = await Promise.all([
      Promise.resolve(reserveSpend(path, 'kimi', 0.15, { cap: 3 })),
      Promise.resolve(reserveSpend(path, 'kimi', 0.15, { cap: 3 })),
    ]);
    const allowed = [a, b].filter((r) => r.allowed).length;
    assert.equal(allowed, 1, 'exactly one reserve may succeed at the edge');
    assert.ok(readSpend(path).totalUsd <= 3, `ledger must not exceed cap; got $${readSpend(path).totalUsd}`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('REGRESSION #1b: a worst-case estimate larger than remaining is refused (conservative cap)', () => {
  const { path, dir } = tmpLedger();
  try {
    recordSpend(path, { brain: 'kimi', model: 'x', costUsd: 2.90, inTok: 1, outTok: 1 });
    // $0.10 remaining, $0.24 worst-case estimate → refused. Better to refuse a call
    // that MIGHT have been cheap than to risk overshooting the hard cap.
    const res = reserveSpend(path, 'kimi', 0.24, { cap: 3 });
    assert.equal(res.allowed, false);
    assert.match(res.reason, /exceeds remaining/);
    assert.ok(Math.abs(readSpend(path).totalUsd - 2.90) < 1e-9, 'a refused reserve writes nothing');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('reserveSpend → settleReservation swaps estimate for real cost', () => {
  const { path, dir } = tmpLedger();
  try {
    const res = reserveSpend(path, 'kimi', 0.24, { cap: 3 });
    assert.equal(res.allowed, true);
    assert.ok(Math.abs(readSpend(path).totalUsd - 0.24) < 1e-9, 'estimate is held');
    const total = settleReservation(path, res.reservationId, { brain: 'kimi', model: 'k', costUsd: 0.05, inTok: 10, outTok: 3 });
    assert.ok(Math.abs(total - 0.05) < 1e-9, 'real cost replaces the estimate');
    assert.equal(readSpend(path).calls.filter((c) => c.pending).length, 0, 'no pending reservations remain');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('settleReservation with costUsd 0 releases a failed call fully', () => {
  const { path, dir } = tmpLedger();
  try {
    const res = reserveSpend(path, 'kimi', 0.24, { cap: 3 });
    const total = settleReservation(path, res.reservationId, { brain: 'kimi', model: '(failed)', costUsd: 0 });
    assert.equal(total, 0, 'a failed call costs nothing');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('REGRESSION #2: isSafeDiffRange rejects shell-injection strings, accepts real ranges', () => {
  // Accept genuine git ranges
  for (const ok of ['HEAD~1..HEAD', 'main..HEAD', 'abc1234', 'HEAD...origin/main', 'v1.2.3', 'feat/x..HEAD']) {
    assert.equal(isSafeDiffRange(ok), true, `should accept ${ok}`);
  }
  // Reject every shell-metacharacter payload (cmd.exe & chaining, ; | $ ` etc.)
  for (const bad of ['HEAD & echo pwned', 'HEAD; rm -rf x', 'HEAD | cat /etc/passwd', 'HEAD$(whoami)', 'HEAD`id`', 'HEAD > file', 'a b', 'HEAD\nrm x', '"; drop']) {
    assert.equal(isSafeDiffRange(bad), false, `should reject ${JSON.stringify(bad)}`);
  }
});

test('REGRESSION #4: a negative estimate cannot poison the ledger negative / bypass the cap', () => {
  const { path, dir } = tmpLedger();
  try {
    recordSpend(path, { brain: 'kimi', model: 'x', costUsd: 2.99, inTok: 1, outTok: 1 });
    const res = reserveSpend(path, 'kimi', -5, { cap: 3 });
    // clamped to 0 → still a valid reserve, but the ledger stays put, never negative
    assert.ok(readSpend(path).totalUsd >= 2.99, `ledger must not go below prior spend; got $${readSpend(path).totalUsd}`);
    assert.ok(readSpend(path).totalUsd <= 3.0, 'ledger must not exceed cap');
    if (res.allowed) settleReservation(path, res.reservationId, { costUsd: 0 });
    assert.ok(readSpend(path).totalUsd >= 0, 'ledger never goes negative');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('REGRESSION #3: Fable estimate uses full max_tokens output, not a hopeful 2500', () => {
  // The worst-case Fable output cost alone (16000 tok @ $50/M) = $0.80 — far above
  // the old 2500-tok ($0.125) guess. The shown estimate must reflect the ceiling.
  const worstOut = computeCost('fable', 0, BRAINS.fable.maxTokens);
  assert.ok(worstOut >= 0.75, `Fable worst-case output should be ~$0.80, got $${worstOut.toFixed(4)}`);
  const oldGuess = computeCost('fable', 0, 2500);
  assert.ok(worstOut > oldGuess * 3, 'worst-case must be materially higher than the old 2500-token guess');
});
