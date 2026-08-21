/**
 * stages/structure.mjs — STRUCTURE stage (S1): skeleton selection driven by the
 * taste profile, with killed-direction memory and collision-checked divergence.
 * ==============================================================================
 * This is the loop's TASTE CONSUMER — the proof the panel demanded (GLM F5,
 * Grok 4.5, HY3 F5): changing a lever in the profile must change WHICH
 * skeleton is selected, and therefore the IR hash and the rendered pixels —
 * not merely some brief text. The S1 acceptance test flips a lever and
 * asserts exactly that delta.
 *
 * Selection mechanics (deterministic, no LLM):
 *   1. Load the brief's skeleton library (skeleton contract = fingerprint
 *      fields, same schema atelier/fingerprint.mjs already governs).
 *   2. Drop skeletons Sean already KILLED for this brief (read-ledger.mjs —
 *      the rejection log's first consumer; kill records surface in the IR).
 *   3. Score each candidate against profile levers (substring match on the
 *      fingerprint fields; positive lever boosts, negative lever penalizes,
 *      weighted by confidence). Ties break by library order (stable).
 *   4. Winner must not collide with the runner-up (fingerprint.mjs reuse).
 */
import { collisions } from '../../atelier/fingerprint.mjs';
import { killedSkeletons } from '../read-ledger.mjs';

/** Score one skeleton against the profile levers. Exported for tests. */
export function scoreSkeleton(skeleton, levers) {
  const haystack = `${skeleton.nav_model} ${skeleton.hero_mechanics} ${skeleton.grid}`.toLowerCase();
  let score = 0;
  for (const lever of levers) {
    if (!lever.match || typeof lever.confidence !== 'number') continue;
    if (lever.confidence < 0.5) continue; // low-confidence levers never steer (panel: 1 event = hypothesis)
    if (haystack.includes(lever.match.toLowerCase())) {
      score += (lever.polarity === 'negative' ? -1 : 1) * lever.confidence;
    }
  }
  return score;
}

export function structureStage(ctx) {
  const { brief, profile } = ctx;
  const library = brief.skeleton_library;
  if (!Array.isArray(library) || library.length < 2) {
    throw new Error('brief carries no skeleton_library[] (>=2) — structure cannot diverge from one option');
  }

  const killed = killedSkeletons(brief.brief_id, ctx.ledgerPath);
  const killedIds = new Set(killed.map((k) => k.skeleton_id));
  const candidates = library.filter((s) => !killedIds.has(s.id));
  if (candidates.length < 2) {
    throw new Error(`killed-direction memory excluded ${killedIds.size} skeleton(s); fewer than 2 remain — re-diverge the library instead of re-serving Sean a dead direction`);
  }

  const scored = candidates
    .map((s, i) => ({ s, i, score: scoreSkeleton(s, profile.levers) }))
    .sort((a, b) => b.score - a.score || a.i - b.i);
  const [winner, runnerUp] = scored;
  const dupes = collisions([winner.s, runnerUp.s]);
  if (dupes.length) {
    throw new Error(`top-2 skeletons collide on the structural fingerprint (${JSON.stringify(dupes)}) — the library is not divergent`);
  }

  const content = ctx.artifacts.content;
  const chosen = winner.s;
  return {
    layout_ir_id: `ir-${brief.brief_id}-${chosen.id}`,
    content_model_id: content.content_model_id,
    skeleton_id: chosen.id,
    nav_model: chosen.nav_model,
    hero_mechanics: chosen.hero_mechanics,
    grid: chosen.grid,
    card_budget: chosen.card_budget ?? 3,
    anti_specs: chosen.anti_specs ?? [],
    // Every zone binds a real content slot — structure has no empty decoration.
    zones: [
      { zone: 'hero', content_slot: 'hero' },
      ...content.sections.filter((s) => s.slot !== 'hero').map((s) => ({ zone: `section-${s.slot}`, content_slot: s.slot })),
    ],
    // Provenance the receipt and tests read: which levers moved this selection,
    // and which directions are dead for this brief and why.
    selection: {
      scores: scored.map(({ s, score }) => ({ skeleton_id: s.id, score })),
      killed_excluded: killed,
    },
  };
}
