/**
 * is-main-module.test.mjs — the guard on scripts that act when loaded.
 * ==============================================================================
 *
 * Three scripts here install packages or spawn test runs at module scope. This decides
 * whether they do it. Getting it wrong in the "false" direction means a repair tool exits
 * 0 having done nothing, silently, while the operator believes the environment is fixed —
 * which is worse than the breakage being repaired.
 *
 * The version this replaced compared URL strings:
 *   `import.meta.url === pathToFileURL(process.argv[1]).href`
 * On Windows that folds no case, and `C:` and `c:` produce different hrefs. Measured, not
 * assumed. A reviewer found it; nothing here would have.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { isMainModule } from './is-main-module.mjs';

const WIN = process.platform === 'win32';
const argv1 = () => process.argv[1];

test('true when the module IS the entry point', () => {
  // node --test runs this file as the entry, so its own url must match.
  assert.equal(isMainModule(pathToFileURL(argv1()).href), true);
});

test('false for a module that is merely imported', () => {
  assert.equal(isMainModule(pathToFileURL('/definitely/not/the/entry.mjs').href), false);
});

test('THE ONE THE OLD GUARD FAILED: a differently-cased drive letter still matches', {
  skip: WIN ? false : 'win32-only — POSIX paths are case-sensitive and must stay so',
}, () => {
  // pathToFileURL('C:\\x') and pathToFileURL('c:\\x') differ as strings. A shell, npm
  // script or editor handing over a lower-cased drive made the old guard false, and the
  // script then did nothing at all, exiting 0.
  const entry = argv1();
  const flipped = entry[0] === entry[0].toUpperCase()
    ? entry[0].toLowerCase() + entry.slice(1)
    : entry[0].toUpperCase() + entry.slice(1);

  assert.notEqual(pathToFileURL(entry).href, pathToFileURL(flipped).href,
    'precondition: the two casings must differ as URLs, or this test proves nothing');
  assert.equal(isMainModule(pathToFileURL(flipped).href), true);
});

test('POSIX case sensitivity is preserved — two real files are not confused', {
  skip: WIN ? 'win32 folds case by design' : false,
}, () => {
  // Folding case everywhere would make /a/File.mjs and /a/file.mjs — which can both exist
  // on Linux — look like the same module. The fix must not create that.
  const entry = argv1();
  const flipped = entry.toUpperCase();
  if (flipped === entry) return;
  assert.equal(isMainModule(pathToFileURL(flipped).href), false);
});

test('no argv[1] answers false rather than throwing', () => {
  const saved = process.argv[1];
  try {
    process.argv[1] = undefined;
    assert.equal(isMainModule(pathToFileURL(saved).href), false);
  } finally { process.argv[1] = saved; }
});

test('garbage input answers false rather than throwing', () => {
  // This runs inside scripts that install and delete. Throwing from the guard would take
  // the script down; answering "true" by accident would run it when nobody asked.
  assert.equal(isMainModule(''), false);
  assert.equal(isMainModule(undefined), false);
  assert.equal(isMainModule('not-a-url'), false);
  assert.equal(isMainModule('file:///nope/\u0000/bad'), false);
});

test('it fails toward IMPORTED, which is the safe direction', () => {
  // The two failure directions are not symmetric. A false negative means a script does not
  // run when invoked — loud and immediate. A false positive means a script that installs
  // or deletes fires during an unrelated import. Every error path must land on false.
  const saved = process.argv[1];
  try {
    process.argv[1] = '\u0000invalid\u0000';
    assert.equal(isMainModule(pathToFileURL(saved).href), false);
  } finally { process.argv[1] = saved; }
});
