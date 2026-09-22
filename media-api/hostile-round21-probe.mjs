/**
 * hostile-round21-probe.mjs — THE USAGE LEDGER'S WRITE PATH, attacked for the first time.
 *
 * ── WHY THIS ROUND EXISTS ──────────────────────────────────────────────────
 * The ledger test picked this surface: `usageLedger.mjs` has a file-table row and one
 * incidental list mention and **not one finding across twenty rounds**. It is also the only
 * module in the lane that both READS and WRITES the artefact the money ceiling is computed
 * from — and every prior round attacked the READ side. Rounds 4 and 12 hardened `usageFor`
 * until a truncated file, a misshapen day and a negative count each degrade the ledger and
 * refuse billing. `record()` was never attacked, and it is the half that writes.
 *
 * ── THE DEFECTS, MEASURED BEFORE ANY FIX ───────────────────────────────────
 *
 *   1. **`record()` launders a ledger it could not read.** `read()` returns `{}` for a
 *      corrupt file and sets `degraded`, and `usageFor` correctly refuses billing. But the
 *      FREE lane is deliberately still allowed to run while degraded — and the first free
 *      run calls `record()`, which writes `{...{}, [day]: next}` over the corruption. The
 *      file is now parseable, so `degraded` clears, every other day is gone, and billing is
 *      re-enabled against a counter that undercounts. Measured: $40 recorded of a $50
 *      ceiling, file truncated, ONE free local run, then a $12 billing run is ADMITTED.
 *      The refusal is undone by the next write from the lane that is exempt from it.
 *   2. **The 30-day trim silently discards the day being recorded.** `record()` returns a
 *      truthful total for a day that the file no longer contains, and `usageFor` then reads
 *      `0/0` with `degraded: false`. Two paths: recording a day older than the 30 newest,
 *      and — the one that matters — 30 future-dated days planted in the file. Planted days
 *      are valid JSON holding valid counts, so this is not corruption and `degraded` never
 *      fires: today's usage is evicted on every write and the ceiling never accumulates.
 *      The anti-truncation fix detects a file it cannot PARSE, not one that forgets.
 *   3. **A ledger write that fails becomes a failed render.** `record()` runs at
 *      `generateVideo.mjs:207`, AFTER `adapter.generate` has already succeeded — so a
 *      ledger path whose directory does not exist (or a read-only disk, or EACCES) throws
 *      ENOENT out of a completed job. For a billing provider the vendor has already charged.
 *      And because ENOENT is deliberately excluded from `degraded`, the same path reads as a
 *      fresh ledger forever: the ceiling never binds and every job fails after succeeding.
 *
 * ── WRITTEN TO SURVIVE THE PRE-FIX TREE ────────────────────────────────────
 * Every check drives the real `makeFileLedger` / `record` / `usageFor` through an injected
 * `fs`, and the money consequences through the real `checkRunAllowed` and `assertRunAllowed`.
 * No new export is required, so the pre-fix replay reports FAILURES with reasons.
 *
 * ── WHAT THIS ROUND DOES NOT DO ────────────────────────────────────────────
 * No live call, no provider enabled, no job created, no GPU. Nothing writes outside a temp
 * directory created by this probe and removed at the end.
 */

import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { makeFileLedger, dayKey } from '../shared/providers/video/usageLedger.mjs';
import { checkRunAllowed, readLimits } from '../shared/providers/video/spendGuard.mjs';
import { assertRunAllowed } from '../backend/scripts/handlers/ceilings.mjs';

let passed = 0; let failed = 0;
const check = (name, ok, detail) => {
  if (ok) { passed += 1; console.log(`  PASS  ${name}${detail ? `\n          ${detail}` : ''}`); }
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`); }
};
const section = (t) => console.log(`\n── ${t} ──`);

const DAY = '2026-09-19';
const BILLING = { provider: 'higgsfield/minimax-h3', costPerRunUsd: '12' };
const FREE = { provider: 'comfyui/local', costPerRunUsd: '0' };
const LIMITS = readLimits({ SWAN_VIDEO_MAX_RUNS_DAILY: '60', SWAN_VIDEO_MAX_SPEND_USD_DAILY: '50' });
const verdict = (usage, caps = BILLING) => {
  try { checkRunAllowed(caps, usage, LIMITS); return 'ALLOWED'; } catch (e) { return e.code; }
};

/** An injected `fs` over one in-memory file. `seed` of `undefined` is a MISSING file. */
const memFs = (seed) => {
  const f = {
    data: seed === undefined ? null : (typeof seed === 'string' ? seed : JSON.stringify(seed)),
    writes: 0,
    readFileSync() {
      if (f.data === null) { const e = new Error('ENOENT: no such file or directory'); e.code = 'ENOENT'; throw e; }
      return f.data;
    },
    writeFileSync(_p, s) { f.writes += 1; f.data = s; },
    json() { return JSON.parse(f.data); },
    keys() { return Object.keys(f.json()); },
    has(k) { return Object.hasOwn(f.json(), k); },
  };
  return f;
};
/** Same, but every write fails — a ledger path that cannot be written. */
const unwritableFs = (seed) => {
  const f = memFs(seed);
  f.writeFileSync = () => { const e = new Error('EACCES: permission denied'); e.code = 'EACCES'; throw e; };
  return f;
};
const days = (n, prefix = '2026-10-') => Object.fromEntries(
  Array.from({ length: n }, (_, i) => [prefix + String(i + 1).padStart(2, '0'), { runs: 1, spendUsd: 0 }]),
);

async function main() {
  console.log('HOSTILE PROBE — ROUND 21: the usage ledger\'s write path, attacked for the first time\n');

  // ══ A. record() must not overwrite a ledger it could not read ════════════
  section('A. a corrupt ledger must not be laundered by the next write');
  {
    const fs1 = memFs('{');                                        // truncated: the documented threat
    const led = makeFileLedger('/ledger.json', fs1);
    check('CONTROL: a truncated ledger reads as degraded (round 4 / round 12)',
      led.usageFor(DAY).degraded === true, `-> ${JSON.stringify(led.usageFor(DAY))}`);

    const before = fs1.data;
    led.record(DAY, { runs: 1, spendUsd: 0 });                     // ONE free local run
    check('A1. record() does not overwrite a file it could not parse',
      fs1.data === before,
      `-> file went from ${JSON.stringify(before)} to ${JSON.stringify(fs1.data)}. Writing `
      + '`{...{}, [day]: next}` over a corrupt file destroys every other day and makes the file '
      + 'parseable again, which is how a bookkeeping fault becomes an undercount.');
    check('A2. ...and the ledger is STILL degraded after that write',
      led.usageFor(DAY).degraded === true,
      `-> ${JSON.stringify(led.usageFor(DAY))}. The refusal has to survive the write, or the `
      + 'next request bills against a counter that was rebuilt from nothing.');

    // THE MONEY CONSEQUENCE, end to end through the real guard.
    const fs2 = memFs({ [DAY]: { runs: 60, spendUsd: 40 } });
    const led2 = makeFileLedger('/ledger.json', fs2);
    check('CONTROL: a real ledger at $40/$50 refuses a $12 run',
      verdict(led2.usageFor(DAY)) === 'E_RUN_CAP', `-> ${verdict(led2.usageFor(DAY))}`);
    fs2.data = '{';                                                // truncated
    check('CONTROL: the truncation is refused while it is still visible',
      verdict(led2.usageFor(DAY)) === 'E_LEDGER_DEGRADED', `-> ${verdict(led2.usageFor(DAY))}`);
    check('CONTROL: a FREE run is still admitted while degraded (the asymmetric half)',
      verdict(led2.usageFor(DAY), FREE) === 'ALLOWED', `-> ${verdict(led2.usageFor(DAY), FREE)}`);
    led2.record(DAY, { runs: 1, spendUsd: 0 });                    // that free run runs
    check('A3. ...and a $12 billing run is STILL refused after it',
      verdict(led2.usageFor(DAY)) === 'E_LEDGER_DEGRADED',
      `-> ${verdict(led2.usageFor(DAY))}. Measured escalation: $40 recorded, file truncated, one `
      + 'free run, billing admitted at $12 against a $50 ceiling.');

    // CONTROLS — the write path must still work where it is supposed to.
    const fs3 = memFs();                                           // missing file
    const led3 = makeFileLedger('/ledger.json', fs3);
    const w = led3.record(DAY, { runs: 2, spendUsd: 3 });
    check('CONTROL: a MISSING ledger is a fresh day and is written normally',
      fs3.writes === 1 && fs3.has(DAY) && fs3.json()[DAY].runs === 2 && w && w.runs === 2,
      `-> writes=${fs3.writes}, file=${fs3.data}`);
    const fs4 = memFs({ [DAY]: { runs: 5, spendUsd: 1 } });
    const led4 = makeFileLedger('/ledger.json', fs4);
    led4.record(DAY, { runs: 1, spendUsd: 9 });
    check('CONTROL: a well-formed ledger still accumulates',
      fs4.json()[DAY].runs === 6 && fs4.json()[DAY].spendUsd === 10,
      `-> ${JSON.stringify(fs4.json()[DAY])}`);
  }

  // ══ B. a day record that is not a record must not be overwritten ═════════
  section('B. a misshapen day record must not be laundered either');
  {
    for (const [label, seed] of [
      ['a string', { [DAY]: 'yesterday-was-busy' }],
      ['a negative count', { [DAY]: { runs: -5, spendUsd: 1 } }],
      ['a non-numeric count', { [DAY]: { runs: 'many', spendUsd: 1 } }],
      ['an array', { [DAY]: [1, 2, 3] }],
    ]) {
      const f = memFs(seed);
      const led = makeFileLedger('/ledger.json', f);
      const before = f.data;
      check(`B. record() will not overwrite a day record that is ${label}`,
        (led.record(DAY, { runs: 1, spendUsd: 1 }), f.data) === before,
        `-> file went from ${JSON.stringify(before)} to ${JSON.stringify(f.data)}. `
        + '`all[day] || {}` reads a misshapen record as an empty one and `Number(x) || 0` reads '
        + '"many" as 0, so the write replaces a count nobody can read with a count this code '
        + 'made up — and the replacement is parseable, so `degraded` clears.');
      check(`B. ...and that day still reads as degraded (${label})`,
        led.usageFor(DAY).degraded === true, `-> ${JSON.stringify(led.usageFor(DAY))}`);
    }
    // CONTROLS — `null` is a valid encoding of "no record" and must stay writable.
    const f = memFs({ [DAY]: null });
    const led = makeFileLedger('/ledger.json', f);
    led.record(DAY, { runs: 1, spendUsd: 1 });
    check('CONTROL: a day recorded as JSON `null` is still absent, and still writable',
      f.json()[DAY].runs === 1, `-> ${f.data}`);
  }

  // ══ C. the day being recorded must never be evicted ═════════════════════
  section('C. the 30-day trim must not discard the day it just counted');
  {
    const f = memFs({ ...days(30), [DAY]: { runs: 5, spendUsd: 1 } });
    const led = makeFileLedger('/ledger.json', f);
    const ret = led.record(DAY, { runs: 1, spendUsd: 9 });
    check('C1. recording an older day leaves that day in the file',
      f.has(DAY),
      `-> keys=${JSON.stringify(f.keys().slice(-3))}, has(${DAY})=${f.has(DAY)}. The trim sorts `
      + 'descending and slices 30, so a day outside the window is dropped and the ceiling '
      + 'it enforces goes with it.');
    check('C2. ...and `usageFor` reads back what `record()` returned',
      led.usageFor(DAY).runs === 6 && led.usageFor(DAY).spendUsd === 10,
      `-> record() said ${JSON.stringify(ret)}, usageFor() says ${JSON.stringify(led.usageFor(DAY))}`);

    // THE PLANTED-FUTURE-DAYS PATH: valid JSON, valid counts, so `degraded` never fires.
    const g = memFs(days(30, '2099-01-'));
    const led2 = makeFileLedger('/ledger.json', g);
    check('CONTROL: planted future-dated days are NOT corruption (that is what makes them work)',
      led2.usageFor(DAY).degraded === false, `-> ${JSON.stringify(led2.usageFor(DAY))}`);
    led2.record(DAY, { runs: 1, spendUsd: 20 });
    check('C3. today survives a file that is full of newer days',
      g.has(DAY),
      `-> has(${DAY})=${g.has(DAY)}. Nothing was corrupt, so nothing degraded: today's usage is `
      + 'evicted on every write and the ceiling never accumulates.');
    check('C4. ...and the recorded spend is what the ceiling is computed from',
      led2.usageFor(DAY).spendUsd === 20,
      `-> ${JSON.stringify(led2.usageFor(DAY))}`);

    // CONTROLS — retention still trims, and a normal ledger is untouched.
    const h = memFs({ ...days(29), [DAY]: { runs: 1, spendUsd: 0 } });
    makeFileLedger('/ledger.json', h).record('2026-11-30', { runs: 1, spendUsd: 0 });
    check('CONTROL: retention is still 30 days (an append-forever ledger is a slow leak)',
      h.keys().length === 30, `-> ${h.keys().length} keys`);
    const i = memFs({ [DAY]: { runs: 1, spendUsd: 0 } });
    makeFileLedger('/ledger.json', i).record(DAY, { runs: 1, spendUsd: 0 });
    check('CONTROL: a ledger with one day is not trimmed at all',
      i.keys().length === 1 && i.json()[DAY].runs === 2, `-> ${i.data.replace(/\s+/g, ' ')}`);
  }

  // ══ D. a write that fails must degrade, not fail the render ══════════════
  section('D. a ledger that cannot be written must not fail a completed render');
  {
    const f = unwritableFs({ [DAY]: { runs: 1, spendUsd: 0 } });
    const led = makeFileLedger('/ledger.json', f);
    let threw = null;
    try { led.record(DAY, { runs: 1, spendUsd: 12 }); } catch (e) { threw = e.code || e.message; }
    check('D1. record() does not throw when the ledger cannot be written',
      threw === null,
      `-> threw ${threw}. This call sits at generateVideo.mjs:207, AFTER adapter.generate has `
      + 'returned, so an ENOENT here converts a successful render — already billed, for a '
      + 'billing provider — into a job failure.');
    check('D2. ...and a ledger we could not write to is DEGRADED, so billing stops',
      led.usageFor(DAY).degraded === true,
      `-> ${JSON.stringify(led.usageFor(DAY))}. Unknown is not zero: if the spend cannot be `
      + 'recorded it cannot be counted, and the next run must not be admitted on that count.');
    check('D3. ...and a billing run is refused, while a free one is not',
      verdict(led.usageFor(DAY)) === 'E_LEDGER_DEGRADED' && verdict(led.usageFor(DAY), FREE) === 'ALLOWED',
      `-> billing=${verdict(led.usageFor(DAY))}, free=${verdict(led.usageFor(DAY), FREE)}`);

    // CONTROLS — a writable ledger is not degraded, and a recovered write clears it.
    const g = memFs({ [DAY]: { runs: 1, spendUsd: 0 } });
    const led2 = makeFileLedger('/ledger.json', g);
    led2.record(DAY, { runs: 1, spendUsd: 0 });
    check('CONTROL: a ledger that writes is not degraded',
      led2.usageFor(DAY).degraded === false && g.writes === 1,
      `-> ${JSON.stringify(led2.usageFor(DAY))}, writes=${g.writes}`);

    // THE PRODUCTION WIRING: a paid run must not be failed by its own bookkeeping.
    const h = unwritableFs({ [DAY]: { runs: 1, spendUsd: 0 } });
    let code = 'no-throw';
    try {
      assertRunAllowed({
        job: { owner: 'sean' }, caps: BILLING, ledger: makeFileLedger('/ledger.json', h),
        env: { SWAN_VIDEO_MAX_RUNS_DAILY: '60', SWAN_VIDEO_MAX_SPEND_USD_DAILY: '50' },
        now: () => new Date('2026-09-19T12:00:00Z'),
      });
    } catch (e) { code = e.code; }
    check('CONTROL: the READ half still admits a first billing run on a fresh ledger',
      code === 'no-throw', `-> ${code}`);
  }

  // ══ E. the contracts the existing suites pin must not move ═══════════════
  section('E. the contracts the existing suites pin');
  {
    const f = memFs();
    const led = makeFileLedger('/ledger.json', f);
    led.record(DAY, { runs: -99, spendUsd: -99, caller: 'alice' });
    check('E1. a negative delta still cannot buy back headroom (round 12)',
      led.usageFor(DAY).runs === 0 && led.usageFor(DAY).spendUsd === 0,
      `-> ${JSON.stringify(led.usageFor(DAY))}`);

    const g = memFs();
    const led2 = makeFileLedger('/ledger.json', g);
    led2.record(DAY, { runs: 1, spendUsd: 0.5, caller: 'alice' });
    led2.record(DAY, { runs: 1, spendUsd: 0.25, caller: 'bob' });
    led2.record(DAY, { runs: 1, spendUsd: 0.1, caller: 'alice' });
    const u = led2.usageFor(DAY);
    check('E2. the per-caller split still accumulates per caller (round 12)',
      u.callers.alice.runs === 2 && u.callers.alice.spendUsd === 0.6 && u.callers.bob.runs === 1,
      `-> ${JSON.stringify(u.callers)}`);

    led2.record(DAY, { runs: 1, spendUsd: 0.05 });
    check('E3. an unattributed run still does not erase the split (round 12)',
      Object.keys(led2.usageFor(DAY).callers).length === 2,
      `-> ${JSON.stringify(led2.usageFor(DAY).callers)}`);

    const h = memFs({ [DAY]: { runs: 4, spendUsd: 2 } });          // written before the split existed
    check('E4. a day with no split still reports NO split, not an empty one (round 12)',
      makeFileLedger('/ledger.json', h).usageFor(DAY).callers === undefined,
      `-> ${JSON.stringify(makeFileLedger('/ledger.json', h).usageFor(DAY))}`);

    check('E5. dayKey is still the UTC day, so a timezone shift cannot reset a ledger',
      dayKey(new Date('2026-09-19T23:59:59Z')) === '2026-09-19'
      && dayKey(new Date('2026-09-19T00:00:00Z')) === '2026-09-19',
      `-> ${dayKey(new Date('2026-09-19T23:59:59Z'))} / ${dayKey(new Date('2026-09-19T00:00:00Z'))}`);

    const i = memFs();
    const led5 = makeFileLedger('/ledger.json', i);
    check('E6. a missing file is a fresh day and is NOT degraded (the common first-run case)',
      led5.usageFor(DAY).degraded === false && led5.usageFor(DAY).runs === 0,
      `-> ${JSON.stringify(led5.usageFor(DAY))}`);

    const j = memFs({ [DAY]: { runs: 3, spendUsd: 1, callers: { alice: { runs: 3, spendUsd: 1 } } } });
    check('E7. a reconciled split still lets a NEW caller be a known zero (round 12/13)',
      (() => {
        const led6 = makeFileLedger('/ledger.json', j);
        return led6.usageFor(DAY).degraded === false && led6.usageFor(DAY).callers.alice.runs === 3;
      })(), `-> ${JSON.stringify(makeFileLedger('/ledger.json', j).usageFor(DAY))}`);
  }

  // ══ F. MUTATION CONTROLS — each check must be able to fail ═══════════════
  await mutationControls();

  console.log(`\n${passed + failed} CHECKS — ${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

/**
 * Re-introduce each fixed defect into a COPY of the real module and require the round's
 * assertions to fail on that copy. This is §7's direction: "does ADDING it back fail the
 * check" proves the check can fail at all.
 */
async function mutationControls() {
  section('F. mutation controls — re-introduce each defect and require the check to fail');
  const src = readFileSync(new URL('../shared/providers/video/usageLedger.mjs', import.meta.url), 'utf8');
  const dir = mkdtempSync(join(tmpdir(), 'r21-mut-'));
  try {
    const mutations = [
      ['A: record() writes over a ledger it could not read',
        [/if \(!ok\) return null;/, ''],
        (L, f) => { L.record(DAY, { runs: 1, spendUsd: 0 }); return f.data !== '{'; }],
      ['B: record() overwrites a misshapen day record',
        [/if \(!dayRecordIsTrustworthy\(rec\)\) \{ readFault = true; return null; \}/, ''],
        (L, f) => { L.record(DAY, { runs: 1, spendUsd: 0 }); return f.data !== '{"2026-09-19":"bad"}'; }],
      ['C: the trim discards the day being recorded',
        [/kept\[kept\.length - 1\] = \[day, merged\[day\]\];/, ''],
        (L, f) => { L.record(DAY, { runs: 1, spendUsd: 0 }); return !f.has(DAY); }],
      ['D: a failed write is swallowed without degrading',
        [/writeFault = true;/, ''],
        (L) => L.usageFor(DAY).degraded === false],
    ];
    for (const [label, [pattern, replacement], probe] of mutations) {
      if (!pattern.test(src)) {
        check(`F. ${label}`, false, `-> MUTATION DID NOT APPLY: ${pattern} is not in usageLedger.mjs`);
        continue;
      }
      const mutated = src.replace(pattern, replacement);
      if (mutated === src) {
        check(`F. ${label}`, false, `-> MUTATION WAS A NO-OP: replacing ${pattern} changed nothing`);
        continue;
      }
      const p = join(dir, `${label.slice(0, 1).toLowerCase()}-mut.mjs`);
      const { writeFileSync } = await import('node:fs');
      writeFileSync(p, mutated);
      const mod = await import(pathToFileURL(p).href);
      const seed = { A: '{', B: { [DAY]: 'bad' }, C: days(30, '2099-01-'), D: { [DAY]: { runs: 1, spendUsd: 0 } } }[label.slice(0, 1)];
      const f = label.startsWith('D') ? unwritableFs(seed) : memFs(seed);
      const led = mod.makeFileLedger('/ledger.json', f);
      let observed;
      try { observed = probe(led, f); } catch (e) { observed = `threw ${e.code || e.message}`; }
      check(`F. ${label}`, observed === true,
        `-> the mutated module ${observed === true ? 'reproduced' : 'did NOT reproduce'} the defect `
        + `(observed: ${observed}), so the check above ${observed === true ? 'can fail' : 'CANNOT fail'}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

main();
