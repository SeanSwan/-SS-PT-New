#!/usr/bin/env node
/**
 * hook-classify.mutate.mjs — do the tests actually CATCH a regression?
 * ====================================================================
 * A DIFFERENT QUESTION FROM EVERY PRIOR ROUND. Thirteen rounds asked "is the code
 * wrong?" and found ~53 defects. Not one asked "if the code were wrong, would my
 * tests say so?" — and that is the question that kept failing:
 *
 *   - round 3 shipped a PASSING test asserting the bug was correct behaviour
 *   - the fuzzer's oracle checked existence, not identity, so a wrong-but-existing
 *     path passed green for two rounds
 *   - the degenerate-run guard sat after the loop it policed, so a hang reported
 *     nothing at all
 *
 * In every case the suite was green while the defect was live. A green suite is only
 * evidence if the suite can go red.
 *
 * HOW IT WORKS: apply a known MUTATION to the classifier source (each one a real
 * defect this session actually shipped), run the unit suite and the property fuzzer
 * against the mutant, and require at least one of them to FAIL. A mutation that
 * SURVIVES is a hole in the tests, not in the code — the tests would not notice that
 * regression returning.
 *
 * Writes mutants to a temp copy; the real source is never modified.
 * Run: node scripts/hooks/hook-classify.mutate.mjs
 */
import { readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(REPO, 'scripts', 'lib', 'hook-classify.mjs');
const original = readFileSync(SRC, 'utf-8');

/**
 * Each mutation reverts a real defect this session shipped. If the tests cannot tell
 * the mutant from the fixed code, they would not have caught that defect either.
 */
const MUTATIONS = [
  {
    name: 'R9: split on \\s+ again (VT/FF/CR treated as separators)',
    find: 'const words = cmd.trim().split(/[ \\t\\n]+/);',
    repl: 'const words = cmd.trim().split(/\\s+/);',
  },
  {
    name: 'R13: drop the first-bare-operand rule (sh -c node x.mjs false OK)',
    find: 'if (firstOperand !== candidates[0]) {',
    repl: 'if (false) {',
  },
  {
    name: 'R13: drop the command-word-is-a-path rule',
    find: "if (candidates[0] !== words[0] && /[/\\\\]/.test(words[0])) {",
    repl: 'if (false) {',
  },
  {
    name: 'R7: accept flag-embedded paths again (--import=./x.mjs)',
    find: "if (tok.startsWith('-')) {",
    repl: 'if (false) {',
  },
  {
    name: 'R5: assert on the first of several candidates',
    find: 'if (candidates.length > 1) {',
    repl: 'if (false) {',
  },
  {
    name: 'R3: statSync existence instead of isFile (directory reads as healthy)',
    find: 'return statSync(abs).isFile()',
    repl: 'return (statSync(abs), true)',
  },
  {
    name: 'R9: treat ENOTDIR as unreadable rather than absent',
    find: "if (e?.code === 'ENOENT' || e?.code === 'ENOTDIR')",
    repl: "if (e?.code === 'ENOENT')",
  },
  {
    name: 'R4: let an empty command fall through silently',
    find: "if (typeof cmd !== 'string' || !cmd.trim()) {",
    repl: 'if (false) {',
  },
];

// Only `scripts/` is copied. `.claude/` holds symlinked skill directories that
// cpSync cannot reproduce without elevation on Windows, and neither the unit suite
// nor the classifier fuzzer reads it — they exercise classifyCommand, which takes a
// root as a parameter and touches no config.
const work = mkdtempSync(join(tmpdir(), 'mutate-'));
cpSync(join(REPO, 'scripts'), join(work, 'scripts'), { recursive: true });

const run = (rel) => {
  try {
    execFileSync(process.execPath, [join(work, rel)], { stdio: 'pipe', timeout: 180000 });
    return 'PASS';
  } catch {
    return 'FAIL';
  }
};

/**
 * How many verdicts does the mutant actually CHANGE? Zero means the mutation is
 * unobservable here, so no test could have caught it and calling it a hole would be
 * a phantom finding.
 */
const PROBES = [
  'node scripts/lib/hook-classify.mjs',
  'node scripts/hooks/absent.mjs',
  'node --import=./scripts/lib/hook-classify.mjs ./scripts/guard',
  'node -r ./scripts/lib/hook-classify.mjs scripts/hooks/absent.mjs',
  'sh -c node scripts/hooks/x.mjs',
  'scripts/pre load.mjs',
  `node ./a${String.fromCharCode(0x0B)}b.mjs`,
  'node notadir.mjs/child.mjs',
  '',
  'node scripts/hooks/dir-like.mjs',
];
function differentialCount(mutation) {
  const script = `
    import { classifyCommand as base } from ${JSON.stringify(pathToFileURL(SRC).href)};
    import { classifyCommand as mut } from ${JSON.stringify(pathToFileURL(join(work, 'scripts', 'lib', 'hook-classify.mjs')).href)};
    const probes = ${JSON.stringify(PROBES)};
    let n = 0;
    for (const p of probes) {
      const a = base(p, ${JSON.stringify(REPO)});
      const b = mut(p, ${JSON.stringify(REPO)});
      if (a.kind !== b.kind || String(a.key) !== String(b.key)) n += 1;
    }
    console.log(n);
  `;
  const f = join(work, 'diff-probe.mjs');
  writeFileSync(f, script);
  try {
    return Number(execFileSync(process.execPath, [f], { encoding: 'utf-8', timeout: 60000 }).trim());
  } catch {
    return -1;   // could not measure — treat as unknown, not as clean
  }
}

const survivors = [];
let killed = 0;
let shadowed = 0;
console.log(`  ${MUTATIONS.length} mutations, each a defect this session actually shipped\n`);

for (const m of MUTATIONS) {
  if (!original.includes(m.find)) {
    // A mutation that cannot be applied is itself a finding: the code moved and this
    // harness is silently testing nothing. Never let that read as a pass.
    survivors.push({ name: m.name, why: 'ANCHOR NOT FOUND — mutation could not be applied' });
    console.log(`  ANCHOR-MISS  ${m.name}`);
    continue;
  }
  writeFileSync(join(work, 'scripts', 'lib', 'hook-classify.mjs'), original.replace(m.find, m.repl));

  const unit = run(join('scripts', 'hooks', 'drift-check-gate.test.mjs'));
  const fuzz = run(join('scripts', 'hooks', 'drift-check-gate.fuzz.mjs'));
  const caught = unit === 'FAIL' || fuzz === 'FAIL';

  if (caught) {
    killed += 1;
    console.log(`  KILLED    unit=${unit} fuzz=${fuzz}  ${m.name}`);
    continue;
  }

  // "Survived" is THREE different findings and reporting them as one would be its own
  // false alarm — the thing this whole session has been about. A mutation only proves
  // a TEST HOLE if the mutant actually behaves differently. If it produces identical
  // verdicts on every input, either a second guard already covers the case
  // (defence-in-depth, not a gap) or the condition cannot occur on this platform —
  // Windows returns ENOENT where POSIX returns ENOTDIR, so that branch is unreachable
  // here and no test on this machine could discriminate it.
  const diff = differentialCount(m);
  if (diff === 0) {
    shadowed += 1;
    console.log(`  SHADOWED  unit=${unit} fuzz=${fuzz}  ${m.name}`);
    console.log('              (mutant is behaviourally identical here — another guard covers it, or the condition cannot occur on this platform)');
  } else {
    console.log(`  SURVIVED  unit=${unit} fuzz=${fuzz}  ${m.name}`);
    survivors.push({ name: m.name, why: `mutant changed ${diff} verdict(s) and both the suite and the fuzzer stayed green` });
  }
}

writeFileSync(join(work, 'scripts', 'lib', 'hook-classify.mjs'), original);
rmSync(work, { recursive: true, force: true });

// Report the three categories SEPARATELY. Folding SHADOWED into KILLED would claim
// the tests caught something they never saw — a green number covering work that did
// not happen, which is the exact class this harness exists to expose.
console.log(`\n  killed by tests: ${killed}/${MUTATIONS.length}`);
console.log(`  shadowed (unobservable here — another guard covers it, or this platform cannot produce the condition): ${shadowed}`);
console.log(`  survived (REAL test holes): ${survivors.length}`);
if (survivors.length) {
  console.log('\n  SURVIVING MUTATIONS — the tests would NOT catch these regressions:');
  for (const s of survivors) console.log(`    - ${s.name}\n        ${s.why}`);
  process.exit(1);
}
console.log(`  no test holes: every OBSERVABLE regression was caught. ${shadowed} mutation(s) could not be observed on this platform and prove nothing either way.`);
process.exit(0);
