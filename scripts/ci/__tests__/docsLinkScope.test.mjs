/**
 * S17 guard tests for the documentation link gate.
 *
 * These cover the part of the gate that is easy to get quietly wrong: which
 * files are checked at all. A scope rule that silently widens is how a green
 * check stops meaning anything, so the exclusion manifest is treated as a
 * reviewed artifact rather than a convenient list.
 *
 * Network-free. Run with: node --test scripts/ci/__tests__/docsLinkScope.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { partition, listTrackedMarkdown, readJson } from '../check-docs-links.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');
const MANIFEST_PATH = path.join(ROOT, 'scripts', 'ci', 'docs-link-scope.json');

// Use the gate's own reader so the tests and the gate agree on BOM tolerance.
const manifest = readJson(MANIFEST_PATH);
const tracked = listTrackedMarkdown(ROOT);

test('partition: files under an excluded prefix leave the checked scope', () => {
  const m = { excludedPaths: [{ path: 'frozen/', reason: 'r', classification: 'c', evidence: 'e' }] };
  const { inScope, excluded } = partition(['a.md', 'frozen/b.md', 'frozenx/c.md'], m);
  assert.deepEqual(inScope, ['a.md', 'frozenx/c.md'], 'prefix must match on a path boundary, not a string prefix');
  assert.deepEqual(excluded.map((x) => x.file), ['frozen/b.md']);
});

test('partition: every tracked file lands in exactly one bucket', () => {
  const { inScope, excluded } = partition(tracked, manifest);
  assert.equal(inScope.length + excluded.length, tracked.length);
  const seen = new Set([...inScope, ...excluded.map((x) => x.file)]);
  assert.equal(seen.size, tracked.length, 'a file must not be counted twice');
});

test('manifest: every exclusion carries classification, reason and evidence', () => {
  assert.ok(manifest.excludedPaths.length > 0, 'an empty exclusion list would be a silent scope change');
  for (const e of manifest.excludedPaths) {
    assert.equal(typeof e.path, 'string');
    assert.ok(e.path.endsWith('/'), `exclusion must be a directory prefix: ${e.path}`);
    assert.ok(e.classification && e.classification.length > 3, `missing classification: ${e.path}`);
    assert.ok(e.reason && e.reason.length > 30, `reason is too thin to review: ${e.path}`);
    assert.ok(e.evidence && e.evidence.length > 10, `missing evidence: ${e.path}`);
  }
});

test('manifest: exclusions are real, non-empty, and do not swallow the repository', () => {
  for (const e of manifest.excludedPaths) {
    assert.notEqual(e.path, '/', 'excluding the root would disable the check');
    assert.notEqual(e.path, './', 'excluding the root would disable the check');
    const matches = tracked.filter((f) => f.startsWith(e.path));
    assert.ok(matches.length > 0, `exclusion matches no tracked Markdown (dead entry): ${e.path}`);
  }
});

test('manifest: no exclusion is nested inside another', () => {
  const paths = manifest.excludedPaths.map((e) => e.path);
  for (const p of paths) {
    const parents = paths.filter((q) => q !== p && p.startsWith(q));
    assert.deepEqual(parents, [], `${p} is already covered by ${parents.join(', ')}`);
  }
});

test('manifest: every exclusion belongs to a declared frozen class', () => {
  // The real guard against scope creep. A ratio test is the wrong instrument
  // here: this repository genuinely holds more archived Markdown than live
  // Markdown, so "checked scope is the majority" is false by construction and
  // asserting it would only invite someone to weaken the assertion. Instead,
  // each exclusion must match a machine-checkable class pattern stating WHY it
  // is frozen. A new exclusion for, say, docs/ai-workflow/references/ fails
  // this test until someone writes and defends a pattern for it.
  const ALLOWED_CLASSES = new Set([
    'vendored upstream content',
    'archive-only historical record',
    'QA artifact / generated output',
  ]);
  for (const e of manifest.excludedPaths) {
    assert.ok(ALLOWED_CLASSES.has(e.classification), `unrecognised classification: ${e.classification}`);
    assert.equal(typeof e.classPattern, 'string', `missing classPattern for ${e.path}`);
    assert.match(e.path, new RegExp(e.classPattern), `${e.path} does not match its own classPattern`);
  }
});

test('manifest: exclusions do not grow between recordings', () => {
  // Scope is shrink-only, like the dead-link ledger. `files` is written by
  // `--record`; a later run that matches more files than the recording means an
  // exclusion widened (a directory gained content, or a prefix was loosened).
  for (const e of manifest.excludedPaths) {
    assert.equal(typeof e.files, 'number', `missing files baseline for ${e.path}; run --record`);
  }
  const { excluded } = partition(tracked, manifest);
  for (const e of manifest.excludedPaths) {
    const observed = excluded.filter((x) => x.entry.path === e.path).length;
    assert.ok(
      observed <= e.files,
      `${e.path} now excludes ${observed} files, up from the recorded ${e.files}`,
    );
  }
});

test('manifest: every recorded ledger baseline is a finite number', () => {
  // Shrink-only ledger: an entry with no recorded baseline cannot be compared,
  // so it would grow silently. NaN and Infinity are `typeof 'number'` and would
  // pass a naive check while making every comparison false, so assert finiteness.
  for (const e of manifest.excludedPaths) {
    for (const key of ['files', 'deadLinks', 'unreadable']) {
      assert.ok(
        Number.isFinite(e[key]),
        `${e.path}.${key} must be a finite recorded number; run --record`,
      );
    }
  }
});

test('enumeration returns real paths, never git C-quoted strings', () => {
  // `git ls-files` C-quotes paths containing non-ASCII characters unless -z is
  // used. If that quoting ever leaked into the enumeration, every prefix match
  // for a frozen directory would silently fail on those files and they would be
  // pulled into the checked scope. -z is the whole defence; assert it holds.
  const quoted = tracked.filter((f) => f.startsWith('"'));
  assert.deepEqual(quoted, [], 'git returned C-quoted paths; use `git ls-files -z`');
});

test('non-ASCII filenames are still matched by their exclusion prefix', () => {
  const nonAscii = tracked.filter((f) => /[^\u0000-\u007F]/.test(f));
  const { inScope } = partition(tracked, manifest);
  const leaked = nonAscii.filter((f) => inScope.includes(f));
  assert.deepEqual(
    leaked,
    [],
    `non-ASCII files leaked into the checked scope (they live under frozen paths): ${leaked.join(', ')}`,
  );
});

test('no frozen path leaks into the checked scope', () => {
  const { inScope } = partition(tracked, manifest);
  const leak = inScope.filter((f) => manifest.excludedPaths.some((e) => f.startsWith(e.path)));
  assert.deepEqual(leak, [], `excluded paths present in the checked scope: ${leak.join(', ')}`);
});

test('manifest: the exclusion set is pinned, so widening it is a conscious act', () => {
  // Hostile review showed that asserting "each path matches its own declared
  // classPattern" is not a guard: an author adding a live directory simply writes
  // a matching pattern for it. Pin the exact set instead. Adding or removing an
  // exclusion now fails here until this list is updated in the same commit, which
  // puts the change in the diff where a reviewer sees it.
  const PINNED = [
    '.agents/',
    '.claude/',
    '.continue/',
    '.cursor/',
    'archive/',
    'docs/ai-workflow/archive/',
    'docs/_attic/',
    'AI-Village-Documentation/validation-prompts/',
    'docs/ai-workflow/validation-reports/',
    'docs/ai-workflow/AI-HANDOFF/',
  ];
  assert.deepEqual(
    manifest.excludedPaths.map((e) => e.path).sort(),
    [...PINNED].sort(),
    'the exclusion set changed; update PINNED deliberately and justify it in review',
  );
});

test('manifest: an active write target may not be excluded by prefix alone', () => {
  // docs/ai-workflow/AI-HANDOFF/ is where CLAUDE.md rule 48 requires audit records
  // to be written. Excluding it wholesale would exempt every future audit record
  // from the link check, so it must freeze an explicit file list and let new files
  // through. The list lives in the manifest rather than being derived from a pinned
  // commit: `actions/checkout` fetches one commit by default, so a commit-based
  // freeze cannot be resolved in CI and exits 2 on every trigger.
  const handoff = manifest.excludedPaths.find((e) => e.path === 'docs/ai-workflow/AI-HANDOFF/');
  assert.ok(handoff, 'AI-HANDOFF entry missing');
  assert.equal(handoff.freezeMode, 'files', 'an active write target must use freezeMode "files"');
  assert.ok(Array.isArray(handoff.frozenFiles) && handoff.frozenFiles.length > 0, 'frozenFiles must be a non-empty recorded list');
  for (const f of handoff.frozenFiles) {
    assert.ok(f.startsWith(handoff.path), `frozen file outside its own prefix: ${f}`);
  }
  assert.equal(
    typeof handoff.frozenAsOf,
    'undefined',
    'a commit-based freeze is unresolvable in a depth-1 CI checkout',
  );
});

test('partition: with a frozen file list, a NEW file in that directory is checked', () => {
  const m = {
    excludedPaths: [
      {
        path: 'active/',
        classification: 'c',
        reason: 'r',
        evidence: 'e',
        freezeMode: 'files',
        frozenFiles: ['active/old.md'],
      },
    ],
  };
  const { inScope, excluded } = partition(['active/old.md', 'active/brand-new.md'], m);
  assert.deepEqual(excluded.map((x) => x.file), ['active/old.md']);
  assert.deepEqual(inScope, ['active/brand-new.md'], 'a newly written file must not inherit the freeze');
});

test('partition: without a frozen list the whole prefix stays excluded', () => {
  const m = {
    excludedPaths: [
      { path: 'generated/', classification: 'c', reason: 'r', evidence: 'e' },
    ],
  };
  const { inScope, excluded } = partition(['generated/a.md', 'generated/b.md'], m);
  assert.deepEqual(inScope, []);
  assert.equal(excluded.length, 2, 'generated output stays excluded however many files appear');
});

test('live documentation entry points stay in the checked scope', () => {
  // Guards the paths a reader is most likely to land on. If one of these ever
  // appears in the exclusion list, the check has stopped covering real docs.
  const { inScope } = partition(tracked, manifest);
  const mustBeChecked = ['docs/index.md', 'README.md', 'docs/ai-workflow/README.md'];
  for (const f of mustBeChecked) {
    if (!tracked.includes(f)) continue;
    assert.ok(inScope.includes(f), `${f} must remain in the checked scope`);
  }
});
