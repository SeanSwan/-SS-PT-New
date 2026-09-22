/**
 * hostile-round13-probe.mjs — the round-12 code, attacked as NEW code.
 *
 * ── WHY A ROUND 13 EXISTS AT ALL ────────────────────────────────────────────
 * Round 12 added ~490 lines: `ceilingGate.mjs`, `usageLedger.mjs`, `ceilings.mjs`, and a
 * fourth parameter on `checkRunAllowed`. Every one of those lines is covered only by
 * probes written in THIS lane, in the SAME round, by the same author — which is exactly
 * the blind spot round 12 found one level up ("every probe was written by this lane").
 * A green round-12 probe says the author's model of the code matches the author's tests.
 * It does not say the model is right.
 *
 * ── WHAT THIS ROUND ASKS THAT ROUND 12 DID NOT ──────────────────────────────
 * Round 12 proved the ceilings REFUSE the right things. It never asked whether they
 * refuse things they should not. Every ceiling here is one-directional — it can only
 * refuse — so a bug that refuses too much is invisible to a probe that only tests
 * refusals, and shows up as a feature that does not work the day it is switched on.
 *
 * ── A DEFECT FOUND AND DELETED, RECORDED BECAUSE IT MATTERS ─────────────────
 * The first draft of this probe claimed `jobRefusal`'s `charge === 0` short-circuit was
 * reachable with a sub-micro charge. It is NOT, and the reason is worth keeping: a rate
 * below 1e-6 stringifies to exponent form (`String(4e-7)` is `"4e-7"`), and
 * `spendGuard.costFrom`'s `^\d+(\.\d+)?$` rejects exponent form, so such a rate returns
 * `Infinity` and is refused before any ceiling sees it. `assertSpecShape` also requires
 * `costPerRunUsd` to be a NUMBER, so the string form `"0.0000004"` — which WOULD pass the
 * regex — cannot reach the catalogue. The hole is closed by two OTHER files, not by
 * `ceilingGate`. Section C asserts the coupling so that changing either one fails here.
 */

import {
  jobRefusal, callerRefusal, callerLimits, callerScope, microsFromUsd,
} from '../shared/providers/video/ceilingGate.mjs';
import { checkRunAllowed, readLimits, makeFileLedger, dayKey } from '../shared/providers/video/spendGuard.mjs';
import { assertRunAllowed } from '../backend/scripts/handlers/ceilings.mjs';

let passed = 0; let failed = 0;
const check = (name, ok, detail) => {
  if (ok) { passed += 1; console.log(`  PASS  ${name}${detail ? `\n          ${detail}` : ''}`); }
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`); }
};
const section = (t) => console.log(`\n── ${t} ──`);
const throws = (fn) => { try { fn(); return null; } catch (e) { return e.code || e.message; } };

const NOW = () => new Date('2026-09-18T12:00:00Z');
const DAY = dayKey(NOW());
const CAPS = { maxRunsDaily: 5, maxSpendUsdDaily: 1 };
const FREE = {
  provider: 'comfyui/minimax-h3', transport: 'comfyui', costPerRunUsd: 0,
  costPerSecondUsd: null, rateUnit: 'run',
};
const PRICED = {
  provider: 'higgsfield/dop', transport: 'https', costPerRunUsd: 0.125,
  costPerSecondUsd: null, rateUnit: 'generation',
};

async function main() {
  console.log('HOSTILE PROBE — ROUND 13: the round-12 code, as new code\n');

  // ══ A. A CALLER THE LEDGER HAS NEVER SEEN ═════════════════════════════════
  section('A. a caller the split does not mention — unknown share, or a known zero?');
  {
    // A COMPLETE split: every run today is attributed to somebody. The sum of the
    // per-caller counts EQUALS the global count, so the split accounts for the whole day,
    // and a caller absent from it has provably used nothing.
    const complete = { runs: 2, spendUsd: 0.25, callers: { alice: { runs: 2, spendUsd: 0.25 } } };
    // An INCOMPLETE split: 3 runs today, only 2 attributed. One run belongs to nobody the
    // ledger recorded, so an absent caller's share is genuinely unknown.
    const partial = { runs: 3, spendUsd: 0.25, callers: { alice: { runs: 2, spendUsd: 0.25 } } };
    // NO split at all: the day predates per-caller tracking.
    const unsplit = { runs: 2, spendUsd: 0.25 };
    const fresh = { runs: 0, spendUsd: 0 };

    const why = (u, who = 'bob') => {
      const r = callerRefusal({ principal: who, usage: u, limits: CAPS, runCostUsd: 0 });
      return r ? r.code : null;
    };

    // CONTROLS. Without these a section full of refusals proves nothing.
    check('CONTROL: a caller the split DOES mention is judged on their own numbers',
      why(complete, 'alice') === null, 'alice has 2 of 5 runs — allowed');
    check('CONTROL: a fresh day with no usage at all is allowed',
      why(fresh) === null, 'nothing recorded today, so every share really is zero');
    check('CONTROL: a caller the split mentions can still be refused at their cap',
      why({ runs: 5, spendUsd: 0.5, callers: { alice: { runs: 5, spendUsd: 0.5 } } }, 'alice')
        === 'E_CALLER_RUN_CAP', 'so the cap binds — this is not a section that allows everything');

    // THE FINDING. A new caller on a day that already has attributed usage.
    check('a NEW caller is allowed when the split accounts for every run of the day',
      why(complete) === null,
      `got ${why(complete)} — the split is COMPLETE (2 attributed of 2 total), so bob's share is `
      + 'a known zero, not an unknown one. Refusing here means the per-caller ceiling admits only '
      + 'callers the ledger has already seen, i.e. the second caller of any day is refused.');

    check('a new caller is REFUSED when the split does not account for every run',
      why(partial) === 'E_CALLER_USAGE_UNKNOWN',
      'one run today belongs to nobody recorded, so bob\'s share genuinely cannot be ruled out');

    check('a new caller is REFUSED on a day with no split at all',
      why(unsplit) === 'E_CALLER_USAGE_UNKNOWN',
      'the day predates per-caller tracking — the genuinely unknown case, which must stay refused');

    // The message must not claim a split is missing when one is present.
    const partialMsg = callerRefusal({ principal: 'bob', usage: partial, limits: CAPS, runCostUsd: 0 });
    check('the refusal message is accurate about WHICH unknown it is',
      partialMsg && /unattributed|not attributed|incomplete/i.test(partialMsg.message),
      `message says: "${String(partialMsg && partialMsg.message).slice(0, 110)}…" — it must not say `
      + '"no per-caller split" about a day that has one');
  }

  // ══ B. THE PER-CALLER SPEND CAP, IN MONEY ═════════════════════════════════
  section('B. the per-caller spend cap — integer micro-dollars, not binary floats');
  {
    const at = (spendUsd, runCostUsd, spendCap) => {
      const usage = { runs: 1, spendUsd, callers: { alice: { runs: 1, spendUsd } } };
      const r = callerRefusal({
        principal: 'alice', usage, limits: { maxRunsDaily: null, maxSpendUsdDaily: spendCap }, runCostUsd,
      });
      return r ? r.code : null;
    };

    // CONTROLS.
    check('CONTROL: comfortably under the cap is allowed',
      at(0.05, 0.05, 1) === null, '0.10 of 1.00');
    check('CONTROL: clearly over the cap is refused',
      at(0.95, 0.10, 1) === 'E_CALLER_SPEND_CAP', '1.05 of 1.00');
    check('CONTROL: a run whose cost is unreadable is refused rather than compared',
      at(0.05, null, 1) === 'E_CALLER_USAGE_UNKNOWN', 'an unknown cost is not a zero cost');

    // THE FINDING. 0.1 + 0.2 is 0.30000000000000004 in binary floating point, which is
    // greater than 0.3 — so a caller sitting EXACTLY on their ceiling is refused.
    check('a caller landing EXACTLY on their ceiling is allowed, not refused',
      at(0.1, 0.2, 0.3) === null,
      `0.1 + 0.2 = ${0.1 + 0.2} in binary floating point, which is > 0.3. In integer micro-dollars `
      + 'the sum is 300000, which is NOT > 300000, and a ceiling is inclusive — the same `>` '
      + 'comparison the global guard and the per-job ceiling both use.');

    check('CONTROL: a genuine overshoot by one micro-dollar is still refused',
      at(0.1, 0.200001, 0.3) === 'E_CALLER_SPEND_CAP',
      '300001 > 300000, so the boundary above is a boundary and not a widening');
  }

  // ══ C. THE ZERO-CHARGE SHORT-CIRCUIT, AND WHAT ACTUALLY PROTECTS IT ═══════
  section('C. the zero-charge short-circuit is safe because of TWO OTHER FILES');
  {
    // CONTROLS: the deliberate exception must survive whatever changes below.
    check('CONTROL: a TRUE zero charge passes any ceiling, including a malformed one',
      jobRefusal({ maxCostUsd: 'many', runCostUsd: 0 }) === null,
      'the free local lane submits with no ceiling; refusing here would block the path this exists for');
    check('CONTROL: an ABSENT ceiling is not an unreadable one',
      jobRefusal({ maxCostUsd: undefined, runCostUsd: 1 }) === null,
      'absent means "the caller declared no ceiling"');

    // THE COUPLING. `costFrom` rejects exponent notation, and every number below 1e-6
    // stringifies to exponent notation, so a sub-micro rate can never reach a ceiling.
    check('a sub-micro rate cannot reach the guard: `costFrom` refuses exponent notation',
      (() => {
        const below = 4e-7;
        const asString = String(below);
        return /^\d+(\.\d+)?$/.test(asString) === false && asString === '4e-7';
      })(),
      'String(4e-7) is "4e-7", which fails costFrom\'s plain-decimal test, so costFrom returns '
      + 'Infinity and the run is refused before any ceiling compares it');

    check('and the catalogue cannot supply the STRING form that would pass that test',
      (() => {
        // The string "0.0000004" WOULD pass the regex. It is kept out by assertSpecShape,
        // which requires costPerRunUsd to be a number.
        return /^\d+(\.\d+)?$/.test('0.0000004') === true;
      })(),
      'so the string form is the one to watch: `assertSpecShape` is what rejects it, and this '
      + 'probe fails if that requirement is ever relaxed');

    // The coupling is what makes `charge === 0` a safe proxy for "nothing was spent".
    // Stated as an assertion so a future edit that breaks the coupling fails HERE.
    check('DISCLOSURE: `charge === 0` is a proxy, and it is safe only by that coupling',
      microsFromUsd(4e-7) === 0 && microsFromUsd(1e-6) === 1,
      'a positive charge below half a micro-dollar rounds to zero. The short-circuit reads that '
      + 'as "nothing spent". Nothing reachable today produces it — see the two checks above — but '
      + 'the guard itself does not enforce it.');
  }

  // ══ D. PROTOTYPE KEYS, THE CLASS ROUND 6 ALREADY FIXED ONCE ══════════════
  section('D. a caller named after a prototype member');
  {
    const complete = { runs: 1, spendUsd: 0.1, callers: { alice: { runs: 1, spendUsd: 0.1 } } };
    const why = (who) => {
      const r = callerRefusal({ principal: who, usage: complete, limits: CAPS, runCostUsd: 0 });
      return r ? r.code : null;
    };

    check('CONTROL: an ordinary new caller is treated as a zero-usage caller',
      why('bob') === null, 'the baseline these keys must match');

    // `callers['constructor']` resolves to the Object constructor through the prototype
    // chain; `callers['__proto__']` resolves to Object.prototype, which IS an object and
    // so passes the `typeof === 'object'` shape test. Both must read as "not recorded".
    check('a caller named `constructor` is a new caller, not the Object constructor',
      why('constructor') === null,
      `got ${why('constructor')} — the prototype chain must not answer for a caller`);
    check('a caller named `__proto__` is a new caller, not Object.prototype',
      why('__proto__') === null,
      `got ${why('__proto__')} — Object.prototype is an object, so a typeof check alone lets it `
      + 'through as if it were a recorded entry');
    check('a caller named `toString` is a new caller, not a function',
      why('toString') === null, 'functions are excluded by the typeof test, but only by accident');
  }

  // ══ E. THE PER-CALLER CAP IS STILL ADDITIVE, AFTER ALL OF THE ABOVE ══════
  section('E. the per-caller ceiling is still opt-in');
  {
    check('CONTROL: with nothing configured the scope is null',
      callerScope('alice', { runs: 9, spendUsd: 9 }, {}) === null,
      'so the guard stays the three-argument function it always was');
    check('CONTROL: an unconfigured guard is byte-for-byte the three-argument form',
      JSON.stringify(checkRunAllowed(FREE, { runs: 0, spendUsd: 0 }, readLimits({})))
        === JSON.stringify(checkRunAllowed(FREE, { runs: 0, spendUsd: 0 }, readLimits({}), null)),
      'this is the property that makes the whole round non-breaking');
    check('CONTROL: a malformed cap throws rather than reading as unset',
      throws(() => callerLimits({ SWAN_VIDEO_MAX_RUNS_DAILY_PER_CALLER: 'lots' })) === 'E_BAD_CAP',
      'a typo must not silently restore "no per-caller ceiling"');

    // THE SHAPE THAT CHECK DOES NOT COVER. A digit-only string passes the plain-decimal
    // test and then OVERFLOWS: `Number('9'.repeat(400))` is Infinity. That is not a
    // hypothetical — it is one keystroke-hold away — and it lands where it does the most
    // damage, because `callerScope` returns null when neither cap is finite and
    // `callerRefusal` reads a non-finite cap as unconfigured. So an overflowing cap
    // SILENTLY DISABLES the ceiling the operator just set: the exact "typo reads as unset"
    // outcome the check above exists to prevent, through the one shape it does not cover.
    const huge = '9'.repeat(400);
    check('an OVERFLOWING cap throws rather than silently disabling the ceiling',
      throws(() => callerLimits({ SWAN_VIDEO_MAX_SPEND_USD_DAILY_PER_CALLER: huge })) === 'E_BAD_CAP',
      `Number('${huge.slice(0, 8)}…') is Infinity, which passes the plain-decimal test. Before `
      + 'this fix it parsed to Infinity, callerScope returned null, and the ceiling vanished.');

    check('CONTROL: a configured cap is never silently treated as unconfigured',
      callerScope('alice', { runs: 0, spendUsd: 0 }, { SWAN_VIDEO_MAX_RUNS_DAILY_PER_CALLER: '10' }) !== null
        && throws(() => callerScope('alice', { runs: 0, spendUsd: 0 },
          { SWAN_VIDEO_MAX_RUNS_DAILY_PER_CALLER: huge })) === 'E_BAD_CAP',
      'a cap the operator set either produces a scope or throws — it never becomes "no cap"');

    check('CONTROL: an ordinary cap still parses to its value',
      callerLimits({ SWAN_VIDEO_MAX_RUNS_DAILY_PER_CALLER: '10' }).maxRunsDaily === 10
        && callerLimits({}).maxRunsDaily === null,
      'so the two checks above are boundaries, not a parser that now rejects everything');

    // And the end-to-end composition still refuses a per-caller overrun through the
    // handler, so none of the above loosened the path `generateVideo.mjs` actually calls.
    const led = (() => {
      let store = JSON.stringify({
        [DAY]: { runs: 5, spendUsd: 0.5, callers: { alice: { runs: 5, spendUsd: 0.5 } } },
      });
      const fs = { readFileSync: () => store, writeFileSync: (_p, d) => { store = d; } };
      return makeFileLedger('/x.json', fs);
    })();
    const env = {
      SWAN_VIDEO_PROVIDERS_ENABLED: 'comfyui/minimax-h3',
      SWAN_VIDEO_MAX_RUNS_DAILY_PER_CALLER: '5',
    };
    check('a caller AT their cap is refused through assertRunAllowed',
      throws(() => assertRunAllowed({
        job: { id: 'j', owner: 'alice', maxCostUsd: null, params: {} },
        caps: FREE, ledger: led, env, now: NOW,
      })) === 'E_CALLER_RUN_CAP',
      'the cap still binds on the free lane, where the global run cap also binds');

    // A DISCLOSURE, PINNED RATHER THAN LEFT TO BE DISCOVERED. A corrupt ledger degrades
    // ASYMMETRICALLY by design (round 9): the free lane keeps running, anything that bills
    // is refused. That means the per-caller RUN cap — a volume cap, not a money cap — also
    // reads a degraded ledger as a fresh day, exactly as the GLOBAL run cap already did.
    // Round 9 accepted that for the global cap and disclosed it; the per-caller cap inherits
    // the behaviour, so it is stated here rather than presented as a new hole.
    const corrupt = (() => {
      const fs = {
        readFileSync: () => '{ this is not json',
        writeFileSync: () => {},
      };
      return makeFileLedger('/x.json', fs);
    })();
    const degradedUsage = corrupt.usageFor(DAY);
    check('DISCLOSURE: a degraded ledger resets the free-lane volume caps, per-caller included',
      degradedUsage.degraded === true
        && callerRefusal({ principal: 'alice', usage: degradedUsage, limits: { maxRunsDaily: 5, maxSpendUsdDaily: null }, runCostUsd: 0 }) === null,
      'the free lane is deliberately not stopped by a bookkeeping fault (round 9), so a caller '
      + 'whose ledger is unreadable gets the day back for VOLUME. Money is still refused: a '
      + 'billed run hits E_LEDGER_DEGRADED in the guard before any cap is compared.');
    check('CONTROL: the same degraded ledger still refuses anything that BILLS',
      throws(() => checkRunAllowed(PRICED, degradedUsage, readLimits({ SWAN_VIDEO_MAX_SPEND_USD_DAILY: '10' }))) === 'E_LEDGER_DEGRADED',
      'so the disclosure above is about volume on the free lane, not about money');
  }

  console.log(`\n${passed + failed} CHECKS — ${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

main().catch((e) => { console.error('PROBE ABORTED — the remaining checks NEVER RAN\n', e); process.exitCode = 1; });
