/**
 * Mutation proof for the R2-10 registry/authority fix.
 *
 * A green AT-06/AT-07 proves nothing unless removing the mechanism turns those cases red. Each
 * mutation deletes exactly one of R2-10's two named bypass fixes, runs the matrix, and reports
 * which cases flip.
 *
 * Mutations are applied LINE-BASED, by matching an anchor substring and replacing whole lines.
 * String.prototype.replace with a template-literal anchor is fragile here: the target code contains
 * backticks and `${...}`, which the harness's own string literal would interpolate. Line-based
 * replacement sidesteps that entirely.
 *
 * Restores from the in-memory original unconditionally, never from a file copy.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const SRC = 'scripts/blueprint-master-evidence.test.mjs';
const original = readFileSync(SRC, 'utf8');

function runMatrix() {
  const r = spawnSync(process.execPath, [
    '--experimental-vm-modules', '--test', 'scripts/blueprint-master-evidence.regression.test.mjs',
  ], { encoding: 'utf8' });
  const out = r.stdout + r.stderr;
  const pass = Number((out.match(/# pass (\d+)/) || [])[1] ?? -1);
  const fail = Number((out.match(/# fail (\d+)/) || [])[1] ?? -1);
  const failed = [...out.matchAll(/^not ok \d+ - (.+)$/gm)].map((m) => m[1]);
  return { pass, fail, failed };
}

/** Replace every line containing `anchor` with the given replacement line. */
function mutateLines(src, anchor, replacement) {
  const lines = src.split('\n');
  let hits = 0;
  const out = lines.map(line => {
    if (line.includes(anchor)) { hits += 1; return replacement; }
    return line;
  });
  return { text: out.join('\n'), hits };
}

/**
 * Replace a MULTI-LINE block: every line from the one containing `startAnchor` through the one
 * containing `endAnchor` (inclusive) becomes `replacement`. Needed because the rejection under test
 * spans two lines — replacing only the second leaves an unclosed `assert.ok(` and produces a syntax
 * error, which fails all cases and would be a vacuous "detection".
 */
function mutateBlock(src, startAnchor, endAnchor, replacement) {
  const lines = src.split('\n');
  const start = lines.findIndex(l => l.includes(startAnchor));
  const end = start === -1 ? -1 : lines.findIndex((l, i) => i >= start && l.includes(endAnchor));
  if (start === -1 || end === -1) return { text: src, hits: 0 };
  return {
    text: [...lines.slice(0, start), replacement, ...lines.slice(end + 1)].join('\n'),
    hits: 1,
  };
}

const MUTATIONS = [
  {
    name: 'N1 — aliases bypass normalization + name/path split (R2-10 bypass 1)',
    case: 'AT-06',
    // NOTE (hostile review round 3): this mutation had to be WIDENED, and its overlap with AT-12 is
    // DECLARED rather than tolerated. The first repair rejected the escaping alias through
    // `normalizeRepoPath` alone; the H-05 fix added a SECOND guard (`!normalized.includes('/')`) that
    // rejects the same input. Reverting only the normalization left the case red for the other
    // reason, so the mutation proved nothing about normalization. The whole alias-ingest block is
    // reverted here — that block IS the fix — and AT-12 goes red with AT-06 because both read it.
    caseOverlap: ['AT-06', 'AT-12'],
    apply: (src) => mutateBlock(
      src,
      'const normalized = normalizeRepoPath(alias,',
      'declare the renamed path explicitly.',
      '      const normalized = alias; // MUTATED: raw alias, no normalization and no name/path split',
    ),
  },
  {
    name: 'N2 — a REJECTED document may be cited as an authority (R2-10 bypass 2)',
    case: 'AT-07',
    // DECLARED overlap: one predicate serves AT-07 (cited by path) and AT-08 (cited by alias), so
    // removing it reddens both. That is correct, not a defect — the alias HALF is isolated by N3,
    // which is case-precise and proves AT-08 is load-bearing on its own.
    caseOverlap: ['AT-07', 'AT-08'],
    // Block mutation: the rejection spans two lines (the assert.ok call and its message). Replacing
    // only the message line leaves an unclosed call, which is a syntax error — that would fail every
    // case and look like a detection while proving nothing.
    apply: (src) => mutateBlock(
      src,
      'const citing = laneAuthorities.find(a => a.path === docPath',
      'citing.aliasOf === docPath ?',
      '        void docPath; // MUTATED: rejected-citation check removed',
    ),
  },
  /* -------------------------------------------------------------------------
   * HOSTILE REVIEW ROUND 3 (record 31) — mutations for the four bypasses the first repair left
   * open. Each removes exactly one new mechanism; the NAMED case must be the one that dies.
   * ------------------------------------------------------------------------- */
  {
    name: 'N3 — the aliasOf target is not checked against rejected documents (H-01)',
    case: 'AT-08',
    // Remove only the alias half of the rejected-citation predicate, leaving `a.path === docPath`.
    // If AT-08 still fails, the case is being killed by something else and is not load-bearing here.
    apply: (src) => mutateBlock(
      src,
      'const citing = laneAuthorities.find(a => a.path === docPath',
      "path === docPath || a.aliasOf === docPath);",
      '        const citing = laneAuthorities.find(a => a.path === docPath); // MUTATED: aliasOf not followed',
    ),
  },
  {
    name: 'N4 — precedence reverts to a bare integer check (H-02 form 1)',
    case: 'AT-09',
    apply: (src) => mutateLines(
      src,
      'assert.ok(Number.isInteger(entry.precedence) && entry.precedence > 0,',
      '  assert.ok(Number.isInteger(entry.precedence), // MUTATED: positivity not checked',
    ),
  },
  {
    name: 'N5 — a tie is allowed again, so precedence is not a total order (H-02 form 2)',
    case: 'AT-10',
    apply: (src) => mutateBlock(
      src,
      "unique(lane.authorities.map(a => a.precedence),",
      'declares a duplicated precedence`);',
      '    // MUTATED: precedence tie check removed',
    ),
  },
  {
    name: 'N6 — names and paths share one collision space again (H-05)',
    case: 'AT-12',
    apply: (src) => mutateBlock(
      src,
      "assert.ok(!normalized.includes('/'),",
      'explicitly.',
      '      // MUTATED: path-shaped alias admitted to the name space',
    ),
  },
];

let allOk = true;
for (const m of MUTATIONS) {
  const { text: mutated, hits } = m.apply(original);
  if (hits === 0) {
    console.log(`!! ${m.name}\n   MUTATION DID NOT APPLY — anchor not found.`);
    allOk = false;
    continue;
  }
  // Guard against a mutation that merely breaks syntax: that is not a detection.
  const syntax = spawnSync(process.execPath, ['--check', SRC], { encoding: 'utf8' });
  writeFileSync(SRC, mutated);
  const afterCheck = spawnSync(process.execPath, ['--check', SRC], { encoding: 'utf8' });
  if (afterCheck.status !== 0) {
    console.log(`!! ${m.name}\n   MUTATION PRODUCED A SYNTAX ERROR — not a valid detection.`);
    console.log(`   ${String(afterCheck.stderr).split('\n')[0]}`);
    allOk = false;
    continue;
  }
  void syntax;
  const result = runMatrix();
  const flipped = result.failed.some((f) => f.startsWith(m.case));
  // "Precise" means exactly one case died. A mutation that kills SEVERAL cases is only acceptable if
  // it DECLARES which ones and why — otherwise it may be failing cases for an unrelated reason (a
  // shared helper, a fixture break) and flattering the proof. Undeclared overlap is treated as a
  // failure of the proof, not as a pass with a caveat.
  const declared = new Set(m.caseOverlap ?? [m.case]);
  const undeclared = result.failed.filter((f) => ![...declared].some((d) => f.startsWith(d)));
  const precise = result.fail === 1;
  let verdict;
  if (!flipped) { verdict = '!! NOT DETECTED'; allOk = false; }
  else if (precise) verdict = 'DETECTED';
  else if (undeclared.length === 0) verdict = 'DETECTED (declared overlap)';
  else { verdict = 'DETECTED (UNDECLARED OVERLAP — not attributable)'; allOk = false; }
  console.log(`${verdict}  ${m.name}`);
  console.log(`   expected ${m.case}${m.caseOverlap ? ` (declared: ${m.caseOverlap.join(', ')})` : ''}; pass=${result.pass} fail=${result.fail}`);
  console.log(`   failed: ${result.failed.length ? result.failed.join(' | ') : '(none)'}`);
}

writeFileSync(SRC, original);
const restored = runMatrix();
console.log(`\nRESTORED — pass=${restored.pass} fail=${restored.fail}`);
if (restored.fail !== 0) { console.log('!! RESTORATION DID NOT RETURN TO GREEN'); allOk = false; }
console.log(allOk ? '\nALL MUTATIONS DETECTED' : '\nSOME MUTATIONS ESCAPED');
process.exitCode = allOk ? 0 : 1;
