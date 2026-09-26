/**
 * smokeLedger.mjs — A6's additions to the smoke runner: the Ledger pane, and the ONE dial on it.
 *
 * A SIBLING MODULE for the reason `smokeTune.mjs` and `smokeBoards.mjs` are ones: `smoke.mjs`
 * sits at Rule 4's cap, so a slice's checks go in their own file. `/ledger` used to have a
 * "not built" check in `smoke.mjs`; A6 replaces it with these.
 *
 * WHY THE COUNT IS ASSERTED AS AN INCREMENT AND NOT AS A NUMBER. `T-E-03` says a reject moves
 * the count by **exactly one**. Asserting `count === 1` after one reject would pass against a
 * counter that counts COMPILES rather than rejections, and would say nothing about the second
 * reject. So this measures before and after, and then rejects the SAME compile a second time
 * and requires the count NOT to move — which is the half that catches a double-count. Over real
 * HTTP, through the shell and the rail, which is the claim a unit test cannot make.
 *
 * WHY THE ABSENT BUTTON IS A CHECK AND NOT AN OBSERVATION. A control that renders on a row it
 * cannot act on is the dead-control defect `UNWIRED_CONTROLS` exists to catch, in its other
 * form: the operator presses it and concludes the action failed rather than that it was never
 * offered. The Ledger emits its dial only on `pending` rows, and this measures that on the
 * bytes the server sent.
 */

/** The dial's id, spelled once. `controls.mjs` is the authority; this is a reader. */
const REJECT = 'ledger.markRejectedAll';
const controlsIn = (text) => [...text.matchAll(/data-control="([^"]+)"/g)].map((m) => m[1]);
/** The header's rejected count, as rendered. */
const countIn = (text) => {
  const m = /<b data-ledger-rejected>(\d+)<\/b>/.exec(text);
  return m ? Number(m[1]) : null;
};

const BRIEF = { text: 'a ledger smoke brief — a cold room, one lamp, no people', intent: 'hero', aspect: '16:9' };

/**
 * The A6 Ledger checks.
 *
 * @param {{call: Function, check: Function, expect: Function}} h the harness helpers
 */
export async function checkLedger({ call, check, expect }) {
  // 1. The pane is REAL, and with nothing compiled it offers NO action.
  await check('GET  /ledger (REAL as of A6, nothing compiled)', async () => {
    const r = await call('GET', '/ledger');
    const ctl = controlsIn(r.text).filter((id) => id === REJECT);
    return {
      status: r.status,
      note: expect(r.status, 200, 'status')
        || (/not built yet/.test(r.text) ? 'the pane still renders as NOT BUILT' : '')
        // All three sections must be on screen: a Ledger showing only the trend would hide
        // the drift, and `AC6.2` is the half that is easy to omit.
        || (!r.text.includes('THIS BATCH') ? 'the batch section is missing' : '')
        || (!r.text.includes('THE TREND') ? 'the trend section is missing' : '')
        || (!r.text.includes('COST DRIFT') ? 'the cost-drift section is missing' : '')
        // AN EMPTY LEDGER MUST NOT RENDER AS ZERO REJECTED WITHOUT SAYING WHY.
        || (!r.text.includes('no compiles yet') ? 'an empty Ledger must name why it is empty' : '')
        // The dead-control guard: nothing to decide means no button.
        || (ctl.length ? `the Ledger offered ${ctl.length} reject control(s) with nothing compiled` : ''),
    };
  });

  // 2. Compile one, and the dial appears — exactly once, attached to that compile.
  const compiled = await call('POST', '/api/compile', { body: { brief: BRIEF } });
  const compileId = compiled.parsed?.compileId ?? null;
  await check('POST /api/compile → GET /ledger offers the dial once', async () => {
    const r = await call('GET', '/ledger');
    const ids = [...r.text.matchAll(new RegExp(`data-control="${REJECT}" data-compile-id="([^"]+)"`, 'g'))]
      .map((m) => m[1]);
    return {
      status: r.status,
      note: expect(compiled.status, 200, 'compile status')
        || (compileId ? '' : 'the compile response carried no compileId')
        || (!r.text.includes('rejected of') ? 'the header did not render its counts' : '')
        || (ids.length !== 1 ? `expected 1 reject control, found ${ids.length}` : '')
        || (ids[0] !== compileId ? `the control points at ${ids[0]}, not ${compileId}` : ''),
    };
  });

  // 3. Reject it, and require the count to move by EXACTLY one.
  const before = await call('GET', '/ledger');
  const c0 = countIn(before.text);
  const rejected = await call('POST', '/api/reject', { body: { compileId } });
  await check('POST /api/reject → the Ledger count moves by exactly 1', async () => {
    const r = await call('GET', '/ledger');
    const c1 = countIn(r.text);
    return {
      status: r.status,
      note: expect(rejected.status, 200, 'reject status')
        || (rejected.parsed?.outcome !== 'rejected_all'
          ? `the reject answered ${JSON.stringify(rejected.parsed?.outcome)}` : '')
        || (c0 === null ? 'the before count did not render' : '')
        || (c1 === null ? 'the after count did not render' : '')
        || (c1 !== c0 + 1 ? `the count went ${c0} → ${c1}, not by exactly one` : '')
        // THE ROW MUST AGREE WITH THE COUNT, and the button must be gone: a decided row that
        // still offered the dial would invite a second reject that does nothing.
        || (!new RegExp(`ledger-row--rejected_all`).test(r.text)
          ? 'no row rendered as rejected_all' : '')
        || (r.text.includes(`data-control="${REJECT}" data-compile-id="${compileId}"`)
          ? 'a decided row still offered the reject control' : ''),
    };
  });

  // 4. The SAME reject again must not move the count — the double-count half.
  await check('POST /api/reject twice → the count does NOT move again', async () => {
    const mid = countIn((await call('GET', '/ledger')).text);
    const again = await call('POST', '/api/reject', { body: { compileId } });
    const after = countIn((await call('GET', '/ledger')).text);
    return {
      status: again.status,
      note: expect(again.status, 200, 'second reject status')
        || (mid === null ? 'the count did not render' : '')
        || (after !== mid
          ? `re-rejecting moved the count ${mid} → ${after}; a rejection is idempotent and the count is a count of BATCHES, not of writes`
          : ''),
    };
  });

  // 5. A reject that names no compile is a NAMED failure, never a silent 200.
  await check('POST /api/reject (unknown id) → 404 with a named code', async () => {
    const r = await call('POST', '/api/reject', { body: { compileId: 'cmp-does-not-exist-0' } });
    return {
      status: r.status,
      note: (r.status === 404 ? '' : `expected 404, got ${r.status}`)
        || (!/E_COMPILE_UNKNOWN/.test(r.text) ? 'the refusal did not name its code' : ''),
    };
  });
}
