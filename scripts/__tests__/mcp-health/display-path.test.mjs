/**
 * display-path.test.mjs — home-directory redaction for anything the health checker prints.
 * Run: node --test scripts/__tests__/mcp-health/display-path.test.mjs
 *
 * WHY THIS FILE EXISTS SEPARATELY: extracted from `check-mcp-health.test.mjs` to bring that file
 * back under the 300-line cap (Rule 4 prescribes extraction, not comment-shaving — Kimi round 16,
 * L1). Path redaction is its own concern anyway: it is a Rule 8/59 security control, not part of
 * the verdict logic or the exit-code contract that file pins.
 *
 * This is a security control (the home dir carries the OS username) and it had ZERO coverage until
 * a one-character escaping slip silently disabled it on Windows — the regex was written `[\/]`
 * instead of `[\\/]`, so no backslash path ever matched and every absolute path printed in full.
 * A redaction with no test is a redaction that can be turned off by accident.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { displayPath } from '../../check-mcp-health.mjs';

test('a Windows home path collapses to ~ (the backslash separator must be matched)', () => {
  assert.equal(displayPath('C:\\Users\\sean\\.claude.json', 'C:\\Users\\sean'), '~\\.claude.json');
});

test('a POSIX home path collapses to ~', () => {
  assert.equal(displayPath('/home/sean/.claude.json', '/home/sean'), '~/.claude.json');
});

test('a sibling directory sharing the home prefix is NOT mangled', () => {
  // Over-redacting `C:\Users\sean2` into `~2\...` would misname the file the reader must open.
  assert.equal(displayPath('C:\\Users\\sean2\\.claude.json', 'C:\\Users\\sean'), 'C:\\Users\\sean2\\.claude.json');
});

test('a path outside home is returned unchanged', () => {
  assert.equal(displayPath('.mcp.json', '/home/sean'), '.mcp.json');
});

test('the home directory itself collapses to ~', () => {
  assert.equal(displayPath('/home/sean', '/home/sean'), '~');
});

test('prefix matching is case-insensitive (Windows paths are)', () => {
  // homedir() can disagree with an env-supplied path on case via junctions, 8.3 names, or
  // USERPROFILE drift. A byte-exact compare would leave this path fully unredacted.
  assert.equal(displayPath('C:\\Users\\SEAN\\.claude.json', 'C:\\Users\\sean'), '~\\.claude.json');
});

test('no redacted output ever contains the username segment', () => {
  const out = displayPath('C:\\Users\\BigotSmasher\\.claude.json', 'C:\\Users\\BigotSmasher');
  assert.ok(!out.includes('BigotSmasher'), 'OS username survived redaction');
});

test('redaction here is PLATFORM-INDEPENDENT — pinned against drift from the paths.mjs policy', () => {
  // This module is a SECOND redaction implementation, living outside `context-gateway/paths.mjs`
  // which exists to hold that policy in one place. Flagged in Kimi round 17 as a possible repeat of
  // the "named instance fixed, class alive" pattern. Probed before acting: it is NOT — it decides
  // separators with a regex CLASS (`/^[\\/]/`), not with a platform primitive like `isAbsolute` or
  // `basename`, so it has no platform-relative failure. The two answer different questions
  // (escape-a-base vs collapse-the-home-prefix), so merging them would be a worse design than
  // keeping them apart.
  //
  // What was genuinely missing is this pin. Nothing stopped a future edit from swapping the class
  // for `sep` or `basename` and reintroducing S1 here, in the one module whose redaction regex has
  // ALREADY been silently disabled once by a `[\/]`-instead-of-`[\\/]` slip.
  for (const [p, home] of [
    ['C:\\Users\\sean\\.claude.json', 'C:\\Users\\sean'],   // backslash
    ['C:/Users/sean/.claude.json', 'C:/Users/sean'],         // forward slash
    ['/home/sean/.claude.json', '/home/sean'],               // posix
    ['C:\\Users\\sean/.claude.json', 'C:\\Users\\sean'],     // mixed — the shape a regex class catches and `sep` does not
  ]) {
    const out = displayPath(p, home);
    assert.ok(out.startsWith('~'), `home prefix not collapsed for ${p}`);
    assert.ok(!out.includes('sean'), `username survived for ${p}`);
  }
});
