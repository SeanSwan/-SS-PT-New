/**
 * Mutation proof for the C3 fixes.
 *
 * Discipline: a green matrix proves nothing unless deleting each mechanism turns its case red.
 * Each mutation removes EXACTLY ONE fix, runs the shipped matrix, and reports which cases flip.
 * The file is restored from the pre-mutation backup afterwards and the matrix re-run, so the
 * repository is never left in a mutated state.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const SRC = 'scripts/intake-reach.mjs';
const BAKDIR = '.tmp-c3-proof';
const BAK = `${BAKDIR}/intake-reach.FIXED.mjs`;

// The backup is taken FRESH on every run, from the currently-shipped source. This is deliberate:
// restoring from a backup that was itself taken before an edit would restore the edit's
// predecessor, which is the classic way a "restore" silently reinstates the bug. The proof always
// restores to the exact bytes it started from.
mkdirSync(BAKDIR, { recursive: true });
const original = readFileSync(SRC, 'utf8');
writeFileSync(BAK, original);

/** Run the matrix and return {pass, fail, failed:[names]}. */
function runMatrix() {
  const r = spawnSync(process.execPath, ['--test', 'scripts/intake-reach.regression.test.mjs'],
    { encoding: 'utf8' });
  const out = r.stdout + r.stderr;
  const pass = Number((out.match(/# pass (\d+)/) || [])[1] ?? -1);
  const fail = Number((out.match(/# fail (\d+)/) || [])[1] ?? -1);
  const failed = [...out.matchAll(/^not ok \d+ - (.+)$/gm)].map((m) => m[1]);
  return { pass, fail, failed };
}

const MUTATIONS = [
  {
    name: 'M1 — disable string masking (impostor edges return)',
    case: 'RT-02',
    apply(src) {
      // Make maskStrings NOT blank string bodies: keep the body verbatim. Imports written inside
      // string literals then become real edges again (R2-08 c), while comment handling stays
      // intact — so exactly the impostor case should flip.
      return src.replace(
        "      const body = src.slice(bodyStart, i);\n      // Replace the body with a same-length filler that contains no quote or keyword, so every\n      // downstream regex index into the masked text still lines up with the original.\n      out += body.replace(/[^\\n]/g, ' ');",
        "      const body = src.slice(bodyStart, i);\n      // MUTATED: body is no longer blanked, so impostor imports inside strings count.\n      out += body;",
      );
    },
  },
  {
    name: 'M2 — disable the parse check (malformed source reads as absence)',
    case: 'RT-03',
    apply(src) {
      // Make detectParseError always report "no error". A truncated file is then parsed as if
      // valid, its (absent) imports are counted, and the target reads DEAD-CANDIDATE instead of
      // INCOMPLETE — which is precisely the defect RT-03 exists to catch.
      return src.replace(
        "  const parser = loadParser();\n  if (!parser) return null;",
        '  return null; // MUTATED: parse check disabled\n  // eslint-disable-next-line no-unreachable\n  const parser = loadParser();\n  if (!parser) return null;',
      );
    },
  },
  {
    name: 'M3 — revert relative resolution (raw string comparison)',
    case: 'RT-04',
    apply(src) {
      // Match on the raw specifier text again, which is what produced the false negative on
      // "../lib/widget" and the false positive on "./lib/widget" in other/use.ts.
      return src.replace(
        '      if (!isPathLike && !refersTo(s, target)) return false;\n      const r = resolvedByFile.get(file)?.get(s);\n      return Boolean(r && targetAbsSet.has(r));',
        '      return refersTo(s, target);',
      );
    },
  },
  {
    name: 'M4 — revert comment stripping (commented-out imports count as uses)',
    case: 'RT-08',
    apply(src) {
      // `stripComments` was removed as orphaned machinery after M4 previously mutated it to no
      // effect. Comment stripping now lives INSIDE maskStrings, so the mutation must target that
      // scan directly: make `//` and `/*` no longer recognised as comment openers.
      return src.replace(
        "    if (c === '/' && next === '/') {\n      while (i < n && src[i] !== '\\n') i += 1;\n      continue;\n    }",
        '    // MUTATED: line-comment handling disabled',
      ).replace(
        "    if (c === '/' && next === '*') {\n      i += 2;\n      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i += 1;\n      i += 2;\n      out += ' ';\n      continue;\n    }",
        '    // MUTATED: block-comment handling disabled',
      );
    },
  },
];

let allOk = true;
for (const m of MUTATIONS) {
  const mutated = m.apply(original);
  if (mutated === original) {
    console.log(`!! ${m.name}\n   MUTATION DID NOT APPLY — the anchor text changed. Fix the harness.`);
    allOk = false;
    continue;
  }
  writeFileSync(SRC, mutated);
  const result = runMatrix();
  const flipped = result.failed.some((f) => f.startsWith(m.case));
  console.log(`${flipped ? 'DETECTED' : '!! NOT DETECTED'}  ${m.name}`);
  console.log(`   expected case ${m.case} to fail;  pass=${result.pass} fail=${result.fail}`);
  console.log(`   failed: ${result.failed.length ? result.failed.join(' | ') : '(none)'}`);
  if (!flipped) allOk = false;
}

// Restore unconditionally, from the in-memory original — not via a file copy, so a partly-written
// backup cannot produce a partly-restored source.
writeFileSync(SRC, original);
const restored = runMatrix();
console.log(`\nRESTORED — pass=${restored.pass} fail=${restored.fail}`);
if (restored.fail !== 0) { console.log('!! RESTORATION DID NOT RETURN TO GREEN'); allOk = false; }
console.log(allOk ? '\nALL MUTATIONS DETECTED BY THEIR NAMED CASE' : '\nSOME MUTATIONS ESCAPED DETECTION');
process.exitCode = allOk ? 0 : 1;
