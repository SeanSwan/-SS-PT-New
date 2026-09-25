/*
 * Swan Brain Console — registry-driven shell.
 * @module scripts/swan-brain-console/app/app-shell
 *
 * The tab strip used to be a hardcoded 8-item literal in `app.js`; the registry drives
 * it now, so a new panel is one JSON row.
 *
 * DOM-FREE BY CONSTRUCTION. `app-shell.test.mjs` runs under `node:test` with no browser,
 * so the decisions are PURE FUNCTIONS (`planTabStrip`, `planPanels`, `nextTabId`,
 * `seatAction`) and the DOM is touched only in `applyShell`/`initShell`. Nothing at
 * module scope reads `document`, and nothing self-initialises: `index.html`'s CSP is
 * `script-src 'self'`, so the entry point is `app.js`, which calls `initShell()`.
 *
 * XSS DISCIPLINE: every string reaching the DOM goes through `textContent`. Registry
 * values are repo content, and a console that renders repo content as HTML is a
 * stored-XSS surface the moment someone commits a stray tag. No `innerHTML` here.
 */

/* The registries this shell knows how to load — the path selects a KEY, never a path. The list
 * lives in `./registry-kinds.mjs`, shared with `server.mjs` as ONE object (round 12, Astra F19). */
import { REGISTRY_KINDS } from './registry-kinds.mjs';

export { REGISTRY_KINDS };

/*
 * ROUND 9 (2026-09-20): the three registry validators and their two constants MOVED to
 * `./app-registries.mjs`. A round-9 fix pushed this file to 329 lines against Rule 4, and the
 * seam is by SUBJECT: that module answers "is this row well-formed?" and holds no DOM, no I/O
 * and no state; this one keeps the half that touches the document.
 *
 * Re-exported so `app-shell.test.mjs` and `app.js` are unchanged — the seam moved, the surface
 * did not. NOTE FOR ANYONE ADDING AN IMPORT HERE: this file is loaded by the browser, so every
 * relative import needs a key in `ASSET_ROUTES` or the browser gets a 404 and NOTHING dynamic
 * runs — see `registry-route.test.mjs`, which guards exactly that.
 *
 * These are IMPORTED, not merely re-exported: `loadRegistries` and `seatAction` below still call
 * them, and `export { x } from './y'` does not put `x` in local scope. The first version of this
 * split used the bare re-export form and broke seven assertions with "validateTabs is not
 * defined" — which is the suite doing its job.
 */
import { validateTabs, validateSources, validateSeats, SEAT_GATES } from './app-registries.mjs';

export { validateTabs, validateSources, validateSeats };

/* ── Pure planning ────────────────────────────────────────────────────────────
 * These produce DATA, not DOM — which is what makes "a new panel needs no shell edit"
 * testable without a browser: add a row to the input, assert a row in the output.
 */

/** The tab strip, with ARIA state resolved. `activeId` falls back to the first tab. */
export function planTabStrip(tabs, activeId) {
  const ids = tabs.map((t) => t.id);
  const active = ids.includes(activeId) ? activeId : (ids[0] ?? null);
  return tabs.map((t, index) => ({
    id: t.id,
    label: t.label,
    tabId: `tab-${t.id}`,
    controls: `panel-${t.id}`,
    index,
    selected: t.id === active,
    tabIndex: t.id === active ? 0 : -1,
  }));
}

/**
 * Panel visibility, plus two honest reports. `needsPanel` marks a registry row with no
 * authored panel — the shell CREATES one rather than dropping the row. `orphans` is the
 * reverse: an authored panel with no registry row, a defect that is reported, not hidden.
 *
 * `module` is carried so `applyShell` can tell a row NOTHING renders from a row a module
 * fills a moment later. See the note in `applyShell` (round 9).
 */
export function planPanels(tabs, existingPanelIds) {
  const have = new Set(existingPanelIds);
  const panels = tabs.map((t) => ({
    id: t.id,
    label: t.label,
    module: t.module ?? null,
    panelId: `panel-${t.id}`,
    hidden: true,
    needsPanel: !have.has(`panel-${t.id}`),
  }));
  const orphans = [...have]
    .filter((p) => !tabs.some((t) => `panel-${t.id}` === p))
    .sort();
  return { panels, orphans };
}

/** Arrow-key navigation. Pure, wraps, and returns null only for an empty registry. */
export function nextTabId(tabs, currentId, delta) {
  if (!tabs.length) return null;
  const found = tabs.findIndex((t) => t.id === currentId);
  const from = found === -1 ? 0 : found;
  return tabs[(from + delta + tabs.length) % tabs.length].id;
}

/**
 * What a seat row may offer. ALWAYS a stop-card — never a Run button.
 *
 * The console is GET-only with no execute route, so a Run button could not work even if
 * drawn. `gate` therefore chooses WHICH stop-card, not whether to run.
 */
export function seatAction(seat) {
  const gate = seat?.gate;
  const reasons = {
    relay: 'requires a relay step outside this console — an agent runs it and returns a receipt',
    manual: 'requires a human command; the console cannot start it',
    direct: 'runnable in principle, but this console is GET-only and has no execute route',
  };
  return {
    seat: seat?.seat ?? null,
    kind: 'stop-card',
    gate: SEAT_GATES.includes(gate) ? gate : 'unrecognised',
    headline: 'Stop — do not run from here',
    reason: reasons[gate] ?? `unrecognised gate ${JSON.stringify(gate)}; treating as not runnable`,
    command: seat?.script ? `node ${seat.script}` : null,
  };
}

/* ── Loading ────────────────────────────────────────────────────────────────── */

/**
 * Fetch all three registries. Never throws: a failure is a report.
 *
 * Fetched at page load, not baked into a bundle — which is what makes D4 true on the
 * client too: edit a row, reload, no rebuild and no restart.
 */
export async function loadRegistries(fetchImpl) {
  const doFetch = fetchImpl ?? globalThis.fetch;
  if (typeof doFetch !== 'function') {
    return { ok: false, errors: ['no fetch implementation available'], tabs: [], sources: [], seats: [] };
  }
  const out = { ok: true, errors: [], tabs: [], sources: [], seats: [] };
  const validators = { tabs: validateTabs, sources: validateSources, seats: validateSeats };
  for (const kind of REGISTRY_KINDS) {
    try {
      const res = await doFetch(`/registry/${kind}.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const parsed = validators[kind](await res.json());
      if (!parsed.ok) {
        out.ok = false;
        out.errors.push(...parsed.errors.map((e) => `${kind}: ${e}`));
      }
      out[kind] = parsed.rows;
    } catch (err) {
      out.ok = false;
      out.errors.push(`${kind}: could not load (${err.message})`);
    }
  }
  return out;
}

/* ── DOM application — the only browser-dependent part; `doc` is injected ───── */

/** Show one panel and hide the rest, keeping ARIA in step. */
export function selectTab(doc, tabs, id) {
  for (const t of tabs) {
    const tab = doc.getElementById(`tab-${t.id}`);
    const panel = doc.getElementById(`panel-${t.id}`);
    const on = t.id === id;
    if (tab) {
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
    }
    if (panel) panel.hidden = !on;
  }
}

/**
 * Build the strip from the registry, and CREATE any panel the document lacks.
 *
 * THE PANEL CREATION IS NOT OPTIONAL. An earlier version built only the tabs, so a new row
 * produced a tab whose `aria-controls` pointed at nothing: the row was visible, the panel
 * was not, and D2 held in the PLAN while being false in the DOM — the reachability defect
 * class this workstream is about.
 */
export function applyShell(doc, tabs) {
  const nav = doc.getElementById('tabs');
  if (!nav) return { applied: false, reason: 'no #tabs element in the document' };
  const plan = planTabStrip(tabs, tabs[0]?.id ?? null);

  nav.replaceChildren();
  for (const p of plan) {
    const b = doc.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.id = p.tabId;
    b.setAttribute('aria-controls', p.controls);
    b.setAttribute('aria-selected', p.selected ? 'true' : 'false');
    b.tabIndex = p.tabIndex;
    b.textContent = p.label; // never innerHTML
    b.addEventListener('click', () => selectTab(doc, tabs, p.id));
    b.addEventListener('keydown', (e) => {
      const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!delta) return;
      e.preventDefault();
      const next = nextTabId(tabs, p.id, delta);
      selectTab(doc, tabs, next);
      doc.getElementById(`tab-${next}`)?.focus();
    });
    nav.append(b);
  }

  /*
   * ORPHAN DETECTION READS THE DOCUMENT, NOT THE REGISTRY (round 11, finding F09).
   *
   * This list used to be built FROM `tabs` — `tabs.map((t) => 'panel-' + t.id).filter(exists)`
   * — so every entry was by construction a panel the registry already knew about. `planPanels`
   * then computed `orphans` as "authored panels the registry does not name", which could only
   * ever be the empty set: dead code that read as a live guard. Astra demonstrated it with the
   * real applier — Doctrine visible, a registry containing only Fleet, `orphans: []`, and both
   * panels still on screen.
   *
   * An authored panel is one that exists in the document BEFORE this function runs. Panels are
   * direct children of `#main` (`index.html`), so that is where they are enumerated.
   */
  const main = doc.getElementById('main');
  const authored = main
    ? [...main.children].map((child) => child.id).filter((id) => id.startsWith('panel-'))
    : [];
  const { panels, orphans } = planPanels(tabs, authored);
  const createdPanels = [];
  for (const p of panels) {
    if (!p.needsPanel || !main) continue;
    const section = doc.createElement('section');
    section.className = 'panel';
    section.id = p.panelId;
    section.setAttribute('role', 'tabpanel');
    section.setAttribute('aria-labelledby', `tab-${p.id}`);
    section.tabIndex = 0;
    section.hidden = true;
    const h2 = doc.createElement('h2');
    h2.textContent = p.label;
    section.append(h2);
    /*
     * ROUND 9 (2026-09-20) — ONLY A ROW WITH NO MODULE GETS THIS NOTE.
     *
     * The note used to be unconditional, so `#panel-gate-health` opened with "no authored
     * content yet" rendered directly ABOVE the real gate report — a false statement on the
     * console's honesty panel, live on every load. `#panel-judge` escaped only because
     * `app-judge.js` happened to delete the note; that module had found the same lie and
     * patched it locally, and the patch did not generalise.
     *
     * Fixed here rather than in each module: a row WITH a module has authored content by
     * definition, so the shell must not claim otherwise. Full account in the round-9
     * hostile review (Z:\HostileReviews, 2026-09-20).
     */
    if (!p.module) {
      const note = doc.createElement('p');
      note.className = 'planned';
      note.textContent = 'This panel is registered in tabs.json but has no authored content yet. '
        + 'The tab is reachable on purpose: a registry row that renders nothing is a defect '
        + 'you can see, while a row that is silently skipped is one you cannot.';
      section.append(note);
    }
    main.append(section);
    createdPanels.push(p.panelId);
  }

  // Normalise visibility. The authored markup hides every panel but the first, and the
  // panels just created are hidden, so one call here makes the DOM match the plan.
  if (plan.length) selectTab(doc, tabs, plan.find((p) => p.selected)?.id ?? plan[0].id);

  /*
   * AN ORPHAN IS HIDDEN AS WELL AS REPORTED (round 11, finding F09). Reporting alone names a
   * panel that is still on screen beside the selected one, and `selectTab` cannot reach it —
   * that function walks the registry, and an orphan is precisely the panel the registry does
   * not have. Hiding is the other half of "report, do not drop": the operator is told the row
   * is gone AND the surface stops showing it.
   */
  for (const orphanId of orphans) {
    const orphan = doc.getElementById(orphanId);
    if (orphan) orphan.hidden = true;
  }

  return { applied: true, count: plan.length, createdPanels, orphans };
}

/**
 * Boot the shell. Called by `app.js`, never at import time.
 *
 * A registry failure is RETURNED rather than thrown: the rest of the console still works, and
 * the caller is told which row broke.
 *
 * THE SHELL NO LONGER WRITES THE BANNER (round 11, finding F08). It used to, and `app.js` then
 * overwrote it: `renderStatus` assigned the same element's `textContent` a moment later, so
 * "Shell registry problem: tabs: could not load (HTTP 500)" was replaced by the ordinary
 * learning-engine message. The operator saw tabs vanish with no explanation on screen at all.
 *
 * The errors were never lost — they are in the return value below — so the fix is to stop
 * presenting from two writers. `app.js` owns the banner; `planBanner` in `app-banner.mjs`
 * decides what it says. A shell that writes the banner and a renderer that writes the banner
 * cannot both be right, and the one that ran second was the one that was wrong.
 */
export async function initShell() {
  const loaded = await loadRegistries();
  const result = applyShell(document, loaded.tabs);
  return { ...loaded, applied: result.applied, tabCount: result.count ?? 0 };
}
