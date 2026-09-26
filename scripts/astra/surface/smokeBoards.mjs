/**
 * smokeBoards.mjs — A5's additions to the smoke runner: the two read-only boards, and the
 * transport-level half of `AC5.4`.
 *
 * A SIBLING MODULE for the reason `smokeHarness.mjs` and `smokeOverrides.mjs` are ones:
 * `smoke.mjs` sits at Rule 4's 300-line cap, so a slice's checks go in their own file. The
 * Tune block moved to `smokeTune.mjs` in the same change to make room.
 *
 * WHY THE ZERO-CONTROL ASSERTION IS A SMOKE CHECK AND NOT ONLY A UNIT TEST. The unit test
 * proves it against the rendered functions; this proves it against the bytes the server
 * actually sent, THROUGH the shell and the rail. Those are different claims, and A4b found
 * a defect that only the second one could see — a control registered and rendered but with
 * no handler. A pane that is supposed to have no controls is exactly the place where
 * "the function returns none" and "the page contains none" could diverge.
 *
 * WHY THE ENABLE-ROUTE SCAN IS HERE. `AC5.4` forbids an actor enabling a REFUSED lane or
 * spec mode. `core/authority.mjs` refuses the OPERATION for every actor; this asserts that
 * no route was ever added that would reach one. A fence in the domain and a scan of the door
 * handles — both are cheap, and only one of them catches a route named `spec-mode-enable`
 * six slices from now.
 */

import { routesThatCouldEnable } from '../core/authority.mjs';

/** A citation the Law pane must produce: the file that RUNS the laws, with a line number. */
const LAW_CITE = /shared\/swanLawFilter\.mjs:\d+/;
/** A citation the State pane must produce: the lane module, with a line number. */
const LANE_CITE = /scripts\/design-brain\/src\/[a-z-]+\.mjs:\d+/;

/** `data-control` ids in a response body. Empty is the requirement on both boards. */
const controlsIn = (text) => [...text.matchAll(/data-control="([^"]+)"/g)].map((m) => m[1]);

/**
 * The A5 board checks.
 *
 * @param {{call: Function, check: Function, expect: Function}} h the harness helpers
 */
export async function checkBoards({ call, check, expect }) {
  await check('GET  /law (REAL as of A5)', async () => {
    const r = await call('GET', '/law');
    const ctl = controlsIn(r.text);
    return {
      status: r.status,
      note: expect(r.status, 200, 'status')
        // A board with no citation is a table of assertions. This is the requirement.
        || (LAW_CITE.test(r.text) ? '' : 'no law row carried a file:line citation')
        || (!r.text.includes('KILL-LIST') ? 'the kill-list section is missing' : '')
        || (ctl.length ? `the Law pane emitted ${ctl.length} control(s): ${ctl.join(', ')}` : '')
        || (/not built yet/.test(r.text) ? 'the pane still renders as NOT BUILT' : '')
        || (r.text.includes('INCONCLUSIVE') && !r.text.includes('ENFORCED')
          ? 'every law row degraded — the markers no longer resolve' : ''),
    };
  });

  await check('GET  /state (REAL as of A5)', async () => {
    const r = await call('GET', '/state');
    const ctl = controlsIn(r.text);
    return {
      status: r.status,
      note: expect(r.status, 200, 'status')
        || (LANE_CITE.test(r.text) ? '' : 'no lane row carried a file:line citation')
        // Both ends of the board must be on screen: a page showing only ACTIVE lanes would
        // read as "everything works", which is the opposite of what the board says.
        || (!r.text.includes('REFUSED') ? 'the REFUSED lanes are missing from the board' : '')
        || (!r.text.includes('RETIRED') ? 'the RETIRED lanes are missing from the board' : '')
        || (!r.text.includes('enabled:' ) ? 'the spec-mode row is missing' : '')
        || (ctl.length ? `the State pane emitted ${ctl.length} control(s): ${ctl.join(', ')}` : '')
        || (/not built yet/.test(r.text) ? 'the pane still renders as NOT BUILT' : ''),
    };
  });

  // `AC5.4` on the pane: the sweep is rendered, and it reports zero.
  await check('GET  /state (AC5.4 sweep renders zero)', async () => {
    const r = await call('GET', '/state');
    const m = /<b>(\d+)<\/b> of <b>(\d+)<\/b> attempts enabled/.exec(r.text);
    return {
      status: r.status,
      note: expect(r.status, 200, 'status')
        || (!r.text.includes('AC5.4') ? 'the pane does not state the rule it enforces' : '')
        || (!m ? 'the sweep did not render its attempt count' : '')
        || (m && m[1] !== '0' ? `${m[1]} attempts enabled something — AC5.4 is violated` : '')
        // The attempt count must be a product of the actors and the lanes, not a literal.
        || (m && Number(m[2]) < 5 ? `only ${m[2]} attempts — the sweep is not covering the board` : ''),
    };
  });

  // The read-only decision must be VISIBLE on the panes it governs, not only in the registry.
  await check('GET  /law + /state (read-only notice on the pane)', async () => {
    const [law, state] = await Promise.all([call('GET', '/law'), call('GET', '/state')]);
    const missing = [];
    if (!law.text.includes('READ-ONLY BY DESIGN')) missing.push('/law');
    if (!state.text.includes('READ-ONLY BY DESIGN')) missing.push('/state');
    return {
      status: 200,
      note: expect(law.status, 200, 'law status') || expect(state.status, 200, 'state status')
        || (missing.length ? `no read-only notice on ${missing.join(', ')}` : ''),
    };
  });
}

/**
 * `AC5.4` at the transport layer: NO ROUTE — API or pane — names an enable action.
 *
 * THE SCOPE OF THIS SCAN IS THE WHOLE POINT, AND IT WAS WRONG FIRST. A5's hostile review
 * found that it read `MUTATION_ROUTES` only. Pane routes were an `if` chain with no exported
 * list, so `GET /state/enable-spec` would have been **invisible to every guard in the tree** —
 * `routesThatCouldEnable()` would catch that string if it ever saw it, and nothing would ever
 * show it to it. That is the same defect class as A4b's Rule 4 guard ("every module" meaning
 * "every `.mjs` module") and A5's own stylesheet scan ("the stylesheet" meaning "one of
 * three"), in the check written to close that class.
 *
 * Both route sets are now enumerable and both are scanned. `paneRoutes.mjs` exports
 * `PANE_PATHS` from its route TABLE, and `a5-boards.test.mjs` asserts the table covers every
 * path literal in that file in both directions — so a new pane cannot be added without
 * appearing here.
 *
 * @param {{check: Function, routes: readonly string[], panePaths: readonly string[]}} h
 */
export async function checkNoEnableRoute({ check, routes, panePaths = [] }) {
  await check('AC5.4 no route can enable a REFUSED lane or spec mode', async () => {
    const scanned = [...routes, ...panePaths];
    const offenders = routesThatCouldEnable(scanned);
    return {
      status: 200,
      note: (panePaths.length === 0
        ? 'no pane paths were supplied — the scan would be silent about every pane route'
        : '')
        || (offenders.length
          ? `these routes name an enable action: ${offenders.join(', ')}` : ''),
    };
  });
}
