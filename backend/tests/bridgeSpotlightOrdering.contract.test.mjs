/**
 * SwanGuard -> SwanStudios Spotlight bridge — ORDERING contract (R1)
 * ==================================================================
 * Scope: revision ordering, tombstone semantics, and the raw-body mount. This file
 * deliberately does NOT re-assert what `tests/api/swanBridgeIngest.test.mjs` (S3) already
 * covers — kill switch on POST, HMAC/skew/malformed signature, no-secret-disclosure, schema
 * validation, the banned-terms second gate, the four basic idempotency outcomes, and image
 * re-host non-fatality. Duplicating a green suite adds maintenance cost and no evidence.
 *
 * What is left is the part S3 does not touch: what happens when revisions arrive OUT OF
 * ORDER, how a tombstone resists a late replay, and what breaks if the bridge loses its
 * private body parser.
 *
 * ── CHANGED 2026-09-20 for R1's D1 remediation (hostile review F06) ──────────────────
 * The route used to read the row, compare `existing.revision >= revision`, await an image
 * re-host, and then call an INSTANCE `existing.update(values)`. The guard ran before the
 * await and the write was unconditional, so a delayed older revision could regress a newer
 * one. It now calls the static
 * `SwanSpotlight.update(values, { where: { itemId, revision: { [Op.lt]: revision } } })`,
 * so the DATABASE evaluates the ordering predicate inside the write.
 *
 * Consequence for this file: `mockUpdate` replaces the per-test instance `update` spy and
 * resolves to Sequelize's `[affectedCount]` — `[0]` means the predicate rejected the write.
 * The assertions therefore check the WHERE clause, which is the mechanism, rather than
 * checking that a spy was not called.
 *
 * The model and both network-touching services are mocked. Nothing here reaches DNS, R2,
 * or a database — so this file can prove the predicate is CONSTRUCTED and the branch is
 * TAKEN. It cannot prove PostgreSQL honours it under real concurrency; that needs a live
 * database and is recorded as `[UNKNOWN]`, not asserted.
 */

import { describe, expect, it } from 'vitest';
import {
  body, installBridgeSpotlightHarness, ITEM, mocks, predicateOf,
} from './helpers/bridgeSpotlightHarness.mjs';

// The rig — the hoisted mock declarations, the `vi.mock` factories, the signed-request helpers
// and the per-test env/reset — lives in `helpers/bridgeSpotlightHarness.mjs`, shared with the
// manifest suite. It cannot be declared here and passed in: a `vi.mock` factory is hoisted above
// this module's imports and would fail with `ReferenceError` on a suite-local binding.
const {
  mockFindByPk, mockUpdate, mockCreate, mockFindAll, mockUploadPhoto, mockFetchDecode,
} = mocks;

const { app, send } = await installBridgeSpotlightHarness();


describe('spotlight ordering — a superseded revision changes nothing', () => {
  it('does not re-host an image that arrives on a superseded revision', async () => {
    // A row already at revision 5: the conditional UPDATE matches nothing and the re-read
    // reports the revision that actually won.
    mockFindByPk.mockResolvedValue({ revision: 5, imageUrl: null });
    mockUpdate.mockResolvedValue([0]);

    const res = await send(app, body({ revision: 4, imageUrl: 'https://swanguard.example/late.png' }));

    expect(res.status).toBe(200);
    expect(res.body.noop).toBe(true);
    expect(res.body.revision).toBe(5);
    // The decisive assertion, same intent and now stronger than the old instance-spy version:
    // the write was CONDITIONED on `revision < 4`, and because it lost, no network work
    // happened for an item that is already behind.
    expect(predicateOf(mockUpdate.mock.calls[0])).toBe(4);
    expect(mockFetchDecode).not.toHaveBeenCalled();
    expect(mockUploadPhoto).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('leaves the stored image untouched when a superseded revision carries a different one', async () => {
    mockFindByPk.mockResolvedValue({ revision: 9, imageUrl: 'https://r2.example/original.jpg' });
    mockUpdate.mockResolvedValue([0]);

    await send(app, body({ revision: 8, imageUrl: 'https://swanguard.example/replacement.png' }));

    // Exactly one write was ISSUED, and it was the conditional one — never an unconditional
    // overwrite of a newer row.
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(predicateOf(mockUpdate.mock.calls[0])).toBe(8);
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockFetchDecode).not.toHaveBeenCalled();
  });

  it('does not apply — or re-host for — a revision that loses the race AFTER the read', async () => {
    // THIS is the interleaving round 1's F02 said the old suite never injected. The read says
    // revision 1 is stored, so revision 2 looks perfectly acceptable and the OLD code would
    // have written it. Between that read and the write a concurrent revision 5 lands. Because
    // the predicate is evaluated inside the UPDATE, the stale write matches nothing.
    mockFindByPk
      .mockResolvedValueOnce({ revision: 1, imageUrl: null })  // the route's preserve-read
      .mockResolvedValueOnce({ revision: 5 });                 // the re-read, after losing
    mockUpdate.mockResolvedValue([0]);

    const res = await send(app, body({ revision: 2, imageUrl: 'https://swanguard.example/race.png' }));

    expect(res.status).toBe(200);
    expect(res.body.noop).toBe(true);
    expect(res.body.revision).toBe(5);
    expect(predicateOf(mockUpdate.mock.calls[0])).toBe(2);
    expect(mockFetchDecode).not.toHaveBeenCalled();
    expect(mockUploadPhoto).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('re-reads the revision after a lost primary-key race instead of assuming it lost', async () => {
    // Two first-time deliveries of the same itemId: our INSERT hits the PK, so the helper
    // retries the conditional UPDATE. Assuming "insert failed ⇒ superseded" would silently
    // drop a legitimately newer revision, so the retry has to happen.
    const race = Object.assign(new Error('duplicate key value'), { name: 'SequelizeUniqueConstraintError' });
    mockFindByPk.mockResolvedValue(null);
    mockUpdate.mockResolvedValueOnce([0]).mockResolvedValueOnce([1]);
    mockCreate.mockRejectedValue(race);

    const res = await send(app, body({ revision: 2 }));

    expect(res.status).toBe(200);
    expect(res.body.noop).toBeUndefined();
    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });
});

describe('spotlight ordering — tombstone semantics', () => {
  it('a late replay of an older, non-retracted revision cannot resurrect a retracted item', async () => {
    // Item is retracted at revision 3; an old revision-2 delivery (retracted:false) is replayed.
    mockFindByPk.mockResolvedValue({ revision: 3, retracted: true, imageUrl: null });
    mockUpdate.mockResolvedValue([0]);

    const res = await send(app, body({ revision: 2, retracted: false }));

    expect(res.status).toBe(200);
    expect(res.body.noop).toBe(true);
    expect(res.body.revision).toBe(3);
    expect(predicateOf(mockUpdate.mock.calls[0])).toBe(2);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('a higher revision after retraction is applied and clears the tombstone', async () => {
    mockFindByPk.mockResolvedValue({ revision: 3, retracted: true, imageUrl: 'https://r2.example/a.jpg' });
    mockUpdate.mockResolvedValue([1]);

    const res = await send(app, body({ revision: 4, retracted: false }));

    expect(res.status).toBe(200);
    expect(res.body.retracted).toBe(false);
    expect(mockUpdate.mock.calls[0][0].retracted).toBe(false);
    expect(predicateOf(mockUpdate.mock.calls[0])).toBe(4);
  });

  it('retraction preserves the existing image rather than clearing it', async () => {
    // Documents real behaviour, and it is now a GUARANTEE rather than a carried value: a
    // retracted row is excluded from the manifest and the rail, so the retained URL is inert.
    //
    // UPDATED 2026-09-20 for R5-03. This used to read the stored image and carry it into the
    // write — which is how a text-only revision could overwrite a NEWER image with a snapshot
    // taken before it existed. The write no longer mentions `imageUrl`, so PostgreSQL keeps
    // whatever the row holds at commit time. The assertion therefore moved from "the payload
    // carried the old URL" to "the payload does not carry the column at all", which is the
    // stronger statement: nothing can be lost if nothing is written.
    mockFindByPk.mockResolvedValue({ revision: 1, retracted: false, imageUrl: 'https://r2.example/keep.jpg' });
    mockUpdate.mockResolvedValue([1]);

    await send(app, body({ revision: 2, retracted: true, imageUrl: 'https://swanguard.example/new.png' }));

    expect(mockUpdate.mock.calls[0][0].retracted).toBe(true);
    // The decisive change: the column is untouched, so the database's current value survives —
    // including an image written by a revision that arrived after this one read the row.
    expect(mockUpdate.mock.calls[0][0]).not.toHaveProperty('imageUrl');
    expect(mockFetchDecode).not.toHaveBeenCalled();
  });
});

describe('spotlight ordering — validation and persistence agree (D3)', () => {
  it('persists the NORMALIZED itemId, not the raw body value', async () => {
    // The old handler destructured the RAW `req.body.itemId` and stored that, so a padded or
    // over-long value was persisted unnormalized even though validation had bounded it.
    mockUpdate.mockResolvedValue([1]);
    await send(app, body({ itemId: `  ${ITEM}  ` }));

    expect(mockUpdate.mock.calls[0][0].itemId).toBe(ITEM);
  });

  it('rejects a revision beyond the INTEGER column range with 422, not 500', async () => {
    // The column is DataTypes.INTEGER (SwanSpotlight.mjs:23). An unbounded revision used to
    // pass validation and then fail at the column as a 500.
    const res = await send(app, body({ revision: 4294967296 }));

    expect(res.status).toBe(422);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('coerces `retracted` ONCE, so the image branch and the stored column agree', async () => {
    // `retracted: "false"` is not a boolean. The old code truthiness-tested it in the image
    // branch (so "false" skipped the image) but strict-compared it for storage (so it stored
    // false) — two different answers for the same input.
    mockUpdate.mockResolvedValue([1]);
    await send(app, body({ retracted: 'false', imageUrl: 'https://swanguard.example/pic.png' }));

    expect(mockUpdate.mock.calls[0][0].retracted).toBe(false);
    // And because the single coercion says "not retracted", the image IS attempted.
    expect(mockFetchDecode).toHaveBeenCalledTimes(1);
  });
});
