/**
 * mcp-health-cli.test.mjs — the CLI's EXIT-CODE contract, exercised as a subprocess.
 * Run via: node --test scripts/__tests__/index.test.mjs
 *
 * WHY SEPARATE FROM check-mcp-health.test.mjs: that file tests `diagnose` — pure verdict logic,
 * in-process. These tests spawn the real CLI and assert what an AUTOMATION consuming it sees.
 * Different subject, different failure mode, and splitting on that seam is what keeps both files
 * under the 300-line cap structurally rather than by shaving comments (Rule 4; Kimi round 17,
 * finding 2 — the previous split landed at 299 lines, one clarifying comment from a violation,
 * which it then took).
 *
 * The whole point of this tool is disambiguating "not configured" from "cannot tell". That
 * distinction lives ONLY in the exit code for any automation consuming it, and it was verified by
 * hand rather than pinned — so it could regress silently (Rule 79; Kimi round 5, O2).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'check-mcp-health.mjs');

/** Same as runCli but returns stdout too — the exit-3 MESSAGE was unpinned for 13 rounds. */
const runCliOut = (args, cwd) => {
  try {
    return {
      status: 0,
      out: execFileSync(process.execPath, [CLI, ...args], {
        cwd, stdio: 'pipe', env: { ...process.env, HOME: cwd, USERPROFILE: cwd },
      }).toString(),
    };
  } catch (e) {
    return { status: e.status, out: e.stdout?.toString() ?? '' };
  }
};

test('REGRESSION: a filter that matches nothing must NOT claim "not configured" is justified', () => {
  // This is the tool's own failure mode, on the exact command linear-sync-gate.mjs recommends.
  // A one-character typo (`linaer`) used to print "This is the ONLY state that justifies saying
  // 'not configured'" — handing an agent the precise false conclusion the tool exists to kill,
  // while the module header already documented that as false under a filter. Exit codes were
  // right; the WORDS lied. Nothing pinned stdout on this path, so 13 review rounds missed it.
  const cwd = mkdtempSync(join(tmpdir(), 'swan-mcp-filter-'));
  const { status, out } = runCliOut(['zzz-typo-that-matches-nothing'], cwd);
  assert.equal(status, 3, 'exit code stays 3');
  assert.doesNotMatch(out, /ONLY state that justifies/i, 'must not justify "not configured" under a filter');
  assert.match(out, /nothing matched/i, 'must say what actually happened');
  assert.match(out, /Re-run with NO filter/i, 'must tell the reader how to get the real answer');
});

test('with NO filter, the justification IS printed — the correction must not gut the true case', () => {
  // The blunt fix (delete the sentence entirely) would pass the test above while destroying the
  // one state where the claim is legitimate. Pin both directions, as the 204/200 pair does.
  const cwd = mkdtempSync(join(tmpdir(), 'swan-mcp-nofilter-'));
  const { status, out } = runCliOut([], cwd);
  assert.equal(status, 3);
  assert.match(out, /ONLY state that justifies/i, 'unfiltered exit-3 IS the justified state');
});

const runCli = (args, cwd) => {
  try {
    // HOME/USERPROFILE point homedir() INSIDE the temp dir: without this the CLI reads the
    // developer's real ~/.claude.json, so an unrelated config edit could flip these results
    // (round 6, S5 — a non-hermetic test fails for reasons that have nothing to do with the code).
    execFileSync(process.execPath, [CLI, ...args], { cwd, stdio: 'pipe', env: { ...process.env, HOME: cwd, USERPROFILE: cwd } });
    return 0;
  } catch (e) {
    return e.status;
  }
};

test('exit 3 = nothing declared anywhere (the ONLY "not configured" state)', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'swan-mcp-none-'));
  assert.equal(runCli(['zzz-no-such-server-anywhere'], cwd), 3);
});

test('exit 2 = declared but nothing probeable — "0 unhealthy" is not "all good"', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'swan-mcp-stdio-'));
  writeFileSync(join(cwd, '.mcp.json'), JSON.stringify({ mcpServers: { swanteststdio: { command: 'node' } } }), 'utf8');
  assert.equal(runCli(['swanteststdio'], cwd), 2);
});

test('exit 3 and exit 2 are DISTINCT — a disambiguation tool must not ship an ambiguous contract', () => {
  const none = mkdtempSync(join(tmpdir(), 'swan-mcp-none2-'));
  const stdio = mkdtempSync(join(tmpdir(), 'swan-mcp-stdio2-'));
  writeFileSync(join(stdio, '.mcp.json'), JSON.stringify({ mcpServers: { swanteststdio: { command: 'node' } } }), 'utf8');
  assert.notEqual(runCli(['zzz-no-such-server-anywhere'], none), runCli(['swanteststdio'], stdio));
});
