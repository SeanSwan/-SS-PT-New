/**
 * canary-harness.mjs — the runner behind the canary suite.
 * ========================================================
 * Split out of selftest.mjs for the 300-line cap (CLAUDE.md rule 4). Pure mechanics: it decides
 * whether each canary behaved, prints the result, and writes the record R15 reads at runtime.
 *
 * The record is BOUND to a hash of the gate's source (see source-hash.mjs). A suite run against
 * since-edited checks proves nothing, and round 5 measured what happens when that binding misses a
 * file: R4 was replaced with `return []` and the canary record still certified the gate.
 *
 * @module packet-gate/canary-harness
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { gateSourceHash } from './source-hash.mjs';

/**
 * Run every canary and report.
 *
 * A RED canary must produce its expected refusal code — a gate that cannot be driven red is
 * presumed failed. A GREEN canary must produce nothing: refusal fatigue kills the gate as surely as
 * a decorative gate does, so a check that fires on clean input is a bug of equal severity.
 *
 * @returns {number} process exit code: 0 when every canary behaved, 1 otherwise.
 */
export function runCanaries(cases, { root, outDir }) {
  const results = cases.map((c) => {
    try {
      const findings = c.run();
      const codes = findings.map((f) => f.code);
      if (c.expect === null) {
        return { name: c.name, pass: findings.length === 0, detail: findings.length ? `expected clean, got ${codes.join(',')}` : 'clean' };
      }
      return { name: c.name, pass: codes.includes(c.expect), detail: codes.length ? codes.join(',') : 'NO REFUSAL — gate did not fire' };
    } catch (err) {
      return { name: c.name, pass: false, detail: `threw: ${err.message}` };
    }
  });

  const greenCount = results.filter((r) => r.pass).length;
  const redCount = results.length - greenCount;

  for (const r of results) console.log(`${r.pass ? 'ok  ' : 'FAIL'}  ${r.name}${r.pass ? '' : `  [${r.detail}]`}`);
  console.log(`\n${greenCount}/${results.length} canaries green, ${redCount} red`);

  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, 'selftest.json'), JSON.stringify({
    ranAt: new Date().toISOString(), total: results.length, green: greenCount, red: redCount,
    // Binds this run to the gate code it certified — R15 refuses a record whose source has moved.
    sourceHash: gateSourceHash(), cases: results,
  }, null, 2));
  console.log(`wrote ${path.relative(root, path.join(outDir, 'selftest.json'))}`);

  return redCount === 0 ? 0 : 1;
}
