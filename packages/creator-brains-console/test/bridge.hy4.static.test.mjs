/**
 * bridge.hy4.static.test.mjs — the H3 static-resolution tests, extracted from
 * `bridge.hy4.test.mjs` when that file crossed the 300-line cap (Rule 4).
 *
 * These two tests are a self-contained subject: `resolveStatic` called directly
 * against a REAL document root, plus the malformed-encoding refusal. They share
 * no fixture with the H4/H5 sections, so they move without dragging anything.
 *
 * The containment block below was rewritten in round 9 after Astra P2 #1: the
 * original asserted `!escapes(dist, resolved)` inside `if (resolved !== null)`,
 * a branch that NO traversal shape ever entered (measured: 0 of 7), so the
 * assertion was unexecuted and its inversion was trivially green.
 *
 * @module creator-brains-console/test/bridge.hy4.static
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { join, resolve, sep, basename } from 'node:path';

import { resolveStatic } from '../server.mjs';
import { tempRoot } from '../../../scripts/creator-brains/test/helpers.mjs';
import { escapes } from './path-containment.mjs';

/* ── H3 · traversal, tested against a REAL webroot ───────────────────────── */

test('HY4-H3: static containment holds against a real document root', () => {
  // The root cause of the vacuous original: `WEB_DIST` is absent until the UI
  // slice lands, so a live-server traversal test could only ever observe the
  // fallback status page. This version calls the resolver DIRECTLY against a
  // real root containing a real file inside it and a real file outside it, so
  // the containment check actually executes.
  const root = tempRoot('hy4-webroot');
  const dist = join(root, 'dist');
  mkdirSync(dist, { recursive: true });
  writeFileSync(join(dist, 'inside.txt'), 'INSIDE-OK', 'utf8');
  writeFileSync(join(root, 'outside.txt'), 'OUTSIDE-SECRET', 'utf8');

  // The positive half. Without it, a "containment" fix that refused everything
  // would satisfy every assertion below and break the static server.
  const legal = resolveStatic('/inside.txt', dist);
  assert.ok(legal, 'a legal file inside the root must resolve');
  assert.equal(legal, join(dist, 'inside.txt'));

  // Every traversal shape must fail, and the STRONGER claim is the one asserted:
  // nothing at all resolves. An earlier revision checked
  // `assert.notEqual(resolved, outside)` inside `if (resolved !== null)` — an
  // assertion that never executed, because all seven shapes return null (round 9,
  // Astra P2 #1: measured 0 of 7 entered the branch). As written it also could not
  // have caught a real escape: `normalize()` strips the leading `../` BEFORE the
  // resolver's separator-aware guard runs, so any escaping shape lands as a sibling
  // name and is refused by the existence check regardless of the guard.
  for (const path of [
    '/../outside.txt',
    '/..%2Foutside.txt',
    '/%2e%2e/outside.txt',
    '/../../outside.txt',
    '/....//outside.txt',
    '/..%5Coutside.txt',
    '/%2e%2e%2foutside.txt',
    '/a/../../outside.txt',
    '/a/../../dist-evil/inside.txt',
  ]) {
    const resolved = resolveStatic(path, dist);
    assert.equal(resolved, null,
      `'${path}' must not resolve to anything (got ${JSON.stringify(resolved)})`);
  }

  // A DIFFERENT PATH THAT DOES RESOLVE, so the containment predicate is exercised
  // rather than assumed. These five shapes look like traversals and normalise INTO the
  // root (measured); `/....//` and `/..%2e/` do not, because the four-dot and three-dot
  // forms are literal directory names.
  for (const path of ['/../inside.txt', '/%2e%2e/inside.txt', '/../../inside.txt',
    '/a/../inside.txt', '/..%2Finside.txt']) {
    const resolved = resolveStatic(path, dist);
    assert.equal(resolved, join(dist, 'inside.txt'),
      `'${path}' must normalise into the root, not out of it`);
    assert.ok(!escapes(dist, resolved), `'${path}' resolved outside the root`);
  }

  // THE PREDICATE'S DISCRIMINATING POWER, pinned where it is actually observable.
  // The two calls above cannot tell `escapes()` apart from a prefix test — an inside
  // path satisfies both, and an escaped path never reaches them. The case that DOES
  // separate them is a SIBLING whose name begins with the root's: a prefix test calls
  // it inside, `escapes()` calls it escaped. This is the R8-07 class, asserted here
  // against the real filesystem rather than only in the predicate's own unit test.
  const sibling = join(root, 'dist-evil');
  mkdirSync(sibling, { recursive: true });
  writeFileSync(join(sibling, 'inside.txt'), 'SIBLING-SECRET', 'utf8');
  const siblingFile = join(sibling, 'inside.txt');
  assert.ok(siblingFile.startsWith(dist), 'precondition: the prefix test misjudges this path');
  assert.ok(escapes(dist, siblingFile), 'the predicate must judge a dist-prefixed sibling as OUTSIDE');
  // And the resolver agrees, refusing it whatever route is taken.
  assert.equal(resolveStatic('/a/../../dist-evil/inside.txt', dist), null);
});

test('HY4-H3: a malformed percent-encoding is refused, not thrown', () => {
  // `decodeURIComponent` throws on a truncated escape sequence. An uncaught
  // throw here would be a 500 on a URL any crawler can produce.
  const root = tempRoot('hy4-badpct');
  mkdirSync(root, { recursive: true });
  assert.equal(resolveStatic('/%E0%A4%A', root), null);
  assert.equal(resolveStatic('/%zz', root), null);
});

test('HY4-H3 (LINK): a junction inside dist cannot smuggle a read out of the root', () => {
  // MEASURED DEFECT, round 9 (Astra P2 #2). `resolveStatic` checked the PATH STRING
  // while `readStatic` FOLLOWS the file. A junction at `dist/linked -> ../outside`
  // therefore satisfied every lexical test — the resolver returned
  // `...\dist\linked\secret.txt`, `escapes()` called it INSIDE — and the read returned
  // the OUTSIDE file's contents. No spelling-based predicate can catch this; only a
  // real-path check can, which is the one this asserts.
  const root = tempRoot('hy4-link');
  const dist = join(root, 'dist');
  const outside = join(root, 'outside');
  mkdirSync(dist, { recursive: true });
  mkdirSync(outside, { recursive: true });
  writeFileSync(join(dist, 'inside.txt'), 'INSIDE-OK', 'utf8');
  writeFileSync(join(outside, 'secret.txt'), 'OUTSIDE-SECRET-VALUE', 'utf8');

  // A junction needs no elevation on Windows, unlike a directory symlink.
  symlinkSync(outside, join(dist, 'linked'), 'junction');

  // The positive control first: an ordinary file still resolves, so a resolver that
  // simply refused every path would not satisfy this test.
  assert.equal(resolveStatic('/inside.txt', dist), join(dist, 'inside.txt'));

  // The defect: this returned a non-null path whose read escaped the root.
  assert.equal(resolveStatic('/linked/secret.txt', dist), null,
    'a link out of the document root must not resolve');
  // And through the real route the caller takes, nothing is served.
  assert.equal(resolveStatic('/linked/../inside.txt', dist), join(dist, 'inside.txt'),
    'a path that normalises back inside is still served');
});

test('HY4-H3 (ROOT BASE): a filesystem root as the document root still serves its children', () => {
  // MEASURED DEFECT, round 9c (Astra P3 #6, "additional edge"). The lexical test was
  // `target.startsWith(base + sep)`. When `base` IS a filesystem root that expression
  // spells a DOUBLED separator, and no ordinary child starts with it, so EVERY descendant
  // was refused. The component check replaced it.
  //
  // ── WHY THIS CASE SELECTS ITS BASE INSTEAD OF USING `resolve(sep)` ──────────
  //
  // The first version called `resolve(sep)` — `C:\` — and wrote a probe file there. That
  // write raises EPERM without elevation, the `catch` returned early, and the case then
  // asserted ONLY its precondition: it passed on the pre-fix form too, so it verified
  // nothing. Measured by mutating the resolver back to `base + sep` and watching this
  // case stay green. An unexecuted assertion is not a passing assertion, and a `catch`
  // that returns quietly is how it hides.
  //
  // So the base is CHOSEN at runtime from the mounted drives, and if no writable root is
  // found the case FAILS. A skip would restore exactly the silence this case exists to
  // remove; the honest report for an unavailable precondition is a failure that says so.
  const base = 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
    .map((d) => `${d}:${sep}`)
    .find((root) => {
      try {
        const probe = join(root, `hy4-rootprobe-${process.pid}.tmp`);
        writeFileSync(probe, 'x');
        rmSync(probe, { force: true });
        return true;
      } catch { return false; }
    });
  assert.ok(base, 'no writable filesystem root is available, so this case cannot run');

  // THE PRECONDITION, and it is the whole defect in one line: a root base dangles a
  // separator, so a string test refuses every child of it.
  const child = join(base, `hy4-rootbase-${process.pid}.txt`);
  assert.ok(!child.startsWith(base + sep),
    'precondition: a root base dangles a separator, so a string test refuses the child');

  try {
    writeFileSync(child, 'ROOT-BASE-OK', 'utf8');
    // THE ASSERTION THE PREVIOUS VERSION NEVER REACHED.
    assert.equal(resolveStatic(`/${basename(child)}`, base), child,
      'a child of a root document root must resolve');
    // And containment still refuses a sibling of nothing: an escaping path stays refused,
    // so the fix is not "accept everything under a root base".
    assert.equal(resolveStatic('/../outside.txt', base), null,
      'a root base must still refuse an escaping path');
  } finally {
    rmSync(child, { force: true });
  }
});
