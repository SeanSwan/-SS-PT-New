/**
 * aiCommandTrainerScopeOwnership.contract.test.mjs
 * ================================================
 * The other half of ownership: not "whose CLIENT is this" but "whose SCHEDULE is this".
 *
 * WHY THIS EXISTS, AND WHY IT IS A SEPARATE FILE
 * ----------------------------------------------
 * `aiCommandDispatcherOwnership.contract.test.mjs` proves the pipeline scopes a caller to
 * their own clients, and named what it could not reach: "Five commands accept a trainer
 * id; nothing asserts a trainer cannot pass a peer's id." Those commands are gated in a
 * different place by a different mechanism — the pipeline has no step for it, so each
 * HANDLER calls `resolveTrainerId` itself. Two of the four are writes
 * (`set_availability`, `create_availability_override`), so a gap here is a peer trainer
 * rewriting your working week, not merely reading it.
 *
 * WHAT WAS ALREADY HERE, AND WHY IT WAS NOT ENOUGH
 * ------------------------------------------------
 * `tests/unit/plaudPhase4ViewAvailableSlots.test.mjs` asserts
 * `/dispatchViewAvailableSlots[\s\S]{0,800}resolveTrainerId/` — ONE of the four commands,
 * guarded by an 800-character window that can run past the end of the function it means
 * to describe. A neighbouring handler's call would satisfy it. This suite covers all four
 * and slices each handler at its own boundaries via `sliceBetween`, which throws rather
 * than silently widening when an anchor drifts.
 *
 * ADMIN IS EXEMPT ON PURPOSE
 * --------------------------
 * `resolveTrainerId` lets an admin name any trainer, and REQUIRES them to name one — an
 * admin has no own-schedule to default to. Two further commands (`set_trainer_permissions`,
 * `view_trainer_clients`) accept a trainer id and are admin-only, so no peer relationship
 * exists to protect. They are listed rather than filtered out silently.
 *
 * NOT PROVEN
 * - That the handlers' downstream service calls re-check anything. This proves the id a
 *   handler acts on is its own, not that the service would refuse a foreign one.
 * - The client-facing `schedule_my_session`, which takes a trainer id by design: a client
 *   books WITH a trainer. Whether that trainer must be theirs is a product question that
 *   nothing here settles.
 */
import { describe, it, expect } from 'vitest';

import { resolveTrainerId } from '../../services/ai/dispatchers/availabilityDispatchers.mjs';
import sliceBetween from '../helpers/sliceBetween.mjs';
import { readDispatcherMap } from '../helpers/dispatcherReachability.mjs';
import {
  OUR_TRAINER, PEER_TRAINER, trainerIdCommands, handlerBody,
} from '../helpers/ownershipFixture.mjs';

const TRAINER = { id: OUR_TRAINER, role: 'trainer', firstName: 'T', lastName: 'R' };
const ADMIN = { id: 9001, role: 'admin', firstName: 'A', lastName: 'D' };

/** Trainer-id commands that are admin-only: no peer relationship exists to protect. */
const ADMIN_ONLY_TRAINER_ID = new Set([
  'set_trainer_permissions', 'view_trainer_clients', 'assign_trainer', 'assign_client_to_trainer',
]);

/** Self-service: a client naming the trainer they want to book with. */
const CLIENT_BOOKING = new Set(['schedule_my_session']);

/**
 * The idioms a handler may use to keep a trainer on their own id. There are two, and
 * naming them is deliberate: a scan that knew only `resolveTrainerId` would report
 * `schedule_session` as ungated when it is in fact the stricter of the two — it ignores
 * `params.trainerId` outright for a trainer rather than validating it.
 *
 * Adding a third idiom is an act, not an accident. Do it here, having read the handler,
 * rather than loosening the assertion until it passes.
 */
const CONSTRAINT_IDIOMS = [
  'resolveTrainerId(params.trainerId',
  "ctx.user.role === 'trainer'",
];

/** Trainer-runnable trainer-id commands: the ones where a peer relationship exists. */
function gatedTrainerIdCommands() {
  return trainerIdCommands().filter((c) => c.roleRequired.includes('trainer')
    && !ADMIN_ONLY_TRAINER_ID.has(c.type)
    && !CLIENT_BOOKING.has(c.type));
}

describe('Swan Coach trainer-scope ownership', () => {
  describe('the self-gate itself', () => {
    it('refuses a trainer who names a peer', () => {
      expect(() => resolveTrainerId(PEER_TRAINER, TRAINER)).toThrow(/only manage their own/i);
    });

    it('defaults a trainer to themselves when no id is given', () => {
      expect(resolveTrainerId(null, TRAINER)).toBe(OUR_TRAINER);
    });

    it('accepts a trainer naming their own id, as a number or a string', () => {
      // The route hands params through JSON, so the same id arrives typed either way. A
      // strict comparison here would refuse a trainer their own schedule.
      expect(resolveTrainerId(OUR_TRAINER, TRAINER)).toBe(OUR_TRAINER);
      expect(resolveTrainerId(String(OUR_TRAINER), TRAINER)).toBe(OUR_TRAINER);
    });

    it('lets an admin name any trainer, and requires them to name one', () => {
      expect(resolveTrainerId(PEER_TRAINER, ADMIN)).toBe(PEER_TRAINER);
      expect(() => resolveTrainerId(null, ADMIN)).toThrow(/specify a trainerId/i);
    });
  });

  describe('every command that takes a trainer id', () => {
    it('is accounted for — as gated, admin-only, or client booking', () => {
      // Instrument validation. If the registry grows a trainer-id command and nobody
      // classifies it, this fails rather than the suite quietly covering less.
      const commands = trainerIdCommands();
      expect(commands.length, 'no trainer-id commands found: the shape reader broke').toBeGreaterThan(0);
      const unclassified = commands.filter((c) => !ADMIN_ONLY_TRAINER_ID.has(c.type)
        && !CLIENT_BOOKING.has(c.type)
        && !c.roleRequired.includes('trainer'));
      expect(unclassified.map((c) => c.type), 'unclassified trainer-id commands').toEqual([]);
    });

    it('constrains it to the caller, inside its OWN handler body', () => {
      const map = new Map(readDispatcherMap().map((e) => [e.type, e.handler]));
      const ungated = [];
      const unfound = [];
      for (const command of gatedTrainerIdCommands()) {
        const handler = map.get(command.type);
        const found = handler ? handlerBody(handler) : null;
        if (!found) { unfound.push(`${command.type} -> ${handler || 'no handler'}`); continue; }
        if (!CONSTRAINT_IDIOMS.some((idiom) => found.body.includes(idiom))) {
          ungated.push(`${command.type} (${found.file})`);
        }
      }
      expect(unfound, `handler source not found — a failure to look, not an absence: ${unfound.join(', ')}`).toEqual([]);
      expect(ungated, `trainer-id commands acting on an unchecked id: ${ungated.join(', ')}`).toEqual([]);
    });

    it('pins a trainer scheduling a session to their own id, ignoring the parameter', () => {
      // Named rather than folded into the scan above because it is the one WRITE that
      // creates a record on a calendar, and because its idiom is bespoke: a trainer's
      // `params.trainerId` is not validated, it is discarded.
      const map = new Map(readDispatcherMap().map((e) => [e.type, e.handler]));
      const found = handlerBody(map.get('schedule_session'));
      expect(found, 'schedule_session handler source not found').toBeTruthy();
      const pin = sliceBetween(
        found.body,
        'const trainerId =',
        ';',
        { label: 'dispatchScheduleSession trainer pin' },
      );
      expect(pin).toContain("ctx.user.role === 'trainer'");
      expect(pin).toContain('ctx.user.id');
    });

    it('covers more than the one command the prior regex reached', () => {
      // The gap this suite was written for: a single command was guarded, three were not
      // guarded by anything. If the surface ever shrinks back to one, that is a removal
      // worth noticing rather than a suite that silently has less to do.
      expect(gatedTrainerIdCommands().length).toBeGreaterThanOrEqual(5);
    });
  });
});
