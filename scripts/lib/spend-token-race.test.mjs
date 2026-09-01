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
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync, utimesSync } from 'node:fs';
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

  // WORDING CHANGED 2026-08-27, and this test is why it changed carefully rather than
  // silently. It used to assert /concurrent call/ plus a "delete claim-<key>" recovery
  // line. When the spent-marker became authoritative (flash round-4 finding 10) this
  // case stopped going through the redemption branch, and the replay fell out as the
  // generic "first ask refused" — telling the operator nothing. A real regression,
  // caught by this assertion within seconds.
  //
  // The fix is NOT to restore the old wording. That wording was already wrong here:
  // there is no concurrency in a replay, the token was simply spent, and telling
  // someone to delete the claim file is telling them to re-open a redeemed approval.
  // One flag had to serve two situations, so they were conflated; a separate marker
  // finally distinguishes them, and the messages should say which is which.
  assert.match(replay.reason, /already spent/, 'a replay must say the token was SPENT');
  assert.ok(replay.token, 'and must hand over the new token this fresh ask needs');
  assert.notEqual(replay.token, first.token, 'the new ask gets a NEW token, never the spent one');
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
  // PER TOKEN, not per key, since 2026-08-27. Keying the claim by model+topic+cost
  // left cycle 1's file sitting in cycle 2's way forever — GLM 5.3 round-5 B3, a
  // BRICK: every later approval for the same breach minted a token and then refused
  // to redeem it. The token is the thing being claimed, so the token is in the path.
  assert.ok(existsSync(join(dir, `claim-${key}-${first.token}.json`)), 'the O_EXCL claim is what decides');
  rmSync(dir, { recursive: true, force: true });
});

/**
 * Race four children through one redemption, with a REAL barrier.
 *
 * THE FIRST VERSION OF THIS TEST WAS VACUOUS, and GLM 5.3 called it before I did
 * (round-3 finding 2). It spawned four children and asserted exactly-one-winner —
 * but node startup is ~30–60ms while the read-modify-write window is ~1ms, so the
 * children never overlapped. Running it 20× against the OLD non-atomic code gave
 * 20 green. It passed whether the fix existed or not.
 *
 * Worse, my earlier "red-test" of it was ALSO wrong. I neutered the claim AND
 * restored the re-mint at the same time, so the test went red because each refusal
 * minted a fresh token and invalidated the children's — not because of any race.
 * A red for the wrong reason reads exactly like a red for the right one, and I
 * reported it as proof in a commit message and on the board.
 *
 * The barrier removes the startup skew: every child boots, imports, announces
 * itself, then spin-waits on a `go` file the parent writes only once all of them
 * are up. They enter `checkSpend` within microseconds of each other.
 *
 * MEASURED, so nobody has to trust the reasoning. Against the old read-modify-write:
 *   before the barrier   0/20 runs detected the double-spend  (vacuous)
 *   with the barrier     12/20 detected                       (4 children)
 *   with 8 children      11/20 detected                       (no better — the RMW
 *                                                              window is simply tiny)
 * Against the current code it is 20/20 green, because the atomic claim makes
 * single-winner a guarantee rather than a likelihood.
 *
 * So this is a PROBABILISTIC detector: roughly a 3-in-5 chance of catching that
 * specific regression on any single run. That is a real test and a poor guarantee,
 * and the distinction matters — the DETERMINISTIC one is the first test in this file,
 * which forces the exact interleaving and catches the regression every time. This one
 * exists to prove the guarantee survives genuine concurrency, not to be the guarantee.
 * Eight children were tried and dropped: same detection rate, twice the processes.
 */
async function raceRedemption(dir, token, children = 4) {
  const runner = join(dir, 'redeem.mjs');
  writeFileSync(runner, [
    'import { writeFileSync, existsSync } from "node:fs";',
    'import { join } from "node:path";',
    'const dir = process.env.SWAN_SPEND_DIR;',
    'const id = process.argv[2];',
    `const m = await import(${JSON.stringify(LEDGER_URL)});`,
    // Announce readiness AFTER the import, so module load is outside the window.
    'writeFileSync(join(dir, `ready-${id}`), "1", "utf-8");',
    'while (!existsSync(join(dir, "go"))) { /* spin — sleeping reintroduces skew */ }',
    `const r = m.checkSpend(${JSON.stringify({ ...BREACH, approvalToken: token })});`,
    'process.stdout.write(r.allow ? "ALLOW" : "DENY");',
  ].join('\n'), 'utf-8');

  const { spawn } = await import('node:child_process');
  const run = (id) => new Promise((resolve) => {
    let out = '';
    const p = spawn(process.execPath, [runner, String(id)], { env: { ...process.env, SWAN_SPEND_DIR: dir } });
    p.stdout.on('data', (d) => { out += d; });
    p.on('close', () => resolve(out.trim()));
  });
  const pending = Array.from({ length: children }, (_, i) => run(i));

  // Release only once every child is parked on the barrier.
  const deadline = Date.now() + 30_000;
  while (Array.from({ length: children }, (_, i) => existsSync(join(dir, `ready-${i}`))).some((r) => !r)) {
    if (Date.now() > deadline) throw new Error('children never reached the barrier — the harness is broken, not the code');
    await new Promise((r) => setTimeout(r, 5));
  }
  writeFileSync(join(dir, 'go'), '1', 'utf-8');
  return Promise.all(pending);
}

test('GENUINELY PARALLEL: four barriered processes, one approval, exactly one winner', async () => {
  const { dir, mod } = await freshLedger();
  const first = mod.checkSpend(BREACH);
  assert.ok(first.token);
  const results = await raceRedemption(dir, first.token, 4);
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

test('a FRESH claim refuses — a live winner may still be in flight', () => {
  // The reclaim below must not fire on a genuine concurrent redemption. This is the
  // control that keeps the orphan fix from re-opening the double-spend it replaced.
  const dir = mkdtempSync(join(tmpdir(), 'swan-fresh-'));
  process.env.SWAN_SPEND_DIR = dir;
  return import(`${LEDGER_URL}?fresh=${Math.random()}`).then((mod) => {
    const first = mod.checkSpend(BREACH);
    const key = Object.keys(JSON.parse(readFileSync(join(dir, 'pending-approval.json'), 'utf-8')))[0];
    writeFileSync(join(dir, `claim-${key}-${first.token}.json`), '{}', 'utf-8'); // orphan, but brand new
    const r = mod.checkSpend({ ...BREACH, approvalToken: first.token });
    assert.equal(r.allow, false, 'a claim inside the window must be treated as a live winner');
    rmSync(dir, { recursive: true, force: true });
  });
});

test('an AGED orphan is reclaimed — a crash must not brick a valid approval', async () => {
  // GLM 5.3-flash blocker 1a, and found independently by attacking claimToken directly.
  // A process that dies between creating the claim and writing `used: true` left the
  // approval permanently unredeemable: every later attempt hit EEXIST forever, with an
  // error blaming a concurrency that never happened. A guard that can brick a
  // legitimate approval on a crash is not fail-closed, just broken in the safer
  // direction.
  const { dir, mod } = await freshLedger();
  const first = mod.checkSpend(BREACH);
  const key = Object.keys(JSON.parse(readFileSync(join(dir, 'pending-approval.json'), 'utf-8')))[0];
  const claimPath = join(dir, `claim-${key}-${first.token}.json`);
  writeFileSync(claimPath, '{}', 'utf-8');

  // Age it past the reclaim window rather than sleeping through it.
  const old = new Date(Date.now() - 5 * 60_000);
  utimesSync(claimPath, old, old);

  const r = mod.checkSpend({ ...BREACH, approvalToken: first.token });
  assert.equal(r.allow, true, "an aged orphan must be reclaimed so Sean's token still works");
  const claim = JSON.parse(readFileSync(claimPath, 'utf-8'));
  assert.equal(claim.reclaimedOrphan, true, 'the reclaim must be visible in the audit trail');
  rmSync(dir, { recursive: true, force: true });
});

test('reclaiming does NOT reopen the race — still exactly one winner', async () => {
  // The reclaim unlinks then re-creates with `wx`. Two processes may both unlink, but
  // only one create can succeed. Proven with real children rather than argued.
  const { dir, mod } = await freshLedger();
  const first = mod.checkSpend(BREACH);
  const key = Object.keys(JSON.parse(readFileSync(join(dir, 'pending-approval.json'), 'utf-8')))[0];
  const claimPath = join(dir, `claim-${key}-${first.token}.json`);
  writeFileSync(claimPath, '{}', 'utf-8');
  const old = new Date(Date.now() - 5 * 60_000);
  utimesSync(claimPath, old, old);

  const runner = join(dir, 'redeem-orphan.mjs');
  writeFileSync(runner, [
    `const m = await import(${JSON.stringify(LEDGER_URL)});`,
    `const r = m.checkSpend(${JSON.stringify({ ...BREACH, approvalToken: first.token })});`,
    'process.stdout.write(r.allow ? "ALLOW" : "DENY");',
  ].join('\n'), 'utf-8');

  const { spawn } = await import('node:child_process');
  const run = () => new Promise((resolve) => {
    let out = '';
    const p = spawn(process.execPath, [runner], { env: { ...process.env, SWAN_SPEND_DIR: dir } });
    p.stdout.on('data', (d) => { out += d; });
    p.on('close', () => resolve(out.trim()));
  });
  const results = await Promise.all([run(), run(), run(), run()]);
  const winners = results.filter((r) => r === 'ALLOW').length;
  assert.equal(winners, 1, `orphan reclaim must stay single-winner, got ${winners} (${results.join(',')})`);
  rmSync(dir, { recursive: true, force: true });
});

test('F1: calls IN FLIGHT count toward the caps', async () => {
  // GLM 5.3-flash round-3 F1, reproduced before fixing: twenty concurrent sol calls
  // (~$0.31 each) against a $5.00 day cap were ALL allowed — $6.20 approved. Each one
  // read spentToday = $0 and compared only its own worst case. The atomic claim fixed
  // token REDEMPTION; this is the ordinary case, since this harness issues parallel
  // tool calls routinely.
  const { dir, mod } = await freshLedger();
  assert.equal(mod.spentToday(), 0, 'control: a clean ledger starts at zero');
  mod.reserveSpend({ model: 'gpt-5.6-sol-pro', topic: 'p', usd: 0.31 });
  mod.reserveSpend({ model: 'gpt-5.6-sol-pro', topic: 'p', usd: 0.31 });
  assert.ok(Math.abs(mod.spentToday() - 0.62) < 1e-9, 'two holds must be visible to the day cap');
  assert.ok(Math.abs(mod.spentOnTopic('p') - 0.62) < 1e-9, 'and to the topic cap');
  rmSync(dir, { recursive: true, force: true });
});

test('F1: a completed call is counted ONCE, not twice', async () => {
  // The reservation is a hold, not a second charge. recordSpend settles the oldest
  // matching hold before appending the real row, so a finished call does not sit in
  // both columns — which would make the caps fire at half the real budget and train
  // exactly the wave-through this whole file argues against.
  const { dir, mod } = await freshLedger();
  mod.reserveSpend({ model: 'gpt-5.6-sol-pro', topic: 'p', usd: 0.31 });
  mod.recordSpend({ model: 'gpt-5.6-sol-pro', topic: 'p', usd: 0.29 });
  assert.ok(Math.abs(mod.spentOnTopic('p') - 0.29) < 1e-9,
    `expected only the real 0.29, got ${mod.spentOnTopic('p')} — the hold was double-counted`);
  rmSync(dir, { recursive: true, force: true });
});

test('F1: a stale hold expires — a crash must not withhold budget forever', async () => {
  // Same reasoning as the orphaned claim: a guard that can permanently deny budget
  // on a crash is broken in the safer direction, not fail-closed.
  const { dir, mod } = await freshLedger();
  const old = new Date(Date.now() - 30 * 60_000).toISOString();
  writeFileSync(join(dir, 'reservations.jsonl'),
    `${JSON.stringify({ ts: old, kind: 'reserve', model: 'x', topic: 'p', usd: 99 })}\n`, 'utf-8');
  assert.equal(mod.spentOnTopic('p'), 0, 'a hold past the TTL must not count');
  rmSync(dir, { recursive: true, force: true });
});

test('an UNPRICED row counts as the per-call cap, not as zero', async () => {
  // Found by mutation-testing, not by reading: changing rowUsd so `usd: null` scores
  // 0 instead of CAPS.perCall produced ZERO reds across all three suites. The policy
  // is documented in recordSpend and load-bearing — "an unpriced call pushes the caps
  // toward refusal, never away" — and nothing anywhere asserted it at the CAP level.
  // spend-ledger.test.mjs pins isPriced(), which is the classifier, not the cost.
  //
  // A silent zero for calls of unknown price is fail-open in exactly the expensive
  // direction, dressed as safe. Three review seats caught that once in recordSpend;
  // the reader side was never covered.
  const { dir, mod } = await freshLedger();
  mod.recordSpend({ model: 'x', topic: 'p', usd: undefined });
  assert.equal(mod.spentOnTopic('p'), mod.CAPS.perCall,
    'an unpriceable call must weigh the full per-call cap against the budget');
  rmSync(dir, { recursive: true, force: true });
});

test('spawnSync is available for the harness (instrument check)', () => {
  // Guards against the harness silently degrading: if the parallel test above ever
  // cannot spawn, it must fail loudly rather than pass with zero children.
  const r = spawnSync(process.execPath, ['-e', 'process.stdout.write("ok")'], { encoding: 'utf-8' });
  assert.equal(r.stdout, 'ok');
});
