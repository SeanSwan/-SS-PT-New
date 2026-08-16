/**
 * Mutation run — the confirming hostile round, from a vantage that is not
 * "re-read your own code". Each mutant reverts one fix. A mutant that SURVIVES
 * (suite still passes) means the corresponding test is decorative.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const MUTANTS = [
  ['Q10a: gitSafeEnv stops stripping GIT_*', 'scripts/hooks/lib/gate-trust.mjs',
    'for (const key of HOSTILE_GIT_ENV) delete clean[key];', '/* mutated: no strip */'],

  ['Q1: gateRoot honors the env var again', 'scripts/hooks/lib/gate-trust.mjs',
    'export function gateRoot() { return gateRootOverride ?? DEFAULT_ROOT; }',
    'export function gateRoot() { return process.env.SWAN_GATE_ROOT ? resolve(process.env.SWAN_GATE_ROOT) : (gateRootOverride ?? DEFAULT_ROOT); }'],

  ['Q1: disabledDir honors the env var again', 'scripts/hooks/lib/gate-trust.mjs',
    'return disableRootOverride ?? join(qaDir(), \'disabled\');',
    'return process.env.SWAN_DISABLE_ROOT ? resolve(process.env.SWAN_DISABLE_ROOT) : (disableRootOverride ?? join(qaDir(), \'disabled\'));'],

  ['Q5: reason is no longer clamped', 'scripts/hooks/lib/gate-telemetry.mjs',
    'let line = build(clampReason(entry?.reason));', 'let line = build(String(entry?.reason ?? \'\'));'],

  ['Q7: marker match becomes case-SENSITIVE', 'scripts/hooks/lib/gate-common.mjs',
    'const present = markers.some((m) => m.toLowerCase() === key);',
    'const present = markers.some((m) => m === key);'],

  ['Q10d: a broken disable channel reports ok/[] again', 'scripts/hooks/lib/gate-common.mjs',
    "return { markers: [], status: 'broken', code: err?.code };",
    "return { markers: [], status: 'ok' };"],

  ['Q10b: the bare-path release branch comes back', 'scripts/hooks/lib/gate-lock.mjs',
    `    throw new TypeError(
      'releaseCounterLock requires the handle returned by acquireCounterLock. '
      + 'The bare-path form was removed: it unlinked any lock unconditionally (GLM Q10b).',
    );`,
    '    try { unlinkSync(handle); return true; } catch { return false; }'],

  ['Q10c: rotation stops preserving the prior record', 'scripts/hooks/lib/gate-common.mjs',
    'record.previous = { sessionId: prior.sessionId, headSha: prior.headSha ?? null, ts: prior.ts ?? null };',
    '/* mutated: prior discarded */'],

  ['Q10c: the future-stamp clamp is removed', 'scripts/hooks/lib/gate-common.mjs',
    'if (effectiveMs > nowMs) { effectiveMs = nowMs; clamped = true; }', '/* mutated: future allowed */'],

  ['self-review: announceOnce announces every time', 'scripts/hooks/lib/gate-telemetry.mjs',
    'if (channelAnnounced.has(scoped)) return;', 'if (false) return;'],

  ['sha inheritance is removed (own regression)', 'scripts/hooks/lib/gate-common.mjs',
    'const effectiveSha = sha !== undefined ? sha : (prior?.headSha ?? null);',
    'const effectiveSha = sha ?? null;'],

  ['stillOwnsLock always says yes', 'scripts/hooks/lib/gate-lock.mjs',
    'return body?.token === handle.token;', 'return true;'],
];

const SUITES = ['scripts/hooks/lib/gate-common.test.mjs', 'scripts/hooks/lib/gate-lock.test.mjs'];

function suitesPass() {
  for (const s of SUITES) {
    try { execFileSync(process.execPath, [s], { stdio: 'ignore' }); } catch { return false; }
  }
  return true;
}

// Control: the suite must be GREEN before we trust any "mutant died" result.
if (!suitesPass()) {
  console.log('BASELINE IS RED — every mutant would "die" for free. Aborting (this is the');
  console.log('exact mistake the handoff records as trap #6).');
  process.exit(2);
}
console.log('baseline: GREEN (control passed)\n');

let survived = 0;
for (const [name, file, from, to] of MUTANTS) {
  const original = readFileSync(file, 'utf8');
  // Files checked out from git are CRLF here; files this slice rewrote are LF.
  // A multiline anchor that ignores that difference SKIPS instead of running,
  // and a skipped mutant reads as "not applicable" when it is really "untested".
  const crlf = original.includes('\r\n');
  const from2 = crlf ? from.replace(/\n/g, '\r\n') : from;
  const to2 = crlf ? to.replace(/\n/g, '\r\n') : to;
  if (!original.includes(from2)) {
    console.log(`SKIP     ${name}\n         (anchor not found in ${file} — mutant is not applicable)`);
    survived += 1;
    continue;
  }
  writeFileSync(file, original.replace(from2, to2), 'utf8');
  const stillGreen = suitesPass();
  writeFileSync(file, original, 'utf8');
  if (stillGreen) { console.log(`SURVIVED ${name}`); survived += 1; }
  else console.log(`killed   ${name}`);
}

const killed = MUTANTS.length - survived;
console.log(`\n==== ${killed}/${MUTANTS.length} mutants killed ====`);
if (!suitesPass()) { console.log('WARNING: suite is not green after restore!'); process.exitCode = 1; }
else console.log('post-run restore verified green');
if (survived) process.exitCode = 1;
