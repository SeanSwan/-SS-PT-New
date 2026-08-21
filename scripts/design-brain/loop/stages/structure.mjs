/**
 * stages/structure.mjs — STRUCTURE stage (S2): divergent fleet, gated, then a
 * taste-recommended direction carries the walking skeleton forward.
 * ==============================================================================
 * S1 selected one skeleton; S2 routes through the divergence engine
 * (diverge.mjs): denylist kills the modal attractor, the distance gate proves
 * the fleet is structurally spread (with a logged, bounded resample trail),
 * and the taste profile — still the consumer the panel demanded — both scores
 * the fleet and picks the recommended direction. The full DirectionSet rides
 * in the IR artifact so the receipt carries the evidence, not a summary claim.
 *
 * N-up rendering of the whole fleet is S9 (Studio); the loop continues with
 * the recommended direction only.
 */
import { diverge } from '../diverge.mjs';

export function structureStage(ctx) {
  const { brief, profile } = ctx;
  if (!Array.isArray(brief.skeleton_library) || brief.skeleton_library.length < 2) {
    throw new Error('brief carries no skeleton_library[] (>=2) — structure cannot diverge from one option');
  }

  const set = diverge({
    brief,
    content: ctx.artifacts.content,
    profile,
    ledgerPath: ctx.ledgerPath,
    denylist: ctx.denylist, // tests inject; default loads slop-skeletons.json
  });

  const chosen = set.directions.find((d) => d.skeleton_id === set.recommended);
  return {
    ...chosen.ir,
    selection: {
      scores: set.directions.map((d) => ({ skeleton_id: d.skeleton_id, score: d.score, wildcard: d.wildcard })),
      killed_excluded: set.killed_excluded,
    },
    direction_set: {
      fleet: set.directions.map((d) => ({ skeleton_id: d.skeleton_id, wildcard: d.wildcard, score: d.score, fingerprint: d.fingerprint })),
      recommended: set.recommended,
      tau: set.tau,
      wildcard_min: set.wildcard_min,
      distance_min: set.distance.min.value,
      distance_min_pair: set.distance.min.pair,
      distance_matrix: set.distance.matrix,
      denylist_rejected: set.denylist_rejected,
      resample_log: set.resample_log,
    },
  };
}
