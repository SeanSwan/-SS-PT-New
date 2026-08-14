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
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { diagnose, displayPath } from '../check-mcp-health.mjs';
import { readCapped } from '../lib/read-capped.mjs';

const CLI = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'check-mcp-health.mjs');

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

// --- exit-code contract ------------------------------------------------------------------------
// The whole point of this tool is disambiguating "not configured" from "cannot tell". That
// distinction lives ONLY in the exit code for any automation consuming it, and it was verified by
// hand rather than pinned — so it could regress silently (Rule 79; Kimi round 5, O2).

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

test('prefix matching is case-insensitive (Windows paths are)', () => {
  // homedir() can disagree with an env-supplied path on case via junctions, 8.3 names, or
  // USERPROFILE drift. A byte-exact compare would leave this path fully unredacted.
  assert.equal(displayPath('C:\\Users\\SEAN\\.claude.json', 'C:\\Users\\sean'), '~\\.claude.json');
});

test('no redacted output ever contains the username segment', () => {
  const out = displayPath('C:\\Users\\BigotSmasher\\.claude.json', 'C:\\Users\\BigotSmasher');
  assert.ok(!out.includes('BigotSmasher'), 'OS username survived redaction');
});

// --- bounded body read ---------------------------------------------------------------------------

test('REGRESSION: a null-body status returns zero bytes instead of throwing', () => {
  // 101/204/205/304 have `body === null` per the fetch spec. A previous version asserted a stream
  // ALWAYS exists and threw here, so a server answering 204 to `initialize` reported UNREACHABLE
  // despite having been reached. A null body is zero bytes — bounded by definition, not a fallback.
  return readCapped({ body: null }, 1024).then((r) => {
    assert.deepEqual(r, { text: '', bytes: 0, truncated: false });
  });
});

test('a genuinely stream-less runtime throws rather than buffering', async () => {
  // The one case that SHOULD throw: a body object with no getReader. Throwing keeps the bound
  // unconditional; silently falling back to .text() is the unbounded defect this replaced.
  await assert.rejects(() => readCapped({ body: {} }, 1024), /web streams/);
});

test('a body under the cap is returned whole and not marked truncated', async () => {
  const body = 'hello world';
  const stream = { getReader: () => { let sent = false; return {
    read: async () => (sent ? { done: true } : (sent = true, { done: false, value: Buffer.from(body) })),
    cancel: async () => {},
  }; } };
  const r = await readCapped({ body: stream }, 1024);
  assert.equal(r.text, body);
  assert.equal(r.bytes, body.length);
  assert.equal(r.truncated, false);
});

// `timeout` matters here: this test feeds an INFINITE stream, so a regression in the cap check
// does not fail — it HANGS. node:test has no default timeout, so the suite would stall rather than
// go red, and a stuck runner reads as "still working" in CI. 5s is ~100x the passing runtime, which
// turns a cap regression into a fast, explicit failure (Kimi round 9, N1).
test('a body over the cap is truncated, reported as such, and the stream is cancelled', { timeout: 5000 }, async () => {
  let cancelled = false;
  const chunk = Buffer.alloc(64, 0x61); // 'a' * 64
  const stream = { getReader: () => ({
    read: async () => ({ done: false, value: chunk }), // infinite — the cap must stop it
    cancel: async () => { cancelled = true; },
  }) };
  const r = await readCapped({ body: stream }, 100);
  assert.equal(r.truncated, true);
  assert.equal(r.text.length, 100, 'text must be clamped to the cap');
  assert.ok(r.bytes > 100, 'bytes reports what was actually read');
  assert.ok(cancelled, 'the stream must be cancelled, not drained');
});

test('REGRESSION: a bodiless 204/205 is HEALTHY but must not claim the credential was ACCEPTED', () => {
  // The hedge this pins was itself a fix for an overclaim — and arrived with no test, which is the
  // same gap this file calls out for redactions: an untested guarantee can be switched off by
  // accident. A refactor restoring the affirmative wording would otherwise pass green.
  for (const s of [204, 205]) {
    const { verdict, remedy } = diagnose(s, '');
    assert.equal(verdict, 'HEALTHY', 'exit-code semantics must stay unchanged');
    assert.match(remedy, /NOT rejected/i, 'the hedge must survive');
    assert.doesNotMatch(remedy, /accepts the credential/i, 'regression: overclaiming acceptance');
  }
  // ...and the affirmative remedy must stay EXCLUSIVE to a response that actually evidences it.
  assert.match(diagnose(200, '{}').remedy, /accepts the credential/i);
});

test('304 is not a redirect to follow — it is a cache validation with no body', () => {
  // read-capped's header lists 304 among the null-body statuses, so routing it into the 3xx branch
  // ("update the url in config") would have the verdict layer contradicting a sibling module's
  // documentation. Near-untriggerable for a POST initialize, pinned because the doc now names it.
  const { verdict, remedy } = diagnose(304, '');

  // POSITIVE pins. The first version of this test asserted only absences, so ANY rewrite of the
  // carve-out passed green — including one that deleted it. Pinning content means the branch has to
  // still exist AND still say the right thing.
  assert.equal(verdict, 'REACHABLE — HTTP 304 (cache validation, no body)');
  assert.match(remedy, /Cache-validation/i);

  // EXIT-CODE pin, the asymmetry round 11 caught: the 204/205 test explicitly pins HEALTHY with
  // "exit-code semantics must stay unchanged", and this test had no equivalent. Someone noticing
  // 304 is a null-body status like 204/205 could "harmonize" it into HEALTHY and silently flip this
  // server's exit code from 1 to 0 — a green suite the whole time. Exit logic keys on the exact
  // string 'HEALTHY', so asserting non-equality is the real guard.
  assert.notEqual(verdict, 'HEALTHY', '304 must stay non-HEALTHY — reclassifying flips exit 1 -> 0');

  // NEGATIVE pins: the original misclassification must not come back.
  assert.doesNotMatch(verdict, /REDIRECT/i);
  assert.doesNotMatch(remedy, /Update the url/i);
  // ...and it must not be labelled UNEXPECTED, which is reserved for genuinely unhandled statuses.
  assert.doesNotMatch(verdict, /UNEXPECTED/i);
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
