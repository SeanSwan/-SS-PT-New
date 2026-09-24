import { test } from 'node:test';
import assert from 'node:assert/strict';

import { startDailyRun, RUN_DAILY_SCRIPT, ROOT_ENV } from '../lib/run-daily.mjs';
import { validatePerHour, ApiError, CODE } from '../lib/errors.mjs';
import { recorder } from './fixtures/spawn-recorder.mjs';

const R = 'C:/tmp/creator-brains-rundaily-fixture';

/* ── T-B4 · validation ────────────────────────────────────────────────────── */

test('T-B4: perHour must be an integer >= 1 — and the refusals are VALIDATION', () => {
  for (const bad of [0, -1, 1.5, NaN, Infinity, -Infinity, undefined, null, '', 'lots', [], {}]) {
    assert.throws(
      () => validatePerHour(bad),
      (e) => {
        assert.ok(e instanceof ApiError, `${JSON.stringify(bad)} must refuse with an ApiError`);
        assert.equal(e.code, CODE.VALIDATION, `${JSON.stringify(bad)} must be a VALIDATION refusal`);
        return true;
      },
      `${JSON.stringify(bad)} must not be accepted as a perHour`,
    );
  }
  // The control: a genuinely valid value is accepted and returned as a NUMBER, so
  // the loop above cannot pass because the validator rejects everything.
  assert.equal(validatePerHour(60), 60, 'an integer >= 1 is accepted');
  assert.equal(validatePerHour(1), 1, 'the boundary value is accepted');
  assert.equal(validatePerHour('3'), 3, 'a numeric string is coerced — errors.mjs documents this as query-param support');
});

test('T-B4: an invalid perHour is refused BEFORE any spawn or any lock is taken', async () => {
  // ⚠️ ONE recorder, destructured once (Astra round 1, P2b). This used to call
  // `recorder()` a SECOND time inline for `spawnFn`, so the `spawns` array asserted
  // below belonged to a different object than the `spawnFn` the code was given.
  // Both arrays were empty, so the test could not fail: had the bridge spawned
  // despite a bad request, the push would have landed in the throwaway recorder's
  // array and this assertion would still have read `[]`. A check whose source of
  // truth is disconnected from its subject — the §8.38 class. The single
  // destructuring below is the whole fix; if you split it again, the test goes
  // vacuous again and nothing will tell you.
  const { gate, spawns, calls, spawnFn } = recorder();
  await assert.rejects(
    () => startDailyRun({ r: R, perHour: 0, gate, spawnFn }),
    (e) => { assert.equal(e.code, CODE.VALIDATION); return true; },
  );
  assert.deepEqual(spawns, [], 'a bad request must not start a process');
  assert.deepEqual(calls, [], 'a bad request must not even read the lock — validation comes first');
});

/* ── T-B4 · the acceptance shape ──────────────────────────────────────────── */

test('T-B4: the answer is 202 acceptance — {requestId, runId: null} and nothing else', async () => {
  const { gate, spawnFn } = recorder();
  const out = await startDailyRun({ r: R, perHour: 60, gate, spawnFn, newRequestId: () => 'req-fixed' });
  assert.deepEqual(Object.keys(out).sort(), ['requestId', 'runId'], 'exactly the two contract fields');
  assert.equal(out.requestId, 'req-fixed', 'the requestId is the caller-visible correlation handle');
  assert.equal(out.runId, null,
    'runId is null at acceptance: run-daily.mjs takes no caller-supplied id, so a non-null value would be fabricated (19 §1)');
});

test('T-B4: runId is null and NEVER the pid, nor the journal\'s current run id', async () => {
  const { gate, spawnFn, spawns } = recorder();
  const out = await startDailyRun({ r: R, perHour: 60, gate, spawnFn, newRequestId: () => 'req-2' });
  assert.equal(out.runId, null, 'not a fabricated id');
  assert.equal(out.runId, undefined === out.runId ? null : out.runId, 'present as null, not omitted');
  assert.notEqual(out.runId, spawns[0] && 4242, 'a pid is not a run id, and must not be returned as one');
  assert.equal('pid' in out, false, 'and the pid must not be returned under any other name either');
});

/* ── T-B4 · the spawn is the real entry point ─────────────────────────────── */

test('T-B4: it spawns the engine\'s OWN scheduled entry point, with the validated budget', async () => {
  const { gate, spawns, spawnFn } = recorder();
  await startDailyRun({ r: R, perHour: 42, gate, spawnFn, newRequestId: () => 'req-3' });
  assert.equal(spawns.length, 1, 'exactly one spawn');
  const [s] = spawns;
  assert.equal(s.args[0], RUN_DAILY_SCRIPT, 'the script is run-daily.mjs — the thing a scheduler runs, not an import');
  assert.ok(/creator-brains[\\/]run-daily\.mjs$/.test(s.args[0]), 'resolved to the engine entry point');
  assert.deepEqual(s.args.slice(1), ['--per-hour=42'], 'the validated budget is the only argument');
  assert.equal(s.opts.detached, true,
    'detached: the bridge\'s lifetime must not decide the run\'s — the console may exit while a run continues');
  assert.equal(s.opts.stdio, 'ignore',
    'the run\'s truth is the engine\'s files; piping stdout into the bridge would invite a reader to source the verdict from a stream');
});

/* ── T-B5 · the shared exclusion gate ─────────────────────────────────────── */

test('T-B5: a held lock is refused 409 RUN_LOCKED with the holder named, and NO process starts', async () => {
  const { gate, spawnFn, spawns } = recorder({ held: true });
  await assert.rejects(
    () => startDailyRun({ r: R, perHour: 60, gate, spawnFn }),
    (e) => {
      assert.ok(e instanceof ApiError);
      assert.equal(e.code, CODE.RUN_LOCKED);
      assert.match(e.message, /pid 777/, 'the holder is named — the detail that tells the operator what to do');
      return true;
    },
  );
  assert.deepEqual(spawns, [], 'a refused run must not spawn: the common case costs no process at all');
});

test('T-B5: the engine\'s own lock refusal is translated, not passed through', async () => {
  const { gate, spawnFn, spawns } = recorder({ withLockRefuses: true });
  await assert.rejects(
    () => startDailyRun({ r: R, perHour: 60, gate, spawnFn }),
    (e) => {
      assert.equal(e.code, CODE.RUN_LOCKED);
      assert.match(e.message, /pid 88/);
      assert.ok(e.extra && e.extra.holder, 'the holder travels as a structured extra, not only in prose');
      return true;
    },
  );
  assert.deepEqual(spawns, [], 'the mutex refused, so no child was started');
});

test('T-B5: the pure read precedes the mutex, so the common case never reaches either the engine or a spawn', async () => {
  const { gate, calls, spawnFn } = recorder({ held: true });
  await assert.rejects(() => startDailyRun({ r: R, perHour: 60, gate, spawnFn }));
  assert.deepEqual(calls, ['lockStatus'],
    'a held lock short-circuits after the PURE read — taking the mutex afterwards would be a second, pointless refusal');
});

test('T-B5: validation, then the pure read, then the mutex, then the spawn — in that order', async () => {
  // The order IS the contract (05 §2b, 19 §4): a bad request must cost nothing, a
  // held lock must cost no process, and only a valid request against a free store
  // starts a child. Asserted as one sequence so a future reorder cannot pass by
  // satisfying each step in isolation.
  const { gate, calls, spawns, spawnFn } = recorder();
  await startDailyRun({ r: R, perHour: 5, gate, spawnFn, newRequestId: () => 'req-order' });
  assert.deepEqual(calls, ['lockStatus', 'withLock'], 'pure read then the engine mutex');
  assert.equal(spawns.length, 1, 'and the spawn happens inside the mutex');
  // The ordering claim, falsifiably (Astra round 1, P2c). The two assertions above
  // are satisfiable by a spawn that happens AFTER the mutex was released: the call
  // sequence would be identical and the count would still be 1. This asserts the
  // flag as observed AT SPAWN TIME, so moving the spawn outside `withLock` turns it
  // red. Note the disclosure that comes with it: the console mutex is released when
  // the spawn RETURNS, not when the child exits — see P1a, which is a real residual.
  assert.equal(spawns[0].mutexHeld, true, 'the spawn must occur WHILE the mutex is held, not after');
});

test('T-B5: repair and the daily run take the SAME gate implementation', async () => {
  // A1-06's whole content is that there is ONE gate, not two compatible ones. That
  // is asserted at the source level here because it is an architectural property:
  // if either module grew its own preamble, both would still pass their own tests
  // while the pair drifted.
  //
  // ⚠️ STRIP COMMENTS FIRST (Astra round 1, P2a). These regexes used to run over the
  // raw source, so a file that merely MENTIONED `underRunGate(` in a comment passed
  // — proved by probe, not argued: `/underRunGate\(/` matches
  // `// underRunGate( is never actually called`. A check about what a file DOES must
  // not read what a file SAYS about what it does, and this file says a great deal.
  const { readFileSync } = await import('node:fs');
  const strip = (s) => s
    .replace(/\/\*[\s\S]*?\*\//g, '')   // block comments
    .replace(/^[ \t]*\/\/.*$/gm, '');   // line comments
  const repair = readFileSync(new URL('../lib/repair.mjs', import.meta.url), 'utf8');
  const daily = readFileSync(new URL('../lib/run-daily.mjs', import.meta.url), 'utf8');
  for (const [name, raw] of [['repair', repair], ['run-daily', daily]]) {
    const src = strip(raw);
    assert.ok(/from '\.\/run-gate\.mjs'/.test(src), `${name} must import the shared gate`);
    assert.ok(/underRunGate\(/.test(src), `${name} must CALL underRunGate, not merely name it`);
    assert.equal(/lock\.mjs'/.test(src), false,
      `${name} must NOT reach the engine lock directly — that is how a second, drifting gate starts`);
  }
  // The control, and it is what makes the two assertions above non-vacuous: prove
  // the stripper actually removes comments, so a future edit that breaks it turns
  // THIS red rather than silently re-opening the hole.
  const decoy = "import { x } from './run-gate.mjs';\n// underRunGate( is never called\n";
  assert.equal(/underRunGate\(/.test(strip(decoy)), false,
    'the stripper must remove a comment that names underRunGate — otherwise the assertion above is decorative');
  assert.ok(/underRunGate\(/.test(decoy), 'and the unstripped decoy DOES match, so the control discriminates');
  // Control: the shared module is the one that does reach the engine lock, so the
  // assertion above is not passing merely because nobody imports it at all.
  const gateSrc = strip(readFileSync(new URL('../lib/run-gate.mjs', import.meta.url), 'utf8'));
  assert.ok(/from '\.\.\/\.\.\/\.\.\/scripts\/creator-brains\/lib\/lock\.mjs'/.test(gateSrc),
    'the shared gate module IS the single site that imports the engine lock');
});

test('T-B5: a held gate prevents the spawn — asserted BEHAVIOURALLY, not by regex', async () => {
  // Astra round 1, P2a's stronger half. The source assertion above is satisfied if
  // the import and the call both exist; it does not prove the call WRAPS the spawn.
  // This asserts the consequence instead: with a held lock, no process may start.
  //
  // NOTE the destructuring: `spawnFn` and `spawns` come from the SAME recorder, and
  // that is not a style choice — T-B4 in this file shipped with them coming from two
  // different recorders, which made its assertion unfalsifiable (Astra P2b). Writing
  // this test any other way would reintroduce the defect it sits next to.
  const { gate, spawns, spawnFn } = recorder({ held: true });
  await assert.rejects(
    () => startDailyRun({ r: R, perHour: 60, gate, spawnFn }),
    (e) => { assert.equal(e.code, CODE.RUN_LOCKED, 'a held store refuses with RUN_LOCKED'); return true; },
  );
  assert.deepEqual(spawns, [], 'no process may start when the gate refuses');
});

/*
 * ROUTING AND LAUNCH FAILURE MOVED to `bridge.spawn-launch.test.mjs`. Two of Astra
 * round 1's P2 findings — the child was not told which store to use, and a failed
 * launch was answered with a 202 — were both invisible here because this file asserts
 * the ARGUMENTS of the spawn call and never the child's behaviour. They need a child
 * that can emit, so they moved next to the harness that provides one rather than
 * growing this file past the Rule 4 cap.
 */
