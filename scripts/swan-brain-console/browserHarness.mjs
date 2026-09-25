/**
 * browserHarness — the isolation harness and the responsive matrix, for browser checks.
 * @module scripts/swan-brain-console/browserHarness
 *
 * WHY THIS IS SEPARATE FROM `console-verify.mjs`
 * Two subjects: the checks are about the console, this is about running checks without one
 * of them taking the run down. Adding round 7's per-tab responsive guard pushed
 * `console-verify.mjs` past Rule 4's 300 lines, and the seam was already here — nothing in
 * this file knows what a console is.
 *
 * THE ISOLATION IS LOAD-BEARING, AND THIS IS WHERE IT LIVES
 * `console-verify.mjs` originally called `page.locator(...).innerText()` inline. When the
 * console's shell died (a 404 on one imported module), the fleet summary never rendered,
 * the locator threw a 30s TimeoutError, and the uncaught throw ABORTED the run — at check 6
 * of 18. Every later check, including the one written specifically to catch a dead shell,
 * never executed at all.
 *
 * A guard that cannot reach its own assertion is the same defect class as the reachability
 * defects this workstream exists to find. So every check runs inside `step`, which converts
 * a throw into a named FAIL and lets the run continue: the result is a full report of every
 * broken thing, not the first one.
 *
 * BOUNDS: no I/O of its own. `page` is a Playwright page supplied by the caller.
 */

/**
 * The widths the console must hold at.
 *
 * Not arbitrary: 320 is the narrowest phone still in use, 2560 is a QHD desktop, and the
 * four between them are the common device classes. Every one of them must be clean on EVERY
 * tab — see `measureOverflowPerTab`.
 */
export const VIEWPORTS = Object.freeze([
  { w: 320, h: 720, label: 'phone-320' },
  { w: 375, h: 812, label: 'phone-375' },
  { w: 414, h: 896, label: 'phone-414' },
  { w: 768, h: 1024, label: 'tablet-768' },
  { w: 1280, h: 800, label: 'laptop-1280' },
  { w: 2560, h: 1440, label: 'qhd-2560' },
]);

/**
 * A results recorder with an isolating `step`.
 *
 * Returns `{ results, pass, fail, step }`. `results` is the array `verifyReport.mjs` tallies;
 * `step` is the only thing callers should need.
 */
export function createRecorder() {
  const results = [];
  const pass = (name, detail = '') => results.push({ ok: true, name, detail });
  const fail = (name, detail = '') => results.push({ ok: false, name, detail });

  const step = async (name, fn) => {
    try {
      pass(name, (await fn()) ?? '');
    } catch (err) {
      /*
       * `||`, not `??`. A check that throws `new Error('')` — which is what
       * `throw new Error(someEmptyString)` produces — has a message of `''`, which is NOT
       * nullish, so `?? err` keeps it and the report prints a bare em-dash. A failure with
       * a blank reason is only marginally better than no check at all, so fall back to the
       * error's own name and then to a literal.
       */
      const reason = String(err?.message ?? '').split('\n')[0].trim()
        || String(err?.name ?? '').trim()
        || 'failed with no message';
      fail(name, reason.slice(0, 160));
    }
  };

  return { results, pass, fail, step };
}

/**
 * Measure horizontal overflow on EVERY tab, at the viewport already set on `page`.
 *
 * Returns the offenders as `{ id, px }`, worst first — an empty array is the healthy value.
 *
 * WHY EVERY TAB, AND WHY THIS IS ITS OWN FUNCTION (round 7, 2026-09-20)
 * The loop this replaced changed the viewport and nothing else. The step before it leaves
 * one tab active, so all six measurements were taken on ONE panel out of ten — and the
 * console reported 6/6 responsive checks green while its Gate Health panel pushed the
 * document 63px wide at 320px and 8px at 375px. `app.css` sets `html { overflow-x: hidden }`,
 * so that overflow was CLIPPED rather than scrollable: the panel's right-hand columns were
 * unreachable on a phone. A console with ten tabs is ten layouts, and the claim being
 * checked is about the layout.
 *
 * The `click()` is what makes the measurement meaningful: a hidden panel is not laid out, so
 * measuring without revealing the tab would report zero overflow for every one of them.
 */
export async function measureOverflowPerTab(page, tabs, settleMs = 120) {
  const over = [];
  for (const id of tabs) {
    await page.locator(`#tab-${id}`).click();
    await page.waitForTimeout(settleMs);
    const px = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    if (px > 2) over.push({ id, px });
  }
  return over.sort((a, b) => b.px - a.px);
}

/**
 * The responsive matrix: one `step` per width, each measuring EVERY tab.
 *
 * It lives here rather than in `console-verify.mjs` because it is plumbing over the two
 * exports above, and because the caller's version of it was long enough to push that file
 * past Rule 4. The two things it must not lose are the vacuity guard (an empty `tabs` would
 * measure nothing and report success) and the fact that the viewport is set BEFORE the tabs
 * are walked — a hidden panel is not laid out, so the order matters.
 */
export async function checkResponsiveAcrossTabs({ page, step, tabs, viewports = VIEWPORTS }) {
  for (const vp of viewports) {
    await step(`responsive ${vp.label}: no h-overflow on any tab`, async () => {
      if (tabs.length === 0) throw new Error('no tabs to measure — this check would be vacuous');
      await page.setViewportSize({ width: vp.w, height: vp.h });
      const over = await measureOverflowPerTab(page, tabs);
      if (over.length) throw new Error(over.map((o) => `${o.id} ${o.px}px`).join(', '));
      return `${tabs.length} tabs clean`;
    });
  }
}
