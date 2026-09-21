import { Op } from 'sequelize';

/**
 * Atomic highest-revision apply for the SwanGuard -> SwanStudios Spotlight bridge.
 *
 * WHY THIS MODULE EXISTS (hostile review R1, finding D1 / F06, 2026-09-20).
 * The route used to read the row, compare `existing.revision >= revision`, `await` an image
 * re-host, and then call `existing.update(values)`. Two defects lived in that gap:
 *
 *   1. The guard was evaluated BEFORE the await, so `existing` was a stale in-memory
 *      instance by the time it was written. A delayed older revision could therefore
 *      overwrite a newer one.
 *   2. `update()` was unconditional. Nothing re-checked the revision at write time, so a
 *      late retraction could be overwritten by an older non-retracted delivery.
 *
 * `06-bans.md` #19 states the invariant this module enforces: *do not remove tombstones or
 * apply stale revisions over newer state.*
 *
 * The fix is to make the DATABASE evaluate the predicate, inside the write statement:
 *
 *   UPDATE "SwanSpotlights" SET ... WHERE "itemId" = ? AND "revision" < ?
 *
 * A concurrent newer revision that lands between the caller's read and this write cannot be
 * regressed, because the comparison happens atomically with the write. `itemId` is the
 * primary key, so a concurrent INSERT collides there and is handled explicitly below rather
 * than surfacing as a 500.
 *
 * SCOPE OF THE CLAIM — what this does and does not establish.
 * `SwanSpotlight.update()` compiles to a single SQL statement, so the conditional apply is
 * atomic per row. This module does NOT claim isolation across statements: the caller still
 * reads the row first, to PRESERVE the stored `imageUrl` across a text-only revision. That
 * read is not the guard — the guard is the WHERE clause — so a stale read can only produce a
 * stale `imageUrl` on a write the database then rejects anyway.
 *
 * NOT established here, and not claimed: that two concurrent applies on a live PostgreSQL
 * serialize correctly. That needs a real database; the contract suite mocks the model, so it
 * proves the predicate is constructed and the branch is taken, never that Postgres honours
 * it. Recorded as `[UNKNOWN]` in the round-3 packet rather than asserted.
 */

/**
 * Apply `values` only if `revision` is strictly newer than the stored revision.
 *
 * @returns {Promise<{applied: boolean, created?: boolean, storedRevision?: number}>}
 *   `applied: false` means a newer-or-equal revision is already stored and NOTHING was
 *   written. `storedRevision` is the revision that won, so the caller can echo it.
 */
export const applyBridgeSpotlightRevision = async ({ SwanSpotlight, itemId, revision, values }) => {
  const conditionalUpdate = () => SwanSpotlight.update(values, {
    where: { itemId, revision: { [Op.lt]: revision } }
  });

  const [applied] = await conditionalUpdate();
  if (applied > 0) return { applied: true, created: false };

  // Nothing matched. Either no row exists yet, or the stored revision is already >= ours —
  // and those two cases need opposite answers, so distinguish them with a read.
  const current = await SwanSpotlight.findByPk(itemId, { attributes: ['revision'] });
  if (current) return { applied: false, storedRevision: current.revision };

  try {
    await SwanSpotlight.create({ ...values, itemId, revision });
    return { applied: true, created: true };
  } catch (error) {
    if (error?.name !== 'SequelizeUniqueConstraintError') throw error;
    // A concurrent INSERT won the primary-key race. Our revision may still be the newer of
    // the two, so re-run the conditional apply rather than treating the loss as a no-op —
    // assuming the loss means "superseded" would silently drop a legitimately newer revision.
    const [retried] = await conditionalUpdate();
    if (retried > 0) return { applied: true, created: false };
    const landed = await SwanSpotlight.findByPk(itemId, { attributes: ['revision'] });
    return { applied: false, storedRevision: landed?.revision ?? revision };
  }
};
