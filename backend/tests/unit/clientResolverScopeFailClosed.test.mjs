/**
 * clientResolverScopeFailClosed.test.mjs
 * ======================================
 * The resolver's own guard, pinned without going through the lane.
 *
 * WHY THIS EXISTS
 * ---------------
 * `resolveClient` used to decide scope with one boolean:
 *
 *     hasTrainerScope = Number.isInteger(parseInt(trainerId)) && trainerId > 0
 *
 * and a `false` there omitted the scope clause entirely — producing the admin-wide query. So
 * that value meant BOTH "no scope was requested" (correct for an admin) and "a scope was
 * requested and could not be computed" (must deny), and the code acted on the permissive
 * reading. A trainer whose own id was missing, zero, negative or unparseable was served every
 * active client rather than refused.
 *
 * WHY IT IS A SEPARATE FILE FROM THE OWNERSHIP CONTRACT
 * ----------------------------------------------------
 * The fix landed in two places on purpose — here, and independently in `stepResolveClient` —
 * because the lane should not depend on a shared helper's internals for its own safety, and
 * this helper serves callers outside the lane.
 *
 * That redundancy has a cost a panel named (GLM Flash, 2026-08-26): with both guards in
 * place, deleting EITHER ONE fails no test, so the only pin was a compound mutation removing
 * both at once. Each half was individually unprotected. This pins the resolver's half
 * directly, which decomposes that compound and means a future edit to one guard cannot
 * silently rely on the other still being there.
 *
 * The database is a mirror-fake: it applies the predicates the SQL actually carries, so a
 * query that stops carrying the scope clause stops being filtered — rather than a fake that
 * enforces assignment itself and would keep the tests green through the very regression they
 * exist to catch.
 */
import { describe, it, expect } from 'vitest';

import { resolveClient } from '../../services/ai/clientResolver.mjs';
import { makeClientDirectory } from '../helpers/fakeClientDirectory.mjs';
import { OUR_TRAINER, PEER_TRAINER, OWN_CLIENT, FOREIGN_CLIENT, DIRECTORY } from '../helpers/ownershipFixture.mjs';

const directory = () => makeClientDirectory(DIRECTORY);

describe('clientResolver scope decision', () => {
  it('resolves an assigned client for a valid trainer — the positive control', async () => {
    // Without this, every denial below could pass because the resolver refuses everything.
    const db = directory();
    const { resolved, error } = await resolveClient(`#${OWN_CLIENT}`, db, { trainerId: OUR_TRAINER });
    expect(error, `a valid trainer was refused their own client: ${error}`).toBeNull();
    expect(resolved?.id).toBe(OWN_CLIENT);
  });

  it('refuses a client assigned to someone else', async () => {
    const { resolved, error } = await resolveClient(`#${FOREIGN_CLIENT}`, directory(), { trainerId: OUR_TRAINER });
    expect(resolved).toBeNull();
    expect(error).toBeTruthy();
  });

  it('REFUSES when a scope was requested but cannot be computed', async () => {
    // The fail-open. Each of these produced `hasTrainerScope === false`, which used to mean
    // "run unscoped" — the admin-wide query — for a caller who had explicitly asked to be
    // scoped. They must be denials, and crucially they must not resolve OWN_CLIENT either:
    // the failure is not "wrong client", it is "no restriction at all".
    for (const bad of [0, -1, 'not-a-number', '', {}, [], NaN, 1.5]) {
      for (const target of [OWN_CLIENT, FOREIGN_CLIENT]) {
        const { resolved, error } = await resolveClient(`#${target}`, directory(), { trainerId: bad });
        expect(resolved, `trainerId ${JSON.stringify(bad)} resolved client ${target}`).toBeNull();
        expect(error, `trainerId ${JSON.stringify(bad)} produced no error`).toBeTruthy();
      }
    }
  });

  it('issues NO query at all when the scope cannot be computed', async () => {
    // Stronger than "returned null": it must not reach the database unscoped and then filter
    // in JavaScript, because a later refactor of the JS side would reopen the hole.
    const db = directory();
    await resolveClient(`#${OWN_CLIENT}`, db, { trainerId: 'garbage' });
    expect(db.calls, 'an unscoped query was issued for an uncomputable scope').toEqual([]);
  });

  it('still runs UNSCOPED when no scope was requested — the admin path', async () => {
    // The other half of the distinction. Omitting the option entirely is how an admin asks
    // for the unrestricted query, and that must keep working — a guard that also broke admins
    // would be reverted within a day, and then the fail-open would be back.
    const db = directory();
    const { resolved, error } = await resolveClient(`#${FOREIGN_CLIENT}`, db, {});
    expect(error).toBeNull();
    expect(resolved?.id).toBe(FOREIGN_CLIENT);
    expect(db.calls.some((c) => c.scopedByAssignment), 'an admin query carried an assignment scope').toBe(false);
  });

  it('applies the scope by NAME as well as by id', async () => {
    // The fuzzy branch carries its own copy of the scope clause. A suite that only ever
    // passes an id leaves the branch a trainer hits saying "log Bo's workout" untested.
    const own = await resolveClient('Ada', directory(), { trainerId: OUR_TRAINER });
    expect(own.resolved?.id).toBe(OWN_CLIENT);

    const foreign = await resolveClient('Bo', directory(), { trainerId: OUR_TRAINER });
    expect(foreign.resolved, 'a name resolved a client assigned to another trainer').toBeNull();

    // The near-miss suggestions must not disclose that Bo exists. But a `not.toContain` on
    // an EMPTY list passes for the wrong reason, so first prove the channel exists at all:
    // a miss inside the caller's own scope does produce suggestions. Without this the leak
    // check would silently become a tautology the day the resolver stopped suggesting.
    // (GLM Flash, round 6: "weakens to a tautology if a future refactor returns NO
    // suggestions" — true, and cheaper to close than to remember.)
    // A name that matches NOTHING, so the resolver takes the suggestion branch rather than
    // fuzzy-resolving it. An earlier version used 'Adaa', which is one edit from 'Ada' and
    // therefore resolves — so the control passed on the resolve branch and proved nothing
    // about suggestions at all. (GLM Flash, round 7: "weak-but-failable"; it was right, and
    // a disjunction that can be satisfied by the wrong half is barely a control.)
    const noMatch = await resolveClient('Zzzzqqq', directory(), { trainerId: OUR_TRAINER });
    expect(noMatch.resolved, 'the control name unexpectedly resolved').toBeNull();
    expect(
      (noMatch.suggestions || []).length,
      'the suggestion channel produced nothing — the leak check below would be vacuous',
    ).toBeGreaterThan(0);

    expect(JSON.stringify(foreign.suggestions || [])).not.toContain('Foreign');
  });

  it('binds the scope to the CALLER, not to any trainer', async () => {
    // If the clause were emitted but bound to the wrong value, every assertion above would
    // still pass. The peer trainer must see their own client and not ours.
    const peer = await resolveClient(`#${FOREIGN_CLIENT}`, directory(), { trainerId: PEER_TRAINER });
    expect(peer.resolved?.id).toBe(FOREIGN_CLIENT);

    const crossed = await resolveClient(`#${OWN_CLIENT}`, directory(), { trainerId: PEER_TRAINER });
    expect(crossed.resolved).toBeNull();
  });
});
