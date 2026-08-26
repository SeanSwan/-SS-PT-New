#!/usr/bin/env node
/**
 * catalog-check.mjs — the answer to "does <id> exist in <catalog>?" that cannot lie.
 *
 * WHY THIS EXISTS
 * ---------------
 * 2026-08-25: a review packet told five paid reviewers that
 * `world.miniature-play.voxel-realm` did not exist in the design-brain world
 * catalog, and that the plan citing it had hallucinated a repo anchor. The entry
 * existed — number 16 of 18. The verifying command was:
 *
 *     grep -nE "miniature|voxel" worlds.md | head -8
 *
 * Entries 14 and 15 produced eight lines before the scan reached entry 16. The
 * CAP produced the absence, not the file. Four of five seats turned the false row
 * into a P0 blocker; one seat's REJECT verdict rested on it.
 *
 * The same failure class — a truncated instrument reporting a clean or empty
 * result — had been written up in this repo's own learning corpus HOURS earlier.
 * It recurred anyway. That is the finding: a lesson written down is not a lesson
 * installed. The fix has to be a tool, not a discipline.
 *
 * THE RULE THIS TOOL ENFORCES
 * ---------------------------
 * An absence claim states its denominator. Not "X is not there" but "N ids
 * enumerated, here they are, X is not among them." This tool always prints the
 * total, never truncates, and exits nonzero on absence — so an absence claim
 * carries a reproducible command and an exit code instead of a human's word.
 *
 * USAGE
 *   node scripts/assets/catalog-check.mjs <catalog> [id]
 *
 *   <catalog>  a .json registry, a .mjs frozen-ID list, or a .md catalog
 *   [id]       optional. Omit to just enumerate (always prints the full list).
 *
 *   exit 0  id found (or no id given and enumeration succeeded)
 *   exit 1  id NOT found — the ONLY output that licenses an absence claim
 *   exit 2  the instrument itself failed (unreadable / unparseable / zero ids)
 *
 * Exit 2 matters as much as exit 1: an empty enumeration is an instrument
 * failure, not evidence of absence. Never let "0 results" mean "not there".
 */
import { readFileSync } from 'node:fs';

const [catalogPath, wantedId] = process.argv.slice(2);

if (!catalogPath) {
  console.error('usage: node scripts/assets/catalog-check.mjs <catalog> [id]');
  process.exit(2);
}

let raw;
try {
  raw = readFileSync(catalogPath, 'utf8');
} catch (err) {
  console.error(`[catalog-check] EXIT 2 — cannot read ${catalogPath}: ${err.message}`);
  console.error('[catalog-check] this is an INSTRUMENT FAILURE, not an absence. Do not claim the id is missing.');
  process.exit(2);
}

/** Collect ids from whichever catalog shape this is. Never truncates. */
function collectIds(text, path) {
  const ids = new Set();

  if (path.endsWith('.json')) {
    const data = JSON.parse(text);
    const walk = (node) => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (node && typeof node === 'object') {
        if (typeof node.id === 'string') ids.add(node.id);
        return Object.values(node).forEach(walk);
      }
    };
    walk(data);
    return ids;
  }

  // .mjs frozen lists and .md catalogs: quoted or backticked dotted ids.
  for (const m of text.matchAll(/['"`]([a-z][a-z0-9-]*(?:\.[a-z0-9-]+){1,})['"`]/g)) ids.add(m[1]);
  return ids;
}

let ids;
try {
  ids = collectIds(raw, catalogPath);
} catch (err) {
  console.error(`[catalog-check] EXIT 2 — cannot parse ${catalogPath}: ${err.message}`);
  process.exit(2);
}

if (ids.size === 0) {
  console.error(`[catalog-check] EXIT 2 — enumerated ZERO ids in ${catalogPath}.`);
  console.error('[catalog-check] An empty enumeration is an INSTRUMENT FAILURE. It is not evidence that anything is absent.');
  process.exit(2);
}

const sorted = [...ids].sort();
console.log(`[catalog-check] ${catalogPath}`);
console.log(`[catalog-check] enumerated ${sorted.length} id(s) — COMPLETE LIST, NOT TRUNCATED:`);
for (const id of sorted) console.log(`  ${id}`);

if (!wantedId) process.exit(0);

if (ids.has(wantedId)) {
  console.log(`[catalog-check] PRESENT: ${wantedId} (1 of ${sorted.length})`);
  process.exit(0);
}

console.log(`[catalog-check] ABSENT: ${wantedId}`);
console.log(`[catalog-check] denominator: ${sorted.length} ids enumerated above, none matched.`);
console.log('[catalog-check] THIS exit code (1), with the list above, is what licenses an absence claim. A capped grep is not.');
process.exit(1);
