/**
 * paths.test.mjs — the ONE escape predicate behind every path redaction in the consult lane.
 * Run: node --test scripts/context-gateway/tests/paths.test.mjs
 *
 * WHY THESE ARE UNIT TESTS AND NOT AN E2E:
 * The previous attempt to pin `shortPath` was an end-to-end test that ran the launcher with an
 * `--out` outside cwd and asserted the printed path contained no `../`. It passed — because the
 * process exits at the spend gate long before the line under test runs, so stdout was EMPTY and
 * both assertions were true of `''`. A test that cannot fail is worse than no test: it reads as
 * coverage. Measured directly: `stdout length: 0` (Kimi round 6, S2).
 *
 * `shortPath` is reachable only on the SUCCESS path, which needs a real paid provider call — so an
 * honest E2E is not available without a transport stub. The function is therefore exported and
 * tested directly, where every escape shape can actually be exercised.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sep, join } from 'node:path';

import { escapes, escapesFrom, shortPath, relativizePath, finalSegment, isWindowsAbsolute } from '../src/paths.mjs';

// --- the predicate ------------------------------------------------------------------------------

test('a path inside the base does not escape', () => {
  assert.equal(escapes('docs/plan.md'), false);
  assert.equal(escapes(join('docs', 'plan.md')), false);
});

test('a bare `..` escapes', () => {
  assert.equal(escapes('..'), true);
});

test('a `..`-prefixed path escapes on either separator', () => {
  assert.equal(escapes(`..${sep}out.md`), true);
  assert.equal(escapes('../out.md'), true);
  assert.equal(escapes('../../Users/someone/out.md'), true);
});

test('an absolute path escapes, on EVERY platform', () => {
  // A `/`-rooted path is absolute on both — win32 `isAbsolute('/tmp/x')` is true, it is simply
  // drive-relative rather than drive-qualified.
  assert.equal(escapes('/tmp/out.md'), true);
  // Drive-qualified MUST escape everywhere. This assertion used to read
  // `process.platform === 'win32'`, which pinned the platform-DEPENDENT behaviour as correct —
  // while receiptV1.test.mjs asserted the POSIX-impossible unconditionally. The two files
  // contradicted each other, and the real consequence was a security hole: on POSIX the receipt
  // recorded `C:/Users/<name>/...` verbatim. Redaction is not allowed to be platform-conditional
  // (round 16, S1).
  assert.equal(escapes('D:\\other\\out.md'), true);
  assert.equal(escapes('C:/Users/someone/packet.md'), true);
});

test('REGRESSION: a Windows path is redacted even when the runtime does not recognise it', () => {
  // The exact leak: POSIX isAbsolute() says false, resolve() nests it under the root, relative()
  // hands it straight back, and the username lands in the receipt.
  const out = relativizePath('/repo', 'C:/Users/SomePerson/AppData/Local/Temp/packet.md');
  assert.equal(out, '<external>');
  assert.ok(!String(out).includes('SomePerson'), 'OS username survived on this platform');
});

test('a sibling whose NAME begins with dots is NOT an escape', () => {
  // `..foo/bar` is a real directory, not a traversal. Redacting it loses information for no gain —
  // and the blunt `startsWith('..')` policy that used to live in receiptV1 got this wrong.
  assert.equal(escapes('..foo/bar.md'), false);
  assert.equal(escapes('..hidden'), false);
});

// --- shortPath: what reaches stdout, stderr, and written artifacts -------------------------------

test('shortPath keeps an inside-base path readable', () => {
  assert.equal(shortPath(join('/repo', 'docs', 'plan.md'), '/repo'), join('docs', 'plan.md'));
});

test('shortPath reduces an outside-base path to its basename — no username can survive', () => {
  const out = shortPath('/home/someone/secret-project/out.md', '/repo');
  assert.equal(out, '.../out.md');
  assert.ok(!out.includes('someone'), 'OS username survived');
  assert.ok(!out.includes('secret-project'), 'directory name survived');
});

test('shortPath handles the exact-parent case', () => {
  assert.equal(shortPath('/repo', '/repo/sub'), '.../repo');
});

test('REGRESSION: a ../ escape never renders as a traversal path', () => {
  // This is the leak Kimi round 5 found INSIDE the round 4 fix: `isAbsolute` alone missed it, so
  // `../../Users/<name>/out.md` printed verbatim.
  const out = shortPath('/home/someone/out.md', '/home/someone/proj/sub');
  // Assert the exact contract. An earlier draft used `!out.includes('..')`, which is unsatisfiable
  // by construction — the redaction marker `.../` contains two dots itself. The code was correct;
  // the assertion was self-defeating, and would have forced a "fix" to correct output.
  assert.equal(out, '.../out.md');
  assert.ok(!/(^|[\\/])\.\.([\\/]|$)/.test(out), `a real traversal SEGMENT survived: ${out}`);
  assert.ok(!out.includes('someone'), 'OS username survived');
});

// --- relativizePath: what lands in the structured receipt ---------------------------------------

test('relativizePath returns null for an absent path', () => {
  assert.equal(relativizePath('/repo', null), null);
  assert.equal(relativizePath('/repo', undefined), null);
});

test('relativizePath marks an outside path <external> rather than recording it', () => {
  assert.equal(relativizePath('/repo', '/home/someone/packet.md'), '<external>');
});

test('relativizePath keeps an inside path, POSIX-normalized', () => {
  assert.equal(relativizePath('/repo', '/repo/docs/plan.md'), 'docs/plan.md');
});

test('relativizePath treats the root itself as <external>', () => {
  assert.equal(relativizePath('/repo', '/repo'), '<external>');
});

test('REGRESSION: relativizePath no longer over-redacts a dotted sibling', () => {
  // The old blunt `startsWith('..')` collapsed a legitimate in-repo `..foo/` to <external>.
  // Both helpers now share one predicate, so they cannot drift apart again (round 6, S6).
  assert.equal(relativizePath('/repo', '/repo/..foo/bar.md'), '..foo/bar.md');
});

test('shortPath and relativizePath agree on whether a path escapes — for any path but the root', () => {
  // Different renderings, one policy. Divergence here is how a fix lands in only one of them.
  // The qualifier matters: an earlier summary claimed unconditional agreement, which is FALSE for
  // the root itself (pinned separately below). An over-broad claim about what a test proves is the
  // same Rule 75 failure as an over-broad claim in a header (Kimi round 7, N2).
  for (const [root, p] of [
    ['/repo', '/repo/a/b.md'],
    ['/repo', '/home/someone/b.md'],
    ['/repo', '/repo/..foo/b.md'],
  ]) {
    const escaped = escapesFrom(root, p);
    assert.equal(shortPath(p, root).startsWith('.../'), escaped, `shortPath disagrees for ${p}`);
    assert.equal(relativizePath(root, p) === '<external>', escaped, `relativizePath disagrees for ${p}`);
  }
});

test('the ROOT ITSELF is the one documented divergence — pinned so nobody "simplifies" it away', () => {
  // The root does not escape (it is the base), but it is not a FILE INSIDE the repo either, so the
  // receipt records it as <external> on purpose. Both statements are correct; they just answer
  // different questions. Unifying them would silently change what a receipt means.
  assert.equal(escapesFrom('/repo', '/repo'), false);
  assert.equal(relativizePath('/repo', '/repo'), '<external>');
});

test('S1b: a BACKSLASH drive path is redacted on every platform — basename() alone is not enough', () => {
  // The S1 fix corrected escapes() so a drive-qualified path is DETECTED as escaping everywhere.
  // It left shortPath's redaction output using node's basename(), which splits only on the HOST
  // separator — so on POSIX the "redacted" render of C:\Users\<name>\packet.md was the whole
  // string, username intact. Detection improved, the leak survived: the class outlived the fix.
  // String.raw, NOT a quoted literal: '\U' is an unrecognized escape that JS silently drops the
  // backslash from, so the fixture becomes 'C:UsersSomePerson...' and the test proves nothing
  // about separator handling. Hit live while writing this very test (round 16 build note).
  const win = String.raw`C:\Users\SomePerson\AppData\Local\Temp\packet.md`;

  // Assert the PRIMITIVE, not just shortPath's composed output. node's basename() returns
  // 'packet.md' for this fixture ON WINDOWS, so a shortPath-only assertion passes against the
  // BUGGY code on the only machine this repo is developed on — vacuous exactly where S1 hid for
  // 15 rounds. finalSegment splits on a regex, so its behaviour is identical on every platform
  // and this assertion has teeth regardless of host.
  assert.equal(finalSegment(win), 'packet.md');
  assert.equal(finalSegment('C:/Users/SomePerson/packet.md'), 'packet.md');
  assert.equal(finalSegment('/home/someone/packet.md'), 'packet.md');
  // NOT String.raw here: a raw template ending in a backslash still escapes the closing backtick,
  // so the literal never terminates (SyntaxError at EOF). Explicit escapes for trailing-separator
  // fixtures only. A trailing separator yields the last real segment, matching basename semantics.
  assert.equal(finalSegment('C:\\Users\\SomePerson\\'), 'SomePerson');
  assert.equal(finalSegment('/'), '');

  const rendered = shortPath(win, '/repo');
  assert.equal(rendered, '.../packet.md');
  assert.ok(!rendered.includes('SomePerson'), 'the username must never survive redaction');
  // Forward-slash drive paths were already safe on POSIX; pin both so neither regresses alone.
  assert.equal(shortPath('C:/Users/SomePerson/packet.md', '/repo'), '.../packet.md');
  // And the receipt renderer, which shares the predicate, still answers <external> for both.
  assert.equal(relativizePath('/repo', win), '<external>');
  assert.equal(relativizePath('/repo', 'C:/Users/SomePerson/packet.md'), '<external>');
});

test('ALL THREE Windows-absolute shapes escape, not just the drive-qualified one', () => {
  // The first pass caught `C:\...` and stopped there, leaving two shapes recording verbatim on
  // POSIX: a UNC share (which leaks the SERVER name as well as the username) and a drive-less
  // rooted path. `escapes` takes the output of relative(), so these are asserted directly —
  // on Windows isAbsolute() would answer true for its own reasons and prove nothing about POSIX.
  // isWindowsAbsolute, NOT escapes: on Windows `isAbsolute` returns true for all three shapes for
  // its OWN reasons, so asserting through escapes() passes even with the shape predicate broken —
  // verified by mutation, the drive-letter-only regex left this test green on Windows. The
  // exported predicate is pure regex, so it means the same thing on every host.
  assert.equal(isWindowsAbsolute('C:\\Users\\SomePerson\\f.md'), true, 'drive + backslash');
  assert.equal(isWindowsAbsolute('C:/Users/SomePerson/f.md'), true, 'drive + forward slash');
  assert.equal(isWindowsAbsolute('\\\\fileserver\\share\\SomePerson\\f.md'), true, 'UNC share');
  assert.equal(isWindowsAbsolute('\\Users\\SomePerson\\f.md'), true, 'rooted, no drive letter');
  // ...and ordinary in-repo paths are untouched — over-redaction is safe, but not free.
  assert.equal(isWindowsAbsolute('docs/a.md'), false);
  assert.equal(isWindowsAbsolute('..foo/bar.md'), false);
  assert.equal(escapes('docs/a.md'), false);
  assert.equal(escapes('..foo/bar.md'), false, 'a sibling whose name begins with dots is NOT an escape');
});
