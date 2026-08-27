#!/usr/bin/env node
/**
 * spend-token-race.test.mjs — the approval token cannot be spent twice (SWA-218).
 * ==============================================================================
 * GLM 5.3 finding 2 (2026-08-26): redeeming a token was a read-modify-write over an
 * unlocked JSON file. Read tokens.json, see `used: false`, set it true, write back.
 * Two concurrent calls carrying the same fresh token could BOTH observe `used: false`
 * and both proceed — a double-spend on one approval. Claude Code issues tool calls in
 * parallel, so scheduling that race is ordinary rather than exotic.
 *
 * Redemption is now an atomic O_EXCL claim. These tests prove it two ways: a
 * deterministic one that forces the exact interleaving, and a genuinely parallel one
 * with real processes.
 *
 * A separate file from spend-ledger.test.mjs because every case here needs its own
 * process-level SWAN_SPEND_DIR, set before the module is imported.
 *
 * Run: node scripts/lib/spend-token-race.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const LEDGER_URL = `file://${join(HERE, 'spend-ledger.mjs').replaceAll('\\', '/')}`;

const BREACH = { model: 'claude-fable-5', topic: 'race', worstCaseUsd: 99 };

/** Fresh ledger dir + a freshly imported module bound to it. */
async function freshLedger() {
  const dir = mkdtempSync(join(tmpdir(), 'swan-race-'));
  process.env.SWAN_SPEND_DIR = dir;
  // Cache-bust so the module re-reads SPEND_DIR at import time.
  const mod = await import(`${LEDGER_URL}?race=${Math.random().toString(36).slice(2)}`);
  return { dir, mod };
}

test('the deterministic interleaving: a STALE used:false cannot redeem twice', async () => {
  // This is the exact race, forced rather than raced for. Redeem once (the claim file
  // is created), then rewind tokens.json to `used: false` — which is precisely what a
  // second process holding a stale read would see — and redeem again.
  //
  // If the JSON flag were still the decider, this would ALLOW. The claim is the
  // decider, so it must refuse.
  const { dir, mod } = await freshLedger();
  const first = mod.checkSpend(BREACH);
  assert.equal(first.allow, false);
  assert.ok(first.token, 'first ask must mint a token');

  const ok = mod.checkSpend({ ...BREACH, approvalToken: first.token });
  assert.equal(ok.allow, true, 'the legitimate second ask must succeed');

  const tokensPath = join(dir, 'pending-approval.json');
  const tokens = JSON.parse(readFileSync(tokensPath, 'utf-8'));
  for (const k of Object.keys(tokens)) { tokens[k].used = false; delete tokens[k].usedAt; }
  writeFileSync(tokensPath, JSON.stringify(tokens), 'utf-8');

  const replay = mod.checkSpend({ ...BREACH, approvalToken: first.token });
  assert.equal(replay.allow, false, 'a stale used:false must NOT re-open a redeemed token');
  assert.match(replay.reason, /already redeemed/);
  rmSync(dir, { recursive: true, force: true });
});

test('a redemption leaves an atomic claim file behind', async () => {
  // The mechanism, asserted directly: if this file stops being written, the test
  // above would start passing for the wrong reason.
  const { dir, mod } = await freshLedger();
  const first = mod.checkSpend(BREACH);
  mod.checkSpend({ ...BREACH, approvalToken: first.token });
  const claims = readFileSync(join(dir, 'pending-approval.json'), 'utf-8');
  assert.ok(claims.includes('used'), 'audit trail still updated');
  const key = Object.keys(JSON.parse(claims))[0];
  assert.ok(existsSync(join(dir, `claim-${key}.json`)), 'the O_EXCL claim is what decides');
  rmSync(dir, { recursive: true, force: true });
});

test('GENUINELY PARALLEL: two real processes, one approval, exactly one winner', async () => {
  // The deterministic test proves the mechanism; this proves it under real
  // concurrency, which is the thing that was actually broken.
  const { dir, mod } = await freshLedger();
  const first = mod.checkSpend(BREACH);
  assert.ok(first.token);

  const runner = join(dir, 'redeem.mjs');
  writeFileSync(runner, [
    `const m = await import(${JSON.stringify(LEDGER_URL)});`,
    `const r = m.checkSpend(${JSON.stringify({ ...BREACH, approvalToken: first.token })});`,
    'process.stdout.write(r.allow ? "ALLOW" : "DENY");',
  ].join('\n'), 'utf-8');

  // Launch both, then collect. spawnSync would serialise them, so the children are
  // started with spawn and awaited together.
  const { spawn } = await import('node:child_process');
  const run = () => new Promise((resolve) => {
    let out = '';
    const p = spawn(process.execPath, [runner], { env: { ...process.env, SWAN_SPEND_DIR: dir } });
    p.stdout.on('data', (d) => { out += d; });
    p.on('close', () => resolve(out.trim()));
  });
  const results = await Promise.all([run(), run(), run(), run()]);

  const winners = results.filter((r) => r === 'ALLOW').length;
  assert.equal(winners, 1, `exactly one of four concurrent redemptions may win, got ${winners} (${results.join(',')})`);
  rmSync(dir, { recursive: true, force: true });
});

test('a WRONG token does not destroy a valid outstanding approval', async () => {
  // GLM 5.3 finding 6. Re-minting on every refusal meant a bad token silently
  // replaced the approval Sean was holding, so his correct token stopped working —
  // and the failure looks like the gate malfunctioning rather than like an attack.
  const { dir, mod } = await freshLedger();
  const first = mod.checkSpend(BREACH);
  const good = first.token;

  const wrong = mod.checkSpend({ ...BREACH, approvalToken: 'deadbeef1234' });
  assert.equal(wrong.allow, false);
  assert.equal(wrong.token, good, 'the refusal must return the EXISTING token, not a new one');

  const still = mod.checkSpend({ ...BREACH, approvalToken: good });
  assert.equal(still.allow, true, "Sean's original token must still work after a wrong guess");
  rmSync(dir, { recursive: true, force: true });
});

test('spawnSync is available for the harness (instrument check)', () => {
  // Guards against the harness silently degrading: if the parallel test above ever
  // cannot spawn, it must fail loudly rather than pass with zero children.
  const r = spawnSync(process.execPath, ['-e', 'process.stdout.write("ok")'], { encoding: 'utf-8' });
  assert.equal(r.stdout, 'ok');
});
