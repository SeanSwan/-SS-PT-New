/**
 * buildIdentity-contract — the fingerprint must identify the RUNNING code, not the current disk.
 * @module scripts/swan-brain-console/buildIdentity.test
 *
 * WHAT THIS SUITE IS FOR (round 12, 2026-09-20 — Astra F15)
 * `verifyTarget.mjs` proved "THIS build" with byte comparisons of browser assets. Astra's point
 * was that this says nothing about the server's own logic: editing `gateClassify.mjs` changes no
 * asset, so a process started before the edit serves identical bytes and computes different gate
 * statuses. The server now publishes a fingerprint of its backend closure, computed at load.
 *
 * Three properties make that work, and each is asserted here:
 *   1. the closure is WALKED, so it reaches the classifier rather than the modules someone
 *      remembered to list — a hand-written list is the drift class this round keeps finding;
 *   2. the fingerprint is SENSITIVE to a byte, so an edit anywhere in the closure is visible;
 *   3. the fingerprint is STABLE — insensitive to file order, and sensitive to a rename even when
 *      the bytes are unchanged, because a rename is a different build.
 *
 * The socket-level half — that the real server answers `/api/build` with this value — lives in
 * `server-contract.test.mjs`, because that file already owns the request boundary.
 *
 * Run: node --test scripts/swan-brain-console/buildIdentity.test.mjs
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  backendClosure, fingerprint, BUILD_FINGERPRINT, BACKEND_FILES, ENTRY,
} from './buildIdentity.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

describe('buildIdentity — the closure is walked, not listed', () => {
  test('the closure starts at the process entry point', () => {
    assert.equal(ENTRY, 'server.mjs');
    assert.ok(BACKEND_FILES.includes('server.mjs'), 'the entry module is not in its own closure');
  });

  test('THE POINT OF THE WALK: it reaches the gate classifier, two hops from the entry', () => {
    /*
     * `gateClassify.mjs` is the file Astra named, and no one wrote it into a list. It is reached
     * `server.mjs → snapshot.mjs → gateHealth.mjs → gateClassify.mjs`. If a future edit breaks the
     * specifier regex or stops following a form of import, this test is what notices — the
     * fingerprint would otherwise quietly shrink to "the files that happen to be imported".
     */
    assert.ok(
      BACKEND_FILES.includes('gateClassify.mjs'),
      `the closure does not reach gateClassify.mjs — it holds ${BACKEND_FILES.length} files: `
      + BACKEND_FILES.join(', '),
    );
    for (const f of ['snapshot.mjs', 'gateHealth.mjs', 'hostGuard.mjs', 'buildIdentity.mjs']) {
      assert.ok(BACKEND_FILES.includes(f), `${f} is reachable from server.mjs and is not in the closure`);
    }
  });

  test('the closure follows the SHARED registry list, which the browser also loads', () => {
    // server.mjs imports ./app/registry-kinds.mjs, so a change to the one shared registry list
    // changes the backend fingerprint as well as the served asset. Both halves move together.
    assert.ok(
      BACKEND_FILES.includes('app/registry-kinds.mjs'),
      'the shared registry list is imported by server.mjs and is missing from the closure',
    );
  });

  test('a bare specifier is not part of the build', () => {
    // `node:http` is runtime, not source. Hashing it would tie the fingerprint to the Node version
    // and make the probe report a different build after an unrelated runtime upgrade.
    for (const f of BACKEND_FILES) {
      assert.ok(!f.startsWith('node:'), `${f} is a runtime module, not a file in this tree`);
    }
  });

  test('the closure is not vacuous and is sorted', () => {
    assert.ok(BACKEND_FILES.length >= 8, `the walk reached only ${BACKEND_FILES.length} files`);
    assert.deepEqual([...BACKEND_FILES], [...BACKEND_FILES].sort(), 'the closure is not sorted');
  });
});

describe('buildIdentity — the fingerprint is sensitive and stable', () => {
  /** A throwaway tree with the given files, and a cleaner. */
  function tree(files) {
    const root = mkdtempSync(join(tmpdir(), 'buildidentity-'));
    for (const [name, body] of Object.entries(files)) writeFileSync(join(root, name), body);
    return { root, clean: () => rmSync(root, { recursive: true, force: true }) };
  }

  test('one changed byte changes the fingerprint', () => {
    const t = tree({ 'server.mjs': "import './a.mjs';\n", 'a.mjs': 'export const x = 1;\n' });
    try {
      const before = fingerprint(t.root);
      writeFileSync(join(t.root, 'a.mjs'), 'export const x = 2;\n');
      assert.notEqual(fingerprint(t.root), before, 'an edit inside the closure was invisible');
    } finally {
      t.clean();
    }
  });

  test('a change OUTSIDE the closure does not change it', () => {
    // The fingerprint must describe the backend, not the directory: an unrelated file appearing
    // beside it is not a different build.
    const t = tree({ 'server.mjs': "import './a.mjs';\n", 'a.mjs': 'export const x = 1;\n' });
    try {
      const before = fingerprint(t.root);
      writeFileSync(join(t.root, 'unrelated.mjs'), 'export const y = 9;\n');
      assert.equal(fingerprint(t.root), before);
    } finally {
      t.clean();
    }
  });

  test('a RENAME changes the fingerprint even when the bytes are identical', () => {
    /*
     * Why the name is hashed alongside the content: moving code between two files is a different
     * build even when the concatenated bytes are the same, and a content-only digest would call
     * the two identical.
     */
    const a = tree({ 'server.mjs': "import './a.mjs';\n", 'a.mjs': 'export const x = 1;\n' });
    const b = tree({ 'server.mjs': "import './b.mjs';\n", 'b.mjs': 'export const x = 1;\n' });
    try {
      assert.notEqual(fingerprint(a.root), fingerprint(b.root), 'a rename was invisible');
    } finally {
      a.clean();
      b.clean();
    }
  });

  test('file ORDER does not change the fingerprint', () => {
    const t = tree({ 'server.mjs': "import './a.mjs';\nimport './b.mjs';\n", 'a.mjs': '1', 'b.mjs': '2' });
    try {
      const files = backendClosure(t.root);
      assert.deepEqual(
        fingerprint(t.root, [...files].reverse()), fingerprint(t.root, files),
        'the digest depends on iteration order — it would flap between runs',
      );
    } finally {
      t.clean();
    }
  });

  test('an unreadable file is recorded, not thrown over', () => {
    const t = tree({ 'server.mjs': "import './missing.mjs';\n" });
    try {
      assert.deepEqual(backendClosure(t.root), ['missing.mjs', 'server.mjs']);
      assert.match(fingerprint(t.root), /^[0-9a-f]{64}$/, 'a missing module must not break the digest');
    } finally {
      t.clean();
    }
  });
});

describe('buildIdentity — the real tree, and the wiring', () => {
  test('BUILD_FINGERPRINT is a sha256 over the real closure', () => {
    assert.match(BUILD_FINGERPRINT, /^[0-9a-f]{64}$/);
    assert.equal(BUILD_FINGERPRINT, fingerprint(HERE, BACKEND_FILES));
  });

  test('WIRING: server.mjs serves the identity rather than holding its own copy', () => {
    // A fingerprint computed in a second place is a second fingerprint. This is a SOURCE
    // assertion, labelled as one; the socket half is in server-contract.test.mjs.
    const src = readFileSync(join(HERE, 'server.mjs'), 'utf8');
    assert.match(src, /serveBuildIdentity\(path, res, json\)/, 'server.mjs no longer serves /api/build');
    assert.doesNotMatch(
      src, /BUILD_FINGERPRINT|backendClosure/,
      'server.mjs computes a fingerprint of its own instead of using buildIdentity.mjs',
    );
  });

  test('the fingerprint is computed at LOAD, so it cannot follow a later edit', () => {
    /*
     * The load-bearing ordering decision, asserted rather than described. `BUILD_FINGERPRINT` is a
     * module-level const, so it is fixed when the module is first evaluated. If someone moves the
     * computation into the request handler, a stale process would report the CURRENT fingerprint
     * and the probe would pass against precisely the case it exists to catch.
     */
    const src = readFileSync(join(HERE, 'buildIdentity.mjs'), 'utf8');
    assert.match(
      src, /export const BUILD_FINGERPRINT = fingerprint\(/,
      'the fingerprint is no longer computed once at module load',
    );
    assert.doesNotMatch(
      src, /fingerprint\(HERE, BACKEND_FILES\)[\s\S]*serveBuildIdentity[\s\S]*fingerprint\(/,
      'the fingerprint is recomputed inside the request path — a stale process would report the current build',
    );
  });
});
