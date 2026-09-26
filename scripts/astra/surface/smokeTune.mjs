/**
 * smokeTune.mjs — the Tune route checks, split out of `smoke.mjs` for Rule 4.
 *
 * WHY THE SPLIT IS AT THIS SEAM. `smoke.mjs` was at 300 lines — the cap exactly — and
 * A5's two new pane checks would have taken it over. The Tune block is the largest
 * self-contained group in the file: it touches only `call`, `check` and `expect`, and
 * every check in it is about the same three routes. That is the same seam
 * `smokeOverrides.mjs` took in A4b, so the file now reads as a list of groups rather
 * than as one long function.
 *
 * NOTHING HERE CHANGED IN THE MOVE. A split that quietly edits is a split nobody can
 * trust, so the checks were copied byte-for-byte; the only new line is the export.
 *
 * ONE CHECK IN HERE IS A REGRESSION GUARD, AND IT IS THE REASON THE BLOCK IS WORTH
 * READING. `GET /api/tuning (carries the stage)` exists because A4 shipped a read
 * route that returned `staged: {}` no matter what — so after a real stage the pane said
 * `STAGED (1)` and the endpoint said nothing was staged. A client polling it would
 * conclude a staged change had been discarded. A status-only check cannot see that;
 * this one asserts the stage is CARRIED.
 */

/**
 * Run the Tune checks against a live server harness.
 *
 * @param {{call: Function, check: Function, expect: Function}} h the smoke harness
 */
export async function checkTune({ call, check, expect }) {
  await check('GET  /api/tuning (live knobs)', async () => {
    const r = await call('GET', '/api/tuning');
    const cur = r.parsed?.view?.current ?? {};
    return {
      status: r.status,
      note: expect(r.status, 200, 'status')
        || (Object.keys(cur).length === 0 ? 'the live config produced no leaf knobs' : '')
        || (cur['auto.S'] === undefined ? 'auto.S is missing — the view is not reading the config' : '')
        || (r.parsed?.view?.staged && Object.keys(r.parsed.view.staged).length
          ? 'a fresh session must start with NOTHING staged' : ''),
    };
  });
  await check('POST /api/tuning-stage (empty = discard)', async () => {
    const r = await call('POST', '/api/tuning-stage', { body: { staged: {} } });
    return { status: r.status, note: expect(r.status, 200, 'status')
      || (r.parsed?.cleared === true ? '' : 'an empty patch must clear the stage, not error') };
  });
  // The read route must describe the SESSION, not a fresh config. A4 shipped a version
  // that returned `staged: {}` no matter what — so after a real stage the pane said
  // `STAGED (1)` and this endpoint said nothing was staged. A client polling it would
  // conclude a staged change had been discarded. This check is that defect's guard.
  await check('GET  /api/tuning (carries the stage)', async () => {
    const staged = await call('POST', '/api/tuning-stage', { body: { staged: { 'mergeBand.low': 0.4 } } });
    if (staged.status !== 200) return { status: staged.status, note: 'staging failed, so the read cannot be judged' };
    const r = await call('GET', '/api/tuning');
    const v = r.parsed?.view ?? {};
    const note = expect(r.status, 200, 'status')
      || (Object.keys(v.staged ?? {}).length === 1 ? ''
        : 'the view reported an empty stage while one was staged — a false all-clear')
      || expect(v.state, 'staged', 'state');
    await call('POST', '/api/tuning-stage', { body: { staged: {} } }); // leave no stage behind
    return { status: r.status, note };
  });
  await check('POST /api/tuning-stage (unknown key REFUSED)', async () => {
    const r = await call('POST', '/api/tuning-stage', { body: { staged: { 'nope.missing': 1 } } });
    return { status: r.status, code: r.parsed?.error?.code,
      note: expect(r.status, 400, 'status')
        || expect(r.parsed?.error?.code, 'E_TUNING_KEY_UNKNOWN', 'code') };
  });
  await check('POST /api/tuning-commit (nothing staged REFUSED)', async () => {
    // Refused BEFORE any write, so this check has no side effect on the real config.
    const r = await call('POST', '/api/tuning-commit', { body: { note: 'a smoke note long enough' } });
    return { status: r.status, code: r.parsed?.error?.code,
      note: expect(r.status, 400, 'status')
        || expect(r.parsed?.error?.code, 'E_TUNING_NO_CHANGES', 'code') };
  });
  // THE REVERT PATH IS DELIBERATELY NOT EXERCISED HERE. A real revert would WRITE the live
  // tuning.json, and a smoke run must not mutate the engine's configuration as a side
  // effect of a health check. The gate is asserted instead; the write path itself is proven
  // against temp copies in tests/a4-tune.test.mjs.
  await check('POST /api/tuning-revert (NO token = gate holds)', async () => {
    const r = await call('POST', '/api/tuning-revert', { body: {}, token: 'none' });
    return { status: r.status, code: r.parsed?.error?.code,
      note: expect(r.status, 401, 'status')
        || expect(r.parsed?.error?.code, 'E_TOKEN_REQUIRED', 'code') };
  });
}
