/**
 * dep-drift.test.mjs — the two states, and the one that must not be silent.
 * ==============================================================================
 *
 * WHY THIS FILE EXISTS. On 2026-09-01 twelve backend suites — four security probes —
 * had never executed on this machine, because two declared dependencies were not
 * installed. A file that cannot LOAD is reported by the runner as a failing FILE with
 * zero tests, which is indistinguishable from ordinary failure.
 *
 * Installing them fixed today and created a worse tomorrow: the packages now exist on
 * disk while declared in NO manifest the owning checkout reads, so the next `npm ci`
 * there deletes them and the suites go quiet again. **That second state is what this
 * detector is for.** `missing` you would eventually notice. `atRisk` looks healthy
 * right up until it is not, and nothing else in the repository can see it.
 *
 * So the case that matters most below is the one where everything is installed and the
 * function must still report a problem.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyDeps, describeDepDrift } from './dep-drift.mjs';

const installedAll = () => true;
const installedNone = () => false;

test('a declared package that is not installed is MISSING', () => {
  const { missing, atRisk } = classifyDeps({
    declared: { jose: '6.2.4' }, isInstalled: installedNone, ownerDeclared: null,
  });
  assert.deepEqual(missing, ['jose']);
  assert.deepEqual(atRisk, []);
});

test('a package installed and declared by the owner is neither', () => {
  const { missing, atRisk } = classifyDeps({
    declared: { express: '^4' }, isInstalled: installedAll,
    ownerDeclared: new Set(['express']),
  });
  assert.deepEqual(missing, []);
  assert.deepEqual(atRisk, []);
});

test('THE ONE THAT MATTERS: installed, declared here, absent from the owner = AT RISK', () => {
  // Everything resolves. Every suite passes. And a clean install in the checkout that
  // owns the shared folder deletes it, because that manifest has never heard of it.
  const { missing, atRisk } = classifyDeps({
    declared: { jose: '6.2.4', express: '^4' },
    isInstalled: installedAll,
    ownerDeclared: new Set(['express']),
  });
  assert.deepEqual(missing, []);
  assert.deepEqual(atRisk, ['jose']);
});

test('nothing is at risk when the folder is not shared', () => {
  // ownerDeclared === null means node_modules is this checkout's own. It cannot be
  // reinstalled out from under this manifest, so reporting would be pure noise — and a
  // detector that cries wolf is one nobody reads.
  const { atRisk } = classifyDeps({
    declared: { jose: '6.2.4' }, isInstalled: installedAll, ownerDeclared: null,
  });
  assert.deepEqual(atRisk, []);
});

test('a missing package is not ALSO reported as at-risk', () => {
  // It is one problem. Reporting it twice, under two headings with two remedies, is how
  // an operator learns to skim the output.
  const { missing, atRisk } = classifyDeps({
    declared: { jose: '6.2.4' }, isInstalled: installedNone,
    ownerDeclared: new Set(),
  });
  assert.deepEqual(missing, ['jose']);
  assert.deepEqual(atRisk, []);
});

test('an empty manifest yields nothing rather than throwing', () => {
  const r = classifyDeps({ declared: {}, isInstalled: installedAll, ownerDeclared: null });
  assert.deepEqual(r, { missing: [], atRisk: [] });
});

test('called with no arguments at all it still answers', () => {
  // This runs inside a SessionStart hook. Throwing here would break a session over a
  // diagnostic, and the first thing anyone does with a hook that breaks sessions is
  // delete it.
  const r = classifyDeps();
  assert.deepEqual(r, { missing: [], atRisk: [] });
});

test('names come back sorted, so the finding text is stable run to run', () => {
  // An unstable ordering makes two identical states look like two different findings.
  const { missing } = classifyDeps({
    declared: { zulu: '1', alpha: '1', mike: '1' }, isInstalled: installedNone,
  });
  assert.deepEqual(missing, ['alpha', 'mike', 'zulu']);
});

test('silence when there is nothing to say', () => {
  assert.deepEqual(describeDepDrift({ label: 'backend' }), []);
});

test('the MISSING text says a file cannot LOAD, not that a test failed', () => {
  // The whole reason this went unnoticed for weeks: the runner called it a failing file
  // and the operator read "failing test". The wording has to break that reading.
  const [text] = describeDepDrift({ label: 'backend', missing: ['jose'] });
  assert.match(text, /NOT INSTALLED/);
  assert.match(text, /cannot LOAD/);
  assert.match(text, /jose/);
});

test('the AT-RISK text names the remedy and what destroys it', () => {
  // A finding that says "this is fragile" and not "npm ci deletes it" leaves the reader
  // to guess at both the cause and the fix.
  const [text] = describeDepDrift({
    label: 'backend', atRisk: ['jose', 'sanitize-html'], ownerPath: 'C:/owner/backend',
  });
  assert.match(text, /npm ci/);
  assert.match(text, /DELETES/);
  assert.match(text, /C:\/owner\/backend/);
  assert.match(text, /moves to a branch that declares them/);
});

test('both states in one manifest produce two separate findings', () => {
  // They have different causes and different remedies. Merging them would force one
  // sentence to describe both, and it would describe neither.
  const out = describeDepDrift({ label: 'backend', missing: ['a'], atRisk: ['b'] });
  assert.equal(out.length, 2);
  assert.match(out[0], /NOT INSTALLED/);
  assert.match(out[1], /installed here/);
});

test('singular and plural read correctly, because a detector nobody trusts gets ignored', () => {
  const [one] = describeDepDrift({ label: 'x', missing: ['a'] });
  assert.match(one, /dependency is/);
  const [many] = describeDepDrift({ label: 'x', missing: ['a', 'b'] });
  assert.match(many, /dependencies are/);
});
