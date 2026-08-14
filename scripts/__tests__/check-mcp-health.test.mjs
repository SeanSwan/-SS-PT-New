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

import { diagnose, credentialHeadersIn, BUCKETS } from '../check-mcp-health.mjs';

const CLI = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'check-mcp-health.mjs');

// The path-redaction tests moved to `display-path.test.mjs` — a separate security concern from the
// verdict logic and exit-code contract pinned here, and keeping them pushed this file past the
// 300-line cap (Kimi round 16, L1).

// --- exit-code contract ------------------------------------------------------------------------
// The whole point of this tool is disambiguating "not configured" from "cannot tell". That
// distinction lives ONLY in the exit code for any automation consuming it, and it was verified by
// hand rather than pinned — so it could regress silently (Rule 79; Kimi round 5, O2).

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

// The bounded-body-read tests moved to `read-capped.test.mjs` — different module, and keeping them
// here pushed this file past the 300-line cap (Kimi round 16, L1).

test('REGRESSION: a bodiless 204/205 is HEALTHY but must not claim the credential was ACCEPTED', () => {
  // The hedge this pins was itself a fix for an overclaim — and arrived with no test, which is the
  // same gap this file calls out for redactions: an untested guarantee can be switched off by
  // accident. A refactor restoring the affirmative wording would otherwise pass green.
  // `true` is explicit at every credential-asserting call site — `hasCredential` now defaults to
  // FALSE so an omitted argument under-claims instead of ungating these branches (round 16, L3).
  for (const s of [204, 205]) {
    const { verdict, remedy } = diagnose(s, '', true);
    assert.equal(verdict, 'HEALTHY', 'exit-code semantics must stay unchanged');
    assert.match(remedy, /NOT rejected/i, 'the hedge must survive');
    assert.doesNotMatch(remedy, /accepts the credential/i, 'regression: overclaiming acceptance');
  }
  // ...and the affirmative remedy must stay EXCLUSIVE to a response that actually evidences it.
  assert.match(diagnose(200, '{}', true).remedy, /accepts the credential/i);
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

// --- credential detection: must reflect what is TRANSMITTED, not what config contains ----------

test('an env block is NOT a credential — only headers are transmitted', () => {
  // Counting env as auth made an unauthenticated probe report TOKEN REJECTED against a working
  // credential: the round-14 inverse failure, alive one clause over (round 15, S2.1).
  assert.equal(credentialHeadersIn(undefined), false);
  assert.equal(credentialHeadersIn({}), false);
  assert.equal(credentialHeadersIn({ 'Content-Type': 'application/json' }), false);
});

test('recognized auth headers count, in any casing', () => {
  for (const h of ['Authorization', 'authorization', 'X-API-Key', 'api-key', 'X-Auth-Token']) {
    assert.equal(credentialHeadersIn({ [h]: 'v' }), true, `${h} should count`);
  }
});

test('an UNRECOGNIZED header fails toward "no credential" — the honest direction', () => {
  // Asymmetric errors: over-detecting accuses a working token (tells Sean to rotate);
  // under-detecting yields CANNOT VERIFY, which accuses nothing.
  assert.equal(credentialHeadersIn({ 'X-Weird-Custom-Auth': 'v' }), false);
});

test('every credential-asserting branch is gated, not just 401/403', () => {
  // The 2xx remedy claimed "accepts the credential"; the body tiebreaker returned REJECTED —
  // both while no credential had been sent. Gating only the branch a reviewer names is how this
  // file shipped the same defect three times (round 15, S2.3).
  assert.match(diagnose(200, '{}', false).verdict, /credential not tested/i);
  assert.doesNotMatch(diagnose(200, '{}', false).remedy, /accepts the credential/i);
  assert.match(diagnose(400, 'unauthorized', false).verdict, /CANNOT VERIFY/i);
  // ...and with a credential, the accusations are still available.
  assert.match(diagnose(200, '{}', true).remedy, /accepts the credential/i);
  assert.match(diagnose(400, 'unauthorized', true).verdict, /TOKEN REJECTED/i);
});

test('401 and 403 are token rejection, not "not configured"', () => {
  for (const s of [401, 403]) {
    assert.equal(diagnose(s, '{"error":"invalid_token"}', true).verdict, 'CONFIGURED BUT TOKEN REJECTED');
  }
});

test('the remedy for a rejected token forbids reporting it as unconfigured', () => {
  // The remedy text is the payload an agent acts on — it must carry the correction explicitly.
  const { remedy } = diagnose(401, '', true);
  // NOT `match(/not configured/i)`: the current remedy passes that by containing the phrase inside a
  // NEGATION (`Do NOT report this as "not configured"`) — but so would a harmful rewrite that simply
  // ASSERTS it ("This server is not configured..."). The regex cannot tell the correction from the
  // falsehood, so the one failure this entire tool exists to prevent could pass green (round 12, L1).
  assert.match(remedy, /IS configured/i, 'the remedy must affirmatively state the server IS configured');
  assert.doesNotMatch(remedy, /is not configured/i, 'regression: the remedy must never assert the falsehood');
  assert.match(remedy, /RESTART/i, 'MCP servers connect at startup; a restart is required after a token swap');
});

test('REGRESSION: a healthy 200 is never misdiagnosed because its body says "unauthorized"', () => {
  // The body regex used to be OR'd with the status check, so it ran against EVERY response. A 200
  // whose payload merely mentions the word would tell Sean to rotate a perfectly good credential.
  const body = '{"result":{"notice":"previously unauthorized clients must re-handshake"}}';
  assert.equal(diagnose(200, body, true).verdict, 'HEALTHY');
});

test('body text is only a tiebreaker for statuses that carry no verdict of their own', () => {
  // 418 is not auth, not success, not redirect, not server-error — here the body legitimately decides.
  assert.equal(diagnose(418, 'invalid_token', true).verdict, 'CONFIGURED BUT TOKEN REJECTED');
  assert.match(diagnose(418, 'teapot', true).verdict, /UNEXPECTED HTTP 418/);
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
  const { verdict, remedy } = diagnose(401, secretish, true);
  assert.ok(!verdict.includes('abcdef'), 'body echoed into verdict');
  assert.ok(!remedy.includes('abcdef'), 'body echoed into remedy');
});

// --- bucket routing --------------------------------------------------------------------------
// The exit code is computed from `bucket`, so an unpinned bucket is an unpinned exit code. The
// router used to re-derive it with `verdict.startsWith('REACHABLE')`, which also caught the 304
// verdict and silently moved a BROKEN endpoint from unhealthy to unverified — flipping exit 1 -> 2
// and letting a config with one 304 server exit 0 (Kimi round 16, S2).

test('every verdict-producing condition lands in exactly one bucket — all nine pinned', () => {
  const cases = [
    // [label,                        args,                        expected bucket]
    ['no credential + 401',           [401, '', false],            BUCKETS.UNVERIFIED],
    ['unauthenticated 2xx',           [200, '{}', false],          BUCKETS.UNVERIFIED],
    ['token rejected',                [401, '{"e":"x"}', true],    BUCKETS.UNHEALTHY],
    ['healthy',                       [200, '{}', true],           BUCKETS.VERIFIED],
    ['unreachable',                   [null, '', true],            BUCKETS.UNHEALTHY],
    ['304 cache validation',          [304, '', true],             BUCKETS.UNHEALTHY],
    ['redirect',                      [302, '', true],             BUCKETS.UNHEALTHY],
    ['server error',                  [503, '', true],             BUCKETS.UNHEALTHY],
    ['unexpected status',             [418, 'teapot', true],       BUCKETS.UNHEALTHY],
  ];
  for (const [label, args, expected] of cases) {
    const { bucket, verdict } = diagnose(...args);
    assert.equal(bucket, expected, `${label} ("${verdict}") bucketed as ${bucket}, expected ${expected}`);
  }
  assert.equal(cases.length, 9, 'a new verdict branch was added without pinning its bucket');
});

test('304 stays UNHEALTHY — a POST initialize drawing a cache response is broken, not unprobeable', () => {
  // Round 11 pinned 304's exit code as load-bearing. This asserts the bucket DIRECTLY rather than
  // via `notEqual(verdict, 'HEALTHY')`, which survived the round-16 regression while no longer
  // guarding the thing it was written to guard.
  const { bucket, verdict } = diagnose(304, '', true);
  assert.equal(bucket, BUCKETS.UNHEALTHY);
  assert.match(verdict, /^REACHABLE/, 'the prose still starts with REACHABLE — that is why prefix routing was unsafe');
});

test('omitting hasCredential fails toward "no credential" — the under-claiming direction', () => {
  // The default used to be `true`, so any call site forgetting the third argument silently ungated
  // every credential-asserting branch — the round-15 S2.3 defect re-armed for the next caller.
  // These four calls omit it deliberately: each must behave as if NO credential was sent.
  assert.match(diagnose(401, '').verdict, /CANNOT VERIFY/i, 'a bare 401 must not accuse a token that was never sent');
  assert.match(diagnose(200, '{}').verdict, /credential not tested/i);
  assert.doesNotMatch(diagnose(200, '{}').remedy, /accepts the credential/i);
  assert.match(diagnose(400, 'unauthorized').verdict, /CANNOT VERIFY/i);
  // ...and the credential-independent verdicts are unchanged by the default, which is why their
  // call sites above legitimately stay two-argument.
  assert.equal(diagnose(503, '').verdict, 'SERVER ERROR');
  assert.equal(diagnose(null).verdict, 'UNREACHABLE');
});

test('no diagnose() result can ship without a bucket, and only the three are valid', () => {
  // The router treats an unrecognized bucket as unhealthy, so a missing one fails safe rather than
  // silently green — but it would still be a defect. Catch it here instead of in an exit code.
  const valid = new Set(Object.values(BUCKETS));
  for (const args of [[401, '', false], [200, '{}', false], [401, '{}', true], [200, '{}', true],
    [null, '', true], [304, '', true], [302, '', true], [503, '', true], [418, 'teapot', true],
    [204, '', true], [400, 'unauthorized', false], [400, 'unauthorized', true]]) {
    const { bucket, verdict } = diagnose(...args);
    assert.ok(valid.has(bucket), `verdict "${verdict}" carries invalid bucket ${JSON.stringify(bucket)}`);
  }
});
