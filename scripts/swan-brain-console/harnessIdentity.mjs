/**
 * harnessIdentity — ONE marker and ONE predicate for "is this the QA harness?".
 * @module scripts/swan-brain-console/harnessIdentity
 *
 * WHY THIS IS A SHARED MODULE AND NOT A CONSTANT IN EACH SCRIPT
 *
 * The QA harness is measured by more than one script, and each one that guesses at its
 * identity is a place the guess can be wrong. `shot-diff.mjs` learned this the hard way and
 * says so in its own header: in S4, :5199 was owned by a DIFFERENT worktree's dev server, so
 * the run found zero `[data-world]` nodes and reported a confusing selector timeout instead of
 * "you are pointing at the wrong application". It then hard-stopped on `HARNESS_TITLE`.
 *
 * `gallery-verify.mjs` — larger, and navigating the same harness three times — never got that
 * check. Measured 2026-09-19: `grep -n "HARNESS_TITLE|title|identity|marker" gallery-verify.mjs`
 * returned **no matches**. So the marker now lives here, once, and both scripts read it from
 * the same place; a second copy would be a second thing to drift.
 *
 * WHY THE PREDICATE IS SEPARATE FROM THE NAVIGATION
 *
 * A gate that is tangled into the measuring loop can only be tested by running the measuring
 * loop. `checkHarnessIdentity` takes a page-like object and returns a verdict, so it can be
 * exercised directly — against a fake page for the verdict, and against a real browser for the
 * end-to-end behaviour.
 *
 * WHY AN EMPTY MARKER IS A HARD ERROR
 *
 * `document.includes('')` is true for every document. A gate built on an empty marker would
 * PASS against any application, which is worse than no gate, because it would be trusted.
 * Refusing to run is the only safe outcome — the same rule `readFrontendIdentityMarker` applies
 * when it cannot find a `<title>`.
 */

/** The QA harness's own `<title>`. The single source of truth for harness identity. */
export const HARNESS_TITLE = '<title>Three.js fleet QA harness</title>';

/** The refusal text, so every caller names the wrong target the same way. */
export function harnessRefusalMessage(url, title) {
  return `${url} is not the Three.js fleet QA harness (title ${JSON.stringify(title)}). `
    + 'Refusing to measure or record baselines against the wrong application.';
}

/**
 * Decide whether `url` is the QA harness.
 *
 * Never throws on a bad target — a wrong or unreachable target is a VERDICT, not an exception,
 * because the caller needs to print which target it refused. It does throw on an empty marker,
 * which is a programming error rather than a verdict.
 *
 * `waitUntil: 'domcontentloaded'` is deliberate: the gate only needs the document, and the
 * measuring navigations keep their own `networkidle`. A gate that waits for the network would
 * slow every run down to catch nothing extra.
 *
 * @param {{goto: Function, title: Function, content: Function}} page page-like object
 * @param {string} url the target under test
 * @param {{marker?: string, timeoutMs?: number}} [options]
 * @returns {Promise<{ok: boolean, title: string, message?: string}>}
 */
export async function checkHarnessIdentity(page, url, { marker = HARNESS_TITLE, timeoutMs = 30_000 } = {}) {
  if (typeof marker !== 'string' || marker.length === 0) {
    throw new Error('checkHarnessIdentity requires a non-empty marker; an empty marker matches every document');
  }

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    const title = await page.title();
    const html = await page.content();
    if (!html.includes(marker)) {
      return { ok: false, title, message: harnessRefusalMessage(url, title) };
    }
    return { ok: true, title };
  } catch (err) {
    const detail = `<unreachable: ${String(err?.message ?? err).split('\n')[0].slice(0, 120)}>`;
    return { ok: false, title: detail, message: harnessRefusalMessage(url, detail) };
  }
}
