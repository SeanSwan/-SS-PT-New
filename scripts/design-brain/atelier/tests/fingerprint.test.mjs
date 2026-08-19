/** Positive controls: the gate must FIRE on injected defects, and pass clean input. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collisions, wildcardAlien, fingerprint } from '../fingerprint.mjs';

const mk = (id, nav, hero, grid, wildcard = false) =>
  ({ id, nav_model: nav, hero_mechanics: hero, grid, wildcard });

test('clean set: no collisions, wildcard alien', () => {
  const set = [
    mk('a', 'side-rail', 'split', '12col'),
    mk('b', 'none', 'full-bleed', '1col'),
    mk('w', 'masthead', 'cover', 'cover-grid', true),
  ];
  assert.equal(collisions(set).length, 0);
  assert.equal(wildcardAlien(set), true);
});

test('POSITIVE CONTROL — identical triple fires collision (exit-2 path)', () => {
  const set = [mk('a', 'top', 'split', '12col'), mk('b', 'top', 'split', '12col')];
  const dupes = collisions(set);
  assert.equal(dupes.length, 1);
  assert.deepEqual(dupes[0], ['a', 'b']);
});

test('POSITIVE CONTROL — tame wildcard fires alienness check (exit-3 path)', () => {
  const set = [mk('a', 'top', 'split', '12col'), mk('w', 'top', 'split', 'cover-grid', true)];
  assert.equal(wildcardAlien(set), false); // differs on only 1 of 3 fields
});

test('one-field difference is NOT a collision (dressing-level variance allowed)', () => {
  const set = [mk('a', 'top', 'split', '12col'), mk('b', 'top', 'split', '2col')];
  assert.equal(collisions(set).length, 0);
});

test('fingerprint is exactly the three contract fields', () => {
  assert.equal(fingerprint(mk('x', 'n', 'h', 'g')), 'n|h|g');
});
