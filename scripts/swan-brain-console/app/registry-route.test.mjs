/**
 * registry-route-contract — the server half of S3.
 * @module scripts/swan-brain-console/app/registry-route.test
 *
 * WHY THIS IS SPLIT FROM `app-shell.test.mjs`
 * Same boundary as the S1 split, and the same reason: these tests exercise the SERVER
 * (a file reader and an HTTP route), while `app-shell.test.mjs` exercises the CLIENT
 * planners. Two subjects, two suites — and both stay inside the 300-line budget instead
 * of one file carrying both.
 *
 * WHY ITS OTHER HALF MOVED OUT (round 10, 2026-09-20)
 * This file used to carry the asset-route/module-graph guard as well, and the round-10
 * allowlist parity check pushed the pair to 340 lines. The seam was already real — this file
 * is about `REGISTRY_NAMES` and `/registry/:name.json`, the other about `ASSET_ROUTES` — so
 * the asset half became `asset-routes.test.mjs`. Two tables, two suites.
 *
 * THE CLAIM THAT NEEDS PROVING HERE (D4)
 * "Registries are read at request time, so adding a row needs no restart." That is a
 * claim about *when* a file is read. It cannot be tested through a route that has
 * already read it once, and it must not be tested by mutating a real registry — so the
 * reader is exported and driven against a throwaway directory, where the file is changed
 * between two calls. The route calls that same exported function.
 *
 * Run: node --test scripts/swan-brain-console/app/registry-route.test.mjs
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONSOLE = resolve(HERE, '..');
const APP = HERE;

const serverMod = await import(pathToFileURL(join(CONSOLE, 'server.mjs')).href);

describe('D4 — the registry reader never caches', () => {
  test('changing the file between two reads changes the result', () => {
    const dir = mkdtempSync(join(tmpdir(), 'swan-registry-'));
    writeFileSync(join(dir, 'tabs.json'), JSON.stringify([{ id: 'one', label: 'One' }]), 'utf8');
    const first = serverMod.readRegistry('tabs', dir);
    assert.equal(first.ok, true);
    assert.equal(first.value.length, 1);

    writeFileSync(
      join(dir, 'tabs.json'),
      JSON.stringify([{ id: 'one', label: 'One' }, { id: 'two', label: 'Two' }]),
      'utf8',
    );
    const second = serverMod.readRegistry('tabs', dir);
    assert.equal(second.value.length, 2, 'the reader served a cached registry — D4 is false');
  });

  test('an unlisted name is refused, and the refusal lists what is allowed', () => {
    const out = serverMod.readRegistry('secrets', APP);
    assert.equal(out.ok, false);
    assert.equal(out.error, 'unknown registry');
    assert.deepEqual(out.allowed, ['tabs', 'sources', 'seats']);
  });

  test('traversal in the name cannot reach outside the registry allowlist', () => {
    for (const name of ['..', '../package', 'a/b', 'tabs/../seats', 'TABS']) {
      const out = serverMod.readRegistry(name, APP);
      assert.equal(out.ok, false, `${name} was accepted`);
    }
  });

  test('a missing file and invalid JSON are distinct, reported failures', () => {
    const dir = mkdtempSync(join(tmpdir(), 'swan-registry-empty-'));
    assert.equal(serverMod.readRegistry('tabs', dir).error, 'registry file missing');

    writeFileSync(join(dir, 'tabs.json'), '{ not json', 'utf8');
    const bad = serverMod.readRegistry('tabs', dir);
    assert.equal(bad.error, 'registry is not valid JSON');
    assert.ok(bad.detail.length > 0);
  });
});

describe('the HTTP route serves the registries the shell asks for', () => {
  const PORT = 4741;
  const base = `http://127.0.0.1:${PORT}`;

  /** Poll until the server answers, or give up. Returns whether it came up. */
  async function waitForServer() {
    for (let i = 0; i < 60; i += 1) {
      try {
        const res = await fetch(`${base}/registry/tabs.json`);
        if (res.ok) return true;
      } catch { /* not up yet */ }
      await new Promise((r) => setTimeout(r, 100));
    }
    return false;
  }

  test('serves the registry, refuses an unlisted one, and survives a traversal attempt', async () => {
    const child = spawn(process.execPath, [join(CONSOLE, 'server.mjs'), '--port', String(PORT)], {
      stdio: 'ignore',
    });
    try {
      assert.equal(await waitForServer(), true, 'the console did not start within 6s');

      const ok = await fetch(`${base}/registry/tabs.json`);
      assert.equal(ok.status, 200);
      assert.match(ok.headers.get('content-type') ?? '', /application\/json/);
      const rows = await ok.json();
      assert.ok(Array.isArray(rows));
      // A lower bound, not an exact count: additions are the feature (D2), removals are
      // the regression. Pinning 8 would make every new registry row a test edit.
      assert.ok(rows.length >= 8, `expected at least 8 tabs, got ${rows.length}`);
      assert.ok(rows.some((t) => t.id === 'doctrine'));

      const bad = await fetch(`${base}/registry/secrets.json`);
      assert.equal(bad.status, 404);
      assert.deepEqual((await bad.json()).allowed, ['tabs', 'sources', 'seats']);

      const traversal = await fetch(`${base}/registry/..%2f..%2fpackage.json`);
      assert.notEqual(traversal.status, 200, 'a traversal attempt was served');
    } finally {
      child.kill();
    }
  });

  /**
   * Judge Mode's assets (S2). Ruled D15 moved Judge Mode after S3 so its TAB arrives as
   * a registry row rather than an `index.html` edit — but a registry row only makes the
   * tab reachable, not the panel's script or stylesheet. Without these two routes the row
   * renders a panel that cannot load either, which is the same unreachable-deliverable
   * defect D15 belongs to.
   */
  test('the Judge Mode assets are routable and served', async () => {
    for (const [route, marker] of [
      ['/app-judge.js', /export function initJudge/],
      ['/judge.css', /\.judge-pair/],
    ]) {
      assert.ok(Object.hasOwn(serverMod.ASSET_ROUTES, route), `${route} is not routable`);
    }

    const child = spawn(process.execPath, [join(CONSOLE, 'server.mjs'), '--port', String(PORT + 2)], {
      stdio: 'ignore',
    });
    try {
      let ready = false;
      for (let i = 0; i < 60 && !ready; i += 1) {
        try {
          const res = await fetch(`http://127.0.0.1:${PORT + 2}/registry/tabs.json`);
          ready = res.ok;
        } catch { /* not up yet */ }
        if (!ready) await new Promise((r) => setTimeout(r, 100));
      }
      assert.equal(ready, true, 'the console did not start within 6s');

      const js = await fetch(`http://127.0.0.1:${PORT + 2}/app-judge.js`);
      assert.equal(js.status, 200);
      assert.match(await js.text(), /export function initJudge/);

      const css = await fetch(`http://127.0.0.1:${PORT + 2}/judge.css`);
      assert.equal(css.status, 200);
      assert.match(css.headers.get('content-type') ?? '', /text\/css/);
      assert.match(await css.text(), /\.judge-pair/);
    } finally {
      child.kill();
    }
  });

  /**
   * The shell is loaded by `app.js` over HTTP. If it is not routable the strip never
   * builds and S3 ships unreachable — the exact defect class D16 belongs to, which is
   * why D16's "the asset map stays fixed" needed the one-key amendment.
   */
  test('app-shell.js is declared in the asset allowlist and is served', async () => {
    assert.ok(
      Object.hasOwn(serverMod.ASSET_ROUTES, '/app-shell.js'),
      'app-shell.js is not routable, so the shell would 404 and no tab would render',
    );
    const child = spawn(process.execPath, [join(CONSOLE, 'server.mjs'), '--port', String(PORT + 1)], {
      stdio: 'ignore',
    });
    try {
      let served = null;
      for (let i = 0; i < 60 && served === null; i += 1) {
        try {
          const res = await fetch(`http://127.0.0.1:${PORT + 1}/app-shell.js`);
          if (res.ok) served = await res.text();
        } catch { /* not up yet */ }
        if (served === null) await new Promise((r) => setTimeout(r, 100));
      }
      assert.ok(served !== null, 'the shell asset never served');
      assert.match(served, /export function planTabStrip/);
    } finally {
      child.kill();
    }
  });
});

/* ── The registry allowlist, which is one fact typed in two places ─────────── */

/**
 * ROUND 10 (2026-09-20). `REGISTRY_NAMES` (`server.mjs:99`, exported at `:288`) and
 * `REGISTRY_KINDS` (`app/app-shell.js:20`) are the same three names written twice — the
 * server's permission and the client's expectation. Nothing imported both, so nothing could
 * notice them diverging, and the divergence is silent in one direction:
 *
 *   - a name the CLIENT has and the server refuses → every page load reports
 *     "could not load (HTTP 404)" for that registry;
 *   - a name the SERVER has and the client lacks → served, and never fetched.
 *
 * This is the round-8 D1 shape (`swan_get_state` claimed identity with `/api/state` and
 * silently lacked `gates`), which was closed by giving both paths one implementation.
 *
 * ROUND 12 (2026-09-20): this block used to end "These two cannot share one — the server is
 * Node, the client is a browser module — so the link has to be a test." That was wrong, and
 * Astra F19 is what exposed it: a dependency-free constant is loadable by BOTH, the browser
 * through an asset route. They now do share one, and the test below asserts identity.
 */
describe('the registry allowlist is one object, not two equal lists', () => {
  test('the client and the server hold the SAME definition, not two that agree', async () => {
    /*
     * ROUND 12 (2026-09-20). This test used to assert `deepEqual` between two independent
     * frozen literals, and called that "one fact, not two". Astra F19 graded the claim false
     * and was right: equality is not single-sourcing. Two literals that agree today can
     * disagree tomorrow, and only the test would notice.
     *
     * The list now lives in `./registry-kinds.mjs`, which both sides import, so the assertion
     * is IDENTITY. Re-inlining the literal on either side fails here instead of passing an
     * equality check — which is the difference between a guard and a coincidence.
     */
    const shell = await import(pathToFileURL(join(APP, 'app-shell.js')).href);
    const shared = await import(pathToFileURL(join(APP, 'registry-kinds.mjs')).href);
    assert.equal(
      shell.REGISTRY_KINDS, shared.REGISTRY_KINDS,
      'app-shell.js no longer re-exports the shared list — it has its own copy again',
    );
    assert.equal(
      serverMod.REGISTRY_NAMES, shared.REGISTRY_KINDS,
      'server.mjs no longer shares the list — it has its own copy again',
    );
    assert.ok(Object.isFrozen(shared.REGISTRY_KINDS), 'the shared list must be frozen');
    assert.deepEqual(
      [...shared.REGISTRY_KINDS], ['tabs', 'sources', 'seats'],
      'the shared list changed shape — update this pin deliberately, not incidentally',
    );
  });

  test('every registry file on disk can be served', () => {
    const onDisk = readdirSync(APP)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''));
    const unreachable = onDisk.filter((n) => !serverMod.REGISTRY_NAMES.includes(n));
    assert.deepEqual(
      unreachable, [],
      `these registry files exist and no allowlist entry can serve them: ${unreachable.join(', ')}`,
    );
  });
});
