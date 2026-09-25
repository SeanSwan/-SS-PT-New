/**
 * doctrine-contract — the states the Doctrine tab can be in, and whether it can tell them apart.
 * @module scripts/swan-brain-console/doctrine.test
 *
 * WHY THIS SUITE EXISTS (round 11, finding F17)
 * `readArchetypes` reported a JSON parse failure as `{ present: true, count: 0, error: … }`, and
 * the renderer keyed its warning off `present`. So a CORRUPT catalogue and a HEALTHY one were
 * indistinguishable on screen: the panel read `Archetypes | 0 | generated from undefined`, with
 * no warning and no error, and a zero an operator would reasonably read as "the routing table is
 * empty". Astra reproduced exactly that, and separately showed a missing engine-config directory
 * rendering as `Spec mode | undefined`.
 *
 * The fix is not "show the error somewhere". It is that a caller must be able to tell MISSING
 * from INVALID from OK, because the three have different fixes — restore the file, repair the
 * file, or nothing — and a single falsy flag cannot express three states.
 *
 * `readDoctrine(repo)` takes the repository root, so every state below is produced from a real
 * temporary tree rather than from a mock. That is the whole reason the module is shaped this way.
 *
 * Run: node --test scripts/swan-brain-console/doctrine.test.mjs
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const doctrine = await import(pathToFileURL(join(HERE, 'doctrine.mjs')).href);

const ARCHETYPES = 'docs/ai-workflow/design-brain/archetypes/index.json';
const SPEC_MODE = 'scripts/design-brain/config/spec-mode.json';

/** Build a throwaway repo root containing exactly the files named. */
function tree(files) {
  const root = mkdtempSync(join(tmpdir(), 'doctrine-'));
  for (const [rel, body] of Object.entries(files)) {
    const full = join(root, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, body);
  }
  return root;
}

/** Run `readDoctrine` against a throwaway tree and clean up. */
function read(files) {
  const root = tree(files);
  try {
    return doctrine.readDoctrine(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const HEALTHY = JSON.stringify({
  generated_from: 'archetypes/registry.json',
  archetypes: [
    { n: 1, id: 'cinematic-3d-scroll-website', motion: 'scroll', thesis: 'a thesis' },
    { n: 2, id: 'fitness-coaching-website', motion: 'hover', thesis: 'another thesis' },
    { n: 3, id: 'editorial-longform', motion: 'none', thesis: 'a third' },
  ],
});

describe('F17 — the three archetype states are distinguishable', () => {
  test('RED — a CORRUPT index.json is `invalid`, not a healthy empty table', () => {
    const out = read({ [ARCHETYPES]: '{ this is not json' });
    assert.equal(out.archetypes.status, 'invalid', 'a parse failure read as a healthy catalogue');
    assert.match(out.archetypes.error, /not valid JSON/);
  });

  test('RED — parsed-but-wrong-shape is `invalid` too — parsing is not the same as being valid', () => {
    // The case a bare `try/catch` calls "ok": the file is syntactically fine and the CONTRACT
    // has changed underneath. It used to fall through to `count: 0` with no error at all.
    const out = read({ [ARCHETYPES]: JSON.stringify({ generated_from: 'x', archetypes: null }) });
    assert.equal(out.archetypes.status, 'invalid');
    assert.match(out.archetypes.error, /no `archetypes` array/);
  });

  test('RED — a MISSING index.json is `missing`, which is a different state from `invalid`', () => {
    // Different facts, different fixes: restore the file vs repair it. Collapsing them sends the
    // operator to the wrong remedy.
    const out = read({});
    assert.equal(out.archetypes.status, 'missing');
    assert.notEqual(out.archetypes.status, 'invalid');
    assert.match(out.archetypes.error, /not present/);
  });

  test('a healthy catalogue is `ok`, and carries the count and its provenance', () => {
    const out = read({ [ARCHETYPES]: HEALTHY });
    assert.equal(out.archetypes.status, 'ok');
    assert.equal(out.archetypes.count, 3);
    assert.equal(out.archetypes.generatedFrom, 'archetypes/registry.json');
    assert.equal(out.archetypes.error, null);
    assert.equal(out.archetypes.relevant.length, 2, 'the two front-page archetypes were not found');
    assert.equal(out.archetypes.sample.length, 3);
  });

  test('EVERY state carries `count` and `error`, so no caller has to branch to get a number', () => {
    // The renderer prints `a.count` unconditionally. A state that omits it prints `undefined`,
    // which is the defect class this finding is about.
    for (const files of [{}, { [ARCHETYPES]: '{bad' }, { [ARCHETYPES]: HEALTHY }]) {
      const a = read(files).archetypes;
      assert.equal(typeof a.count, 'number', `count missing for status ${a.status}`);
      assert.ok('error' in a, `error key missing for status ${a.status}`);
      assert.ok(Array.isArray(a.sample));
      assert.ok(Array.isArray(a.relevant));
    }
  });

  test('`status` is the only field the renderer needs — `present` is gone, not duplicated', () => {
    // Two names for one fact is how the previous shape drifted. If `present` comes back, this
    // fails and the reviewer has to decide which one the renderer reads.
    assert.ok(!('present' in read({ [ARCHETYPES]: HEALTHY }).archetypes));
  });
});

describe('F17 — an unknown spec mode is `null`, never an absent key', () => {
  test('RED — a missing config directory reports specModeEnabled as null', () => {
    const out = read({});
    assert.equal(out.engineConfig.present, false);
    assert.equal(
      out.engineConfig.specModeEnabled,
      null,
      'the key was absent, so the renderer printed the literal string `undefined`',
    );
  });

  test('a real spec-mode.json reports the value it declares', () => {
    const off = read({ [SPEC_MODE]: JSON.stringify({ enabled: false }) });
    assert.equal(off.engineConfig.specModeEnabled, false);
    const on = read({ [SPEC_MODE]: JSON.stringify({ enabled: true }) });
    assert.equal(on.engineConfig.specModeEnabled, true);
  });

  test('a present-but-CORRUPT spec-mode.json is unknown, which is not the same as `false`', () => {
    // `false` is a claim about the engine. `null` is the absence of one, and the console must
    // not make the claim on the engine's behalf.
    const out = read({ [SPEC_MODE]: '{bad json' });
    assert.equal(out.engineConfig.specModeEnabled, null);
    assert.notEqual(out.engineConfig.specModeEnabled, false);
  });

  test('a spec-mode.json with no `enabled` key is unknown, not false', () => {
    const out = read({ [SPEC_MODE]: JSON.stringify({ somethingElse: 1 }) });
    assert.equal(out.engineConfig.specModeEnabled, null);
  });
});

/* ── Rule 4 ──────────────────────────────────────────────────────────────── */

test('Rule 4: the doctrine reader and this suite stay within 300 lines', () => {
  for (const f of ['doctrine.mjs', 'doctrine.test.mjs']) {
    const lines = readFileSync(join(HERE, f), 'utf8').split('\n').length;
    assert.ok(lines <= 300, `${f} is ${lines} lines`);
  }
});
