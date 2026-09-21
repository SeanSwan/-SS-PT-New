/*
 * R7-01 — CONTAINMENT TESTS PATH COMPONENTS, NOT PREFIXES
 * (Astra round 7, 2026-09-20).
 *
 * THE DEFECT. The containment predicate asked whether the RELATIVE PATH began with the
 * two characters `..`. That is not the question. `..` is the parent DIRECTORY, but `..`
 * is also the first two characters of every ordinary name that starts with dots —
 * `..notes`, `..cache`, `...`. So a legal child of the store was reported as an escape.
 *
 * WHY IT IS REACHABLE RATHER THAN THEORETICAL. `listNamespaces` is an UNFILTERED
 * `readdirSync`, so a directory named `..notes` inside `brains/` IS enumerated; and
 * `resolvePointer` runs namespace containment BEFORE the ordinary-file skip, so the
 * predicate is asked about that name on every request. One such directory would make the
 * console refuse a store that is perfectly readable — an over-refusal, which is worse
 * than a missed check in the same way a false divergence is worse than a missing one:
 * it invites someone to rename a correct directory to satisfy the reader.
 *
 * THE FIX TESTS COMPONENTS. `relative()` is compared against `'..'` exactly, and against
 * `'..' + sep` — the separator matters, because it is what distinguishes the parent
 * directory from a name that merely begins with the same characters.
 *
 * WHY THIS FILE HAS BOTH A UNIT AND AN INTEGRATION HALF. `inside()` is the predicate, so
 * the unit half pins it directly and cheaply. But R6-01's lesson is that a predicate can
 * be correct while the reader that is supposed to consult it is not — so the integration
 * half drives `resolvePointer` over a real store carrying such a name, which is the only
 * way to show the predicate is reached at all.
 *
 * @module creator-brains-console/test/containment.r7
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { tempRoot } from '../../../scripts/creator-brains/test/helpers.mjs';
import { inside } from '../lib/containment.mjs';
import { listNamespaces, resolvePointer } from '../lib/pointer.mjs';
import { fixtureRoot, seedPublishedBrain } from './fixtures.mjs';

/** A real directory, so the lexical checks have something honest to work with. */
function dir(label) {
  const d = tempRoot(label);
  mkdirSync(d, { recursive: true });
  return d;
}

test('R7-01a: a legal name that merely STARTS with dots is INSIDE the store', () => {
  const d = dir('r701a');
  // `rel.startsWith('..')` answered false for every one of these. Each is an ordinary
  // child whose name happens to begin with the two characters of the parent directory.
  for (const name of ['..notes', '..cache', '...', '..a', '.hidden']) {
    assert.equal(inside(d, join(d, name)), true, `\`${name}\` is an ordinary child of the store`);
  }
});

test('R7-01b: the escapes are still refused, so the predicate did not go slack', () => {
  const d = dir('r701b');
  const escapes = [
    d,                        // the root is not inside itself
    join(d, '..'),            // the parent directory
    resolve(d, '..'),         // ...spelled absolutely
    resolve(d, '..', 'out'),  // a sibling
    resolve(d, '..', '..'),   // two levels up
    resolve(d, '..', '..out'), // a SIBLING whose name begins with dots — still outside
  ];
  for (const target of escapes) {
    assert.equal(inside(d, target), false, `\`${target}\` is not inside the store`);
  }
});

test('R7-01c: a namespace named `..notes` is ENUMERATED, and resolves', () => {
  const r = fixtureRoot('r701c');
  const ns = '..notes';
  const seeded = seedPublishedBrain(r, ns);

  // The precondition that makes the defect reachable: the enumerator does not filter the
  // name, so the containment predicate really is asked about it.
  assert.ok(
    listNamespaces(join(r, 'brains')).includes(ns),
    'an unfiltered enumeration must return the name, or this defect could not fire',
  );

  const res = resolvePointer(r, ns);
  assert.equal(res.present, true, 'a legal ordinary name must resolve, not be refused');
  assert.equal(res.generation, seeded.generation);
});
