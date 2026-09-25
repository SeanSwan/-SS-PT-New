/**
 * verifyTarget.test — the identity gate must reject a stale console, not just a foreign app.
 * @module scripts/swan-brain-console/verifyTarget.test
 *
 * The regression this pins is a real incident, not a hypothetical: during S5 a server from
 * an earlier session owned `127.0.0.1:4599`. It answered `200` on `/` and its title contained
 * `Swan Brain Console`, so every reachability probe in the project passed it — while it was a
 * pre-S3 build that served five routes and 404'd `/registry/tabs.json`.
 *
 * Each test below boots a throwaway server on an EPHEMERAL port. A fixed port is what
 * produced the incident, so the test for the incident must not reproduce it.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import {
  compareTargetToDisk, assertTargetIdentity, expectedFor, IDENTITY_PROBES,
} from './verifyTarget.mjs';
import { BUILD_FINGERPRINT, BACKEND_FILES } from './buildIdentity.mjs';

/** Boot a server on port 0 and hand back its base URL and a closer. */
async function serve(handler) {
  const server = createServer(handler);
  await new Promise((res) => server.listen(0, '127.0.0.1', res));
  const { port } = server.address();
  return {
    base: `http://127.0.0.1:${port}`,
    close: () => new Promise((res) => server.close(res)),
  };
}

/**
 * Serve exactly what is on disk — i.e. a faithful copy of this build.
 *
 * ROUND 12 (2026-09-20): this also answers `/api/build` with this build's real fingerprint. It did
 * not have to before, because the identity gate had no backend probe; a "faithful copy of this
 * build" now means the assets AND the code the process loaded, so the stub has to model both.
 */
function diskHandler() {
  return (req, res) => {
    if (req.url === '/api/build') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ fingerprint: BUILD_FINGERPRINT, files: BACKEND_FILES.length }));
      return;
    }
    const probe = IDENTITY_PROBES.find((p) => p.url === req.url);
    if (!probe) { res.writeHead(404); res.end('nope'); return; }
    res.writeHead(200, { 'content-type': 'application/octet-stream' });
    res.end(readFileSync(probe.file));
  };
}

describe('a faithful copy of this build is accepted', () => {
  it('reports ok with no problems, and says what it checked', async () => {
    const s = await serve(diskHandler());
    try {
      const verdict = await compareTargetToDisk(s.base);
      assert.equal(verdict.ok, true);
      assert.deepEqual(verdict.problems, []);
      // Every content probe, plus `/api/build` — the backend-identity probe added in round 12.
      assert.equal(verdict.checked.length, IDENTITY_PROBES.length + 1);
      assert.ok(verdict.checked.includes('/api/build'), 'the build-identity probe did not run');
    } finally {
      await s.close();
    }
  });
});

describe('the real incident: a stale pre-S3 console is REJECTED', () => {
  /**
   * The measured shape of the leftover server: `/` answers 200, the title contains
   * `Swan Brain Console`, and `/registry/tabs.json` is a 404. A substring probe accepts
   * this. The identity gate must not.
   */
  it('rejects a console that does not serve /registry/tabs.json', async () => {
    const handler = (req, res) => {
      if (req.url === '/registry/tabs.json') {
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'not found', path: '/registry/tabs.json' }));
        return;
      }
      if (req.url === '/') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end('<title>Swan Brain Console</title>');   // the marker a substring probe trusts
        return;
      }
      diskHandler()(req, res);
    };
    const s = await serve(handler);
    try {
      const verdict = await compareTargetToDisk(s.base);
      assert.equal(verdict.ok, false);
      const registry = verdict.problems.find((p) => p.url === '/registry/tabs.json');
      assert.ok(registry, 'the missing registry must be named');
      assert.match(registry.detail, /HTTP 404/);
    } finally {
      await s.close();
    }
  });

  it('rejects a console whose registry has a different number of tabs', async () => {
    const stale = JSON.stringify([{ id: 'doctrine', label: 'Doctrine' }]);
    const s = await serve((req, res) => {
      if (req.url === '/registry/tabs.json') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(stale);
        return;
      }
      diskHandler()(req, res);
    });
    try {
      const verdict = await compareTargetToDisk(s.base);
      assert.equal(verdict.ok, false);
      assert.ok(verdict.problems.some((p) => p.url === '/registry/tabs.json'));
    } finally {
      await s.close();
    }
  });

  it('rejects a console whose served asset differs by one byte', async () => {
    const target = IDENTITY_PROBES.find((p) => p.url === '/app.js');
    const original = readFileSync(target.file, 'utf8');
    const s = await serve((req, res) => {
      if (req.url === '/app.js') {
        res.writeHead(200, { 'content-type': 'text/javascript' });
        res.end(`${original}\n/* stale */`);
        return;
      }
      diskHandler()(req, res);
    });
    try {
      const verdict = await compareTargetToDisk(s.base);
      assert.equal(verdict.ok, false);
      assert.ok(verdict.problems.some((p) => p.url === '/app.js'));
    } finally {
      await s.close();
    }
  });

  it('rejects a target that is not reachable at all', async () => {
    // Bind then release, so the port is almost certainly free and nothing answers.
    const s = await serve(diskHandler());
    const dead = s.base;
    await s.close();
    const verdict = await compareTargetToDisk(dead, { fetchImpl: () => { throw new Error('ECONNREFUSED'); } });
    assert.equal(verdict.ok, false);
    assert.ok(verdict.problems.every((p) => /unreachable/.test(p.detail)));
  });
});

describe('the throwing form names the likely cause', () => {
  it('says "not this build" and mentions the leftover-server cause', async () => {
    const s = await serve((req, res) => { res.writeHead(404); res.end('x'); });
    try {
      await assert.rejects(
        () => assertTargetIdentity(s.base),
        (err) => {
          assert.match(err.message, /is NOT this build/);
          assert.match(err.message, /Refusing to measure/);
          assert.match(err.message, /leftover server from another session or worktree/);
          return true;
        },
      );
    } finally {
      await s.close();
    }
  });

  it('resolves silently when the target IS this build', async () => {
    const s = await serve(diskHandler());
    try {
      const verdict = await assertTargetIdentity(s.base);
      assert.equal(verdict.ok, true);
    } finally {
      await s.close();
    }
  });
});

describe('expected content comes from disk, not from the target', () => {
  it('reports a probe whose file is missing rather than skipping it', () => {
    const fake = { url: '/nope', file: 'C:/definitely/not/here.json', kind: 'json' };
    const expected = expectedFor(fake);
    assert.equal(expected.ok, false);
    assert.match(expected.reason, /missing on disk/);
  });

  it('treats CRLF as equivalent, so a checkout difference is not a false alarm', async () => {
    const target = IDENTITY_PROBES.find((p) => p.kind === 'text');
    const original = readFileSync(target.file, 'utf8');
    const s = await serve((req, res) => {
      if (req.url === target.url) {
        res.writeHead(200);
        res.end(original.replace(/\n/g, '\r\n'));
        return;
      }
      diskHandler()(req, res);
    });
    try {
      const verdict = await compareTargetToDisk(s.base);
      assert.equal(verdict.ok, true, 'CRLF must not be reported as a different build');
    } finally {
      await s.close();
    }
  });
});

describe('rule 4', () => {
  it('both modules stay within 300 lines', () => {
    for (const f of ['verifyTarget.mjs', 'verifyTarget.test.mjs']) {
      const lines = readFileSync(new URL(`./${f}`, import.meta.url), 'utf8').split('\n').length;
      assert.ok(lines <= 300, `${f} is ${lines} lines`);
    }
  });
});

/*
 * ROUND 12 (2026-09-20) — Astra F15. The case these tests cover is the one the content probes
 * CANNOT see: every browser asset and registry is byte-identical to this build, and the server's
 * own logic is not. `gateClassify.mjs` changes no asset, so a process started before an edit to
 * it serves identical bytes while computing different gate statuses.
 */
describe('identical assets are not identity (Astra F15)', () => {
  /** A server whose every asset matches disk but whose backend fingerprint does not. */
  function staleBackendHandler(fingerprint) {
    return (req, res) => {
      if (req.url === '/api/build') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ fingerprint, files: BACKEND_FILES.length }));
        return;
      }
      diskHandler()(req, res);
    };
  }

  it('rejects a server serving current assets from a different backend', async () => {
    const s = await serve(staleBackendHandler('deadbeef'.repeat(8)));
    try {
      const verdict = await compareTargetToDisk(s.base);
      assert.equal(verdict.ok, false, 'identical assets must not certify an unidentical backend');
      const build = verdict.problems.find((p) => p.url === '/api/build');
      assert.ok(build, 'the build-identity problem must be named');
      assert.match(build.detail, /stale process/);
      // And the content probes all PASSED — that is what made the old gate green.
      assert.equal(
        verdict.problems.length, 1,
        `only the build probe should fail here, got: ${verdict.problems.map((p) => p.url).join(', ')}`,
      );
    } finally {
      await s.close();
    }
  });

  it('rejects a server that publishes no build identity at all', async () => {
    // A pre-round-12 server is exactly the stale case being hunted; its 404 is a failure, not a
    // "no opinion". Treating it as a skip would restore the hole this test exists to close.
    const s = await serve((req, res) => {
      if (req.url === '/api/build') { res.writeHead(404); res.end('not found'); return; }
      diskHandler()(req, res);
    });
    try {
      const verdict = await compareTargetToDisk(s.base);
      assert.equal(verdict.ok, false);
      assert.match(verdict.problems.find((p) => p.url === '/api/build').detail, /no build identity/);
    } finally {
      await s.close();
    }
  });

  it('THE FIXTURE IS FAITHFUL: a matching fingerprint is accepted', async () => {
    /*
     * The guard on the guard. If `diskHandler` served a WRONG fingerprint, the two rejections
     * above would pass for the wrong reason and every acceptance test in this file would be
     * measuring a broken fixture.
     */
    const s = await serve(diskHandler());
    try {
      const verdict = await compareTargetToDisk(s.base);
      assert.equal(verdict.ok, true, 'the faithful fixture must be accepted');
    } finally {
      await s.close();
    }
  });
});
