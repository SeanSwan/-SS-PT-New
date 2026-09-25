/**
 * asset-routes-contract — the ASSET route table against the module graph the browser loads.
 * @module scripts/swan-brain-console/app/asset-routes.test
 *
 * WHY THIS IS SPLIT FROM `registry-route.test.mjs`
 * Both files test what the server will serve, but they test different TABLES, and round 10
 * pushed the pair past Rule 4's budget. `registry-route.test.mjs` is about `REGISTRY_NAMES`
 * and the `/registry/:name.json` route; this file is about `ASSET_ROUTES` and the module
 * graph. Two tables, two subjects, two suites.
 *
 * THE GUARD THAT WOULD HAVE CAUGHT THE 404, AND DID NOT.
 *
 * `app-judge.js` imports `./judge-export.mjs`. The asset map had no key for it, so the
 * browser got a 404, `app-judge.js` failed to load, that failure propagated up to `app.js`,
 * and NOTHING dynamic ever ran — no registry tabs, no created panels, no fleet rows. The
 * static no-JS fallback in `index.html` then rendered a plausible page, and
 * `console-verify.mjs` PASSED because its tab assertion hardcoded the same ids the fallback
 * happened to contain. A green suite certified a completely broken shell.
 *
 * The guard written for that checked a HARDCODED LIST of three modules and their direct
 * imports — `['app.js', 'app-shell.js', 'app-judge.js']` — while its own header claimed it
 * checked "the module GRAPH". Round 10 mutation-proved the gap: one relative import with no
 * route, added to `app-registries.mjs` (which sits inside the app.js chain), and this suite
 * reported 10/10 PASS while the browser showed `#gate-body` with zero children and a 404 on
 * the module. Four modules the browser loads were never scanned, and `onboard.js` — a real
 * root, loaded by `index.html` in its own `<script type="module">` — was one of them.
 *
 * The roots are now READ FROM `index.html` and the closure is walked from them, so the set
 * under test is the set the browser loads rather than a list someone has to remember.
 *
 * Run: node --test scripts/swan-brain-console/app/asset-routes.test.mjs
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, join, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONSOLE = resolve(HERE, '..');
const APP = HERE;

const serverMod = await import(pathToFileURL(join(CONSOLE, 'server.mjs')).href);

describe('every module the browser loads is routable', () => {
  /*
   * ROUND 11 (2026-09-20) — THESE TWO REGEXES UNDER-COVERED, AND THE HEADER ABOVE CLAIMED THEY
   * DID NOT. The previous pattern required `from '<spec>'`, so it could not see a SIDE-EFFECT
   * import (`import './x.mjs';` — no `from` at all) and could not see a DOUBLE-QUOTED specifier.
   * Astra proved it by injecting `import './missing-guard-probe.mjs';` into `app-registries.mjs`
   * in memory: the real suite returned 3/3 PASS while the browser would 404. The nested-specifier
   * case was wrong in the other direction — a specifier was resolved against the app ROOT rather
   * than its importer, so a module under a subdirectory would have been checked at the wrong path.
   *
   * That is the same defect this file was written to close, one level up: a guard whose scope is
   * narrower than its name. The forms below are the ones the JS grammar allows for a relative
   * specifier, and `the import forms the walk claims to cover are extracted` asserts each one is
   * actually seen — so the claim is testable rather than aspirational.
   */
  const RELATIVE_IMPORT = /(?:^|\n)[ \t]*(?:import|export)\s+(?:[^;'"]*?\sfrom\s+)?['"](\.[^'"]+)['"]/g;
  const DYNAMIC_IMPORT = /\bimport\(\s*['"](\.[^'"]+)['"]\s*\)/g;

  /** The module roots, read from the document that loads them. */
  function moduleRoots() {
    const html = readFileSync(join(APP, 'index.html'), 'utf8');
    return [...html.matchAll(/<script\s+src="([^"]+)"\s+type="module"/g)]
      .map((m) => m[1].replace(/^\//, ''));
  }

  /** Resolve a specifier against the IMPORTING module's directory, in route-key form. */
  function resolveSpec(fromFile, spec) {
    return join(dirname(fromFile), spec).split(sep).join('/');
  }

  /** Every module reachable from the roots, mapped to the relative imports it makes. */
  function moduleGraph() {
    const seen = new Map();
    const queue = moduleRoots();
    while (queue.length) {
      const file = queue.shift();
      if (seen.has(file)) continue;
      let src = '';
      // A root that is missing on disk is reported as unrouted, not swallowed.
      try { src = readFileSync(join(APP, file), 'utf8'); } catch { /* see above */ }
      const specs = new Set();
      for (const re of [RELATIVE_IMPORT, DYNAMIC_IMPORT]) {
        for (const m of src.matchAll(re)) specs.add(resolveSpec(file, m[1]));
      }
      seen.set(file, specs);
      for (const s of specs) queue.push(s);
    }
    return seen;
  }

  const GRAPH = moduleGraph();

  test('every module the browser loads, and every import it makes, has an asset route', () => {
    const missing = [];
    for (const [file, specs] of GRAPH) {
      if (!Object.hasOwn(serverMod.ASSET_ROUTES, `/${file}`)) {
        missing.push(`${file} is loaded by the browser and has no ASSET_ROUTES key`);
      }
      for (const s of specs) {
        if (!Object.hasOwn(serverMod.ASSET_ROUTES, `/${s}`)) {
          missing.push(`${file} imports '${s}' → /${s} has no ASSET_ROUTES key`);
        }
      }
    }
    assert.deepEqual(missing, [], `unroutable modules: ${missing.join('; ')}`);
  });

  test('every declared asset route points at a file that exists', () => {
    for (const [route, asset] of Object.entries(serverMod.ASSET_ROUTES)) {
      assert.ok(existsSync(join(APP, asset.file)), `${route} → ${asset.file} is missing on disk`);
    }
  });

  test('every stylesheet the document or a module reaches for has an asset route', () => {
    /*
     * ROUND 12 (2026-09-20). The module walk above reads `<script src>` roots, so a STYLESHEET was
     * never checked — and a `<link>` with no route is a silent 404: the page renders, that layer
     * of styling simply does not apply, and nothing reports an error. It is the S2 incident one
     * element type over, and it became reachable the moment `app.css` split in two.
     *
     * Both sources are read: the document's `<link rel="stylesheet">` elements, and the `.css`
     * paths modules set at runtime (`app-judge.js` adds `/judge.css` after boot, so it appears in
     * no markup at all).
     */
    const doc = readFileSync(join(APP, 'index.html'), 'utf8');
    const wanted = new Set(
      [...doc.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"/g)].map((m) => m[1]),
    );
    for (const f of readdirSync(APP)) {
      if (!f.endsWith('.mjs') && !f.endsWith('.js')) continue;
      for (const m of readFileSync(join(APP, f), 'utf8').matchAll(/['"](\/[a-z0-9-]+\.css)['"]/g)) {
        wanted.add(m[1]);
      }
    }
    assert.ok(wanted.size >= 3, `only ${wanted.size} stylesheets found — this check would be vacuous`);
    const missing = [...wanted].filter((href) => !Object.hasOwn(serverMod.ASSET_ROUTES, href)).sort();
    assert.deepEqual(
      missing, [],
      `these stylesheets are reachable and have no ASSET_ROUTES key: ${missing.join(', ')}`,
    );
  });

  test('the repository-writing generators are reachable from no route and no module', () => {
    /*
     * ROUND 12 (2026-09-20), Astra F22. "No writes" was an unqualified claim about the whole
     * console tree, and it was false: `generate-worlds.mjs` and `wire-playground.mjs` write
     * repository files when run directly. Astra's settle was to state the boundary precisely —
     * the observation paths do not mutate repository or engine data; the generators are a
     * separate, directly-invoked effect. This test is what makes that boundary CHECKABLE rather
     * than merely written down in two headers.
     *
     * The claim has two halves, and both are asserted:
     *   1. neither generator is an ASSET_ROUTES value (so no HTTP path can serve or reach it);
     *   2. neither appears in the browser's module graph (so no module the browser loads can
     *      import it).
     * If someone ever imports a generator from `app.js`, half 1 fails first — the graph test
     * above would demand a route key for it, and this test forbids one.
     */
    const GENERATORS = ['generate-worlds.mjs', 'wire-playground.mjs'];
    for (const g of GENERATORS) {
      assert.ok(
        existsSync(join(CONSOLE, g)),
        `${g} does not exist — this guard is asserting a claim about a file that is gone`,
      );
    }
    const routed = new Set(Object.values(serverMod.ASSET_ROUTES).map((a) => a.file));
    for (const g of GENERATORS) {
      assert.ok(!routed.has(g), `${g} is reachable as an asset route — it writes repository files`);
      assert.ok(!GRAPH.has(g), `${g} is in the browser module graph — it writes repository files`);
    }
  });

  test('the graph walk is not vacuous', () => {
    /*
     * The defect round 10 found was a SCOPE defect, so the guard on the guard has to be
     * about scope rather than about a regex matching something: a walk that quietly reached
     * two modules would satisfy every assertion above.
     */
    assert.ok(GRAPH.size >= 7, `the walk reached only ${GRAPH.size} modules: ${[...GRAPH.keys()].join(', ')}`);
    assert.ok(
      moduleRoots().includes('onboard.js'),
      'index.html loads /onboard.js as a module and the walk did not take it as a root — '
      + 'this is the root the old hardcoded list omitted',
    );
    assert.ok(
      GRAPH.has('app-registries.mjs'),
      'app-registries.mjs is in the app.js chain and the walk did not reach it — this is the '
      + 'module whose unrouted import survived a 10/10 green in the round-10 mutation',
    );
    const imports = [...GRAPH.values()].reduce((n, s) => n + s.size, 0);
    assert.ok(imports >= 4, `the walk found only ${imports} relative imports across the graph`);
  });

  test('the import forms the walk claims to cover are extracted', () => {
    /*
     * ROUND 11. The extractor used to require `from '<spec>'`, so a side-effect import and a
     * double-quoted specifier were invisible — Astra injected `import './missing-guard-probe.mjs';`
     * into `app-registries.mjs` in memory and this suite returned 3/3 PASS while the browser
     * would 404. This is the guard on the guard: every form the JS grammar allows for a
     * relative specifier must be seen, or the walk silently under-counts the graph.
     */
    const SAMPLE = [
      "import './side-effect.mjs';",
      'import a from "./double-quoted.mjs";',
      "import { x, y } from './named.mjs';",
      "import * as ns from './namespace.mjs';",
      "export { z } from './reexport.mjs';",
      "export * from './reexport-all.mjs';",
      "const d = await import('./dynamic.mjs');",
      'const e = await import("./dynamic-double.mjs");',
      "import './sub/nested.mjs';",
    ].join('\n');
    const found = new Set();
    for (const re of [RELATIVE_IMPORT, DYNAMIC_IMPORT]) {
      for (const m of SAMPLE.matchAll(re)) found.add(m[1]);
    }
    const expected = [
      './side-effect.mjs', './double-quoted.mjs', './named.mjs', './namespace.mjs',
      './reexport.mjs', './reexport-all.mjs', './dynamic.mjs', './dynamic-double.mjs',
      './sub/nested.mjs',
    ];
    for (const spec of expected) {
      assert.ok(found.has(spec), `the walk does not extract ${spec} — that module can go unrouted`);
    }
  });

  test('a nested specifier resolves against its IMPORTER, not the app root', () => {
    // `./x.mjs` inside `sub/a.mjs` is `sub/x.mjs`. Resolving it as `x.mjs` would check the
    // wrong route key, so a nested module could be unrouted and still pass.
    assert.equal(resolveSpec('sub/a.mjs', './x.mjs'), 'sub/x.mjs');
    assert.equal(resolveSpec('app.js', './y.mjs'), 'y.mjs');
    assert.equal(resolveSpec('sub/deep/a.mjs', '../z.mjs'), 'sub/z.mjs');
  });
});
