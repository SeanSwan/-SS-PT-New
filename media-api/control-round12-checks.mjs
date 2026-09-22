/**
 * control-round12-checks.mjs — prove round 6's NEW assertions can actually fail.
 *
 * Round 6's old `max_cost_usd` check passed VACUOUSLY after the round-12 refactor, because
 * it asserted the ABSENCE of a string and the string had moved to another file. A check
 * that cannot distinguish "fixed" from "moved" is not a check.
 *
 * So every new pattern is run against a MUTATED copy of the real source: the exact edit a
 * regression would make. If a pattern still matches after its subject is removed, it was
 * never testing the subject.
 */
import { readFileSync } from 'node:fs';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const ceilings = strip(read('../backend/scripts/handlers/ceilings.mjs'));
const guard = strip(read('../shared/providers/video/spendGuard.mjs'));
const gate = strip(read('../shared/providers/video/ceilingGate.mjs'));
// Round 13 split the per-caller half out of `ceilingGate.mjs` for rule 4. The control reads
// where the code lives now — the same follow-through the assertions themselves needed, and
// the reason this file failed the moment the split landed rather than passing vacuously.
const caller = strip(read('../shared/providers/video/callerCeiling.mjs'));
const ledger = strip(read('../shared/providers/video/usageLedger.mjs'));
const runner = read('../backend/scripts/handlers/generateVideo.mjs');

let pass = 0; let fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? `\n          ${detail}` : ''}`); }
  else { fail += 1; console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`); }
};

// Each case: [label, real source, mutation, pattern]
const cases = [
  ['per-job ceiling call', ceilings,
    ceilings.replace(/jobRefusal\(\{\s*maxCostUsd: job\.maxCostUsd, runCostUsd: allowance\.runCost\s*\}\)/s, 'noop()'),
    /jobRefusal\(\{\s*maxCostUsd: job\.maxCostUsd, runCostUsd: allowance\.runCost\s*\}\)/],
  ['principal on checkRunAllowed', guard,
    guard.replace('limits = readLimits(), caller = null', 'limits = readLimits()'),
    /checkRunAllowed\(caps, usage = \{ runs: 0, spendUsd: 0 \}, limits = readLimits\(\), caller = null\)/],
  ['guard delegates to callerRefusal', guard,
    guard.replace(/callerRefusal\(\{[\s\S]*?\}\);\n\s*if \(refusal\)/, 'if (false)'),
    /callerRefusal\(\{/],
  ['per-caller env caps', caller,
    caller.replace(/SWAN_VIDEO_MAX_RUNS_DAILY_PER_CALLER/g, 'X').replace(/SWAN_VIDEO_MAX_SPEND_USD_DAILY_PER_CALLER/g, 'Y'),
    /SWAN_VIDEO_MAX_RUNS_DAILY_PER_CALLER/],
  ['the split is invisible to importers', gate,
    gate.replace(/export \{ callerLimits[\s\S]*?callerCeiling\.mjs';/, ''),
    /export \{ callerLimits, callerRefusal, callerScope, CeilingError \} from '\.\/callerCeiling\.mjs'/],
  ['per-caller ledger split', ledger,
    ledger.replace(/callers/g, 'nothing').replace(/caller = null/, 'x'),
    /callers/],
  ['per-job refusal is permanent', runner,
    runner.replace(/E_JOB_COST_EXCEEDED/, 'E_WHATEVER'),
    /E_JOB_COST_EXCEEDED/],
  ['global ceiling still per-day', ceilings,
    ceilings.replace(/usageFor\(day\)/, 'usageFor(whatever)'),
    /usageFor\(day\)/],
];

console.log('CONTROL — round 6\'s new assertions must fail on the regression they describe\n');
for (const [label, real, mutated, pattern] of cases) {
  check(`CONTROL: "${label}" matches the REAL source`, pattern.test(real));
  check(`CONTROL: "${label}" does NOT match the MUTATED source`, !pattern.test(mutated),
    'so the assertion is testing its subject, not a coincidence');
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
