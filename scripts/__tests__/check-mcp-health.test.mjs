/**
 * check-mcp-health.test.mjs — the verdict logic that tells "expired token" from "not configured".
 * Run: node --test scripts/__tests__/check-mcp-health.test.mjs
 *
 * This tool exists because agents guess wrong about MCP availability (5 recurrences to 2026-08-13).
 * A WRONG verdict is therefore worse than no tool: it launders a guess into an authoritative-looking
 * answer. These tests pin the two directions of that failure —
 *   false NEGATIVE: a rejected token reported as anything else -> the recurrence continues
 *   false POSITIVE: a healthy server reported as token-rejected -> Sean rotates a working credential
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diagnose, displayPath } from '../check-mcp-health.mjs';

// --- path redaction -----------------------------------------------------------------------------
// This is a security control (the home dir carries the OS username) and it had ZERO coverage until
// a one-character escaping slip silently disabled it on Windows — the regex was written `[\/]`
// instead of `[\\/]`, so no backslash path ever matched and every absolute path printed in full.
// A redaction with no test is a redaction that can be turned off by accident.

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

test('401 and 403 are token rejection, not "not configured"', () => {
  for (const s of [401, 403]) {
    assert.equal(diagnose(s, '{"error":"invalid_token"}').verdict, 'CONFIGURED BUT TOKEN REJECTED');
  }
});

test('the remedy for a rejected token forbids reporting it as unconfigured', () => {
  // The remedy text is the payload an agent acts on — it must carry the correction explicitly.
  const { remedy } = diagnose(401, '');
  assert.match(remedy, /not configured/i);
  assert.match(remedy, /RESTART/i, 'MCP servers connect at startup; a restart is required after a token swap');
});

test('REGRESSION: a healthy 200 is never misdiagnosed because its body says "unauthorized"', () => {
  // The body regex used to be OR'd with the status check, so it ran against EVERY response. A 200
  // whose payload merely mentions the word would tell Sean to rotate a perfectly good credential.
  const body = '{"result":{"notice":"previously unauthorized clients must re-handshake"}}';
  assert.equal(diagnose(200, body).verdict, 'HEALTHY');
});

test('body text is only a tiebreaker for statuses that carry no verdict of their own', () => {
  // 418 is not auth, not success, not redirect, not server-error — here the body legitimately decides.
  assert.equal(diagnose(418, 'invalid_token').verdict, 'CONFIGURED BUT TOKEN REJECTED');
  assert.match(diagnose(418, 'teapot').verdict, /UNEXPECTED HTTP 418/);
});

test('a redirect is reported as such and never followed', () => {
  const { verdict, remedy } = diagnose(302, '');
  assert.match(verdict, /REDIRECT \(HTTP 302\)/);
  assert.match(remedy, /NOT followed/i, 'the credential must not be forwarded to another origin');
});

test('null status is unreachable — a network fault, not an auth fault', () => {
  const { verdict, remedy } = diagnose(null);
  assert.equal(verdict, 'UNREACHABLE');
  assert.match(remedy, /not an auth problem/i);
});

test('5xx is an upstream fault, explicitly not a local config problem', () => {
  assert.equal(diagnose(503, '').verdict, 'SERVER ERROR');
  assert.match(diagnose(503, '').remedy, /Not a local config problem/i);
});

test('no verdict or remedy ever echoes the response body', () => {
  const secretish = 'Bearer abcdef0123456789 invalid_token';
  const { verdict, remedy } = diagnose(401, secretish);
  assert.ok(!verdict.includes('abcdef'), 'body echoed into verdict');
  assert.ok(!remedy.includes('abcdef'), 'body echoed into remedy');
});
