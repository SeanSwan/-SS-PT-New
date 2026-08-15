#!/usr/bin/env node
/**
 * constitution-references.mjs — every repo path the constitution cites must resolve.
 *
 * WHY THIS EXISTS (Kimi K3 hostile review, question 6)
 * ----------------------------------------------------
 * The 2026-08-14 repair found four defects that NO diff could ever surface, because
 * they were byte-identical in BOTH CLAUDE.md and AGENTS.md: a decision chain retired
 * three weeks earlier, two lines naming a superseded review gate, and a live
 * instruction to force-reseed production. Mirror-parity called all four healthy.
 * They were found by a person reading for self-contradiction, which does not scale.
 *
 * Asked for a mechanical version, the reviewer's answer was: you cannot generally
 * mechanize contradiction detection in prose, but you CAN resolve the document's
 * externally-verifiable assertions against ground truth. A cited path is the most
 * common such assertion and the cheapest to check.
 *
 * First run found 6 real broken pointers, five of which name documents that
 * NEVER EXISTED IN GIT — two of them marked MANDATORY. Agents have been told to
 * read files that were never written.
 *
 * WHAT IT DOES NOT DO (deliberately)
 * ----------------------------------
 * It checks REPO-ROOTED paths only. A naive "every backticked path must exist" rule
 * flags 63 items in this document — bare filenames used as prose shorthand
 * ("MeasurementEntry.tsx"), template placeholders, and gitignored runtime files.
 * A check with 63 false positives is a check people learn to bypass, which is worse
 * than no check. Narrowing to repo-rooted paths cuts that to 14, of which 8 are
 * legitimately absent by design and filtered below, leaving real signal.
 *
 * EXIT: 0 = every cited path resolves. 1 = at least one does not.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOC = resolve(repoRoot, 'CLAUDE.md');

/** Only these top-level dirs make a citation a real repo pointer. */
// `.ai-workflow` is included deliberately even though every one of its paths is
// exempted below. Excluding it here instead would produce the same result while
// leaving a documented EXEMPT entry that can never fire — dead code that reads as
// load-bearing. Its own test caught that.
const REPO_ROOTED = /^(scripts|docs|backend|frontend|shared|config|seeders|\.claude|\.agents|\.ai-workflow|\.githooks|AI-Village-Documentation|archive|wiki)\//;

/**
 * Legitimately absent — cited correctly, not present in a clean checkout.
 * Each entry needs a reason; an unexplained exemption is how a lint rots.
 */
const EXEMPT = [
  { re: /</,                                   why: 'template placeholder, e.g. <name>/SKILL.md' },
  { re: /\*/,                                  why: 'glob pattern, not a literal path' },
  { re: /^\.ai-workflow\//,                    why: 'gitignored runtime state (lanes, catalog, inbox)' },
  { re: /^\.claude\/settings\.local\.json$/,   why: 'gitignored local settings' },
  { re: /^scripts\/continuity-config\.local\.json$/, why: 'gitignored local config, template is tracked' },
  // Cited as a PROHIBITION ("the catalog never writes into wiki/"), not as a source
  // to read. The Karpathy Wiki is a planned surface, blocked on Pi SSD/power hardware.
  // Naming a boundary that does not exist yet is correct; the rule is what stops it
  // from being created carelessly later.
  { re: /^wiki\//,                             why: 'planned surface (Pi-blocked), cited as a write-prohibition boundary' },
];

export function checkReferences(docPath = DOC, root = repoRoot) {
  if (!existsSync(docPath)) return { errors: [`${docPath} not found`], checked: 0, exempt: 0, missing: [] };
  const text = readFileSync(docPath, 'utf8');

  const cited = [...new Set([...text.matchAll(/`([^`\n]+)`/g)].map((m) => m[1].trim()))]
    .filter((s) => REPO_ROOTED.test(s) && !s.includes(' '));

  const missing = [];
  let exempt = 0;
  for (const p of cited) {
    if (EXEMPT.some((e) => e.re.test(p))) { exempt += 1; continue; }
    if (!existsSync(resolve(root, p.replace(/\/$/, '')))) missing.push(p);
  }

  const errors = missing.map((p) => `CLAUDE.md cites \`${p}\` — no such file or directory. A pointer to nothing is worse than no pointer: it costs the next agent a turn and can be read as "this is handled".`);
  return { errors, checked: cited.length - exempt, exempt, missing };
}

function main() {
  const r = checkReferences();
  console.log(`[constitution-refs] ${r.checked} repo-rooted citation(s) checked, ${r.exempt} exempt, ${r.missing.length} unresolvable`);
  if (!r.errors.length) { console.log('[constitution-refs] PASS — every cited path resolves.'); return 0; }
  console.error('\n' + '━'.repeat(60));
  console.error('COMMIT BLOCKED: the constitution points at files that do not exist');
  console.error('━'.repeat(60));
  for (const e of r.errors) console.error(`  • ${e}`);
  console.error(`
Fix by making the document true (Rule 75 Trailhead-Truth): correct the path, point
at what actually exists, or mark it plainly as not-yet-written. Do NOT delete the
line if the need is real — an honest "NOT YET WRITTEN" is information; a silent
removal loses it. If a path is legitimately absent in a clean checkout, add it to
EXEMPT in this file WITH A REASON.
`);
  return 1;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  process.exit(main());
}
