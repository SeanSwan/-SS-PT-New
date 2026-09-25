/*
 * Swan Brain Console — Judge Mode.
 * @module scripts/swan-brain-console/app/app-judge
 *
 * WHAT THIS IS
 * The tournament's judging surface: twenty variants presented as ten side-by-side pairs,
 * judged from the keyboard, with the result exported as promotion evidence. It exists
 * because a shortlist argued about from memory is not a shortlist — the export is the
 * artifact a reviewer reads.
 *
 * WHAT IS DELIBERATELY NOT HERE
 * No promotion. The export says so in its own text, and there is no button anywhere in
 * this file that changes a route, a registry or a file. Promotion is a reviewed commit
 * (see the Ship tab). A console that could promote would bypass every design,
 * accessibility and hostile-review gate that rule exists to enforce.
 *
 * THREE MODULES, THREE SUBJECTS (round 11, 2026-09-20)
 *   `judge-export.mjs`      what a verdict MEANS — pure, pinned by `judge-export.test.mjs`
 *   `app-judge-render.mjs`  what it LOOKS like — the DOM-building half
 *   this file               how it is WIRED — storage, stylesheet, keyboard, boot
 *
 * The rendering half moved out in round 11, and the reason is recorded rather than assumed:
 * closing F10 needed an `acquireStorage` boundary, which reads an ambient browser global and
 * therefore must NOT sit in the pure module that `judge-export.test.mjs` polices. It belongs
 * here, and here was already at 302 lines against Rule 4's 300.
 */
import {
  pairsFrom, verdictForKey, applyVerdict, clearVerdict, emptyState,
  loadStoredState, saveState, VERDICT_KINDS,
} from './judge-export.mjs';
import { renderJudge, node, ACTIVE_ATTR } from './app-judge-render.mjs';

/*
 * Re-exported so this module's public surface is unchanged by the round-11 split: `ACTIVE_ATTR`
 * is the attribute the keyboard contract is written in, and `renderJudge` was exported here
 * before the rendering half moved.
 */
export { ACTIVE_ATTR, renderJudge };

/**
 * Acquire the browser's local storage, or `null` when the browser refuses to hand one over.
 *
 * ROUND 11 (2026-09-20), finding F10. `loadStoredState` and `saveState` each guard their own
 * work with try/catch — but the PROPERTY ACCESS was at the call site, `globalThis.localStorage`
 * evaluated as an argument, outside both guards. `localStorage` is a getter and is documented to
 * THROW (a SecurityError) rather than return null in a partitioned or cookie-blocked context, so
 * a restricted browser took the whole Judge panel down. Because `initGates` runs after
 * `initJudge` in the same outer try, Gate Health never rendered either — and the banner blamed
 * the snapshot read, which had not failed.
 *
 * The access lives here, inside the try, so the failure has one place to be absorbed. It is
 * deliberately NOT in `judge-export.mjs`: that module is pure, `judge-export.test.mjs` enforces
 * it, and a function that reads an ambient browser global belongs on this side of the line.
 */
export function acquireStorage(scope = globalThis) {
  try {
    return scope.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Wire keyboard judging. Returns the current state and the pairs.
 *
 * The key is read on the PAIR, not globally: the handler is attached to the container
 * and resolves the pair from the event target's nearest ancestor carrying the pair
 * attribute, so arrow-key tab navigation is unaffected.
 *
 * `onChange` receives the pair INDEX as well as the state (round 11, finding F11), because
 * focus has to follow the judgement: with focus reset to pair one, the next keypress resolved
 * to index zero and overwrote it. The index travels with the state so the redraw cannot forget
 * which pair the operator was on.
 */
export function wireJudgeKeys(container, rows, initial, onChange) {
  const { pairs } = pairsFrom(rows);
  let state = initial;
  let active = 0;

  const setState = (next, index) => {
    state = next;
    onChange(state, index);
  };

  container.addEventListener('keydown', (e) => {
    const pairEl = e.target?.closest?.(`[${ACTIVE_ATTR}]`);
    const index = pairEl ? Number(pairEl.getAttribute(ACTIVE_ATTR)) : active;
    if (!Number.isInteger(index)) return;
    active = index;

    if (e.key === '0' || e.key === 'Backspace') {
      e.preventDefault();
      setState(clearVerdict(state, index), index);
      return;
    }
    const kind = verdictForKey(e.key);
    if (!kind || !VERDICT_KINDS.includes(kind)) return;
    e.preventDefault();
    setState(applyVerdict(state, index, kind, new Date().toISOString()), index);
  });

  return { getState: () => state, pairs };
}

/**
 * Load this panel's stylesheet, once.
 *
 * WHY THE LINK IS INJECTED RATHER THAN DECLARED IN `index.html`. Ruled D15 scopes S2 to
 * arrive as ONE registry row with no `index.html` edit, and the page's CSP
 * (`style-src 'self'`) permits a same-origin stylesheet, so injecting is allowed. A
 * `<link>` in the document would be tidier, but it is precisely the shell edit D15
 * removed. Keeping the style with the module that needs it also keeps the registry row
 * self-contained: the row plus this file is the whole feature.
 *
 * Returns whether a link was added, so a caller can tell "already loaded" from "loaded".
 */
export function ensureStylesheet(doc = document, href = '/judge.css') {
  if (doc.querySelector(`link[href="${href}"]`)) return false;
  const link = doc.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  doc.head.append(link);
  return true;
}

/**
 * Boot Judge Mode into the panel the shell created.
 *
 * `panel` is `#panel-judge`. If it is absent, this returns a reason rather than
 * throwing: the shell may have failed to build it, and a judge panel that takes the
 * whole console down with it would be a worse failure than a missing feature.
 */
export function initJudge(rows, panel = document.getElementById('panel-judge')) {
  if (!panel) return { ok: false, reason: 'panel-judge not found' };
  if (!Array.isArray(rows) || rows.length < 2) {
    return { ok: false, reason: 'fewer than two variants to pair' };
  }
  ensureStylesheet();

  /*
   * ROUND 9 (2026-09-20) — this removal is now DEFENCE IN DEPTH, not the fix.
   *
   * The shell used to create every missing panel with a placeholder note saying it had no
   * authored content. Now that real content exists, that note is a LIE sitting directly above
   * the feature — the panel would open by telling the operator there is nothing here, and then
   * show ten pairs. This module found that and deleted the note.
   *
   * But the patch did not generalise: `app-gates.mjs` was written later, renders into a panel
   * the shell also creates, and does NOT delete the note — so `#panel-gate-health` opened with
   * "no authored content yet" directly above a full gate report, live on every load. The root
   * cause was the shell telling a lie, not each module forgetting to erase it, and it is fixed
   * there: `applyShell` only emits the note for a row with no `module`. This removal stays as
   * belt-and-braces in case a future edit reinstates it.
   */
  for (const stale of panel.querySelectorAll('p.planned')) stale.remove();

  const { pairs } = pairsFrom(rows);
  const storage = acquireStorage();
  const restored = loadStoredState(storage, pairs);
  const state = restored ?? emptyState(pairs);

  const host = node('div', 'judge-host');
  panel.append(host);

  /*
   * ROUND 12 (2026-09-21) — PERSISTENCE IS REPORTED, NOT ASSUMED (Astra G13).
   *
   * `redraw` called `saveState(...)` and discarded the result, and `saveState` itself
   * returned `true` when there was no storage at all. So a session that could not be
   * persisted looked exactly like one that was: the panel drew every verdict, and they were
   * gone on reload with nothing said. Astra executed the null-storage case and got a success
   * receipt.
   *
   * The verdicts are still held in memory and still exportable — that is the honest fallback,
   * not a failure. What was missing is that the operator is told WHICH of the two they have,
   * because the difference only becomes visible at the moment the tab closes.
   */
  let persisted = true;
  const notice = node('p', 'judge-persistence');
  const reportPersistence = (ok) => {
    if (ok === persisted && (ok || notice.isConnected)) return;
    persisted = ok;
    if (ok) { notice.remove(); return; }
    notice.textContent = 'This session is NOT being saved — browser storage is unavailable '
      + 'or refused. Your judgments are held in this page only and will be lost on reload. '
      + 'Export them before you close the tab.';
    panel.prepend(notice);
  };

  const redraw = (next, activeIndex = 0) => {
    reportPersistence(saveState(storage, next));
    renderJudge(host, rows, next, document, activeIndex);
  };
  redraw(state, 0);

  const keys = wireJudgeKeys(host, rows, state, redraw);
  return { ok: true, pairs: keys.pairs, state, persisted };
}
