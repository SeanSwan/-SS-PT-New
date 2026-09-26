/**
 * paneRoutes.mjs — THE PANE DISPATCH, as a TABLE. Split out of `server.mjs` for Rule 4.
 *
 * WHY THE SPLIT IS AT THIS SEAM. `server.mjs` owns two separable jobs: HTTP PLUMBING
 * (read the body, gate the token, decide the verb, write the headers) and PANE DISPATCH
 * (given a pathname, produce a title, an active rail item and a body). Only the second
 * one grows every time a slice adds a screen — A5 adds two, A6 adds the Ledger. Splitting
 * on that seam means the file that grows with the product is not the file that owns the
 * security boundary, and `server.mjs` keeps its whole budget for the plumbing.
 *
 * WHY IT IS A TABLE AND NOT AN `if` CHAIN, WHICH IT WAS FIRST. A5's hostile review found
 * this, and it is the finding worth reading. `AC5.4` — *no actor enables a REFUSED lane or
 * spec mode* — has a transport half: scan the routes and fail if any of them names an
 * enable action. That scan read `MUTATION_ROUTES`, which is an exported list. **Pane routes
 * were an `if (pathname === '...')` chain with no list anywhere**, so `GET /state/enable-spec`
 * would have been invisible to every guard in the tree — `routesThatCouldEnable()` would
 * catch that string if it ever saw it, and nothing would ever show it to it.
 *
 * That is the exact defect class this repo keeps finding: *the claim was true of the set
 * measured and silent about the set excluded.* `controls.mjs` solved the same problem the
 * same way — it made the controls a REGISTRY so `AC4.6` could walk them rather than scrape
 * markup. `PANE_PATHS` is that registry for the routes, and
 * `a5-boards.test.mjs` asserts it covers every path literal in this file **in both
 * directions**, so a new pane cannot be added without appearing in it.
 *
 * NOTHING HERE TOUCHES `res`. A pane route RETURNS `{ title, activePane, body }` and the
 * caller decides the status, the headers and the cookie. That is what makes a pane testable
 * from a literal `state` object without a socket — the same reason `panes.mjs` does no I/O.
 *
 * THE BOARD IS RESOLVED **ONCE** PER REQUEST. `capabilities()` reads twelve files, and the
 * `/state` render needs both a summary and the `AC5.4` sweep. Calling `capabilitySummary()`
 * and `auditEnable()` separately would read the board twice and let the two halves of one
 * pane disagree about what is switched on — a "one board, two consumers" violation inside a
 * single render. So the board is read here, and the pure summarisers take it as data.
 *
 * `null` MEANS "NOT A PANE ROUTE", never "an empty pane". The caller's fall-through is a
 * 404, so conflating the two would turn every unknown path into a blank 200 — the exact
 * failure the copy rule in §2.6 forbids.
 */

import { readTuning, flattenTuning } from '../core/tuning.mjs';
import { previewStaged } from '../core/tuningPreview.mjs';
import { repoRelative, TUNING_PATH, TASTE_PROBE_ORIGIN } from '../core/paths.mjs';
import { capabilities, summarizeBoard, readSpecMode } from '../core/capabilities.mjs';
import { lawBoard } from '../core/lawBoard.mjs';
import { auditEnable } from '../core/authority.mjs';
import { renderCompose, renderThink, renderNotBuilt } from './panes.mjs';
import { renderTune } from './paneTune.mjs';
import { renderLaw } from './paneLaw.mjs';
import { renderState } from './paneState.mjs';
import { slotsForEditor } from './slotView.mjs';

/**
 * Compose and Choose are the same screen at two rail positions.
 *
 * THE TITLE AND THE RAIL ITEM ARE PASSED IN, NOT DECIDED FROM THE PATHNAME. They used to be
 * `pathname === '/' ? 'Compose' : 'Choose'` inside the renderer — which meant a bare pathname
 * comparison survived outside the route table, and `a5-boards.test.mjs` (rightly) refused to
 * let that pass: a path compared anywhere but the table is a route the guards cannot
 * enumerate. Deciding it at the table is also just more honest — the renderer should not have
 * to re-derive which pane it is.
 */
const composeOrChoose = (state, _pathname, pane) => {
  const overrides = state.slotOverrides ?? {};
  return {
    title: pane.title,
    activePane: pane.activePane,
    body: renderCompose({
      brief: state.brief,
      directions: state.directions,
      // The editor needs the EFFECTIVE value AND the baseline it came from, so an
      // edit back to the resolved value removes an override instead of pinning it.
      slots: slotsForEditor(state.brief, overrides),
      overrides,
    }),
  };
};

const renderThinkPane = async (state, pathname) => {
  const id = pathname.slice('/think'.length).replace(/^\//, '') || state.lastCompileId;
  let view = null; let error = null;
  if (id) {
    try { view = (await import('../core/session.mjs')).getCompile(id).view; }
    catch (e) { error = { code: e.code ?? 'E_EXPLAIN', message: e.message }; }
  }
  return { title: 'Think', activePane: 'think', body: renderThink({ view, compileId: id, error }) };
};

const renderTunePane = (state) => {
  // The pane reads the LIVE config on every request (AC4.1) — never a cached copy, so an
  // external edit to tuning.json shows up on the next refresh with no code change.
  let body;
  try {
    const flat = flattenTuning(readTuning());
    const staged = state.staged ?? {};
    body = renderTune({
      current: flat,
      staged,
      note: state.note ?? '',
      lastCommit: state.lastCommit ?? null,
      preview: Object.keys(staged).length ? previewStaged({ staged }) : null,
      path: repoRelative(TUNING_PATH),
    });
  } catch (e) {
    // A corrupt config renders as a NAMED error in the pane, not a 500 (T-M-01).
    body = renderTune({ error: { code: e.code ?? 'E_TUNING', message: e.message } });
  }
  return { title: 'Tune', activePane: 'tune', body };
};

/**
 * THE PANE TABLE. One entry per screen, and the ONLY place a pane path is written.
 *
 * `match: 'prefix'` exists for `/think`, which takes a compile id in the path. It is stated
 * rather than inferred so the route set stays enumerable — an inferred prefix match is a
 * route nobody can list.
 */
export const PANE_ROUTES = Object.freeze([
  { path: '/', match: 'exact', pane: { title: 'Compose', activePane: 'compose' }, render: composeOrChoose },
  { path: '/choose', match: 'exact', pane: { title: 'Choose', activePane: 'choose' }, render: composeOrChoose },
  { path: '/think', match: 'prefix', render: renderThinkPane },
  {
    path: '/law',
    match: 'exact',
    // The law board is resolved here, in the caller — a pane does no I/O. See paneLaw.mjs.
    render: () => ({ title: 'Law', activePane: 'law', body: renderLaw({ board: lawBoard() }) }),
  },
  {
    path: '/state',
    match: 'exact',
    // ONE board read, two consumers inside the pane. See this file's header.
    render: () => {
      const board = capabilities();
      return {
        title: 'State',
        activePane: 'state',
        body: renderState({
          summary: summarizeBoard(board),
          audit: auditEnable(board),
          specMode: readSpecMode(),
          taste: TASTE_PROBE_ORIGIN,
        }),
      };
    },
  },
  { path: '/tune', match: 'exact', render: renderTunePane },
  {
    path: '/ledger',
    match: 'exact',
    render: () => ({ title: 'Ledger', activePane: 'ledger', body: renderNotBuilt('Ledger', 'A6',
      'The rejected-all trend and cost drift arrive with A6.') }),
  },
]);

/**
 * Every pane path, for the guards that have to scan them.
 *
 * Exported because a route a guard cannot enumerate is a route no guard can see — which is
 * how `/state/enable-spec` would have slipped past `AC5.4`'s transport check before A5's
 * hostile review found it. `PANE_ROUTES` is the registry; this is its index.
 */
export const PANE_PATHS = Object.freeze(PANE_ROUTES.map((r) => r.path));

/**
 * Resolve a pane route, or `null` if the pathname is not one.
 *
 * @param {string} pathname  the URL path, already parsed
 * @param {{state: object}} ctx  the server's per-session UI state
 * @returns {Promise<{title: string, activePane: string|null, body: string}|null>}
 */
export async function renderPane(pathname, { state }) {
  const route = PANE_ROUTES.find((r) => (r.match === 'prefix'
    ? pathname.startsWith(r.path)
    : pathname === r.path));
  if (!route) return null;
  return route.render(state, pathname, route.pane);
}
