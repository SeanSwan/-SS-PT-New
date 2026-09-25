/**
 * panelPopulation — what each dynamic panel must CONTAIN, from a source other than the page.
 * @module scripts/swan-brain-console/panelPopulation
 *
 * THE DEFECT (round 12, 2026-09-20 — Astra F14).
 * `console-verify.mjs` asserted that each panel's `innerText` exceeded 20 characters. Every
 * authored panel already carries permanent introductory copy — `#panel-judge` alone holds
 * ~334 characters of it — so the check passed even with the dynamic renderer replaced by a
 * SUCCESSFUL NO-OP. Astra's words: it "measures the whole panel, including permanent
 * introductory text". It was measuring the prose, not the product.
 *
 * THE FIX HAS TWO HALVES, AND BOTH ARE REQUIRED.
 *   1. Measure the CONTAINER the renderer fills (`#fleet-rows > tr`), never the panel — static
 *      copy cannot reach into a container that starts empty in `index.html`.
 *   2. Derive the expected COUNT from an independent source — the `/api/state` snapshot — so a
 *      renderer that quietly does nothing cannot supply its own denominator.
 *
 * (2) is the same shape as round 11's F04 fix for the render gate: a subset run used to certify
 * the full-fleet gate because the denominator came from the thing being measured. Here the
 * denominator comes from the snapshot and the measurement comes from the DOM, so the two can
 * disagree — which is the only reason a check is worth running.
 *
 * WHAT MAKES AN ENTRY WORTH HAVING. The decisive test is `0 vs N`: every container below starts
 * EMPTY in `index.html` and is filled only by its renderer, so any positive expectation catches a
 * renderer that does nothing — which is exactly the no-op Astra asked for. Where the population is
 * also DATA-DRIVEN (rows, rounds, pairs, gate rows) the entry catches an under-delivering renderer
 * as well, and those are preferred. Where it is not — Engine's two authored blocks — the count is
 * fixed and the entry says so, rather than a fixed number being dressed up as a population. A weak
 * assertion wearing a strong one's clothes is worse than an absent one, because it reads as coverage.
 *
 * WHAT IS DELIBERATELY ABSENT. A tab whose `module` is `null` in `tabs.json` (Seats, Memory, Ship)
 * is static by design; demanding rendered content of it would invent a requirement the product does
 * not have. This module's suite derives the expected tab set from the registry, so a new rendered
 * panel forces a new entry here and a new static one does not.
 *
 * PURE. No DOM, no I/O, no clock — so its suite can pin the table against the real readers.
 */

/** Round size the Canvas panel groups variants into (`app.js`). */
export const CANVAS_ROUND_SIZE = 5;

/**
 * How many side-by-side pairs Judge renders for `n` variants.
 *
 * Adjacent pairing, matching `pairsFrom` in `judge-export.mjs`: 20 variants are TEN pairs, not
 * C(20,2). An odd row out is reported as unpaired rather than dropped. This is duplicated from
 * `pairsFrom` deliberately and pinned by this module's suite — the browser gate cannot import
 * the app's ESM graph, so the alternative is a number written down with nothing checking it.
 */
export function pairsFor(n) {
  return Math.floor(Math.max(0, n) / 2);
}

/**
 * One row per container that a RENDERER fills, with the population it must hold.
 *
 * `expect` reads the snapshot — never the page. `selector` must match the container's CHILDREN,
 * because a selector matching the container itself counts 1 forever.
 */
export const PANEL_POPULATION = Object.freeze([
  {
    tab: 'doctrine',
    selector: '#doctrine-rows > tr',
    what: 'doctrine document rows',
    expect: (c) => c.doctrine.files.length,
  },
  {
    tab: 'doctrine',
    selector: '#doctrine-archetypes > *',
    what: 'archetype cards',
    // Three authored cards (Archetypes, Doctrine lines, Spec mode) plus one per relevant
    // archetype — `renderDoctrine` in `app.js`, read rather than assumed.
    expect: (c) => 3 + (c.doctrine.archetypes.relevant ?? []).length,
  },
  {
    tab: 'fleet',
    selector: '#fleet-rows > tr',
    what: 'fleet rows',
    expect: (c) => c.fleet.rows.length,
  },
  {
    tab: 'canvas',
    selector: '#canvas-rounds > .round',
    what: 'canvas rounds',
    expect: (c) => Math.ceil(c.fleet.rows.length / CANVAS_ROUND_SIZE),
  },
  {
    tab: 'copy',
    selector: '#copy-body > *',
    what: 'copy blocks',
    // One cards block, plus one item per variant — or one "could not be read" note when empty.
    expect: (c) => 1 + Math.max(1, (c.copy?.variants ?? []).length),
  },
  {
    tab: 'engine',
    selector: '#engine-body > *',
    what: 'engine blocks',
    /*
     * FIXED, NOT A POPULATION, and labelled as such: `renderEngine` always authors two blocks
     * (the durable-writes gate and the cards row). Its per-fact counts appear as TEXT inside those
     * blocks, so there is no element population to read. The assertion that matters still holds —
     * `#engine-body` is empty in `index.html`, so a no-op renderer gives 0 against an expectation
     * of 2. This entry exists because the suite derives the tab set from the registry and Engine
     * has a renderer; leaving it out is what made that completeness check fire the first time.
     */
    expect: () => 2,
  },
  {
    tab: 'gate-health',
    selector: '#gate-body tbody tr',
    what: 'gate rows',
    // The table's rows, not `#gate-body`'s four authored sections — see the header.
    expect: (c) => c.gates.gates.length,
  },
  {
    tab: 'judge',
    selector: '#panel-judge .judge-pair',
    what: 'judge pairs',
    expect: (c) => pairsFor(c.fleet.rows.length),
  },
]);

/**
 * Compare the snapshot-derived expectation against what the DOM actually holds.
 *
 * `measured` maps each selector to a child count, produced by the browser gate. Returns the
 * list of problems; empty is the only healthy value.
 */
export function comparePopulations(ctx, measured) {
  const problems = [];
  for (const entry of PANEL_POPULATION) {
    const want = entry.expect(ctx);
    const got = measured?.[entry.selector];
    if (typeof got !== 'number') {
      problems.push(`${entry.selector} was never measured`);
      continue;
    }
    if (got < want) {
      problems.push(`${entry.tab}: ${entry.selector} holds ${got} ${entry.what}, expected ${want}`);
    }
  }
  return problems;
}
