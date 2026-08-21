/**
 * diverge.mjs — the S2 divergence engine: build a fleet of structurally distinct
 * directions, kill the modal attractor, and prove the spread numerically.
 * ================================================================================
 * BLUEPRINT §S2 (SWA-185). Generation-time structural forcing — the panel's
 * highest-leverage anti-slop lever (GLM F1, Kimi F2, Grok 4.1):
 *
 *   1. Score the brief's skeleton library against the taste profile
 *      (killed directions excluded via the ledger reader — S1).
 *   2. DENYLIST: any candidate whose IR matches a slop-skeleton predicate is
 *      rejected before it can be sampled, with the hit recorded.
 *   3. FLEET: top-3 clean non-wildcards + exactly one clean wildcard.
 *   4. DISTANCE GATE: every non-wildcard pair >= MIN_PAIR_DISTANCE; the
 *      wildcard >= WILDCARD_MIN against every member. A failing pair swaps
 *      its lower-scored member for the next candidate — an EXPLICIT, LOGGED
 *      lever change, bounded by MAX_RESAMPLES. Exhaustion fails loudly.
 *
 * The DirectionSet this returns is evidence, not narration: distance matrix,
 * minimum pair, denylist rejections, and the full resample log ride into the
 * IR artifact and the run receipt.
 */
import { collisions } from '../atelier/fingerprint.mjs';

import { SECTION_TYPES, MIN_PAIR_DISTANCE, WILDCARD_MIN, irDistance, distanceMatrix, irFingerprint } from './ir.mjs';
import { slopMatches, loadDenylist } from './slop-denylist.mjs';
import { killedSkeletons } from './read-ledger.mjs';
import { typeCompatible } from './content-lint.mjs';

export const FLEET_SIZE = 3;
export const MAX_RESAMPLES = 6;

/** Score one skeleton against profile levers (moved from structure.mjs in S2). */
export function scoreSkeleton(skeleton, levers) {
  const haystack = `${skeleton.nav_model} ${skeleton.hero_mechanics} ${skeleton.grid}`.toLowerCase();
  let score = 0;
  for (const lever of levers) {
    if (!lever.match || typeof lever.confidence !== 'number') continue;
    if (lever.confidence < 0.5) continue;
    if (haystack.includes(lever.match.toLowerCase())) {
      score += (lever.polarity === 'negative' ? -1 : 1) * lever.confidence;
    }
  }
  return score;
}

/**
 * Section-plan vs content-shape clashes for one skeleton (S4). A data-only
 * type planned over narrative facts (or vice versa) is a structural lie about
 * the content — the skeleton is ineligible for THIS brief, not bad in general.
 */
export function contentClashes(skeleton, content) {
  const plan = skeleton.section_plan ?? {};
  const clashes = [];
  for (const s of content.sections) {
    const type = plan[s.slot];
    if (!type) continue; // unplanned slots fall back to shape-agnostic defaults
    const shape = s.shape ?? 'mixed';
    if (!typeCompatible(type, shape)) {
      clashes.push({ slot: s.slot, planned_type: type, content_shape: shape });
    }
  }
  return clashes;
}

/** Compile one skeleton + content model into a LayoutIR v2. */
export function buildIR(skeleton, content, brief) {
  const plan = skeleton.section_plan ?? {};
  const heroType = SECTION_TYPES.includes(plan.hero) ? plan.hero : 'hero';
  const zones = [
    { zone: 'hero', content_slot: 'hero', section_type: heroType, cardinality: content.sections.find((s) => s.slot === 'hero')?.facts.length ?? 0 },
    ...content.sections
      .filter((s) => s.slot !== 'hero')
      .map((s) => ({
        zone: `section-${s.slot}`,
        content_slot: s.slot,
        section_type: SECTION_TYPES.includes(plan[s.slot]) ? plan[s.slot] : 'editorial-flow',
        cardinality: s.facts.length,
      })),
  ];
  return {
    layout_ir_id: `ir-${brief.brief_id}-${skeleton.id}`,
    content_model_id: content.content_model_id,
    skeleton_id: skeleton.id,
    nav_model: skeleton.nav_model,
    hero_mechanics: skeleton.hero_mechanics,
    grid: skeleton.grid,
    card_budget: skeleton.card_budget ?? 3,
    anti_specs: skeleton.anti_specs ?? [],
    focal_point: skeleton.hero_mechanics.split('-').slice(0, 2).join('-'),
    density_map: Object.fromEntries(zones.map((z) => [z.zone, z.cardinality])),
    zones,
  };
}

/**
 * Build the divergent fleet. Throws on: no clean wildcard, fewer clean
 * candidates than FLEET_SIZE, or resample budget exhaustion.
 */
export function diverge({ brief, content, profile, ledgerPath, denylist = loadDenylist() }) {
  const killed = killedSkeletons(brief.brief_id, ledgerPath);
  const killedIds = new Set(killed.map((k) => k.skeleton_id));
  const rejected = [];
  const contentRejected = [];
  const clean = [];

  for (const skeleton of brief.skeleton_library ?? []) {
    if (killedIds.has(skeleton.id)) continue;
    // S4 content-driven IA: a skeleton whose section plan fights the actual
    // content SHAPE is rejected before sampling — structure serves content,
    // never the genre prior (GLM F4: "IA is generated from the content model").
    const clashes = contentClashes(skeleton, content);
    if (clashes.length) { contentRejected.push({ skeleton_id: skeleton.id, clashes }); continue; }
    const ir = buildIR(skeleton, content, brief);
    const hits = slopMatches(ir, denylist);
    if (hits.length) rejected.push({ skeleton_id: skeleton.id, hits });
    else clean.push({ skeleton, ir, score: scoreSkeleton(skeleton, profile.levers) });
  }

  const rank = (list) => [...list].sort((a, b) => b.score - a.score);
  const nonWild = rank(clean.filter((c) => !c.skeleton.wildcard));
  const wilds = rank(clean.filter((c) => c.skeleton.wildcard));
  const exclusions = `denylist ${rejected.length}, content-clash ${contentRejected.length}, killed ${killedIds.size}`;
  if (!wilds.length) throw new Error(`diverge: no clean wildcard in the library (${exclusions}) — a round-1 fleet requires exactly one`);
  if (nonWild.length < FLEET_SIZE) throw new Error(`diverge: only ${nonWild.length} clean non-wildcard candidate(s) for a fleet of ${FLEET_SIZE} (${exclusions}) — re-diverge the skeleton library`);

  const fleet = nonWild.slice(0, FLEET_SIZE);
  let pool = nonWild.slice(FLEET_SIZE);
  const wildcard = wilds[0];
  const resampleLog = [];

  for (let attempt = 0; ; attempt++) {
    const dupes = collisions(fleet.map((f) => f.skeleton));
    const failingPair = dupes.length
      ? { ids: dupes[0], dist: 0 }
      : (() => {
          for (let i = 0; i < fleet.length; i++) {
            for (let j = i + 1; j < fleet.length; j++) {
              const d = irDistance(fleet[i].ir, fleet[j].ir);
              if (d < MIN_PAIR_DISTANCE) return { ids: [fleet[i].skeleton.id, fleet[j].skeleton.id], dist: d };
            }
          }
          return null;
        })();
    if (!failingPair) break;
    if (attempt >= MAX_RESAMPLES || !pool.length) {
      throw new Error(`diverge: distance gate unsatisfiable — pair ${failingPair.ids.join(' vs ')} at ${failingPair.dist.toFixed(3)} < ${MIN_PAIR_DISTANCE} after ${resampleLog.length} resample(s); the library lacks structural spread`);
    }
    // Swap out the LOWER-scored member of the failing pair — taste keeps the
    // stronger direction; the resample is the explicit lever change.
    const idxA = fleet.findIndex((f) => f.skeleton.id === failingPair.ids[0]);
    const idxB = fleet.findIndex((f) => f.skeleton.id === failingPair.ids[1]);
    const loserIdx = fleet[idxA].score <= fleet[idxB].score ? idxA : idxB;
    const swappedIn = pool.shift();
    resampleLog.push({
      swapped_out: fleet[loserIdx].skeleton.id,
      swapped_in: swappedIn.skeleton.id,
      reason: 'pair-distance',
      pair: failingPair.ids,
      distance: Math.round(failingPair.dist * 1000) / 1000,
    });
    fleet[loserIdx] = swappedIn;
  }

  for (const member of fleet) {
    const d = irDistance(member.ir, wildcard.ir);
    if (d < WILDCARD_MIN) {
      throw new Error(`diverge: wildcard ${wildcard.skeleton.id} not alien enough vs ${member.skeleton.id} (${d.toFixed(3)} < ${WILDCARD_MIN}) — re-roll the wildcard before Sean sees it`);
    }
  }

  const directions = [...fleet, wildcard];
  const { matrix, min } = distanceMatrix(directions.map((d) => d.ir));
  const recommended = rank(directions)[0];

  return {
    directions: directions.map((d) => ({
      skeleton_id: d.skeleton.id,
      wildcard: Boolean(d.skeleton.wildcard),
      score: d.score,
      fingerprint: irFingerprint(d.ir),
      ir: d.ir,
    })),
    recommended: recommended.skeleton.id,
    tau: MIN_PAIR_DISTANCE,
    wildcard_min: WILDCARD_MIN,
    distance: { matrix, min: { value: min.value, pair: min.pair } },
    denylist_rejected: rejected,
    content_rejected: contentRejected,
    killed_excluded: killed,
    resample_log: resampleLog,
  };
}
