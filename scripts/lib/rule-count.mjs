/**
 * rule-count.mjs — the rulebook must be able to say how big it is.
 * ================================================================
 * "66 MANDATORY rules" is written in CLAUDE.md's own router. The section defines 73.
 * A forensics report counted 164. Three numbers, no agreement, and every one of them
 * typed by hand.
 *
 * Four hostile panel seats flagged this, and ox-alpha named why it matters more than
 * its size suggests:
 *
 *   "Symbolically fatal — the program's thesis is that drifted numbers are a root
 *    cause, and the rulebook's own count is a drifted number."
 *
 * It is not merely embarrassing. `MERGED:` closure in the learning-packet schema
 * validates against a rule registry; a registry whose cardinality is unknown by ~2.5×
 * cannot support merge detection at all (GLM 5.3). And an agent cannot verify it has
 * read the whole rulebook against a number that is wrong.
 *
 * THE RULE THIS FILE ENFORCES ON ITSELF: generate it, or stop printing it. This
 * module only ever computes; it never writes a number into a document.
 *
 * COUNTING IS THE HARD PART, and the naive version is wrong. A first attempt matched
 * a bare "digits-dot-bold" pattern across the whole file and returned 99, because
 * CLAUDE.md is full of OTHER numbered lists — the four Karpathy principles, rule 48's
 * twelve required sections, the dual-pass checklist. Producing a confident wrong number while
 * measuring number drift is the exact failure under audit, so the scan is bounded to
 * the MANDATORY Rules section and to column zero, and it reports gaps, duplicates
 * and non-monotonicity rather than just a total.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Heading that opens the rules section, and the pattern that closes it. */
const SECTION = /^##\s+MANDATORY Rules/i;
const NEXT_H2 = /^##\s/;
/** A rule definition: column zero, `N. **`. Indented lists inside a rule never match. */
const RULE_DEF = /^(\d+)\.\s+\*\*/;
/** Prose claims like "the 66 MANDATORY rules" or "83 MANDATORY rules". */
const CLAIM = /\b(\d{1,4})\s+MANDATORY rules\b/gi;

/**
 * Count the rule definitions in one document.
 * @returns {{ok: boolean, why?: string, count: number, min: number, max: number,
 *            gaps: number[], duplicates: number[], monotonic: boolean, claims: number[]}}
 */
export function analyzeRules(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex((l) => SECTION.test(l));
  if (start < 0) {
    return { ok: false, why: 'no "## MANDATORY Rules" section found', count: 0, claims: [] };
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (NEXT_H2.test(lines[i])) { end = i; break; }
  }

  const nums = [];
  for (const l of lines.slice(start + 1, end)) {
    const m = l.match(RULE_DEF);
    if (m) nums.push(Number(m[1]));
  }
  if (!nums.length) {
    return { ok: false, why: 'the MANDATORY Rules section defines no numbered rules', count: 0, claims: [] };
  }

  const min = Math.min(...nums), max = Math.max(...nums);
  const seen = new Set(), duplicates = [];
  for (const n of nums) { if (seen.has(n)) duplicates.push(n); seen.add(n); }
  const gaps = [];
  for (let i = min; i <= max; i++) if (!seen.has(i)) gaps.push(i);
  const monotonic = nums.every((n, i) => i === 0 || n > nums[i - 1]);

  // Claims are read from the WHOLE document — the router sentence that states the
  // count lives above the section it describes.
  const claims = [...String(text).matchAll(CLAIM)].map((m) => Number(m[1]));

  return { ok: true, count: nums.length, min, max, gaps, duplicates, monotonic, claims };
}

/**
 * Audit the rulebook's self-description.
 * @returns {{findings: string[], scopeNote: string, count: number|null}}
 */
export function auditRuleCount(root, { files = ['CLAUDE.md', 'AGENTS.md'] } = {}) {
  const findings = [];
  const scopeNote =
    'counts column-zero `N. **` definitions inside the "## MANDATORY Rules" section only; ' +
    'numbered lists nested inside a rule are deliberately not counted';
  let firstCount = null;

  for (const name of files) {
    let text;
    try {
      text = readFileSync(join(root, name), 'utf-8');
    } catch (e) {
      // AGENTS.md may legitimately be absent in a repo that has no mirror. An
      // UNREADABLE file is not the same thing and must not be silently skipped.
      if (e?.code !== 'ENOENT') {
        findings.push(`${name} exists but could not be read (${e?.code || 'unknown'}) — its rule count is UNKNOWN, not clean.`);
      }
      continue;
    }

    const a = analyzeRules(text);
    if (!a.ok) {
      // Only report a missing section for the primary file; a mirror without one is
      // its own separate (already-detected) drift.
      if (name === files[0]) findings.push(`${name}: ${a.why} — the rule count could not be computed.`);
      continue;
    }
    if (firstCount === null) firstCount = a.count;

    if (a.duplicates.length) {
      findings.push(`${name} defines rule number(s) ${[...new Set(a.duplicates)].join(', ')} more than once — a rule cited by number is then ambiguous.`);
    }
    if (a.gaps.length) {
      // A gap is not automatically wrong: rule 12 is a deliberate tombstone kept so
      // that ~109 documents citing rule numbers stay valid. Report it as a fact to
      // confirm, never as an error to fix by renumbering.
      findings.push(`${name} has no definition for rule number(s) ${a.gaps.join(', ')} between ${a.min} and ${a.max}. If these are deliberate tombstones, say so at the number; if not, a rule has been lost.`);
    }
    if (!a.monotonic) {
      findings.push(`${name} rule numbers are not in ascending order — a reader cannot bisect to find rule N.`);
    }

    const wrong = [...new Set(a.claims)].filter((c) => c !== a.count);
    if (wrong.length) {
      findings.push(
        `${name} SAYS it has ${wrong.join(' / ')} MANDATORY rules; it defines ${a.count} (${a.min}-${a.max}). ` +
        'The rulebook cannot state its own size. Any agent verifying it has read all the ' +
        'rules is checking against a wrong number, and rule-registry lookups by count are ' +
        'unreliable. Generate this number or stop printing it.'
      );
    }
  }

  return { findings, scopeNote, count: firstCount };
}
