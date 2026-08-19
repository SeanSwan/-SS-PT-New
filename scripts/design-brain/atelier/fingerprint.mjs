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

export function fingerprint(s) { return [s.nav_model, s.hero_mechanics, s.grid].join('|'); }
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
  if (!file) { console.error('usage: fingerprint.mjs <skeletons.json>'); process.exit(1); }
  const { skeletons } = JSON.parse(readFileSync(file, 'utf8'));
  const dupes = collisions(skeletons);
  if (dupes.length) {
    console.error(`COLLISION — HARD GATE TRIPPED. Halt the build. Pairs: ${JSON.stringify(dupes)}`);
    process.exit(2);
  }
  if (!wildcardAlien(skeletons)) {
    console.error('WILDCARD NOT ALIEN — re-roll the wildcard before Sean sees it (pre-Sean re-roll is legal).');
    process.exit(3);
  }
  console.log(`DIVERGENT — ${skeletons.length} skeletons, 0 collisions, wildcard alien. Proceed.`);
}
