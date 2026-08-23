#!/usr/bin/env node
/**
 * rule-count.test.mjs — the counter that measures number drift must not drift.
 * ============================================================================
 * The first version of this counter returned 99 for a rulebook that defines 73,
 * because it matched every numbered list in the document rather than the rule
 * definitions. A wrong number produced by the number-drift detector is worse than no
 * detector: it is authoritative-looking and it is what the whole program is about.
 *
 * So the cases below are mostly about what must NOT be counted.
 *
 * Run: node scripts/hooks/rule-count.test.mjs   (exit 0 = pass)
 */
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyzeRules, auditRuleCount } from '../lib/rule-count.mjs';

let pass = 0;
const failures = [];
const check = (name, cond, detail = '') => {
  if (cond) { pass++; return; }
  failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
};
const doc = (...l) => l.join('\n');
const dirs = [];
const repo = (files) => {
  const d = mkdtempSync(join(tmpdir(), 'rulecount-'));
  dirs.push(d);
  for (const [n, body] of Object.entries(files)) writeFileSync(join(d, n), body);
  return d;
};

// ---- 1. The nested-list trap that produced 99 ------------------------------
{
  const t = doc(
    '# Book',
    'We follow the 3 MANDATORY rules below.',
    '## MANDATORY Rules (Apply to ALL Tasks)',
    '1. **First** — do a thing',
    '2. **Second** — with required sections:',
    '    1. **Nested one** — indented, part of rule 2',
    '    2. **Nested two** — also part of rule 2',
    '3. **Third** — last',
    '## Next Section',
    '1. **Not a rule** — different section entirely',
  );
  const a = analyzeRules(t);
  check('1a counts only column-zero definitions', a.count === 3, `count=${a.count}`);
  check('1b ignores indented sub-lists', a.max === 3, `max=${a.max}`);
  check('1c stops at the next H2', a.count === 3);
  check('1d reads the prose claim', a.claims.includes(3), JSON.stringify(a.claims));
}

// ---- 2. Drift is reported, agreement is silent -----------------------------
{
  const drifted = doc('The 66 MANDATORY rules apply.', '## MANDATORY Rules', '1. **A**', '2. **B**');
  const r = auditRuleCount(repo({ 'CLAUDE.md': drifted }), { files: ['CLAUDE.md'] });
  check('2a drift produces a finding', r.findings.length === 1, JSON.stringify(r.findings));
  check('2b names both numbers', /SAYS it has 66/.test(r.findings[0]) && /defines 2/.test(r.findings[0]), r.findings[0]);
  check('2c returns the computed count', r.count === 2, `count=${r.count}`);

  const agreed = doc('The 2 MANDATORY rules apply.', '## MANDATORY Rules', '1. **A**', '2. **B**');
  const r2 = auditRuleCount(repo({ 'CLAUDE.md': agreed }), { files: ['CLAUDE.md'] });
  check('2d agreement is silent', r2.findings.length === 0, JSON.stringify(r2.findings));

  // No claim written anywhere is fine — nothing to contradict.
  const noclaim = doc('## MANDATORY Rules', '1. **A**');
  check('2e absent claim is not a finding',
    auditRuleCount(repo({ 'CLAUDE.md': noclaim }), { files: ['CLAUDE.md'] }).findings.length === 0);
}

// ---- 3. Structural defects in the numbering --------------------------------
{
  const dup = doc('## MANDATORY Rules', '1. **A**', '2. **B**', '2. **B again**');
  const a = analyzeRules(dup);
  check('3a duplicate detected', a.duplicates.includes(2), JSON.stringify(a.duplicates));

  const gap = doc('## MANDATORY Rules', '1. **A**', '3. **C**');
  const g = analyzeRules(gap);
  check('3b gap detected', g.gaps.includes(2), JSON.stringify(g.gaps));
  const r = auditRuleCount(repo({ 'CLAUDE.md': gap }), { files: ['CLAUDE.md'] });
  check('3c gap is reported as a fact to confirm, not an error to renumber',
    /deliberate tombstones/.test(r.findings.join(' ')), r.findings.join(' '));

  const unordered = doc('## MANDATORY Rules', '2. **B**', '1. **A**');
  check('3d non-monotonic detected', analyzeRules(unordered).monotonic === false);
  check('3e ordered is monotonic', analyzeRules(doc('## MANDATORY Rules', '1. **A**', '2. **B**')).monotonic === true);
}

// ---- 4. Undeterminable is never clean --------------------------------------
{
  const a = analyzeRules(doc('# Book', '## Other', 'no rules here'));
  check('4a missing section is not ok', a.ok === false && /no "## MANDATORY Rules"/.test(a.why), a.why);
  const r = auditRuleCount(repo({ 'CLAUDE.md': '# nothing' }), { files: ['CLAUDE.md'] });
  check('4b and produces a finding', r.findings.length > 0, JSON.stringify(r.findings));

  const empty = analyzeRules(doc('## MANDATORY Rules', 'prose only, no numbered rules'));
  check('4c section with no definitions is not ok', empty.ok === false, empty.why);

  check('4d garbage input does not throw', analyzeRules(null).ok === false && analyzeRules(undefined).ok === false);

  // An absent mirror is legitimate; only the primary file's absence is a finding.
  const r2 = auditRuleCount(repo({ 'CLAUDE.md': doc('## MANDATORY Rules', '1. **A**') }), { files: ['CLAUDE.md', 'AGENTS.md'] });
  check('4e absent mirror is silent', r2.findings.length === 0, JSON.stringify(r2.findings));

  // A DELETED PRIMARY MUST NOT READ AS CLEAN. Found by hostile review of this
  // module: an absent CLAUDE.md originally produced zero findings, so a repo whose
  // rulebook had been deleted reported perfect health — the silent-success failure
  // this entire skill exists to prevent, inside the check that measures it.
  const r3 = auditRuleCount(repo({}), { files: ['CLAUDE.md', 'AGENTS.md'] });
  check('4f absent PRIMARY is a finding, not silence', r3.findings.length === 1, JSON.stringify(r3.findings));
  check('4g and says it is not clean', /DOES NOT EXIST/.test(r3.findings[0] || ''), JSON.stringify(r3.findings));
}

// ---- 5. CRLF and heading spelling ------------------------------------------
{
  check('5a CRLF parses', analyzeRules('## MANDATORY Rules\r\n1. **A**\r\n2. **B**\r\n').count === 2);
  check('5b heading suffix tolerated',
    analyzeRules(doc('## MANDATORY Rules (Apply to ALL Tasks)', '1. **A**')).count === 1);
  check('5c case-insensitive heading', analyzeRules(doc('## mandatory rules', '1. **A**')).count === 1);
}

// ---- 6. This repo, right now ------------------------------------------------
// Not a fixture: the real rulebook. Pins that the counter still finds the section
// and returns a plausible number, so a CLAUDE.md restructure cannot silently reduce
// this check to "no section found" and read as clean.
{
  const here = join(import.meta.dirname, '..', '..');
  const r = auditRuleCount(here, { files: ['CLAUDE.md'] });
  check('6a the real rulebook is still parseable', typeof r.count === 'number' && r.count > 20,
    `count=${r.count}`);
}

for (const d of dirs) { try { rmSync(d, { recursive: true, force: true }); } catch { /* temp */ } }

if (failures.length) {
  console.error(`FAIL ${failures.length} of ${pass + failures.length}`);
  for (const f of failures) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log(`rule-count: ${pass}/${pass} pass`);
