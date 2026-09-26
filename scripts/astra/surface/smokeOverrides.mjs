/**
 * smokeOverrides.mjs — A4b's additions to the smoke runner: the override route, and the
 * runner's own COMPLETENESS.
 *
 * A SIBLING MODULE for the reason `smokeHarness.mjs` is one: `smoke.mjs` sits at 288 of
 * Rule 4's 300 lines, and A4b needed to add checks rather than grow the runner. The seam
 * is "one slice's smoke checks in their own file", which is how the panes are already
 * organised (`paneTune.mjs`, `paneSlots.mjs`).
 *
 * WHY THE COVERAGE CHECK IS HERE, NEXT TO THE ROUTE CHECK. They are the same finding.
 * `overrides-stage` is a real, token-gated route that A4b added — and the 29-check smoke
 * suite did not mention it. The suite's whole claim is that a person can read one screen
 * and see that EVERY route answers the way it says, and it printed `29 checks` as if that
 * number meant completeness. It did not: the count was a list length, and nothing tied
 * the list to the routes that exist. Adding a route is what exposed the gap, so the guard
 * against it belongs beside the checks that closed it.
 */

/**
 * The A4b override-layer checks: the gate, the stage, the pane, and the refusal.
 *
 * @param {{call: Function, check: Function, expect: Function}} h the harness helpers
 */
export async function checkOverrides({ call, check, expect }) {
  await check('POST /api/overrides-stage (NO token = gate holds)', async () => {
    const r = await call('POST', '/api/overrides-stage',
      { body: { overrides: { light: 'x' } }, token: 'none' });
    return {
      status: r.status,
      code: r.parsed?.error?.code,
      note: expect(r.status, 401, 'status')
        || expect(r.parsed?.error?.code, 'E_TOKEN_REQUIRED', 'code'),
    };
  });

  await check('POST /api/overrides-stage (token, stages)', async () => {
    const r = await call('POST', '/api/overrides-stage',
      { body: { overrides: { light: 'flat overcast light' } } });
    return {
      status: r.status,
      note: expect(r.status, 200, 'status')
        // A stage that claimed to write would be claiming a file change that did not happen.
        || (r.parsed?.wrote === false ? '' : 'staging must state that it wrote nothing')
        || (Array.isArray(r.parsed?.changedKeys) && r.parsed.changedKeys.includes('light')
          ? '' : 'the stage did not report the key it accepted'),
    };
  });

  // The PANE must show the stage. A stage the server keeps and the pane cannot see is the
  // dead-control defect with the sign flipped: the control works and nothing says so.
  await check('GET  / (Compose shows the staged override)', async () => {
    const r = await call('GET', '/');
    return {
      status: r.status,
      note: expect(r.status, 200, 'status')
        || (r.text.includes('1 staged') ? '' : 'the pane did not report the staged override')
        || (r.text.includes('flat overcast light') ? '' : 'the pane did not show the staged value'),
    };
  });

  // The pane withholds `negative`; the boundary must refuse it. One policy, both ends.
  await check('POST /api/overrides-stage (negative REFUSED)', async () => {
    const r = await call('POST', '/api/overrides-stage', { body: { overrides: { negative: '' } } });
    return {
      status: r.status,
      code: r.parsed?.error?.code,
      note: expect(r.status, 400, 'status')
        || expect(r.parsed?.error?.code, 'E_OVERRIDE_KEY_BLOCKED', 'code'),
    };
  });

  // Leave no stage behind, so the screen after this one describes the same session.
  await call('POST', '/api/overrides-stage', { body: { overrides: {} } });
}

/**
 * Fail the run if a mutation route has no check naming it.
 *
 * `rows` is the harness's recorded list, so this reads what was ACTUALLY run rather than
 * what the file appears to declare. A route is covered when some check's name mentions
 * `/api/<route>` — the names already carry the path, so no second inventory is needed and
 * there is nothing to keep in step by hand.
 *
 * @param {{rows: Array, check: Function, routes: readonly string[]}} h
 */
export async function checkRouteCoverage({ rows, check, routes }) {
  await check('COVERAGE every mutation route is checked', async () => {
    const names = rows.map((r) => r.name);
    const missing = routes.filter((route) => !names.some((n) => n.includes(`/api/${route}`)));
    return {
      status: 200,
      // This check's own name contains no `/api/`, so it cannot satisfy itself.
      note: missing.length ? `no smoke check names: ${missing.join(', ')}` : '',
    };
  });
}
