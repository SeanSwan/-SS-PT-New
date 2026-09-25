/**
 * harnessIdentity.test — the QA harness's identity gate must refuse a wrong application.
 * @module scripts/swan-brain-console/harnessIdentity.test
 *
 * THE DEFECT THIS PINS (round 4, 2026-09-19). `gallery-verify.mjs` is 553 lines, launches
 * headless Chromium, and navigates the QA harness THREE times (per-variant, layout, reduced
 * motion) — and checked the identity of its target ZERO times. Measured:
 *
 *     grep -n "HARNESS_TITLE|title|identity|marker" gallery-verify.mjs   ->   no matches
 *
 * Its sibling `shot-diff.mjs` hard-stops on `HARNESS_TITLE` for exactly this reason, and says
 * so at line 51: in S4, :5199 was owned by a DIFFERENT worktree's dev server, so the run found
 * zero `[data-world]` nodes and reported a confusing selector timeout instead of "you are
 * pointing at the wrong application". The lesson was encoded in the smaller script and never
 * applied to the larger one — the same per-call-site gap round 2 established.
 *
 * The first test below is END TO END: a real Chromium, a real HTTP server serving a non-harness
 * page, and the real script. Measured A/B against a copy with only the gate removed: WITHOUT it,
 * 36 seconds ending in `CRASHED after 1 checks` and a variant-level failure that reads like a
 * rendering regression (`v01: animating with real draws — cards=0 · no canvas · zero draw
 * calls`); WITH it, 1.5 seconds and the wrong target named.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkHarnessIdentity, HARNESS_TITLE } from './harnessIdentity.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const GALLERY = resolve(HERE, 'gallery-verify.mjs');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Run a script to completion and return everything it printed.
 *
 * `spawnSync` IS THE WRONG TOOL HERE, and it cost a round of bad evidence. `gallery-verify.mjs`
 * launches Chromium, and the browser inherits the stdout pipe. `spawnSync` reads until EOF, so
 * it blocks on a pipe the grandchild still holds; its timeout path then returns EMPTY output.
 * Measured: the same run reported 25s and zero bytes under `spawnSync`, and 1.6s with the
 * refusal message under `spawn`. Use the async spawn and resolve on the child's own exit.
 */
function runToCompletion(script, args, { timeoutMs = 20_000 } = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...args], {
      env: { ...process.env, CI: '1' },
    });
    let output = '';
    let settled = false;
    const finish = (status, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      clearTimeout(grace);
      resolve({ status, signal, output });
    };
    child.stdout.on('data', (d) => { output += d; });
    child.stderr.on('data', (d) => { output += d; });
    child.on('error', (e) => { output += String(e); finish(null, null); });

    // The child's own exit is the signal. A browser grandchild holding the pipe must not
    // delay it — that is the whole point of not using spawnSync.
    const grace = setTimeout(() => finish(null, 'GRACE_EXPIRED'), timeoutMs + 5_000);
    const deadline = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.on('exit', (code, signal) => finish(code, signal));
  });
}

/**
 * Serve a page that is deliberately NOT the harness. Closes on a deadline: a fixture that can
 * hang is worse than a test that fails, and a browser leaves keep-alive connections behind.
 */
async function serveNotTheHarness(body) {
  const server = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(body);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return {
    port: server.address().port,
    close: async () => {
      const done = new Promise((r) => server.close(() => r(true)));
      server.closeAllConnections?.();
      await Promise.race([done, sleep(1000)]);
    },
  };
}

/** A page-like object, so the predicate can be exercised without a browser. */
const fakePage = ({ title = '', html = '', throwOnGoto = null } = {}) => ({
  goto: async () => { if (throwOnGoto) throw new Error(throwOnGoto); },
  title: async () => title,
  content: async () => html,
});

describe('the gate refuses a wrong application, end to end', () => {
  it('gallery-verify names the wrong target instead of failing 20 variants', async () => {
    const foreign = await serveNotTheHarness(
      '<html><head><title>Some Other App</title></head><body><p>not the harness</p></body></html>',
    );
    try {
      const url = `http://127.0.0.1:${foreign.port}/qa-worlds.html`;
      const result = await runToCompletion(GALLERY, [url], { timeoutMs: 25_000 });
      assert.match(
        result.output,
        /is not the Three\.js fleet QA harness/,
        `expected an identity refusal; got:\n${result.output.slice(0, 600)}`,
      );
      assert.equal(result.status, 1, 'a wrong target must exit non-zero');
      // The gate must run BEFORE the measuring loop, so exactly one check is reported.
      assert.match(result.output, /\[gallery\] 0\/1 checks passed/);
      assert.ok(
        !/\[gallery\] \d+\/20 checks passed/.test(result.output),
        'the gate must stop the run before 20 variants are measured',
      );
    } finally {
      await foreign.close();
    }
  });
});

describe('checkHarnessIdentity', () => {
  it('accepts a document carrying the marker', async () => {
    const result = await checkHarnessIdentity(
      fakePage({ title: 'Three.js fleet QA harness', html: `<head>${HARNESS_TITLE}</head>` }),
      'http://127.0.0.1:1/qa-worlds.html',
    );
    assert.equal(result.ok, true);
  });

  it('refuses a document without the marker, and says which target it refused', async () => {
    const result = await checkHarnessIdentity(
      fakePage({ title: 'Some Other App', html: '<head><title>Some Other App</title></head>' }),
      'http://127.0.0.1:5199/qa-worlds.html',
    );
    assert.equal(result.ok, false);
    assert.match(result.message, /is not the Three\.js fleet QA harness/);
    assert.match(result.message, /Some Other App/);
    assert.match(result.message, /Refusing to measure/);
  });

  it('refuses an unreachable target rather than pretending it looked', async () => {
    const result = await checkHarnessIdentity(
      fakePage({ throwOnGoto: 'net::ERR_CONNECTION_REFUSED' }),
      'http://127.0.0.1:1/qa-worlds.html',
    );
    assert.equal(result.ok, false);
    assert.match(result.message, /unreachable/);
    assert.match(result.message, /ERR_CONNECTION_REFUSED/);
  });

  /**
   * The vacuity guard, and the same defect fixed in `readFrontendIdentityMarker`: an empty
   * marker matches EVERY document, so a gate built on one would pass against any application.
   */
  it('refuses to run with an empty marker', async () => {
    await assert.rejects(
      () => checkHarnessIdentity(fakePage({ html: '<html></html>' }), 'http://x/', { marker: '' }),
      /non-empty marker/,
    );
  });
});

describe('the gate runs before the first measurement', () => {
  /**
   * A source-text guard, and it is weaker than the end-to-end test above — it proves the call
   * is written, not that it is reached first. It exists so that deleting the gate is a visible
   * decision; the end-to-end test is what proves the behaviour.
   */
  it('gallery-verify invokes the identity gate', () => {
    const source = readFileSync(GALLERY, 'utf8');
    assert.match(source, /checkHarnessIdentity\(/);
    assert.match(source, /from '\.\/harnessIdentity\.mjs'/);
  });
});
