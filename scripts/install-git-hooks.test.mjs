/**
 * install-git-hooks.test.mjs — coverage for the hook-presence installer.
 * Run: node scripts/install-git-hooks.test.mjs
 *
 * WHY THIS EXISTS (GLM 5.3, panel 2026-08-23 — confirmed by reproduction)
 * "Nothing in this system distinguishes 'gate passed' from 'gate not installed'."
 *
 * Verified: a fresh clone of main has `core.hooksPath` unset, and a commit there succeeded
 * with the secret scan, frontend guards and constitution guard ALL silently skipped. Exit 0,
 * no warning. The same thing had already happened to three of this session's own commits.
 *
 * The state machine is tiny, and each branch has a distinct failure cost, so each is pinned:
 *   'unset' misread as ok    -> the gap stays invisible, which is the whole bug
 *   'other' overwritten      -> we clobber a deliberate config, and get removed for it
 *   'n/a' treated as failure -> `npm install` breaks in tarball/CI checkouts
 */
import assert from 'node:assert/strict';
import { hookState } from './install-git-hooks.mjs';

let pass = 0;
const fail = [];
const t = (name, fn) => {
  try { fn(); pass += 1; console.log(`  PASS  ${name}`); }
  catch (e) { fail.push(name); console.log(`  FAIL  ${name}\n        ${e.message}`); }
};

const base = { inRepo: true, hooksDirPresent: true, configured: null };

t('configured correctly → ok', () => {
  assert.equal(hookState({ ...base, configured: '.githooks' }).state, 'ok');
});

t('unset in a real repo with .githooks → unset (THE confirmed failure)', () => {
  assert.equal(hookState({ ...base, configured: null }).state, 'unset');
});

t('empty string is treated as unset, not as a custom path', () => {
  assert.equal(hookState({ ...base, configured: '' }).state, 'unset');
});

t('pointed somewhere else → other, and the current value is preserved for the message', () => {
  const r = hookState({ ...base, configured: '.husky' });
  assert.equal(r.state, 'other');
  assert.equal(r.current, '.husky', 'must report what it found so the human can judge it');
});

t('not a git checkout → n/a (npm install must not break in a tarball)', () => {
  assert.equal(hookState({ ...base, inRepo: false }).state, 'n/a');
});

t('no .githooks directory → n/a (nothing to point at)', () => {
  assert.equal(hookState({ ...base, hooksDirPresent: false }).state, 'n/a');
});

t('n/a wins even when a path is configured — never judge a repo we are not in', () => {
  assert.equal(hookState({ inRepo: false, hooksDirPresent: false, configured: '.githooks' }).state, 'n/a');
});

t('every state is one of the four known values', () => {
  const seen = new Set();
  for (const inRepo of [true, false]) {
    for (const hooksDirPresent of [true, false]) {
      for (const configured of [null, '', '.githooks', '.husky']) {
        seen.add(hookState({ inRepo, hooksDirPresent, configured }).state);
      }
    }
  }
  assert.deepEqual([...seen].sort(), ['n/a', 'ok', 'other', 'unset']);
});

t('ONLY .githooks counts as ok — a near-miss path must not pass', () => {
  for (const near of ['githooks', './.githooks', '.githooks/', '.git/hooks']) {
    assert.notEqual(hookState({ ...base, configured: near }).state, 'ok', `"${near}" must not read as ok`);
  }
});

console.log(`\ninstall-git-hooks: ${pass} passed, ${fail.length} failed`);
if (fail.length) process.exit(1);
