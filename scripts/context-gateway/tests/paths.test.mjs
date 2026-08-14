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

import { escapes, escapesFrom, shortPath, relativizePath, finalSegment, isWindowsAbsolute, collapseHome } from '../src/paths.mjs';
import { homedir } from 'node:os';

// --- the predicate ------------------------------------------------------------------------------

test('a path inside the base does not escape', () => {
  assert.equal(escapes('docs/plan.md'), false);
  assert.equal(escapes(join('docs', 'plan.md')), false);
});

test('a bare `..` escapes', () => {
  assert.equal(escapes('..'), true);
});

test('a `..`-prefixed path escapes on either separator — LITERALLY both, on every host', () => {
  // This assertion used to read `escapes(`..${sep}out.md`)` — the HOST separator. On Windows that
  // is `..\` and the sibling line covers `../`, so it looked like both were tested; on POSIX `sep`
  // is `/` and the SAME shape was asserted twice while `..\` was never tested at all. The title
  // claimed "either separator" and the body could only ever deliver one — a Rule 75 violation in a
  // test name, and it is why F1 (username emitted verbatim from relativizePath on POSIX) survived
  // every prior round. Both separators are now literal, so this cannot go vacuous on any platform.
  assert.equal(escapes('..\\out.md'), true, 'backslash parent must escape even where sep is "/"');
  assert.equal(escapes('../out.md'), true, 'forward-slash parent must escape even where sep is "\\"');
  assert.equal(escapes('../../Users/someone/out.md'), true);
  assert.equal(escapes('..\\..\\Users\\someone\\out.md'), true);
});

test('REGRESSION F5: collapseHome redacts when the path and home disagree on separator', () => {
  // Reported by HY3 (2026-08-14) and probe-confirmed. `homedir()` on Windows yields `C:\Users\x`,
  // but a path can reach this function forward-slashed (hardcoded literal, config value, WSL
  // boundary, copied string). The prefix test was a raw `startsWith`, so the two disagreed at the
  // first separator and the function returned the path UNREDACTED — username intact.
  // NOTE ON SEVERITY: this is a latent primitive defect, not a live leak. HY3 rated it CRITICAL on
  // the claim that check-mcp-health's displayPath leaks today; that claim is FALSE — CONFIG_LOCATIONS
  // builds every path with join(), so separators always agree there. It is fixed anyway because this
  // module's stated contract is that the primitive is correct independent of its callers, and
  // because it is exported public API.
  const home = 'C:\\Users\\SomePerson';
  for (const shape of ['C:\\Users\\SomePerson\\.claude.json', 'C:/Users/SomePerson/.claude.json']) {
    const out = collapseHome(shape, home);
    assert.ok(!out.includes('SomePerson'), `username survived: ${shape} -> ${out}`);
    assert.ok(out.startsWith('~'), `expected a ~-collapsed path, got ${out}`);
  }
});

test('F5: collapseHome preserves the ORIGINAL separators in its output', () => {
  // The output names a file the reader will open. Normalizing `~/x` to `~\x` (or the reverse)
  // misreports the path, so normalization is for COMPARISON only.
  const home = 'C:\\Users\\SomePerson';
  assert.equal(collapseHome('C:/Users/SomePerson/.claude.json', home), '~/.claude.json');
  assert.equal(collapseHome('C:\\Users\\SomePerson\\.claude.json', home), '~\\.claude.json');
});

test('F5: a sibling directory sharing the home prefix is still not mangled', () => {
  // The separator-required property must survive the cross-separator fix: `…\SomePerson2` is a
  // DIFFERENT directory and must not become `~2`.
  const home = 'C:\\Users\\SomePerson';
  assert.equal(collapseHome('C:/Users/SomePerson2/x.json', home), 'C:/Users/SomePerson2/x.json');
});

test('REGRESSION F1: a Windows-RELATIVE escape is redacted, not normalized into a clean leak', () => {
  // relativizePath ends with `.replaceAll('\\','/')`, so a missed `..\` escape did not merely leak —
  // it emitted a tidy `../Users/<name>/out.md` that reads like an intentional relative path.
  for (const shape of ['..\\Users\\SomePerson\\out.md', '../Users/SomePerson/out.md']) {
    const out = relativizePath('/repo', shape);
    assert.equal(out, '<external>', `${shape} was not treated as external`);
    assert.ok(!String(out).includes('SomePerson'), 'OS username survived on this platform');
  }
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

test('collapseHome fails CLOSED when `home` is omitted — it must not silently skip redaction', () => {
  // Without a default, `collapseHome(p)` returned the path untouched: no redaction, no error, in
  // the module whose documented asymmetry is "a false negative leaks a username". A primitive that
  // does nothing when under-called contradicts the ownership claim it was extracted to make
  // (HY3 W3). Asserted against the REAL home so the default is exercised, not assumed.
  const home = homedir();
  assert.equal(collapseHome(join(home, 'somefile.json')), `~${sep}somefile.json`);
  assert.equal(collapseHome(home), '~');

  // EXPLICIT falsy is the hole a default parameter does NOT close: `= homedir()` fires only on
  // `undefined`, so a caller forwarding an unset config value as null/'' got NO redaction and no
  // error. Verified by probe before fixing: it returned a full home path, username intact. Falsy
  // must mean "use the real home", never "skip redaction" (HY3 final, W#1).
  for (const falsy of [null, '', undefined, 0, false]) {
    const out = collapseHome(join(home, 'secret.json'), falsy);
    assert.equal(out, `~${sep}secret.json`, `home=${JSON.stringify(falsy)} must still redact`);
  }
  // Explicit home still wins, and separators are preserved rather than normalized.
  assert.equal(collapseHome(String.raw`C:\Users\sean\.claude.json`, String.raw`C:\Users\sean`), String.raw`~\.claude.json`);
  assert.equal(collapseHome('/home/sean/.claude.json', '/home/sean'), '~/.claude.json');
  // A sibling sharing the prefix is not mangled, and an unrelated path is untouched.
  assert.equal(collapseHome(String.raw`C:\Users\sean2\x.json`, String.raw`C:\Users\sean`), String.raw`C:\Users\sean2\x.json`);
  assert.equal(collapseHome('/elsewhere/x.json', '/home/sean'), '/elsewhere/x.json');
});
