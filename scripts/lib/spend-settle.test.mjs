/**
 * spend-settle.test.mjs — does a completed call actually settle the hold the gate placed?
 * =======================================================================================
 * Round 5, and the answer for the whole life of the reservation feature was NO.
 *
 * THE DEFECT, proven by probe before any fix. The gate reserves under its
 * `SCRIPT_MODEL` key; the writer records under the OpenRouter id from
 * `providers.mjs`. Those are two different strings and always have been:
 *
 *     reserve  claude-fable-5             ->  day = $1.06
 *     record   anthropic/claude-fable-5   ->  day = $1.48   (hold STILL held)
 *
 * So every completed consult double-counted itself for the full 10-minute TTL. Two
 * honest Fable calls put the $3.00 topic cap over on the third — refusing spend that
 * was never real, which is the cry-wolf direction this workstream keeps arguing is
 * the more corrosive one.
 *
 * WHY 113 GREEN TESTS MISSED IT. `spend-token-race.test.mjs` has a test named
 * "F1: a completed call is counted ONCE, not twice" — and it reserves and records
 * with the SAME string. It proves the settle path works exactly when both sides
 * already agree, which is the one condition production never met. That is the sixth
 * vacuous test this workstream has found, and the signature has not changed once:
 * **the fixture encodes the assumption the bug violates.** A test written from the
 * same mental model as the code cannot see past it; only running the two real sides
 * against each other can. GLM 5.3 put it in MISSED — "you never verified the consult
 * scripts' recordSpend model strings against SCRIPT_MODEL keys" — and the reason I
 * had not is that both files read correct on their own.
 *
 * Every test below therefore uses the REAL strings from the two real call sites,
 * never a shared constant.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync, utimesSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LEDGER_URL = new URL('./spend-ledger.mjs', import.meta.url).href;

async function freshLedger() {
  const dir = mkdtempSync(join(tmpdir(), 'swan-settle-'));
  process.env.SWAN_SPEND_DIR = dir;
  const mod = await import(`${LEDGER_URL}?s=${Math.random().toString(36).slice(2)}`);
  return { dir, mod };
}

test('PARITY: the gate reserves and the writer records the SAME seat — the hold drains', async () => {
  // The two strings are copied from their real sources, deliberately NOT shared:
  //   spend-guard-gate.mjs  SCRIPT_MODEL['consult-fable.mjs'] = 'claude-fable-5'
  //   context-gateway/src/providers.mjs  model: 'anthropic/claude-fable-5'
  // If a future refactor makes the two sides disagree again, this goes red.
  const { dir, mod } = await freshLedger();
  mod.reserveSpend({ model: 'claude-fable-5', topic: 'plan', usd: 1.06 });
  assert.ok(Math.abs(mod.spentOnTopic('plan') - 1.06) < 1e-9, 'control: the hold is visible');

  mod.recordSpend({ model: 'anthropic/claude-fable-5', topic: 'plan', usd: 0.42 });
  assert.ok(Math.abs(mod.spentOnTopic('plan') - 0.42) < 1e-9,
    `expected only the real $0.42; got $${mod.spentOnTopic('plan')} — the hold never settled`);
  rmSync(dir, { recursive: true, force: true });
});

test('PARITY holds for every gated seat — the pairs are DERIVED, not hand-copied', async () => {
  // GLM 5.3 round-5 F12 / flash F9, and they are right: this list used to be three
  // pairs typed by hand out of ~17 SCRIPT_MODEL keys, with nothing asserting it was
  // complete. A fourth seat added next week with mismatched keys would be invisible —
  // **the blind spot of the very fix that closed the never-settling hold**, one file
  // over. The price-parity test derives both sides; this one did not, and the
  // inconsistency is the tell.
  //
  // Derived now: every provider record's model must be a key the gate reserves under.
  // That is the exact invariant the Fable defect violated, asserted over the whole
  // roster instead of a sample of it.
  const gateSrc = readFileSync(fileURLToPath(new URL('../hooks/spend-guard-gate.mjs', import.meta.url)), 'utf-8');
  const { PROVIDERS } = await import('../context-gateway/src/providers.mjs');
  const { normalizeModelKey } = await import(LEDGER_URL);

  const block = gateSrc.slice(gateSrc.indexOf('const SCRIPT_MODEL'));
  const gateKeys = new Set([...block.matchAll(/:\s*'([a-z0-9][\w.-]*)',/g)].map((m) => m[1]));
  assert.ok(gateKeys.size > 5, `instrument: only ${gateKeys.size} SCRIPT_MODEL values parsed`);

  const PAIRS = Object.values(PROVIDERS).map((p) => [normalizeModelKey(p.model), p.model]);
  assert.ok(PAIRS.length >= 3, 'instrument: providers.mjs yielded too few seats');
  for (const [gateKey, writerId] of PAIRS) {
    assert.ok(gateKeys.has(gateKey),
      `${writerId} normalises to "${gateKey}", which the gate never reserves under — its holds can never settle`);
  }

  for (const [gateKey, writerId] of PAIRS) {
    const { dir, mod } = await freshLedger();
    mod.reserveSpend({ model: gateKey, topic: 't', usd: 0.5 });
    mod.recordSpend({ model: writerId, topic: 't', usd: 0.1 });
    assert.ok(Math.abs(mod.spentOnTopic('t') - 0.1) < 1e-9,
      `${gateKey} vs ${writerId}: hold not settled (got $${mod.spentOnTopic('t')})`);
    rmSync(dir, { recursive: true, force: true });
  }
});

test('LIFECYCLE: in-flight drains to zero after the settle', async () => {
  // GLM 5.3 MISSED: "no lifecycle test that in-flight totals drain to zero after a
  // settle — a leak test for the hold itself." Distinct from the test above, which
  // pins the TOTAL: this one pins that nothing is left holding budget. A hold that
  // survives its own settlement leaks silently until TTL, and the total only reveals
  // it while the real row happens to be smaller.
  const { dir, mod } = await freshLedger();
  const res = join(dir, 'reservations.jsonl');
  mod.reserveSpend({ model: 'kimi-k3', topic: 'x', usd: 0.31 });
  mod.recordSpend({ model: 'moonshotai/kimi-k3', topic: 'x', usd: 0.31 });
  // Subtract the settled row: whatever remains is in-flight.
  const settled = mod.readLedger().reduce((s, e) => s + Number(e.usd || 0), 0);
  assert.ok(Math.abs((mod.spentOnTopic('x') - settled)) < 1e-9,
    'in-flight must be zero once the call has settled');
  assert.ok(readFileSync(res, 'utf-8').includes('"kind":"release"'), 'control: a release was written');
  rmSync(dir, { recursive: true, force: true });
});

test('an ORPHAN release is discarded, not banked as a coupon for the next hold', async () => {
  // GLM 5.3 finding 2 / flash finding 4. The old fold counted every release first and
  // then walked the reserves, so a release could settle a hold appended AFTER it —
  // a coupon good for ten minutes. Sean running a consult by hand minted one every
  // time: no hook, so no reserve, but the shim still records.
  //
  // THIS TEST WAS VACUOUS ON ITS FIRST WRITING and mutation-testing caught it, not
  // reading. Its first version recorded the orphan into an EMPTY ledger dir, where
  // `releaseReservation` no-ops because reservations.jsonl does not exist yet — so no
  // orphan row was ever written and the fold was never exercised. Restoring the old
  // out-of-order fold produced ZERO reds while the assertion sat there looking
  // rigorous. Seventh vacuous test of this workstream, same signature every time: the
  // fixture never reaches the code it names. An unrelated hold below establishes the
  // file first, so the orphan actually lands.
  const { dir, mod } = await freshLedger();
  mod.reserveSpend({ model: 'grok-4.6', topic: 'other', usd: 0.11 });      // makes the file exist
  mod.recordSpend({ model: 'moonshotai/kimi-k3', topic: 'x', usd: 0.05 }); // release, no hold
  mod.reserveSpend({ model: 'kimi-k3', topic: 'x', usd: 0.31 });           // must NOT be eaten
  assert.ok(Math.abs(mod.spentOnTopic('x') - 0.36) < 1e-9,
    `the later hold was cancelled by an earlier orphan release (got $${mod.spentOnTopic('x')})`);
  rmSync(dir, { recursive: true, force: true });
});

test('a release settles by NONCE, never a concurrent caller’s hold', async () => {
  // The gate places holds before it decides, so a refusal has to give back exactly
  // its own. Without the nonce it would settle the oldest matching hold — which,
  // under parallel gates on the same seat and topic, is somebody else's live call.
  const { dir, mod } = await freshLedger();
  const mine = mod.reserveSpend({ model: 'kimi-k3', topic: 'x', usd: 0.31 });
  const theirs = mod.reserveSpend({ model: 'kimi-k3', topic: 'x', usd: 0.31 });
  assert.notEqual(mine, theirs, 'control: two holds get two nonces');

  mod.releaseReservation({ model: 'kimi-k3', topic: 'x', nonce: theirs });
  assert.ok(Math.abs(mod.spentOnTopic('x') - 0.31) < 1e-9, 'exactly one hold remains');

  // And the one remaining must be MINE: settling it must empty the file's live set.
  mod.releaseReservation({ model: 'kimi-k3', topic: 'x', nonce: mine });
  assert.equal(mod.spentOnTopic('x'), 0, 'the nonce settled a different hold than the one named');
  rmSync(dir, { recursive: true, force: true });
});

test('RESERVE-THEN-CHECK: a refused call does not keep holding the budget', async () => {
  // The hold is placed before the decision, so the refusal path must hand it back or
  // the guard slowly starves itself: every blocked attempt would leave $1.06 parked
  // for ten minutes, and the next honest call inherits a budget it never spent.
  const { dir, mod } = await freshLedger();
  const nonce = mod.reserveSpend({ model: 'claude-fable-5', topic: 'p', usd: 1.06 });
  const decision = mod.checkSpend({
    model: 'claude-fable-5', topic: 'p', worstCaseUsd: 1.06, selfHeld: true,
  });
  assert.equal(decision.allow, false, 'control: $1.06 breaches the $1.00 per-call cap');
  mod.releaseReservation({ model: 'claude-fable-5', topic: 'p', nonce });
  assert.equal(mod.spentOnTopic('p'), 0, 'a refusal must release the hold it placed');
  rmSync(dir, { recursive: true, force: true });
});

test('selfHeld does not double-count the caller against its own hold', async () => {
  // The whole risk of reserve-then-check: the totals now contain the caller's own
  // worst case, so adding `call` on top again would refuse honest calls at half the
  // real budget — the cry-wolf failure, arriving through the door opened to close a
  // race. $2.50 held, $2.50 asked, $3.00 topic cap: allowed once, refused if doubled.
  const { dir, mod } = await freshLedger();
  mod.reserveSpend({ model: 'kimi-k3', topic: 'p', usd: 0.90 });
  const d = mod.checkSpend({ model: 'kimi-k3', topic: 'p', worstCaseUsd: 0.90, selfHeld: true });
  assert.equal(d.allow, true, `own hold counted twice: topic read $${d.totals.topic}`);

  // And the opposite direction still works: a SECOND caller sees the first's hold.
  // Sized to actually breach — the first version of this assertion used $0.90 + $0.90
  // against a $3.00 topic cap and demanded a refusal the caps had no reason to give.
  // My expectation was wrong, not the code; a red for the wrong reason is exactly the
  // trap this file's own history records, so it is written down rather than quietly
  // retuned.
  const d2 = mod.checkSpend({ model: 'kimi-k3', topic: 'p', worstCaseUsd: 2.50, selfHeld: false });
  assert.equal(d2.allow, false, 'a second caller must see the first hold and be refused');
  rmSync(dir, { recursive: true, force: true });
});

test('the reported "already spent" figure excludes the caller’s own hold', async () => {
  // Cosmetic but load-bearing: the refusal text is what Sean reads to decide whether
  // to approve. Reserve-then-check puts the caller's own money inside the running
  // total, so a naive message would tell him $2.12 was already spent on a topic where
  // $1.06 was his pending request.
  const { dir, mod } = await freshLedger();
  mod.recordSpend({ model: 'anthropic/claude-fable-5', topic: 'p', usd: 2.50 });
  mod.reserveSpend({ model: 'claude-fable-5', topic: 'p', usd: 1.06 });
  const d = mod.checkSpend({ model: 'claude-fable-5', topic: 'p', worstCaseUsd: 1.06, selfHeld: true });
  assert.equal(d.allow, false);
  assert.match(d.breach, /already spent \$2\.50/, `misreported prior spend: ${d.breach}`);
  rmSync(dir, { recursive: true, force: true });
});

test('the gate never prices a seat CHEAPER than the seat’s own provider record', async () => {
  // Two price tables existed and disagreed by 2x for sol, unnoticed, because nothing
  // ever compared them: the gate's PRICES said $2.50/$15 while providers.mjs had
  // carried `priceVerified: '2026-07-17'` at $5/$30. A guard that under-counts by half
  // is worse than one that is incomplete — it reports a confident wrong number.
  //
  // Found by a parity test written for the RESERVATION key, which is the argument for
  // cross-table tests: careful reading of either file alone shows nothing, because
  // each is internally consistent. The assertion is one-directional — the gate may be
  // more pessimistic than the provider record (worst-case routing is a real reason),
  // never cheaper.
  const gateSrc = readFileSync(fileURLToPath(new URL('../hooks/spend-guard-gate.mjs', import.meta.url)), 'utf-8');
  const { PROVIDERS } = await import('../context-gateway/src/providers.mjs');

  const priceOf = (key) => {
    const m = gateSrc.match(new RegExp(`'${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}':\\s*\\[([\\d.]+),\\s*([\\d.]+)\\]`));
    return m ? [Number(m[1]), Number(m[2])] : null;
  };

  let checked = 0;
  for (const [seat, p] of Object.entries(PROVIDERS)) {
    const key = p.model.replace(/^[^/]+\//, '');
    const gate = priceOf(key);
    assert.ok(gate, `seat "${seat}" calls ${p.model} and the gate has no PRICES entry for "${key}"`);
    assert.ok(gate[0] >= p.priceInPerM,
      `${seat}: gate prices input at $${gate[0]}/M, provider record says $${p.priceInPerM}/M`);
    assert.ok(gate[1] >= p.priceOutPerM,
      `${seat}: gate prices output at $${gate[1]}/M, provider record says $${p.priceOutPerM}/M`);
    checked += 1;
  }
  // Instrument check: a regex that matched nothing would pass this loop silently.
  assert.ok(checked >= 3, `expected to check every provider, only reached ${checked}`);
});

test('a LOST used flag cannot buy a second redemption', async () => {
  // GLM 5.3-flash round-4 finding 10. Redemption required `!tokens[key].used`, and
  // that flag was set by rewriting the WHOLE tokens.json — an unlocked
  // read-modify-write of a shared object, on the money path. Two concurrent
  // redemptions of DIFFERENT keys can lose one `used: true` in the merge; a lost
  // flag plus a claim past the orphan window re-redeems the same approval.
  //
  // Simulated directly rather than raced for, the same reasoning as the
  // deterministic interleaving test: rewind tokens.json to `used: false` — exactly
  // what a lost write leaves behind — and age the claim past the reclaim window so
  // the orphan branch is reachable. That is the WHOLE failure, forced.
  //
  // MUTATION NOTE, because it is the inverse of the trap this file keeps recording.
  // There are TWO guards — the `!isSpent` precondition here and the `isSpent` check
  // inside claimToken — and disabling EITHER ONE leaves this test green, because the
  // other catches it. Only disabling BOTH turns it red. A single mutation reporting
  // zero reds therefore proves nothing about this test; it proves the layering works.
  // Worth writing down: "zero reds" has now meant three different things in this
  // workstream — a vacuous test, a mutation that never landed, and genuine defence in
  // depth — and they are indistinguishable from the number alone.
  const { dir, mod } = await freshLedger();
  const BREACH = { model: 'claude-fable-5', topic: 'p', worstCaseUsd: 4.00 };

  const first = mod.checkSpend(BREACH);
  assert.equal(first.allow, false, 'control: first ask is refused');
  assert.ok(first.token, 'control: a token is minted');

  const spent = mod.checkSpend({ ...BREACH, approvalToken: first.token });
  assert.equal(spent.allow, true, 'control: the second ask redeems');

  // The lost write, plus an aged claim.
  const tokensPath = join(dir, 'pending-approval.json');
  const store = JSON.parse(readFileSync(tokensPath, 'utf-8'));
  for (const k of Object.keys(store)) { store[k].used = false; delete store[k].usedAt; }
  writeFileSync(tokensPath, JSON.stringify(store, null, 2), 'utf-8');
  for (const f of readdirSync(dir)) {
    if (f.startsWith('claim-')) {
      const old = new Date(Date.now() - 10 * 60_000);
      utimesSync(join(dir, f), old, old);
    }
  }

  const again = mod.checkSpend({ ...BREACH, approvalToken: first.token });
  assert.equal(again.allow, false,
    'a token whose used-flag was lost redeemed a SECOND time — the store is authoritative again');
  rmSync(dir, { recursive: true, force: true });
});

test('an IN-FLIGHT redemption still names its own recovery path', async () => {
  // The "concurrent call — delete claim-<key>" message lost its only assertion when
  // the replay case moved out of the redemption branch. It is still REACHABLE, on the
  // one situation it was actually written for: a claim exists (a redemption is in
  // flight) and no spent-marker has been written yet. Leaving it uncovered would let
  // a stuck operator's only instructions rot silently — which is exactly the failure
  // the message exists to prevent.
  const { dir, mod } = await freshLedger();
  const BREACH = { model: 'claude-fable-5', topic: 'p', worstCaseUsd: 4.00 };
  const first = mod.checkSpend(BREACH);

  // Simulate a redemption in flight: a FRESH claim, no marker, token still unused.
  const store = JSON.parse(readFileSync(join(dir, 'pending-approval.json'), 'utf-8'));
  const key = Object.keys(store)[0];
  // Claims are keyed per TOKEN since 2026-08-27 (GLM 5.3 round-5 B3). A path built
  // the old way would create a decoy nobody consults, and the test would pass for the
  // wrong reason — which is exactly what happened to a sibling test in this batch:
  // it kept passing through the contract change and quietly went vacuous.
  writeFileSync(join(dir, `claim-${key}-${first.token}.json`), JSON.stringify({ inFlight: true }), 'utf-8');

  const blocked = mod.checkSpend({ ...BREACH, approvalToken: first.token });
  assert.equal(blocked.allow, false, 'a claim held by another caller must refuse');
  assert.match(blocked.reason, /concurrent call/, 'and must say it is a concurrency, not a spend');
  assert.match(blocked.reason, /delete .*claim-/, 'a refusal must name its own recovery path');
  rmSync(dir, { recursive: true, force: true });
});

test('a CRASHED holder is still distinguishable from a spent one', async () => {
  // The other half of the same mechanism, and the reason the marker exists rather
  // than the claim alone. A process that creates the claim and dies before spending
  // leaves an aged claim with NO marker — Sean's approval must still be redeemable,
  // or the guard bricks a legitimate token on a crash with no TTL and no override.
  //
  // THIS TEST WAS VACUOUS AS FIRST WRITTEN, and GLM 5.3-flash named it exactly when I
  // asked for an eighth. At the point it built the "claim", only the FIRST ask had
  // run — which mints a token and creates no claim file — so
  // `readdirSync(dir).find(f => f.startsWith('claim-')) || 'none'` wrote and aged a
  // junk file literally named `none`, and the retry then succeeded through the
  // ORDINARY path. Deleting the orphan-reclaim branch entirely left it green.
  //
  // Eighth of this workstream, signature unchanged: THE FIXTURE NEVER REACHES THE CODE
  // IT NAMES. The `|| 'none'` fallback is the tell — a default that silently converts
  // "the thing I need does not exist" into "carry on".
  //
  // Rebuilt to construct the claim at the real per-token path, and to ASSERT IT EXISTS
  // before ageing it. That instrument check is the one line that would have caught the
  // original.
  const { dir, mod } = await freshLedger();
  const BREACH = { model: 'claude-fable-5', topic: 'p', worstCaseUsd: 4.00 };
  const first = mod.checkSpend(BREACH);
  const key = Object.keys(JSON.parse(readFileSync(join(dir, 'pending-approval.json'), 'utf-8')))[0];

  // The crash: the claim was created, the process died before marking it spent.
  const claim = join(dir, `claim-${key}-${first.token}.json`);
  writeFileSync(claim, JSON.stringify({ crashed: true }), 'utf-8');
  assert.ok(existsSync(claim), 'instrument: the claim under test must actually exist');
  assert.ok(!readdirSync(dir).some((f) => f.startsWith('used-')),
    'instrument: a crashed holder leaves NO spent-marker — that is what distinguishes it');
  const old = new Date(Date.now() - 10 * 60_000);
  utimesSync(claim, old, old);

  const retry = mod.checkSpend({ ...BREACH, approvalToken: first.token });
  assert.equal(retry.allow, true,
    'an aged claim with no spent-marker is a crashed holder; the approval must still work');
  assert.ok(JSON.parse(readFileSync(claim, 'utf-8')).reclaimedOrphan,
    'and it must go through the RECLAIM branch, not around it');
  rmSync(dir, { recursive: true, force: true });
});

test('R5: the reclaim DELETES NOTHING — the race was in the unlink', async () => {
  // flash round-5 F1. `stat -> unlink -> create` is three operations and therefore not
  // atomic as a unit: racer B stats the AGED claim, is descheduled while racer A
  // completes its reclaim, then unlinks A's FRESH claim and creates its own. Both
  // proceed. The inline invariant "only one create can succeed" assumed both racers act
  // on the same file — and after A's unlink they do not.
  //
  // Asserted STRUCTURALLY rather than by racing, and deliberately so: the fix is that
  // the dangerous operation no longer exists, and forcing that interleaving reliably
  // needs instrumentation the production path should not carry. Exactly one process can
  // create generation N with O_EXCL; nothing is deleted, so there is no window to lose.
  const { dir, mod } = await freshLedger();
  const BREACH = { model: 'claude-fable-5', topic: 'p', worstCaseUsd: 4.00 };
  const first = mod.checkSpend(BREACH);
  const key = Object.keys(JSON.parse(readFileSync(join(dir, 'pending-approval.json'), 'utf-8')))[0];

  const claim = join(dir, `claim-${key}-${first.token}.json`);
  writeFileSync(claim, JSON.stringify({ crashed: true }), 'utf-8');
  const old = new Date(Date.now() - 10 * 60_000);
  utimesSync(claim, old, old);

  assert.equal(mod.checkSpend({ ...BREACH, approvalToken: first.token }).allow, true);
  assert.ok(existsSync(claim), 'the original claim must SURVIVE — deleting it is what was racy');
  assert.ok(readdirSync(dir).some((f) => f.includes('.gen1.')),
    'the win must be recorded as an exclusively-created next generation');
  rmSync(dir, { recursive: true, force: true });
});

test('R5: a SECOND approval cycle for the same breach still works', async () => {
  // GLM 5.3 round-5 B3 — a BRICK, and one my own round-4 fix created. The spent-marker
  // and the claim file were both keyed by model+topic+cost, and nothing deletes either.
  // So the next approval for the same breach — Fable on the same document, next day,
  // clean caps — minted a token and then refused to redeem it, forever, needing a
  // hand-deleted file the error message never named.
  //
  // Reproduced before fixing (cycle 2 redeem: allow=false), and this is the shape:
  // A CONTROL KEYED ON SOMETHING COARSER THAN THE THING IT PROTECTS WILL EVENTUALLY
  // DENY THE THING IT PROTECTS. The token is what gets spent, so the token is what the
  // marker records and what the claim path names.
  const { dir, mod } = await freshLedger();
  const BREACH = { model: 'claude-fable-5', topic: 'plan', worstCaseUsd: 1.06 };

  const c1 = mod.checkSpend(BREACH);
  assert.equal(mod.checkSpend({ ...BREACH, approvalToken: c1.token }).allow, true, 'cycle 1 redeems');

  const c2 = mod.checkSpend(BREACH);
  assert.ok(c2.token, 'cycle 2 mints a token');
  assert.notEqual(c2.token, c1.token, 'and it is a new one');
  assert.equal(mod.checkSpend({ ...BREACH, approvalToken: c2.token }).allow, true,
    'cycle 2 must redeem — a stale marker or claim from cycle 1 bricks every future approval');

  // Third cycle too: a brick that only appears on the Nth cycle is still a brick.
  const c3 = mod.checkSpend(BREACH);
  assert.equal(mod.checkSpend({ ...BREACH, approvalToken: c3.token }).allow, true, 'cycle 3 as well');
  rmSync(dir, { recursive: true, force: true });
});

test('R5: cycle 1 token is still dead after cycle 2 exists', async () => {
  // The other side of B3's fix, and the risk it introduced: per-token keying must not
  // resurrect a SPENT token just because a newer one was issued for the same breach.
  const { dir, mod } = await freshLedger();
  const BREACH = { model: 'claude-fable-5', topic: 'plan', worstCaseUsd: 1.06 };
  const c1 = mod.checkSpend(BREACH);
  mod.checkSpend({ ...BREACH, approvalToken: c1.token });
  mod.checkSpend(BREACH); // cycle 2 mints, overwriting the per-key marker

  const replay = mod.checkSpend({ ...BREACH, approvalToken: c1.token });
  assert.equal(replay.allow, false, 'a spent token must stay spent, whatever was minted after it');
  rmSync(dir, { recursive: true, force: true });
});

test('normalizeModelKey folds vendor prefixes and case, and nothing else', async () => {
  const { dir, mod } = await freshLedger();
  const n = mod.normalizeModelKey;
  assert.equal(n('anthropic/claude-fable-5'), 'claude-fable-5');
  assert.equal(n('claude-fable-5'), 'claude-fable-5');
  assert.equal(n('  OpenAI/GPT-5.6-Sol  '), 'gpt-5.6-sol');
  // Only the FIRST segment is a vendor. A seat id that legitimately contains a slash
  // must not be flattened past recognition.
  assert.equal(n('a/b/c'), 'b/c');
  assert.equal(n(null), '');
  rmSync(dir, { recursive: true, force: true });
});
