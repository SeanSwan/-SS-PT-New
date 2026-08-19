#!/usr/bin/env node
/**
 * fingerprint.mjs — A2b structural fingerprint for Swan Atelier Studio.
 * Fingerprint = the skeleton-contract fields themselves (R2 ruling; Kimi's fix).
 * Collision: two skeletons identical on (nav_model, hero_mechanics, grid).
 * Wildcard-alienness (GLM R2): the wildcard must differ from EVERY non-wildcard
 * on at least two of the three fingerprint fields.
 * Exit 0 = divergent. Exit 2 = COLLISION (HARD GATE: halt the build).
 * Exit 3 = wildcard not alien enough (re-roll pre-Sean; legal per E9 carve-out).
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// JSON tuple, not join('|') — a '|' inside a field could forge/suppress a collision.
// Missing fields normalize to null and therefore COLLIDE with each other (two
// skeletons that both fail to declare a field are structurally indistinguishable).
export function fingerprint(s) { return JSON.stringify([s.nav_model ?? null, s.hero_mechanics ?? null, s.grid ?? null]); }
export function collisions(list) {
  const seen = new Map(); const out = [];
  for (const s of list) {
    const fp = fingerprint(s);
    if (seen.has(fp)) out.push([seen.get(fp), s.id]);
    else seen.set(fp, s.id);
  }
  return out;
}
export function wildcardAlien(list) {
  const wc = list.filter(s => s.wildcard); const rest = list.filter(s => !s.wildcard);
  return wc.every(w => rest.every(r => {
    let diff = 0;
    if (w.nav_model !== r.nav_model) diff++;
    if (w.hero_mechanics !== r.hero_mechanics) diff++;
    if (w.grid !== r.grid) diff++;
    return diff >= 2;
  }));
}

// CLI entry — only when executed directly, never on import (tests import the pure functions).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const file = process.argv[2];
  if (!file) { console.error('usage: fingerprint.mjs <skeletons.json> [--allow-no-wildcard]'); process.exit(1); }
  let parsed;
  try { parsed = JSON.parse(readFileSync(file, 'utf8')); }
  catch (e) { console.error(`MALFORMED — not valid JSON: ${e.message}`); process.exit(4); }
  const skeletons = parsed?.skeletons;
    if (!Array.isArray(skeletons) || skeletons.length < 2) {
    console.error('MALFORMED — skeletons[] with >=2 entries required (a 1-skeleton fleet cannot be called divergent).');
    process.exit(4);
  }
  const wcCount = skeletons.filter(x => x.wildcard).length;
  const allowNoWildcard = process.argv.includes('--allow-no-wildcard'); // wave-2 pages carry no wildcard
  if (wcCount === 0 && !allowNoWildcard) {
    console.error('NO WILDCARD — round-1 fleets require exactly one (R-1 ruling). Pass --allow-no-wildcard for wave-2 pages.');
    process.exit(4);
  }
  if (wcCount > 1) {
    console.error(`${wcCount} WILDCARDS — exactly one allowed; multiple wildcards are never compared to each other.`);
    process.exit(4);
  }
  const dupes = collisions(skeletons);
  if (dupes.length) {
    console.error(`COLLISION — HARD GATE TRIPPED. Halt the build. Pairs: ${JSON.stringify(dupes)}`);
    process.exit(2);
  }
  if (!wildcardAlien(skeletons)) {
    console.error('WILDCARD NOT ALIEN — re-roll the wildcard before Sean sees it (pre-Sean re-roll is legal).');
    process.exit(3);
  }
    console.log(`DIVERGENT — ${skeletons.length} skeletons, 0 collisions${wcCount ? ', wildcard alien' : ' (no-wildcard page)'}. Proceed.`);
}
