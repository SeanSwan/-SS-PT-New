#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/publication.test.mjs
 * PURPOSE: Publication atomicity under a REAL process kill (review HR25).
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair evidence)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * A generation is published by writing `gen-NNNN/` COMPLETELY and then swapping
 * `current.json` — so a reader sees the previous complete generation or the new
 * complete one, never a mixture. That claim is worth nothing if it is only
 * reasoned about, so this spawns real `node` children and kills them at a range
 * of offsets inside the publish window.
 *
 * The assertion each time is the same: whatever the timing, the pointer names a
 * generation whose files all exist. A half-written generation that is POINTED AT
 * is the failure mode, and it is the one a timing-sensitive process can produce.
 *
 * RUN: node --test scripts/creator-brains/test/publication.test.mjs
 * @module creator-brains/test/publication
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { makeClock, tempRoot } from './helpers.mjs';
import { paths } from '../lib/paths.mjs';
import { writeDoc, ensureStore, listDocsChecked } from '../lib/store.mjs';
import { buildBrain } from '../lib/extract.mjs';
import { publishBrain, listPublished } from '../lib/render.mjs';
import { fixtureDoc } from './helpers.mjs';

const LIB = fileURLToPath(new URL('../lib/', import.meta.url));
const A = 'UC' + 'a'.repeat(22);
const VA = 'a'.repeat(11);

/** A store whose first brain generation is already published. */
async function seededStore(tag) {
  const r = tempRoot(`cb-${tag}`);
  ensureStore(r);
  await writeDoc(r, fixtureDoc({ channelId: A, videoId: VA }));
  const { valid } = listDocsChecked(r, A);
  publishBrain(buildBrain({ channelId: A, title: 'Alpha' }, { docs: valid }), {
    r, sources: valid.map((d) => d.text), now: makeClock(),
  });
  return r;
}
// ── Publication atomicity under a REAL process kill ─────────────────────────

test('BK4 a kill mid-publish leaves a COMPLETE generation readable, never a mixture', async () => {
  const r = await seededStore('bk4');
  const first = listPublished(r);
  assert.equal(first.length, 1, 'a first generation is published');
  const gen1 = first[0].pointer.generation;

  // A real child builds generation 2 and is killed at a random point in the
  // publish. The window is small, so this is run several times.
  const child = `
    import { buildBrain } from ${JSON.stringify(pathToFileURL(join(LIB, 'extract.mjs')).href)};
    import { publishBrain } from ${JSON.stringify(pathToFileURL(join(LIB, 'render.mjs')).href)};
    import { listDocsChecked } from ${JSON.stringify(pathToFileURL(join(LIB, 'store.mjs')).href)};
    const r = process.env.CB_ROOT;
    const { valid } = listDocsChecked(r, ${JSON.stringify(A)});
    const brain = buildBrain({ channelId: ${JSON.stringify(A)}, title: 'Alpha' }, { docs: valid });
    publishBrain(brain, { r, sources: valid.map((d) => d.text) });
    process.stdout.write('DONE');
  `;
  const dir = tempRoot('cb-bk4-child');
  const file = join(dir, 'publish.mjs');
  writeFileSync(file, child, 'utf-8');

  for (const killAfterMs of [0, 1, 2, 3, 5, 8, 12]) {
    const proc = spawn(process.execPath, [file], {
      env: { ...process.env, CB_ROOT: r }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    await new Promise((done) => {
      const timer = setTimeout(() => { try { proc.kill('SIGKILL'); } catch { /* already gone */ } }, killAfterMs);
      proc.on('close', () => { clearTimeout(timer); done(); });
      proc.on('error', () => { clearTimeout(timer); done(); });
    });

    // A reader must ALWAYS see a coherent generation.
    const published = listPublished(r);
    assert.equal(published.length, 1, `kill@${killAfterMs}ms: exactly one live generation`);
    const { dir: genDir, pointer } = published[0];
    for (const name of pointer.files) {
      assert.ok(existsSync(join(genDir, name)),
        `kill@${killAfterMs}ms: pointer names ${name} but the generation is incomplete`);
    }
    // And a generation directory is never left half-written and POINTED AT.
    const generations = readdirSync(join(paths(r).brainsDir, A)).filter((n) => n.startsWith('gen-'));
    assert.ok(generations.includes(pointer.generation), 'the pointer names a real generation');
    assert.ok(generations.length >= 1 && generations.length <= 3, `unexpected generation count: ${generations}`);
    void gen1;
  }
});

// ── E2: the generation counter must survive its own success ─────────────────

test('E2 generation numbering crosses five digits: gen-9999 + gen-10000 -> gen-10001, and no publish reuses a directory', async () => {
  const r = await seededStore('e2');
  const { mkdirSync } = await import('node:fs');
  // Plant the state three publishes at gen-10000 leave behind. `nextGeneration`
  // must SEE a five-digit directory (`render.mjs` used to filter `/^gen-\d{4}$/`
  // so it was invisible) and must ORDER it numerically (`listDir().sort()` is
  // lexicographic: 'gen-10000' < 'gen-9999', so a widened regex ALONE still
  // returns gen-10000 forever — both halves are load-bearing).
  const base = join(paths(r).brainsDir, A);
  mkdirSync(join(base, 'gen-9999'), { recursive: true });
  mkdirSync(join(base, 'gen-10000'), { recursive: true });
  const { valid } = listDocsChecked(r, A);
  const brain = buildBrain({ channelId: A, title: 'Alpha' }, { docs: valid });
  const sources = valid.map((d) => d.text);

  const g1 = publishBrain(brain, { r, sources, now: makeClock() });
  const g2 = publishBrain(brain, { r, sources, now: makeClock() });

  assert.equal(g1.generation, 'gen-10001',
    `first publish after the boundary names the next free generation, got '${g1.generation}' (E2: five-digit directories were invisible to nextGeneration)`);
  assert.equal(g2.generation, 'gen-10002',
    `second publish must not reuse a directory, got '${g2.generation}'`);
  assert.notEqual(g1.generation, g2.generation,
    'consecutive publishes must yield distinct generations — collapsing them is the E2 measured failure ("1 distinct generation of 3 publishes")');
});


