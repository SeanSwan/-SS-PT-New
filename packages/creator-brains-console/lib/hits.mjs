/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/hits.mjs
 * PURPOSE: The console's projection of an engine rule row into a hit.
 * PART OF: Creator Brains Console (05-contracts.md §1, A1-04)
 * ============================================================================
 *
 * WHY THIS IS ITS OWN MODULE. Two routes serve the same claim — `/api/query` and
 * the brain drawer — and the drawer's contract (`web/src/adapters/types.ts`)
 * declares `claims: QueryHit[]`, the same type the query route returns. One
 * shape, two producers, is the classic place a contract drifts. Keeping the
 * projection in one named place makes "these must agree" a fact about the code
 * rather than a hope about two call sites, and `bridge.brains.test.mjs` asserts
 * it field for field.
 *
 * WHY THE DRAWER IS ALLOWED TO BE *BETTER* THAN THE QUERY ROUTE, IN ONE FIELD.
 * The drawer reads the raw `rules.jsonl` row, so it has the engine's real
 * `claim_id`. `/api/query` does not: it reaches this shape through the engine's
 * `queryBrains`, which drops `claim_id`, so `queryConsole` falls back to the
 * composite `${videoId}:${tStartMs}` — an id that COLLIDES for two claims in one
 * video at the same millisecond.
 *
 * The two routes therefore disagree on `claimId`, and the disagreement is
 * deliberate and PINNED by `bridge.brains.test.mjs` rather than papered over:
 * discarding a correct identifier so that two routes can be wrong together is a
 * worse outcome than one route being visibly better. Fixing the query route
 * means `queryBrains` passing `claim_id` through — an engine change, which S0's
 * additive-only boundary forbids here. Recorded as a named defect with the
 * engine as owner.
 *
 * Every OTHER field is identical between the two routes, and that IS asserted
 * field for field, because those are the fields where drift would be a silent
 * bug rather than a known gap.
 *
 * @module creator-brains-console/lib/hits
 */

/**
 * One raw engine rule row → a hit.
 *
 * @param {object} row a `rules.jsonl` row: snake_case, required fields already
 *                     validated by `readClaims` in `lib/brain-read.mjs`. That is
 *                     the console's own reader since R2-03 — this docstring used
 *                     to name the engine's `loadHits`, which is no longer on
 *                     this path.
 */
export function toQueryHit(row) {
  const videoId = row.video_id;
  const tStartMs = Number(row.t_start_ms) || 0;
  return {
    claimId: row.claim_id || `${videoId}:${tStartMs}`,
    creatorId: row.creator_id,
    creatorTitle: row.creator_id,
    videoId,
    tStartMs,
    keyPhrase: row.key_phrase,
    // Present on the row and already returned by `/api/query`; declared on
    // `QueryHit` since A1-03. The drawer is a claim list, so it needs them.
    statement: row.statement,
    topic: row.topic,
    // The deep link is the product: it opens the creator's own video at the
    // second the claim was made.
    watchUrl: `https://youtu.be/${videoId}?t=${Math.max(0, Math.floor(tStartMs / 1000))}`,
  };
}
