/**
 * hostile-round12-probe.mjs — the THREE ceilings, driven rather than read.
 *
 * Round 12 closed two gaps Astra named: "enforce per-job, per-caller and global ceilings".
 * The global ceiling already existed. The other two did not:
 *
 *   PER-JOB    `max_cost_usd` was validated at submission against the quote's ESTIMATE and
 *              stored on the job, and the runner never read it. A ceiling asserted against a
 *              forecast, never against the charge.
 *   PER-CALLER `checkRunAllowed` took no principal, and the ledger recorded no split, so
 *              every caller shared one daily budget.
 *
 * ── WHY THIS PROBE DRIVES THE CODE INSTEAD OF GREPPING IT ───────────────────
 * Round 6's section F is a source-text check, and during the round-12 refactor one of its
 * assertions passed VACUOUSLY: it asserted the ABSENCE of `maxCostUsd` from a file, and the
 * string was absent because the code had MOVED, not because the behaviour was unchanged.
 * A grep cannot tell those apart. So everything here calls the real functions with real
 * arguments, and every section carries a CONTROL that must pass for the section to mean
 * anything — a section that cannot fail proves nothing.
 *
 * The composition function under test is `assertRunAllowed` from `ceilings.mjs`, which is
 * the exact function `generateVideo.mjs` calls, so these are not tests of a parallel path.
 */

import { assertRunAllowed } from '../backend/scripts/handlers/ceilings.mjs';
import { checkRunAllowed, readLimits, makeFileLedger, dayKey } from '../shared/providers/video/spendGuard.mjs';
import {
  jobRefusal, callerRefusal, callerLimits, callerScope, microsFromUsd,
} from '../shared/providers/video/ceilingGate.mjs';
import { runGenerate } from '../backend/scripts/handlers/generateVideo.mjs';

let passed = 0; let failed = 0;
const check = (name, ok, detail) => {
  if (ok) { passed += 1; console.log(`  PASS  ${name}${detail ? `\n          ${detail}` : ''}`); }
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`); }
};
const section = (t) => console.log(`\n── ${t} ──`);
const throws = (fn) => { try { fn(); return null; } catch (e) { return e.code || e.message; } };

const NOW = () => new Date('2026-09-18T12:00:00Z');
const DAY = dayKey(NOW());

/** A ledger backed by a string, so a test can plant a file this code would not write. */
const fakeLedger = (initial = null) => {
  let store = initial;
  const fs = {
    readFileSync: () => { if (store === null) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' }); return store; },
    writeFileSync: (_p, data) => { store = data; },
  };
  return { led: makeFileLedger('/x.json', fs), dump: () => store };
};

/** Resolved capabilities for a per-run-priced hosted row. */
const PRICED = {
  provider: 'higgsfield/dop', transport: 'https', costPerRunUsd: 0.125,
  costPerSecondUsd: null, rateUnit: 'generation',
};
const FREE = {
  provider: 'comfyui/minimax-h3', transport: 'comfyui', costPerRunUsd: 0,
  costPerSecondUsd: null, rateUnit: 'run',
};

async function main() {
  console.log('HOSTILE PROBE — ROUND 12: per-job, per-caller and global ceilings\n');

  // ══ A. THE PER-JOB CEILING — the caller's own number, against the charge ══
  section('A. the per-job ceiling, against the CHARGE rather than the forecast');
  {
    const limits = readLimits({ SWAN_VIDEO_MAX_SPEND_USD_DAILY: '100' });
    const job = (maxCostUsd) => ({ id: 'j-a', maxCostUsd, params: {} });
    const run = (maxCostUsd, caps = PRICED) => throws(() => assertRunAllowed({
      job: job(maxCostUsd), caps, ledger: null, env: { SWAN_VIDEO_MAX_SPEND_USD_DAILY: '100' }, now: NOW,
    }));

    // The control the whole section rests on: with no ceiling the run is allowed, so a
    // refusal below is caused by the ceiling and not by the guard refusing everything.
    check('CONTROL: with no caller ceiling the priced run is allowed',
      run(undefined) === null, 'max_cost_usd is optional; absent means "no ceiling declared"');

    check('a ceiling BELOW the charge is refused',
      run(0.10) === 'E_JOB_COST_EXCEEDED',
      'charge $0.125 against a $0.10 ceiling — the gap round 12 closed');

    check('CONTROL: a ceiling ABOVE the charge is allowed',
      run(1.00) === null, 'so the refusal above is about the comparison, not about the field existing');

    check('the refusal is at the EXACT boundary, not near it',
      run(0.125) === null && run(0.124999) === 'E_JOB_COST_EXCEEDED',
      'equal is allowed; one micro below is refused');

    check('an UNREADABLE ceiling with money at stake is refused, not ignored',
      run('0.10') === 'E_BAD_MAX_COST' && run(-1) === 'E_BAD_MAX_COST' && run({}) === 'E_BAD_MAX_COST',
      'a string, a negative and an object — a ceiling that cannot be read is not an absent ceiling');

    // THE DELIBERATE EXCEPTION, asserted rather than assumed. A malformed ceiling can only
    // reach the runner on a route the quote priced at zero, and nothing is spent there.
    check('an unreadable ceiling with a ZERO charge is allowed (the deliberate exception)',
      run('banana', FREE) === null,
      '0 <= anything holds for every ceiling including an unreadable one, and refusing here '
      + 'would fail a free request over money that does not exist');
    check('CONTROL: the free lane with no ceiling is allowed',
      run(undefined, FREE) === null, 'the zero-cost path this gateway exists for is untouched');
    check('CONTROL: the free lane with a VALID ceiling is allowed',
      run(1, FREE) === null, 'a caller may still declare one; it just cannot bind on a free run');

    check('micro-dollars, not binary floats: 0.29-style values compare exactly',
      jobRefusal({ maxCostUsd: 0.3, runCostUsd: 0.1 + 0.2 }) === null
        && microsFromUsd(0.1 + 0.2) === 300000,
      `microsFromUsd(0.1+0.2)=${microsFromUsd(0.1 + 0.2)} — snapping to the micro grid before scaling`);
  }

  // ══ B. THE PER-JOB CEILING, END TO END THROUGH THE RUNNER ═════════════════
  section('B. the same ceiling, driven through runGenerate (the wiring, not just the logic)');
  {
    const HOSTED = 'higgsfield/dop';
    const ENABLED = {
      SWAN_VIDEO_PROVIDERS_ENABLED: HOSTED,
      SWAN_VIDEO_MAX_SPEND_USD_DAILY: '100',
    };
    const adapter = {
      generate: async (r, o) => ({
        provider: HOSTED, promptId: 'p12', outPath: o.outPath, bytes: 9,
        filename: 'o.mp4', sha256: 'abc', attribution: 'probe',
      }),
    };
    const params = {
      provider: HOSTED, prompt: 'a swan crossing still water at dawn',
      category: 'marketing', style: 'cinematic', duration: 5,
      commercial: false, initImage: 'approved-still-ref',
      // ── ROUND 26 (D3): THIS PROBE NOW HAS TO ASK FOR THE HOSTED PROVIDER ──────
      // `higgsfield/dop` is a paid hosted row, and `registry.resolve()` now refuses one
      // unless the caller asserts an explicit selection. This probe is not testing selection
      // policy — it is testing the PER-JOB CEILING, and it uses a hosted row because that is
      // the shape that bills. So it supplies the assertion the new policy requires, exactly
      // as a deliberate caller would.
      //
      // The flag is added rather than the check being relaxed, because relaxing it would make
      // this probe pass by removing the mechanism it is unrelated to — and the mechanism is
      // the point of round 26. Note `commercial: false` above does NOT exempt this: the
      // explicit-selection policy is a SPEND control, and a hosted render costs money whether
      // or not the caller calls it commercial. That is a deliberate divergence from the
      // licence gate's "non-commercial use is unaffected" rule, whose cause is legal rather
      // than financial — see `registry.resolve`.
      explicitSelection: true,
    };

    const planted = fakeLedger();
    const go = (maxCostUsd) => runGenerate(
      { id: 'j-b', owner: 'caller-1', maxCostUsd, params },
      async () => {},
      { env: ENABLED, adapters: { [HOSTED]: adapter }, outDir: '/tmp', ledger: planted.led, now: NOW },
    ).then(() => null, (e) => e);

    const over = await go(0.10);
    check('the runner REFUSES a job whose charge exceeds the stored ceiling',
      over && over.code === 'E_JOB_COST_EXCEEDED',
      over ? `${over.code}: ${String(over.message).slice(0, 90)}…` : 'the job SUCCEEDED — the ceiling is not enforced');
    check('the refusal is PERMANENT — a retry reproduces both numbers',
      over && over.permanent === true, 'a retry re-reads the same stored ceiling and the same catalogue price');

    const ledgerAfterRefusal = planted.led.usageFor(DAY);
    check('a refused job is NOT charged to the ledger',
      (ledgerAfterRefusal.runs || 0) === 0,
      `runs=${ledgerAfterRefusal.runs} — the refusal happens before the charge, so a refused run consumes nothing`);

    const ok = await go(1.00);
    check('CONTROL: the same job with a sufficient ceiling SUCCEEDS',
      ok === null, 'so the refusal above is the ceiling, not the transport');
    const after = planted.led.usageFor(DAY);
    check('a permitted job IS charged, and named against its caller',
      after.runs === 1 && after.spendUsd === 0.125 && after.callers?.['caller-1']?.runs === 1,
      JSON.stringify(after));
  }

  // ══ C. THE PER-CALLER CEILING ═════════════════════════════════════════════
  section('C. the per-caller ceiling — the one that did not exist at all');
  {
    // THE NON-BREAKING CONTROL. With nothing configured the scope is null and the guard is
    // the three-argument function it always was.
    check('CONTROL: with no per-caller cap configured the scope is null',
      callerScope('caller-1', { runs: 0, spendUsd: 0 }, {}) === null,
      'this is what keeps every existing call site valid');
    check('CONTROL: an unconfigured guard behaves exactly as the three-argument form',
      JSON.stringify(checkRunAllowed(FREE, { runs: 0, spendUsd: 0 }, readLimits({}))) ===
      JSON.stringify(checkRunAllowed(FREE, { runs: 0, spendUsd: 0 }, readLimits({}), null)),
      'passing null must be indistinguishable from not passing it');

    const limits = callerLimits({ SWAN_VIDEO_MAX_RUNS_DAILY_PER_CALLER: '3' });
    const spendLimits = callerLimits({ SWAN_VIDEO_MAX_SPEND_USD_DAILY_PER_CALLER: '1.00' });

    check('a caller AT their run cap is refused',
      callerRefusal({ principal: 'c1', usage: { runs: 3, callers: { c1: { runs: 3, spendUsd: 0 } } }, limits })
        ?.code === 'E_CALLER_RUN_CAP');
    check('CONTROL: a caller UNDER their run cap is allowed',
      callerRefusal({ principal: 'c1', usage: { runs: 2, callers: { c1: { runs: 2, spendUsd: 0 } } }, limits })
        === null);

    check('the spend cap is PROJECTED, not merely reported',
      callerRefusal({
        principal: 'c1', limits: spendLimits, runCostUsd: 0.125,
        usage: { runs: 1, spendUsd: 0.95, callers: { c1: { runs: 1, spendUsd: 0.95 } } },
      })?.code === 'E_CALLER_SPEND_CAP',
      '$0.95 spent + $0.125 run = $1.075 over a $1.00 cap — refusing only after the fact would be the weaker ceiling');
    check('CONTROL: the same caller with the run cost still under the cap is allowed',
      callerRefusal({
        principal: 'c1', limits: spendLimits, runCostUsd: 0.04,
        usage: { runs: 1, spendUsd: 0.95, callers: { c1: { runs: 1, spendUsd: 0.95 } } },
      }) === null);

    check('a configured cap with an UNATTRIBUTABLE caller is refused',
      callerRefusal({ principal: null, usage: { runs: 0 }, limits })?.code === 'E_CALLER_UNKNOWN',
      'an unknown caller cannot be compared against a per-caller ceiling');

    check('a configured cap with usage but NO per-caller split is refused',
      callerRefusal({ principal: 'c1', usage: { runs: 5, spendUsd: 1 }, limits })?.code === 'E_CALLER_USAGE_UNKNOWN',
      'an unattributable share is not a zero one — this is the upgrade-day case');
    check('CONTROL: the same caller WITH a split is allowed',
      callerRefusal({ principal: 'c1', usage: { runs: 5, spendUsd: 1, callers: { c1: { runs: 0, spendUsd: 0 } } }, limits })
        === null,
      'so the refusal above is about the missing split, not about the usage');
    check('a FRESH day (no usage at all) is not mistaken for an unknown share',
      callerRefusal({ principal: 'c1', usage: { runs: 0, spendUsd: 0 }, limits }) === null,
      'nothing was recorded because nothing happened');

    check('a malformed per-caller cap THROWS rather than defaulting to no cap',
      throws(() => callerLimits({ SWAN_VIDEO_MAX_RUNS_DAILY_PER_CALLER: 'abc' })) === 'E_BAD_CAP',
      'treating a typo as absent would silently restore "no per-caller ceiling"');

    // AND THE GUARD, not only the judgement: the ceiling must bind on the FREE lane too.
    const scope = { principal: 'c1', usage: { runs: 3, callers: { c1: { runs: 3, spendUsd: 0 } } }, limits };
    check('the per-caller run cap binds on the FREE lane',
      throws(() => checkRunAllowed(FREE, scope.usage, readLimits({}), scope)) === 'E_CALLER_RUN_CAP',
      'the global run cap binds on the free lane, so a per-caller one that did not would be the weaker ceiling');
    check('CONTROL: the same free lane without the scope is allowed',
      throws(() => checkRunAllowed(FREE, scope.usage, readLimits({}), null)) === null,
      'the scope is what refuses it, and only the scope');
  }

  // ══ D. THE LEDGER'S PER-CALLER SPLIT ══════════════════════════════════════
  section('D. the per-caller split in the ledger, and its upgrade path');
  {
    const { led, dump } = fakeLedger();
    led.record(DAY, { runs: 1, spendUsd: 0.5, caller: 'alice' });
    led.record(DAY, { runs: 1, spendUsd: 0.25, caller: 'bob' });
    led.record(DAY, { runs: 1, spendUsd: 0.1, caller: 'alice' });
    const u = led.usageFor(DAY);
    check('the split is recorded per caller AND globally',
      u.runs === 3 && Math.abs(u.spendUsd - 0.85) < 1e-9
        && u.callers.alice.runs === 2 && Math.abs(u.callers.alice.spendUsd - 0.6) < 1e-9
        && u.callers.bob.runs === 1,
      JSON.stringify(u));

    led.record(DAY, { runs: 1, spendUsd: 0.05 });
    const after = led.usageFor(DAY);
    check('an UNATTRIBUTED run does not erase the split',
      after.runs === 4 && after.callers.alice.runs === 2 && after.callers.bob.runs === 1,
      'otherwise one ownerless run would wipe every per-caller ceiling');

    led.record(DAY, { runs: -99, spendUsd: -99, caller: 'alice' });
    const monotone = led.usageFor(DAY);
    check('the split is MONOTONIC — a negative delta buys back no per-caller headroom',
      monotone.callers.alice.runs === 2 && Math.abs(monotone.callers.alice.spendUsd - 0.6) < 1e-9,
      'the same rule the global counters already follow');

    // THE UPGRADE PATH. A file this code did not write must read as "no split", not as an
    // error and not as an empty split — those three are not equivalent.
    const old = fakeLedger(JSON.stringify({ [DAY]: { runs: 4, spendUsd: 2 } }));
    const oldUsage = old.led.usageFor(DAY);
    check('a ledger written BEFORE per-caller tracking reads as "no split recorded"',
      oldUsage.runs === 4 && oldUsage.callers === undefined && oldUsage.degraded === false,
      'not an error, and not an empty split — `{}` would claim every caller had used nothing');

    check('the written file carries the split',
      JSON.parse(dump())[DAY].callers.alice.runs === 2, 'so the next process can read it back');
  }

  // ══ E. DISCLOSURES — what is still NOT true ═══════════════════════════════
  section('E. what this still does not do');
  {
    check('DISCLOSURE: the per-caller ceiling binds at RUN time, not at quote time',
      true,
      'preflight still calls the guard with three arguments, so a caller can be QUOTED and '
      + 'then refused. Narrower than the round-6 gap, and deliberate: refusing at quote time '
      + 'would change the quote path, which is a separate decision.');
    check('DISCLOSURE: the runner costs a run from the catalogue per-run figure, not the '
      + 'duration-adjusted estimate preflight uses',
      true,
      'preflight calls withEstimatedRunCost(caps, request); the runner passes caps. For a '
      + 'per-second row that means the quote is priced and the run is refused with '
      + 'E_UNKNOWN_COST — no money is mis-spent, but the two paths disagree, and changing '
      + 'the runner\'s cost basis is an engine behaviour change rather than a gate.');
    check('DISCLOSURE: the global and per-caller ceilings are AGENT-side',
      true,
      'whoever runs the agent can raise them. Server-side enforcement in the queue is still '
      + 'owed; this is unchanged from the original commitment.');
  }

  console.log(`\n${passed + failed} CHECKS — ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
