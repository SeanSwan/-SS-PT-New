/*
 * R7-02 — THE STORE IS THE SUBJECT, SO THE STORE IS THE FILENAME
 * (Astra round 7, 2026-09-20).
 *
 * THE DEFECT. `listNamespaces` called `damaged(message)` with ONE argument, so it took
 * `damaged`'s default `file: 'current.json'`. A failure to LIST the brains store was
 * therefore reported against a pointer file that has nothing to do with it — the console
 * would tell the operator that `current.json` was damaged when the store root was the
 * thing it could not read. `countPublished` carries that name through in `extra.file`,
 * so it reaches the UI.
 *
 * WHY IT IS THE NEIGHBOURING ROW OF R6-02'S CLASS. Round 6 fixed exactly this for the
 * store root RESOLUTION in `containment.mjs` — "a root failure names `brains`" — and left
 * the root ENUMERATION here untouched, one function over, in the same module chain. This
 * is the fifth round in which a fix closed the named row and left the adjacent one
 * standing.
 *
 * WHAT THE ERRNO IS ON THIS HOST, MEASURED. `readdirSync` on an ordinary FILE reports
 * **ENOTDIR** on Windows as well as on POSIX (measured 2026-09-20), so the fault below is
 * platform-independent — unlike R6-01's ordering defect, which was ENOTDIR-only and so
 * invisible here. `ENOENT` is still the one errno that means ABSENCE, and R7-02c is the
 * control that keeps the fix from turning a first run into damage.
 *
 * @module creator-brains-console/test/pointer.r7
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { tempRoot } from '../../../scripts/creator-brains/test/helpers.mjs';
import { listNamespaces } from '../lib/pointer.mjs';
import { countPublished } from '../lib/read-surface.mjs';
import { fixtureRoot } from './fixtures.mjs';

/** A root whose `brains` entry is an ordinary FILE, so listing it fails with ENOTDIR. */
function unlistableStore(label) {
  const r = fixtureRoot(label);
  rmdirSync(join(r, 'brains'));
  writeFileSync(join(r, 'brains'), 'not a directory\n', 'utf8');
  return r;
}

test('R7-02a: a store that cannot be LISTED names `brains`, not `current.json`', () => {
  const r = unlistableStore('r702a');
  assert.throws(
    () => listNamespaces(join(r, 'brains')),
    (err) => {
      assert.equal(err.code, 'STORE_DAMAGED');
      assert.equal(err.extra.file, 'brains', 'the file named is the one that failed');
      assert.match(err.message, /ENOTDIR/, 'and it names the errno rather than hiding it');
      return true;
    },
  );
});

test('R7-02b: the name reaches the STATUS count, so it is user-visible', () => {
  const r = unlistableStore('r702b');
  // The observable path, not just the helper: this is the shape the console renders.
  const { count, damage } = countPublished(r);
  assert.equal(count, null, 'a count that cannot be taken is null, never 0');
  assert.ok(damage, 'and the damage is named');
  assert.equal(damage.file, 'brains', 'NOT `current.json` — that file is not the problem');
});

test('R7-02c: an ABSENT store is still not damage, so a first run is not a refusal', () => {
  const d = tempRoot('r702c');
  mkdirSync(d, { recursive: true });

  // The control in the other direction. `ENOENT` is the only errno that means absence,
  // and naming the subject must not turn "there is no store yet" into a fault.
  assert.deepEqual(listNamespaces(join(d, 'brains')), []);
  assert.deepEqual(countPublished(d), { count: 0, damage: null });
});
