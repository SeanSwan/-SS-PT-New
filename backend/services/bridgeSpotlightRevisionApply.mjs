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
 *
 * REVISED 2026-09-20 (hostile review R5-01, astra round 5, filed FAIL).
 * The conditional UPDATE fixed the WRITE path; it did not fix the INSERTION path. This module
 * used to answer "no-op" whenever a row existed at all, on the assumption that any row observed
 * after a missed UPDATE must be >= our revision. That assumption is false: a delayed OLDER
 * delivery can INSERT in the window between the UPDATE and the re-read, and the newer revision
 * was then acknowledged and discarded. Both loss paths now re-check the STORED REVISION within a
 * bound, and an unresolvable outcome throws rather than acknowledging work that was not persisted.
 */

/** Passes over (conditional UPDATE → re-read → INSERT) before the outcome is declared unresolved. */
const MAX_APPLY_ATTEMPTS = 3;

/**
 * Split the caller's values into the UPDATE payload and the INSERT payload.
 *
 * WHY (hostile review R5-03, MEDIUM). The caller used to preserve the stored image by carrying the
 * value it had read BEFORE the write into `values`, where the database then wrote it. That is not
 * preservation, it is a lost update: rev 1 holds image A; a text-only rev 3 reads A and pauses on
 * its re-host; rev 2 writes image B; rev 3's `revision < 3` predicate PASSES and rewrites A over B.
 * A value that must survive to commit time cannot be decided by a read taken before the write.
 *
 * So the caller signals "leave `imageUrl` alone" with an explicit sentinel, and the key is dropped
 * from the UPDATE, which makes the database keep whatever it holds at the moment the row is locked.
 *
 * THE TEST IS SENTINEL IDENTITY, NOT KEY PRESENCE. An earlier version of this function treated
 * "has an `imageUrl` key" as "wants the column omitted", which silently discarded the deliberate
 * `imageUrl: null` the caller sets for an image-carrying revision. Two different intentions —
 * "do not write the column" and "write it as NULL" — cannot be told apart by presence, so they are
 * told apart by value.
 *
 * It is dropped from the UPDATE ONLY. On INSERT there is no prior row to preserve, so the column
 * must always be present: omitting it leaves the attribute `undefined`, which discards the column
 * default and is how this was caught — an existing assertion that the INSERT payload for an
 * image-carrying revision carries `imageUrl: null`.
 *
 * @param {object} values the caller's normalized values, possibly carrying the sentinel
 * @returns {{forUpdate: object, forInsert: object}}
 */
const splitImagePayload = (values) => {
  if (!values || typeof values !== 'object') return { forUpdate: values, forInsert: values };

  const hasImageKey = Object.prototype.hasOwnProperty.call(values, 'imageUrl');
  const image = values.imageUrl;
  const leaveItAlone = typeof image === 'symbol';

  if (!hasImageKey) {
    // Caller did not mention the column. The UPDATE leaves it alone; the INSERT must still
    // supply it, and `null` is the honest representation of "no image given".
    return { forUpdate: values, forInsert: { ...values, imageUrl: null } };
  }
  if (leaveItAlone) {
    // eslint-disable-next-line no-unused-vars -- destructured only to omit the key
    const { imageUrl, ...forUpdate } = values;
    return { forUpdate, forInsert: { ...forUpdate, imageUrl: null } };
  }
  // An explicit value — including an explicit `null` — is written by BOTH statements.
  return { forUpdate: values, forInsert: values };
};

/**
 * Apply `values` only if `revision` is strictly newer than the stored revision.
 *
 * @returns {Promise<{applied: boolean, created?: boolean, storedRevision?: number}>}
 *   `applied: false` means a newer-or-equal revision is already stored and NOTHING was
 *   written. `storedRevision` is the revision that won, so the caller can echo it.
 *   Throws if the winner cannot be established — never returns `applied: false` for a
 *   revision that was simply not persisted (see the bound below).
 */
export const applyBridgeSpotlightRevision = async ({ SwanSpotlight, itemId, revision, values }) => {
  // Computed ONCE, before the loop: whether `imageUrl` is written is a property of the request,
  // not of the attempt. The UPDATE drops it so the database keeps the value it holds when the row
  // is locked; the INSERT must carry it, because there is no prior row to preserve (R5-03).
  const { forUpdate, forInsert } = splitImagePayload(values);

  const conditionalUpdate = () => SwanSpotlight.update(forUpdate, {
    where: { itemId, revision: { [Op.lt]: revision } }
  });

  // BOUNDED RE-CHECK. Both ways of losing a write are races, and neither one means "superseded":
  //
  //   · The conditional UPDATE can miss because no row exists YET, and a delayed OLDER delivery
  //     can INSERT in the window before the re-read. Observed revision < ours, so the write must
  //     still happen (hostile review R5-01 — the earlier `if (current) return no-op` assumed any
  //     observed row was >= ours, which the UPDATE-miss does NOT establish).
  //   · The INSERT can lose the primary key to a concurrent delivery that is OLDER than ours.
  //
  // The winner is decided by the STORED REVISION, never by the fact that a write lost. Each loss
  // re-checks instead of returning. Three passes cover both interleavings with room to spare, and
  // the bound keeps a pathological interleaving from spinning.
  for (let attempt = 0; attempt < MAX_APPLY_ATTEMPTS; attempt++) {
    const [applied] = await conditionalUpdate();
    if (applied > 0) return { applied: true, created: false };

    const current = await SwanSpotlight.findByPk(itemId, { attributes: ['revision'] });
    if (current) {
      if (current.revision >= revision) return { applied: false, storedRevision: current.revision };
      continue; // a row exists but is OLDER than ours — it appeared after the UPDATE missed
    }

    try {
      await SwanSpotlight.create({ ...forInsert, itemId, revision });
      return { applied: true, created: true };
    } catch (error) {
      if (error?.name !== 'SequelizeUniqueConstraintError') throw error;
      continue; // PK race: our revision may still be the newer of the two, so re-check
    }
  }

  // Unresolved after the bound. Report a no-op ONLY if a newer-or-equal revision is genuinely
  // stored; otherwise fail loudly. Acknowledging a revision that was never persisted is the exact
  // defect this module exists to prevent, so it must not be the fallback.
  const landed = await SwanSpotlight.findByPk(itemId, { attributes: ['revision'] });
  if (landed && landed.revision >= revision) {
    return { applied: false, storedRevision: landed.revision };
  }
  throw new Error(
    `applyBridgeSpotlightRevision could not resolve ${itemId}@${revision} after ` +
    `${MAX_APPLY_ATTEMPTS} attempts (stored revision: ${landed?.revision ?? 'absent'}). ` +
    'Refusing to acknowledge a revision that was not persisted.'
  );
};
