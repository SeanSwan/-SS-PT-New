/**
 * assetRoutes — the console's asset allowlist.
 * @module scripts/swan-brain-console/assetRoutes
 *
 * WHY THIS IS ITS OWN MODULE
 * The request path selects a KEY in this table; it is never concatenated into a file path.
 * That property is what makes path traversal structurally impossible here rather than
 * filtered, so this table is security-relevant DATA — and data this load-bearing deserves
 * to be readable in one screen without the server's behaviour around it.
 *
 * It was extracted from `server.mjs` in S4, when adding the Gate Health route pushed that
 * file to 308 lines against a 300-line budget. The split is by subject rather than by size:
 * `server.mjs` keeps routing, request validation and the registry reader; this file is only
 * the allowlist.
 *
 * EVERY KEY IS SPELLED OUT. Nothing here is derived from a request, and adding an entry is
 * a deliberate edit. The two mistakes this table has already produced are both recorded
 * below, because each cost a debugging session:
 *
 *   - A registry-driven TAB whose module has no route renders a panel that cannot load its
 *     script — the row appears and the content does not.
 *   - Worse, a 404 on an IMPORTED module takes the whole shell down, not just that panel.
 *     S2's `judge-export.mjs` did exactly this: `app-judge.js` failed, which failed `app.js`,
 *     so NOTHING dynamic ran, and `index.html`'s static fallback rendered a plausible page.
 *     `app/registry-route.test.mjs` now compares the browser's module graph against this
 *     table so a missing key fails a test instead of silently degrading the console.
 */

/** Asset allowlist. The request path selects a KEY, never a file path. */
export const ASSET_ROUTES = {
  '/': { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/app.css': { file: 'app.css', type: 'text/css; charset=utf-8' },
  /*
   * ROUND 12 (2026-09-20), Astra F20. `app.css` reached 409 lines against Rule 4, so the
   * per-panel treatments split into their own stylesheet. It needs a key for the same reason
   * every stylesheet does: a `<link>` with no route is a silent 404, and the panel styles simply
   * do not apply — a degradation with no error anywhere. `asset-routes.test.mjs` now guards that
   * every stylesheet the document links has a key here.
   */
  '/app-panels.css': { file: 'app-panels.css', type: 'text/css; charset=utf-8' },
  '/app.js': { file: 'app.js', type: 'text/javascript; charset=utf-8' },
  '/onboard.css': { file: 'onboard.css', type: 'text/css; charset=utf-8' },
  '/onboard.js': { file: 'onboard.js', type: 'text/javascript; charset=utf-8' },
  /*
   * Ruled D16 said this map stays "fixed and untouched". It gains exactly ONE key.
   * The ruling's intent was that the map must not become a file-path router, and that
   * property is intact: this is still a literal key → asset pair with no concatenation,
   * and the new key is spelled out rather than derived from the request. The key is
   * required because S3's deliverable is a registry-driven shell in its own module —
   * without a route for it, the shell cannot load and the slice ships unreachable,
   * which is the very defect class D16 belongs to.
   */
  '/app-shell.js': { file: 'app-shell.js', type: 'text/javascript; charset=utf-8' },
  /*
   * ROUND 9 (2026-09-20): the registry validators moved out of `app-shell.js` into their own
   * module (Rule 4, split by subject — "is this row well-formed?" vs "what does the shell do
   * with it?"). Because `app-shell.js` now IMPORTS it, this key is not optional: without it
   * the browser gets a 404, `app-shell.js` fails to load, that propagates to `app.js`, and
   * nothing dynamic runs at all — the exact S2 `judge-export.mjs` incident described above,
   * which `registry-route.test.mjs` now guards.
   */
  '/app-registries.mjs': { file: 'app-registries.mjs', type: 'text/javascript; charset=utf-8' },
  /*
   * Judge Mode (S2). Two more fixed keys, same property as above: literal key → asset,
   * no concatenation, nothing derived from the request. Ruled D15 moved Judge Mode after
   * S3 so the TAB arrives as a registry row rather than an `index.html` edit — but the
   * panel's own assets still need routes, or the row renders a panel that cannot load
   * its script or its stylesheet.
   */
  '/app-judge.js': { file: 'app-judge.js', type: 'text/javascript; charset=utf-8' },
  '/judge-export.mjs': { file: 'judge-export.mjs', type: 'text/javascript; charset=utf-8' },
  '/judge.css': { file: 'judge.css', type: 'text/css; charset=utf-8' },
  /*
   * Gate Health (S4.1). One more fixed key, same property as every other entry: literal
   * key → asset, no concatenation, nothing derived from the request. The `tabs.json` row
   * creates the tab and the shell creates the panel, but without this route the panel's
   * module 404s — and a 404 on an imported module takes the WHOLE shell down, which is
   * exactly what happened in S2 with `judge-export.mjs`.
   */
  '/app-gates.mjs': { file: 'app-gates.mjs', type: 'text/javascript; charset=utf-8' },
  /*
   * ROUND 11 (2026-09-20). `app-banner.mjs` is imported by `app.js` — the page's ENTRY POINT —
   * so this key is the most load-bearing in the table: without it `app.js` 404s, nothing dynamic
   * runs at all, and `index.html`'s static fallback renders a page that looks plausible. That is
   * the S2 `judge-export.mjs` incident verbatim, and it is why the missing key is a test failure
   * rather than a silent degradation.
   */
  '/app-banner.mjs': { file: 'app-banner.mjs', type: 'text/javascript; charset=utf-8' },
  /*
   * ROUND 11 (2026-09-20). `app-judge-render.mjs` was split out of `app-judge.js` so the
   * `acquireStorage` boundary could sit in the DOM layer instead of the pure one. Because
   * `app-judge.js` IMPORTS it, this key is mandatory: a 404 here fails `app-judge.js`, which
   * fails `app.js`, and NOTHING dynamic runs — the S2 `judge-export.mjs` incident again.
   */
  '/app-judge-render.mjs': { file: 'app-judge-render.mjs', type: 'text/javascript; charset=utf-8' },
  /*
   * ROUND 12 (2026-09-20). `registry-kinds.mjs` is the ONE definition of the three registry
   * names, imported by `app-shell.js` (browser) and by `server.mjs` (Node). It needs a route
   * for the same reason every other import here does — `app-shell.js` failing to load
   * propagates to `app.js` and nothing dynamic runs — and this key is also what makes the
   * shared constant genuinely SHARED rather than merely identical.
   */
  '/registry-kinds.mjs': { file: 'registry-kinds.mjs', type: 'text/javascript; charset=utf-8' },
};
