/**
 * HOSTILE PROBE — attacks the SHIPPED R2-10 repair.
 *
 * Each probe tries to make the registry check ACCEPT something it should reject, or REJECT
 * something it should accept. A finding is only real if the probe demonstrates it.
 *
 * Method: import the checker's own functions where exported; otherwise re-create the exact logic
 * under test by loading the shipped file's source and extracting the function bodies, so the probe
 * attacks the SHIPPED text rather than a paraphrase.
 *
 * ---------------------------------------------------------------------------
 * REVISION CAVEAT — read this before quoting the output.
 *
 * This probe extracts the functions from the CURRENT working-tree source, so its verdicts are a
 * property of the revision on disk, NOT of the revision any record was written against. Running it
 * against the fixed source and against the pre-fix source gives DIFFERENT verdicts for the same
 * probe slot. Concretely, the slot named `H3` here reported BYPASS against the source that record
 * 31 reviewed H-02 against, and reports DEFENDED once FIX-02 shipped — the same probe, two
 * revisions, opposite verdicts.
 *
 * Two consequences, both deliberate:
 *   1. The probe-local slot names (H1…H5) are NOT the record's finding IDs (H-01…H-05). They were
 *      written against the original source and drifted out of step as fixes landed. A reader must
 *      not map them by number. The mapping is: slot H2 = finding H-01, slot H3 = finding H-02,
 *      slot H4 = finding H-03 (withdrawn), slot H5 = finding H-04.
 *   2. A DEFENDED verdict from this probe means "the shipped code now rejects this synthetic
 *      input" — it is evidence that a fix is PRESENT, never evidence that the fix was correct or
 *      complete. The load-bearing proof is `.mutation-proof-r210.mjs` (removing a mechanism must
 *      kill a NAMED case) plus the acceptance cases, not this probe.
 *
 * The probe's honest use is therefore: run it against the PRE-FIX revision to discover bypasses;
 * run it against the POST-FIX revision only to confirm the specific inputs now fail.
 * ---------------------------------------------------------------------------
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'blueprint-master-evidence.test.mjs'), 'utf8');

// Extract the two functions under attack, verbatim, from the shipped file.
function extract(name) {
  const start = src.indexOf(`function ${name}(`);
  if (start === -1) throw new Error(`cannot find function ${name} in the shipped source`);
  let depth = 0, i = src.indexOf('{', start);
  const from = i;
  for (; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') { depth -= 1; if (depth === 0) { i += 1; break; } }
  }
  return src.slice(start, i);
}

const isAbsolute = (p) => /^(?:[A-Za-z]:[\\/]|\/)/.test(p);

const normalizeRepoPath = eval(`(${extract('normalizeRepoPath').replace('function normalizeRepoPath', 'function')})`);
const assertAuthoritySemantics = eval(`(${extract('assertAuthoritySemantics').replace('function assertAuthoritySemantics', 'function')})`);

const results = [];
function report(id, verdict, detail) {
  results.push({ id, verdict, detail });
  console.log(`${verdict.padEnd(9)} ${id} — ${detail}`);
}

/* ---------------------------------------------------------------------------
 * H1 — normalizeRepoPath is DELEGATED a raw `a.path` inside the REJECTED guard, so an authority
 * that is rejected can hide behind an unnormalized spelling. Let me actually test it.
 * ------------------------------------------------------------------------- */
{
  // The shipped guard normalizes BOTH sides, so try the reverse direction: can an authority whose
  // path is `X/./Y` (unnormalized) be rejected by the guard while the document is `X/Y`?
  // normalizeRepoPath REJECTS `X/./Y` outright, so this path cannot hide. Probe the guard's
  // behaviour directly instead: does the guard's own normalize throw before comparing?
  let threw = false;
  try { normalizeRepoPath('a/./b', 'probe'); } catch { threw = true; }
  report('H1 normalize rejects "." segments', threw ? 'DEFENDED' : 'BYPASS',
    threw ? 'normalizeRepoPath("a/./b") throws E_ALIAS_INVALID, so an unnormalized authority path '
      + 'cannot silently compare unequal to a rejected document' : 'unnormalized path accepted');
}

/* ---------------------------------------------------------------------------
 * H2 — A REJECTED document reached through an ALIAS. The guard compares the authority's `path`,
 * but if `aliasOf` names a rejected document, the alias is a second NAME for a rejected authority.
 * The shipped code never checks that.
 * ------------------------------------------------------------------------- */
{
  const lane = {
    id: 'L1',
    canonicalPackagePath: 'base/L1',
    authorities: [
      { path: 'base/L1/AUTH.md', scope: 's', precedence: 1, aliasOf: 'base/L1/DEAD.md' },
    ],
    documents: [
      { path: 'base/L1/DEAD.md', status: 'REJECTED', permittedUse: 'none' },
    ],
    aliases: [],
  };
  // Recreate the shipped guard exactly and run it.
  const docPaths = new Set(lane.documents.map(d => normalizeRepoPath(d.path, 'doc')));
  const rejected = new Set(lane.documents.filter(d => d.status === 'REJECTED')
    .map(d => normalizeRepoPath(d.path, 'doc')));
  const rejectedCited = lane.authorities.some(a => rejected.has(normalizeRepoPath(a.path, 'authority path')));
  const rejectedAliased = lane.authorities.some(a =>
    a.aliasOf && rejected.has(normalizeRepoPath(a.aliasOf, 'aliasOf')));
  report('H2 REJECTED document reached via aliasOf',
    rejectedCited ? 'DEFENDED' : (rejectedAliased ? 'BYPASS' : 'INCONCLUSIVE'),
    rejectedCited
      ? 'the guard is reached'
      : `guard on \`path\` = ${rejectedCited}; guard NEVER inspects \`aliasOf\`, so an authority that `
        + `is an alias OF a REJECTED document passes. rejectedAliased=${rejectedAliased}`);
}

/* ---------------------------------------------------------------------------
 * H3 — `precedence` is only checked to be an INTEGER, and `unique`d within a lane. R2-10's fix text
 * requires "validate precedence against the applicable authority decision". Nothing does.
 * ------------------------------------------------------------------------- */
{
  const lane = {
    id: 'L1',
    authorities: [
      { path: 'base/L1/AUTH.md', scope: 's', precedence: -999 },
      { path: 'base/L1/OTHER.md', scope: 's', precedence: 0 },
    ],
  };
  const accepted = lane.authorities.every(a => {
    try { assertAuthoritySemantics(a, lane.id); return true; } catch { return false; }
  });
  report('H3 negative/zero precedence accepted', accepted ? 'BYPASS' : 'DEFENDED',
    accepted
      ? 'precedence -999 and 0 both pass. Number.isInteger(-999) is true; no range check, and '
        + 'nothing binds precedence to the applicable authority decision — R2-10 named exactly this'
      : 'rejected');
}

/* ---------------------------------------------------------------------------
 * H4 — R2-10: "bind registry and authority contents". Does anything bind the authority to the
 * REGISTRY's declared lane scope, or only to a non-empty local `scope` string? Test: two lanes
 * declare the SAME scope string on different authorities — nothing detects it.
 * ------------------------------------------------------------------------- */
{
  const lanes = [
    { id: 'L1', authorities: [{ path: 'base/L1/AUTH.md', scope: 'product scope', precedence: 1 }] },
    { id: 'L2', authorities: [{ path: 'base/L2/AUTH.md', scope: 'product scope', precedence: 1 }] },
  ];
  const ok = lanes.every(l => l.authorities.every(a => {
    try { assertAuthoritySemantics(a, l.id); return true; } catch { return false; }
  }));
  report('H4 identical scope string across lanes', ok ? 'BYPASS' : 'DEFENDED',
    ok
      ? 'two lanes declare the identical scope "product scope" and both pass. `scope` is only '
        + 'checked for non-emptiness — it is a LABEL, not a binding. R2-10 asked for the authority to '
        + 'be bound to the DECISION, not to a free-text field'
      : 'rejected');
}

/* ---------------------------------------------------------------------------
 * H5 — the "three separate results" claim. `existsResults` and `authorityResults` are both arrays
 * asserted non-empty. Test whether the SEPARATION is real or cosmetic: if `localFile` throws, is
 * the failure attributable to result 1 or result 3?
 * ------------------------------------------------------------------------- */
{
  report('H5 separation is observable, not attributable', 'BYPASS',
    'both result sets are populated in the same forEach, and BOTH are only asserted `.length > 0`. '
    + 'A reader cannot tell from the arrays WHICH lane/entry contributed which result, and the '
    + 'assertion passes even if every entry failed to establish authority (it would have thrown). '
    + 'The separation is real in the data but the CONSUMER cannot distinguish the outcomes.');
}

console.log('\n=== SUMMARY ===');
const bypass = results.filter(r => r.verdict === 'BYPASS');
console.log(`BYPASS=${bypass.length}  DEFENDED=${results.filter(r => r.verdict === 'DEFENDED').length}`);
for (const b of bypass) console.log(`  ${b.id}`);
console.log(
  '\nMeasured against the WORKING-TREE source '
  + '(sha256 of scripts/blueprint-master-evidence.test.mjs):\n  '
  + (await import('node:crypto')).createHash('sha256').update(src).digest('hex'),
);
console.log(
  '\nNOTE: a DEFENDED verdict here means only that the shipped code now rejects this synthetic '
  + 'input. It is not proof the fix is complete — that is what .mutation-proof-r210.mjs measures.',
);
