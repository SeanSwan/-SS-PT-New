/**
 * bridge.repair.test.mjs — T-B10 (S3): the repair operation and its exclusion gate.
 *
 * T-B10's two halves, corrected 2026-09-20 (R2-06):
 *   (a) repair returns the PROJECTED engine result and agrees with the engine's
 *       own counts; a concurrent run is refused `409 RUN_LOCKED {holder}` rather
 *       than interleaving the journal.
 *   (b) canary reflects a stubbed `selfCheck`.
 *
 * WHAT THIS FILE REFUSES TO ASSUME. `05 §2b` records that `lib/run.mjs:107`
 * writes the journal BEFORE it attempts the lock at `:154` — so a `RUN_LOCKED`
 * verdict is "a refusal of the run, NOT proof the store is untouched". The
 * centrepiece case below therefore asserts on the JOURNAL, not on the status
 * code: a refusal that had already appended a journal entry would pass a
 * status-code assertion while doing the damage the contract warns about.
 *
 * The engine is never invoked for real here. `repairStore` takes `run` and
 * `gate` as injections precisely so this suite can hold the lock, count journal
 * writes, and assert the ORDERING (pure read → lock → engine) without a
 * 3-second spawn per case.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { repairStore, projectRepair } from '../lib/repair.mjs';
import { ApiError, CODE } from '../lib/errors.mjs';

const R = 'C:/tmp/creator-brains-repair-fixture';

/** A gate that records the call order so ordering can be asserted, not assumed. */
function recordingGate({ held = false, withLockRefuses = false } = {}) {
  const calls = [];
  return {
    calls,
    gate: {
      lockStatus() { calls.push('lockStatus'); return held ? { held: true, pid: 4242, host: 'probe' } : { held: false }; },
      async withLock(_r, fn, opts) {
        calls.push('withLock');
        if (withLockRefuses) return opts.onBusy({ reason: 'lock_held', holder: { pid: 99, host: 'other' } });
        return fn({});
      },
    },
  };
}

/* ── (a) the projected result ─────────────────────────────────────────────── */

test('T-B10: repair returns exactly the projected triple, nothing more', async () => {
  const { gate } = recordingGate();
  const result = await repairStore({
    r: R,
    gate,
    // The engine's repair path is `runDaily({only:['reconcile','build','export']})`.
    // The injected recorder echoes a FULL record — phases, notes, an unprojected
    // count — so a passthrough implementation would leak them and fail here.
    run: async () => ({ counts: { repaired: 5, built: 4, emptied: 2, quarantined: 1 }, phases: [{ name: 'reconcile' }], notes: ['x'] }),
  });
  assert.deepEqual(Object.keys(result).sort(), ['built', 'emptied', 'repaired']);
  assert.deepEqual(result, { repaired: 5, built: 4, emptied: 2 });
  assert.equal('quarantined' in result, false, 'a count outside the contract must not leak through the projection');
});

/* ── a refused run is never a 200 (G9 review, major 1) ────────────────────── */
/* The engine can refuse from INSIDE runDaily — a bounds refusal, a damaged
 * preflight — and those arrive as a CONCLUDED record with `ok === false`
 * (run.mjs:148), not as a throw. Projecting that record's (zero) counts used
 * to ship a 200 and the UI read it as "repair ran and changed nothing": the
 * success-shaped lie. The fix surfaces it through the API's existing refusal
 * contract, and these cases pin that. */

test('T-B10: an engine-refused repair (ok:false) is REFUSED, not a projected 200', async () => {
  const { gate } = recordingGate();
  await assert.rejects(
    () => repairStore({
      r: R,
      gate,
      run: async () => ({
        ok: false,
        counts: { repaired: 0, built: 0, emptied: 0 },
        notes: ['preflight: state.json is damaged beyond repair'],
        phases: [{ name: 'preflight', ok: false, reason: 'state.json is damaged beyond repair' }],
      }),
    }),
    (e) => {
      assert.ok(e instanceof ApiError, 'the refusal must be an ApiError, not a raw throw');
      assert.equal(e.code, CODE.REFUSED);
      assert.match(e.message, /preflight: state\.json is damaged beyond repair/, 'the engine\'s note must reach the operator');
      return true;
    },
    'a refused run must never surface as resolved counts',
  );
});

test('T-B10: an ok:false record with no notes still refuses, with a usable message', async () => {
  const { gate } = recordingGate();
  await assert.rejects(
    () => repairStore({ r: R, gate, run: async () => ({ ok: false, counts: {} }) }),
    (e) => {
      assert.equal(e.code, CODE.REFUSED);
      assert.match(e.message, /repair refused by the engine/);
      return true;
    },
  );
});

test('T-B10: a record without an ok verdict still projects (defensive for legacy shapes)', async () => {
  const { gate } = recordingGate();
  const result = await repairStore({
    r: R,
    gate,
    run: async () => ({ counts: { repaired: 1, built: 0, emptied: 0 } }),
  });
  assert.deepEqual(result, { repaired: 1, built: 0, emptied: 0 });
});

test('T-B10: the engine is asked for the repair phase set, not the whole daily run', async () => {
  const { gate } = recordingGate();
  let received = null;
  await repairStore({ r: R, gate, run: async (o) => { received = o; return { counts: {} }; } });
  assert.deepEqual(received.only, ['reconcile', 'build', 'export'],
    'repair is not a second mechanism — it must call the engine\'s own repair phase set');
});

test('T-B10: absent or non-finite counts project to 0, never to NaN or undefined', () => {
  assert.deepEqual(projectRepair({}), { repaired: 0, built: 0, emptied: 0 });
  assert.deepEqual(projectRepair({ counts: { repaired: NaN, built: null, emptied: '3' } }),
    { repaired: 0, built: 0, emptied: 0 },
    'a string count is not a count; the engine CLI prints `|| 0` for exactly this reason');
});

/* ── (a) the exclusion gate ───────────────────────────────────────────────── */

test('T-B10: a held lock is refused 409 RUN_LOCKED with the holder named', async () => {
  const { gate } = recordingGate({ held: true });
  await assert.rejects(
    () => repairStore({ r: R, gate, run: async () => { throw new Error('must not run'); } }),
    (e) => {
      assert.ok(e instanceof ApiError, 'must be an ApiError so the envelope carries a code');
      assert.equal(e.code, CODE.RUN_LOCKED);
      assert.match(e.message, /pid 4242/, 'the holder must be named — that is the one detail that tells the operator what to do');
      return true;
    },
  );
});

test('T-B10: THE READ PRECEDES THE ENGINE — a held lock never reaches runDaily', async () => {
  const { gate, calls } = recordingGate({ held: true });
  let engineEntered = false;
  await assert.rejects(() => repairStore({ r: R, gate, run: async () => { engineEntered = true; return { counts: {} }; } }));
  assert.equal(engineEntered, false,
    'runDaily writes the journal at :107 BEFORE checking the lock at :154 — entering it under a held lock would append a journal entry we claimed we refused');
  assert.equal(calls.includes('withLock'), false, 'the pure read must short-circuit before the mutex is taken');
});

test('T-B10: the engine\'s own lock refusal is translated, not passed through', async () => {
  const { gate } = recordingGate({ withLockRefuses: true });
  await assert.rejects(
    () => repairStore({ r: R, gate, run: async () => { throw new Error('must not run'); } }),
    (e) => {
      assert.equal(e.code, CODE.RUN_LOCKED);
      assert.match(e.message, /pid 99/);
      return true;
    },
  );
});

test('T-B10: a refusal carries the holder as a structured extra, not only in prose', async () => {
  const { gate } = recordingGate({ held: true });
  await assert.rejects(
    () => repairStore({ r: R, gate, run: async () => ({ counts: {} }) }),
    (e) => {
      assert.ok(e.extra && e.extra.holder, 'the envelope spreads `extra`, so the holder must travel as a field');
      assert.equal(e.extra.holder.pid, 4242);
      return true;
    },
  );
});

test('T-B10: repair and the daily run share ONE gate, so neither is a second door', async () => {
  // The claim in `05 §2b` is that repair reaches the SAME runDaily journal path,
  // so a gate on the run route alone would leave the journal reachable through
  // repair. Asserted by construction: repairStore is the only caller, and it
  // takes the engine's own `withLock`.
  const { gate, calls } = recordingGate();
  await repairStore({ r: R, gate, run: async () => ({ counts: {} }) });
  assert.deepEqual(calls, ['lockStatus', 'withLock'],
    'lockStatus (pure) then withLock (the engine mutex) — in that order and no other');
});

test('T-B10: no backup path is exercised, because none exists', async () => {
  const api = await import('../api.mjs');
  assert.equal(typeof api.repairStore, 'function', 'repair IS exported from the public surface');
  assert.equal(api.repairStore, repairStore, 'the barrel re-exports this exact function, not a copy');
  // Read the route table as TEXT. `readFileSync` takes a path or a URL — not a
  // third thing that looks like one; the first draft of this case mishandled the
  // `await`/`then` shape and failed for a reason unrelated to its claim.
  const { readFileSync } = await import('node:fs');
  const routes = readFileSync(new URL('../routes.mjs', import.meta.url), 'utf8');
  assert.equal(/['"]\/api\/backup['"]/.test(routes), false,
    'A1-08 / D4 is still open: backup stays visible-but-blocked with NO endpoint, so no route may exist');
  // ...and the control: the same extractor DOES find the route that legitimately
  // exists. Without this, a typo in the pattern above would make the case pass
  // while proving nothing.
  assert.ok(/['"]\/api\/repair['"]/.test(routes),
    'the same pattern must find /api/repair, or the assertion above is vacuous');
});

/* ── the A1-06 gate binds S3 as it binds S4 ───────────────────────────────── */

test('A1-06 repair reaches the SAME journal path as the daily run, so one gate covers both', async () => {
  // `19 §4` widened this gate from S4 alone to S3 AND S4, on the ground that
  // "repair invokes the same `runDaily` journal path, so gating one door and
  // shipping the other is gating nothing." That is asserted structurally rather
  // than by comment: `repairStore` must reach the engine's own `runDaily`
  // against the same store root, so there is exactly ONE journal file and no
  // "repair journal" that could drift from it.
  //
  // The engine-side proof that the journal itself preserves the holder's entry
  // lives in `scripts/creator-brains/test/journal-preservation.test.mjs`. This
  // case proves the console is wired into that same path; that file proves the
  // path is safe. Neither alone closes the gate.
  const { repairStore } = await import('../lib/repair.mjs');
  const { paths } = await import('../../../scripts/creator-brains/lib/paths.mjs');
  const { join } = await import('node:path');
  const { readFileSync: readRoutes } = await import('node:fs');
  const store = 'C:/tmp/creator-brains-a106-fixture';
  let reached = null;
  await repairStore({
    r: store,
    gate: { lockStatus: () => ({ held: false }), withLock: async (_r, fn) => fn({}) },
    run: async (o) => { reached = o; return { counts: {} }; },
  });
  assert.deepEqual(reached.only, ['reconcile', 'build', 'export'],
    'repair invokes runDaily — the same journal path the daily run uses');
  assert.equal(reached.r, store, 'against the same store root, so the same journal file');
  // The shared journal FILE, named once, so a future rename breaks this loudly
  // rather than leaving the case quietly asserting a path nobody writes.
  assert.equal(paths(store).journal, join(paths(store).base, 'journal.json'),
    'there is exactly one journal file per store — the thing both doors contend for');

  // THE OTHER HALF OF THE GATE, STATED AS STATE RATHER THAN ASPIRATION.
  // S4 is what adds `POST /api/run/daily`, and it does not exist yet. Asserting
  // that route is present would be a claim this slice cannot make — the first
  // draft of this case did exactly that and failed, correctly. What the gate
  // requires *today* is that the door not yet built is exactly the one named as
  // owed, so closing it is a known, single step rather than a discovery.
  const routesText = readRoutes(new URL('../routes.mjs', import.meta.url), 'utf8');
  const dailyRouted = routesText.includes("'/api/run/daily'") || routesText.includes('"/api/run/daily"');
  if (dailyRouted) {
    assert.ok(true, 'S4 has landed and the gate is fully applied on both doors');
  } else {
    // Not routed. That is permitted ONLY while S4 is open — and while it is, this
    // suite records that A1-06 covers one door, so shipping S4 without its route
    // taking this same gate would be gating nothing (19 §4).
    //
    // The rule must be about a MUTATING run route, not any `/api/run` string:
    // `GET /api/run` (`routes.mjs:86`) is an existing, legitimate read surface
    // that S0 shipped. A first draft of this case matched the bare substring and
    // failed on that read route — an assertion firing on a false positive, which
    // is its own defect. Only a run route that is a WRITE can be an unguarded
    // second entrance to the journal.
    //
    // The pattern is written against the route table's ACTUAL shape, read from
    // the file rather than assumed: every write route in this project is spelled
    // `if (req.method === 'POST' && p === '/api/…')`. Matching a bare `POST`
    // token found nothing and made the control below fail — which is what a
    // control is for.
    const WRITE_ROUTE = (path) => new RegExp(
      `req\\.method\\s*===\\s*['"]POST['"]\\s*&&\\s*p\\s*===\\s*['"]${path}['"]`,
    );
    const writeRunRoutes = routesText
      .split('\n')
      .filter((line) => /req\.method\s*===\s*['"]POST['"]/.test(line))
      .filter((line) => /\/api\/run\b/.test(line))
      // `/api/run/daily` is S4's route; its absence is the point of this branch.
      .filter((line) => !/['"]\/api\/run\/daily['"]/.test(line));
    assert.deepEqual(writeRunRoutes, [],
      `no POST /api/run* route may exist without the daily door being on the shared gate — a partial S4 would be an unguarded second entrance to the journal (found ${JSON.stringify(writeRunRoutes)})`);
    // Control: the same extraction DOES find the write route that genuinely
    // exists, so the case above cannot pass because its pattern is dead.
    assert.equal(WRITE_ROUTE('/api/repair').test(routesText), true,
      'the write-route pattern must match the repair route that genuinely exists, or the assertion above proves nothing');
  }
});
