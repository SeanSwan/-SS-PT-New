/**
 * Mutation run over slice 2. Each mutant reverts one decision; a SURVIVOR means
 * the corresponding test is decorative. Skips count as survivors — a mutant whose
 * anchor did not match is UNTESTED, not "not applicable" (slice 1 lesson).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const GATE = 'scripts/hooks/privacy-boundary-gate.mjs';
const RUN = 'scripts/hooks/lib/gate-run.mjs';

const MUTANTS = [
  ['Q4: an unobservable allow stops blocking', RUN,
    'if (!logged && closed) {', 'if (false) {'],

  ['fail-closed throw becomes a silent allow', RUN,
    "    appendTelemetry({ gate: name, boundary, result: 'error', reason: `check threw: ${err?.message ?? 'unknown'}`, latency_ms: latency });\n    return { exitCode: 0, payload: { decision: 'block', reason }, result: 'error', telemetrySound: true };",
    "    return { exitCode: 0, payload: null, result: 'error', telemetrySound: true };"],

  ['the disable marker stops being honoured', RUN,
    'if (isDisabled(name)) {', 'if (false) {'],

  ['the disable marker stops being ANNOUNCED', RUN,
    "    appendTelemetry({ gate: name, boundary, result: 'fail-open', reason: 'disabled', latency_ms: Math.round(now() - started) });",
    '    /* mutated: silent disable */'],

  ['runGate stops sanitizing the hostile env', RUN,
    '  sanitizeGateEnv();', '  /* mutated: env not sanitized */'],

  ['check-ignore loses --no-index (the real-git defect)', GATE,
    "exec('git', ['check-ignore', '--no-index', '--', ...staged], opts)",
    "exec('git', ['check-ignore', '--', ...staged], opts)"],

  ['check-ignore exit 1 becomes a hard error', GATE,
    'if (err?.status === 1) return [];', '/* mutated: exit 1 is an error */'],

  ['git-commit detection reverts to a substring match', GATE,
    "  return String(cmd)\n    .split(/\\|\\||&&|[;\\n|]/)\n    .some((seg) => /^\\s*(?:sudo\\s+)?git\\b(?:\\s+-[^\\s]+(?:\\s+\\S+)?)*\\s+commit\\b/.test(seg));",
    '  return /\\bgit\\b[^\\n]*\\bcommit\\b/.test(String(cmd));'],

  ['card detection falls back to bare Luhn', GATE,
    'filter: (m) => looksLikeCard(m) }', 'filter: (m) => luhnValid(m) }'],

  ['a personal mail domain gets allowlisted', GATE,
    "    '@users\\\\.noreply\\\\.github\\\\.com$',", "    '@(?:users\\\\.noreply\\\\.github\\\\.com|gmail\\\\.com)$',"],

  ['a directory is fed to the reader', GATE,
    'if (!st.isFile() || st.size > MAX_SCAN_BYTES) continue;', 'if (st.size > MAX_SCAN_BYTES) continue;'],

  ['an absent artifact becomes a scanner error', GATE,
    'try { st = statSync(abs); } catch { continue; }', 'st = statSync(abs);'],

  ['emission paths drop out of the scan set', GATE,
    'if (isLlmBound(target) && !signals.artifacts.includes(target)) signals.artifacts.push(target);',
    'if (isLlmBound(target) && !EMISSION_PATH_RE.test(target) && !signals.artifacts.includes(target)) signals.artifacts.push(target);'],

  ['stop_hook_active stops short-circuiting', GATE,
    'if (hookInput?.stop_hook_active) return null;', 'if (false) return null;'],

  ['the block message starts echoing the matched text', GATE,
    'if (hits.length) offenders.push({ path: p, kinds: hits.map((h) => h.kind) });',
    'if (hits.length) offenders.push({ path: p, kinds: hits.map((h) => `${h.kind}:${text.slice(0, 40)}`) });'],
];

const SUITES = [
  'scripts/hooks/privacy-boundary-gate.test.mjs',
  'scripts/hooks/gate-window-parity.test.mjs',
];

function suitesPass() {
  for (const s of SUITES) {
    try { execFileSync(process.execPath, [s], { stdio: 'ignore' }); } catch { return false; }
  }
  return true;
}

if (!suitesPass()) {
  console.log('BASELINE IS RED — every mutant would die for free. Aborting.');
  process.exit(2);
}
console.log('baseline: GREEN (control passed)\n');

let survived = 0;
for (const [name, file, from, to] of MUTANTS) {
  const original = readFileSync(file, 'utf8');
  const crlf = original.includes('\r\n');
  const f2 = crlf ? from.replace(/\n/g, '\r\n') : from;
  const t2 = crlf ? to.replace(/\n/g, '\r\n') : to;
  if (!original.includes(f2)) {
    console.log(`SKIP(=survived) ${name}\n                anchor not found in ${file}`);
    survived += 1;
    continue;
  }
  writeFileSync(file, original.replace(f2, t2), 'utf8');
  const green = suitesPass();
  writeFileSync(file, original, 'utf8');
  if (green) { console.log(`SURVIVED ${name}`); survived += 1; }
  else console.log(`killed   ${name}`);
}

console.log(`\n==== ${MUTANTS.length - survived}/${MUTANTS.length} mutants killed ====`);
console.log(suitesPass() ? 'post-run restore verified green' : 'WARNING: not green after restore');
if (survived) process.exitCode = 1;
