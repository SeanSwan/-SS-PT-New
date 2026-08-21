/**
 * slop-denylist.mjs — evaluates slop-skeletons.json predicates against a LayoutIR (S2).
 * =====================================================================================
 * The denylist REMOVES the modal attractor at generation time instead of grading
 * around it at critique time (panel: cheapest deterministic anti-slop lever).
 * Predicates run on the IR fingerprint — structure, never strings-in-markup —
 * so a recolored clone of a banned skeleton is still banned.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { irFingerprint } from './ir.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

export function loadDenylist(path = join(HERE, 'slop-skeletons.json')) {
  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(parsed.entries)) throw new Error('slop denylist malformed: entries[] required');
  return parsed.entries;
}

/** All denylist entries a given IR matches. Empty array = clean. */
export function slopMatches(ir, entries = loadDenylist()) {
  const fp = irFingerprint(ir);
  const hits = [];
  for (const e of entries) {
    const m = e.match ?? {};
    let ok = true;
    if (m.hero_family !== undefined) ok &&= fp.hero.startsWith(m.hero_family);
    if (m.grid_family !== undefined) ok &&= fp.grid.startsWith(m.grid_family);
    if (m.min_cards !== undefined) ok &&= fp.cards >= m.min_cards;
    if (m.section_present !== undefined) ok &&= fp.sections.includes(m.section_present);
    if (m.section_sequence !== undefined) {
      const seq = fp.sections.join('>');
      ok &&= seq.includes(m.section_sequence.join('>'));
    }
    if (m.section_run !== undefined) {
      let run = 0, best = 0;
      for (const s of fp.sections) { run = s === m.section_run.type ? run + 1 : 0; best = Math.max(best, run); }
      ok &&= best >= m.section_run.min_run;
    }
    if (m.section_cardinality !== undefined) {
      ok &&= fp.sections.some((s, i) => s === m.section_cardinality.type && fp.cardinalities[i] === m.section_cardinality.equals);
    }
    if (ok) hits.push({ id: e.id, why: e.why });
  }
  return hits;
}
