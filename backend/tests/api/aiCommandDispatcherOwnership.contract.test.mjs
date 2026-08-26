/**
 * aiCommandDispatcherOwnership.contract.test.mjs
 * ==============================================
 * Role says WHAT you may run. This asks WHOSE record you may run it on.
 *
 * WHY THIS EXISTS
 * ---------------
 * `aiCommandDispatcherAuthorization.contract.test.mjs` proved that no below-role caller
 * reaches a dispatcher, and stated plainly what it did not prove: "nothing here asserts
 * that a correctly-roled trainer cannot act on a client who is not theirs." It could not
 * prove it, because it MOCKS `clientResolver` — the one component that scopes a caller to
 * their own clients. This suite does the opposite: the resolver is real, and the database
 * underneath it is a mirror-fake that applies exactly the predicates the SQL carries
 * (`tests/helpers/fakeClientDirectory.mjs`). Delete the assignment scope from the resolver
 * and these tests fail; that is the whole design.
 *
 * THE ONE PLACE OWNERSHIP IS DECIDED
 * ----------------------------------
 * `commandExecutor.mjs` step 6 (`stepResolveClient`) is the only pipeline step that maps a
 * caller-supplied client id to a record, and it passes a scope to the resolver derived
 * from the caller's role. Read that derivation as a table rather than a ternary and the
 * shape is visible: a trainer is scoped to assigned clients; an admin is deliberately
 * unscoped, being the superset role; and every remaining role must be scoped to itself,
 * which is what the non-privileged section below pins.
 *
 * THE VACUITY HAZARD THIS SUITE WAS BUILT AROUND
 * ----------------------------------------------
 * The steps run: validate (4) -> rbac (5) -> resolve_client (6) -> debate (7) ->
 * confirmation (8) -> execute (9). A probe that only asserts "dispatch was not called"
 * passes for a destructive command because it stopped at CONFIRMATION, and for a
 * malformed one because it stopped at VALIDATION — in both cases whether or not ownership
 * is enforced at all. Every denial here therefore asserts the STAGE as well: the caller
 * must be stopped at `resolve_client`, by the resolver, and nowhere else.
 *
 * NOT PROVEN (stated, because silence reads as coverage)
 * - Indirect object references. Ownership is checked on the client id. A caller who
 *   supplies a session, plan, goal, intake, profile or achievement id belonging to
 *   someone else is not checked here; those are handler-side and still open.
 * - A trainer id as a parameter. Five commands accept one (`schedule_session`,
 *   `set_availability`, ...); nothing asserts a trainer cannot pass a peer's id.
 * - Real SQL. The fake mirrors the resolver's predicates; it does not prove PostgreSQL
 *   evaluates them the same way, only that the query carries them.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import AiCommandAuditLog from '../../models/AiCommandAuditLog.mjs';
import { classifyIntent } from '../../services/ai/intentClassifier.mjs';
import { dispatch } from '../../services/ai/commandDispatcher.mjs';
import { startDebate } from '../../services/ai/debate/debateOrchestrator.mjs';
import { buildDebateClientContext } from '../../services/ai/debate/debateClientContextService.mjs';
import { executeCommandPipeline } from '../../services/ai/commandExecutor.mjs';
import { buildValidParams } from '../helpers/zodParamFixture.mjs';
import { paramNames, commandsWithHiddenShape } from '../helpers/schemaShape.mjs';
import { makeClientDirectory } from '../helpers/fakeClientDirectory.mjs';
import {
  OUR_TRAINER, OWN_CLIENT, FOREIGN_CLIENT, DIRECTORY, UNSYNTHESIZABLE, PINNED_PARAMS,
  pinnedClientRefCommandsWithoutFixture,
  allCommands, clientRefCommands,
} from '../helpers/ownershipFixture.mjs';

vi.mock('../../models/AiCommandAuditLog.mjs', () => ({ default: { create: vi.fn() } }));
vi.mock('../../services/ai/intentClassifier.mjs', () => ({ classifyIntent: vi.fn() }));
vi.mock('../../services/ai/commandDispatcher.mjs', () => ({
  dispatch: vi.fn(),
  hasDispatcher: vi.fn(() => true),
}));
vi.mock('../../services/ai/debate/debateOrchestrator.mjs', () => ({ startDebate: vi.fn() }));
vi.mock('../../services/ai/debate/debateClientContextService.mjs', () => ({
  buildDebateClientContext: vi.fn(),
}));
// clientResolver is deliberately NOT mocked. It is the subject.

const createMock = vi.mocked(AiCommandAuditLog.create);
const classifyMock = vi.mocked(classifyIntent);
const dispatchMock = vi.mocked(dispatch);
const startDebateMock = vi.mocked(startDebate);
const buildDebateClientContextMock = vi.mocked(buildDebateClientContext);

const ENV_KEYS = ['AI_COMMAND_WRITES_ENABLED', 'AI_COMMANDS_ENABLED'];
const savedEnv = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  createMock.mockReset();
  createMock.mockResolvedValue({});
  classifyMock.mockReset();
  dispatchMock.mockReset();
  dispatchMock.mockResolvedValue({ probe: 'dispatcher reached' });
  startDebateMock.mockReset();
  startDebateMock.mockReturnValue('debate_job_probe');
  buildDebateClientContextMock.mockReset();
  buildDebateClientContextMock.mockResolvedValue({ deIdentified: { alias: 'Client-42' } });
});

/**
 * @param {object} [opts]
 * @param {string} [opts.byName] resolve by NAME instead of id. The two take different
 *   branches of `clientResolver` — a direct-id lookup and a fuzzy list scan — and each
 *   carries its own copy of the assignment scope, so a suite that only ever passes an id
 *   leaves the branch a trainer hits when saying "log Bo's workout" untested.
 */
async function runAgainstClient(command, role, callerId, targetClientId, opts = {}) {
  const byName = opts.byName || null;
  const auto = buildValidParams(command.inputSchema);
  // A pinned command uses its hand-written fixture rather than being skipped. A pin means
  // "the generator cannot invent this", never "this is untested".
  const base = PINNED_PARAMS.get(command.type) || auto.params;
  const fixture = { params: base, ok: auto.ok || PINNED_PARAMS.has(command.type) };
  classifyMock.mockResolvedValue({
    intent: command.type,
    clientRef: byName,
    params: byName ? fixture.params : { ...fixture.params, clientId: targetClientId },
    confidence: 0.95,
  });
  dispatchMock.mockClear();
  const directory = makeClientDirectory(opts.directory || DIRECTORY);
  const ctx = await executeCommandPipeline('ownership probe', {
    id: callerId, role, firstName: 'Probe', lastName: 'Actor',
  }, {
    selectedClientId: byName ? null : targetClientId,
    sequelize: directory,
  });
  return {
    ctx,
    directory,
    dispatchCalls: dispatchMock.mock.calls.length,
    dispatchedClientId: dispatchMock.mock.calls[0]?.[1]?.clientId ?? null,
    resolvedClientId: ctx.resolvedClient?.id ?? null,
    schemaConverged: fixture.ok,
  };
}

const TRAINER_READ = 'view_client_profile';

describe('Swan Coach dispatcher ownership', () => {
  describe('the probe itself', () => {
    it('reaches a dispatcher for a client the trainer OWNS — the positive control', async () => {
      // Without this, every denial below could pass because the harness never reaches
      // the gate rather than because the gate holds.
      const command = allCommands().find((c) => c.type === TRAINER_READ);
      const run = await runAgainstClient(command, 'trainer', OUR_TRAINER, OWN_CLIENT);
      expect(
        run.dispatchCalls,
        `control failed: an ASSIGNED client never reached dispatch (stopped at ${run.ctx.stage}: ${run.ctx.error})`,
      ).toBe(1);
      expect(run.dispatchedClientId).toBe(OWN_CLIENT);
    });

    it('sends the assignment scope to the database, with the caller as the trainer', async () => {
      // The denial must come from the scope clause. If the query stops carrying it, the
      // fake stops filtering, the foreign client resolves, and the suite fails — but this
      // asserts the mechanism directly rather than only through its effect.
      const command = allCommands().find((c) => c.type === TRAINER_READ);
      const run = await runAgainstClient(command, 'trainer', OUR_TRAINER, OWN_CLIENT);
      const scoped = run.directory.calls.filter((call) => call.scopedByAssignment);
      expect(scoped.length, 'resolver issued no assignment-scoped query for a trainer').toBeGreaterThan(0);
      for (const call of scoped) {
        expect(Number(call.replacements.trainerId)).toBe(OUR_TRAINER);
      }
    });

    it('sees parameter names through refine/optional wrappers', () => {
      // Instrument validation. A naive `Object.keys(schema.shape)` returns [] for the 19
      // wrapped schemas, hiding 12 commands' entire parameter lists — including
      // update_client's client id — while reporting a clean survey.
      const hidden = commandsWithHiddenShape(allCommands());
      expect(hidden, 'no wrapped schemas found: either the registry changed or the reader broke').not.toEqual([]);
      expect(paramNames(allCommands().find((c) => c.type === 'update_client'))).toContain('clientId');
    });

    it('leaves no command able to name a client without declaring that it does', () => {
      // Panel round 3 (Qwen): the confirm lane refuses a missing client only when
      // `command.requiresClientRef === true`. Strict equality means a command with the field
      // ABSENT skips the check and the gate falls through to permitted — so the protection
      // rests on an invariant that nothing enforces.
      //
      // Loosening the equality would be the wrong fix: `delete_workout_plan` legitimately
      // declares no client ref and must keep working. The right fix is to enforce the
      // invariant the gate assumes. Today it holds for all 139 commands; this is what makes
      // it stay true when someone adds the 140th.
      const CLIENT_IDENTIFYING = /^(clientId|clientRef|clientName|traineeId|memberId|athleteId)$/;
      const undeclared = allCommands().filter((command) => {
        const names = paramNames(command).filter((n) => CLIENT_IDENTIFYING.test(n));
        if (!names.length) return false;
        return command.requiresClientRef !== true && command.selfService !== true;
      });
      expect(
        undeclared.map((c) => c.type),
        'these commands accept a client id but declare neither requiresClientRef nor selfService, '
        + 'so every gate keyed on those flags silently skips them',
      ).toEqual([]);
    });

    it('never lets a pin become an untested client-ref command', () => {
      // Panel finding (GLM, 2026-08-26): a pin excluded its command from every sweep, and
      // "no stale pins" passed precisely BECAUSE the command stayed unsynthesizable — so a
      // pinned command could leak a foreign client indefinitely while the suite reported
      // full coverage. Three of the five pins are client-data WRITES.
      //
      // A pin now means only "the generator cannot invent this". Anything pinned that
      // resolves a client reference must carry a hand-written fixture, and this fails the
      // moment someone adds a pin without one.
      const uncovered = pinnedClientRefCommandsWithoutFixture();
      expect(
        uncovered,
        `pinned client-ref commands with no fixture — every sweep silently skips these: ${uncovered.join(', ')}`,
      ).toEqual([]);
      expect(PINNED_PARAMS.size, 'the fixture table emptied').toBeGreaterThan(0);
    });

    it('has no stale pins', () => {
      const stale = [...UNSYNTHESIZABLE].filter((type) => {
        const command = allCommands().find((c) => c.type === type);
        return command && buildValidParams(command.inputSchema).ok;
      });
      expect(stale, `pinned commands now converge and must be unpinned: ${stale.join(', ')}`).toEqual([]);
    });
  });

  describe('a trainer and a client who is not theirs', () => {
    it('is stopped at resolve_client, not merely short of dispatch', async () => {
      const command = allCommands().find((c) => c.type === TRAINER_READ);
      const run = await runAgainstClient(command, 'trainer', OUR_TRAINER, FOREIGN_CLIENT);
      expect(run.dispatchCalls).toBe(0);
      expect(run.ctx.stage).toBe('resolve_client');
      expect(run.ctx.error).toBeTruthy();
    });

    it('is denied by NAME as well as by id — the other resolver branch', async () => {
      const command = allCommands().find((c) => c.type === TRAINER_READ);
      const own = await runAgainstClient(command, 'trainer', OUR_TRAINER, null, { byName: 'Ada' });
      expect(
        own.dispatchCalls,
        `control failed: an assigned client was not resolvable by name (${own.ctx.stage}: ${own.ctx.error})`,
      ).toBe(1);
      expect(own.dispatchedClientId).toBe(OWN_CLIENT);

      const foreign = await runAgainstClient(command, 'trainer', OUR_TRAINER, null, { byName: 'Bo' });
      expect(foreign.dispatchCalls, 'a trainer resolved an unassigned client by name').toBe(0);
      expect(foreign.ctx.stage).toBe('resolve_client');
      // The scan must not even list the foreign client, or a near-miss suggestion would
      // disclose that they exist.
      expect(JSON.stringify(foreign.ctx.result || {})).not.toContain('Foreign');
    });

    it('holds for EVERY command that resolves a client reference', async () => {
      const commands = clientRefCommands().filter((c) => c.roleRequired.includes('trainer'));
      expect(commands.length).toBeGreaterThan(30);
      const leaked = [];
      const wrongStage = [];
      for (const command of commands) {
        if (UNSYNTHESIZABLE.has(command.type) && !PINNED_PARAMS.has(command.type)) continue;
        const run = await runAgainstClient(command, 'trainer', OUR_TRAINER, FOREIGN_CLIENT);
        if (run.dispatchCalls > 0) leaked.push(`${command.type} -> ${run.dispatchedClientId}`);
        else if (run.ctx.stage !== 'resolve_client') wrongStage.push(`${command.type} @ ${run.ctx.stage}`);
      }
      expect(leaked, `a trainer reached a dispatcher for an unassigned client: ${leaked.join(', ')}`).toEqual([]);
      expect(wrongStage, `denied, but NOT by the ownership gate: ${wrongStage.join(', ')}`).toEqual([]);
    });
  });

  describe('a caller who is neither admin nor trainer', () => {
    it('cannot reach a dispatcher holding another client id', async () => {
      // `view_xp_streaks` is the case that exposed this: roleRequired includes 'client',
      // requiresClientRef is true, selfService is not set. Step 6 derived a scope for
      // trainers only, so a client caller was unscoped and the resolver returned any
      // active client row by id.
      const command = allCommands().find((c) => c.type === 'view_xp_streaks');
      expect(command.roleRequired).toContain('client');
      const run = await runAgainstClient(command, 'client', OWN_CLIENT, FOREIGN_CLIENT);
      expect(
        run.dispatchedClientId,
        'a client-role caller reached a dispatcher holding another client id',
      ).not.toBe(FOREIGN_CLIENT);
      expect(run.resolvedClientId).not.toBe(FOREIGN_CLIENT);
    });

    it('is refused explicitly, not silently retargeted to itself', async () => {
      // The distinction matters: a silent retarget answers a question the caller did not
      // ask, and on a future write command it would modify the wrong record without ever
      // reporting an error.
      const command = allCommands().find((c) => c.type === 'view_xp_streaks');
      const run = await runAgainstClient(command, 'client', OWN_CLIENT, FOREIGN_CLIENT);
      expect(run.dispatchCalls).toBe(0);
      expect(run.ctx.stage).toBe('resolve_client');
      expect(run.ctx.error).toBeTruthy();
    });

    it('still reaches a dispatcher for its OWN record', async () => {
      // The fix must scope the caller, not lock them out. Without this, denying every
      // non-privileged caller unconditionally would pass every assertion above.
      const command = allCommands().find((c) => c.type === 'view_xp_streaks');
      const run = await runAgainstClient(command, 'client', OWN_CLIENT, OWN_CLIENT);
      expect(
        run.dispatchCalls,
        `a client was blocked from its own record (stopped at ${run.ctx.stage}: ${run.ctx.error})`,
      ).toBe(1);
      expect(run.dispatchedClientId).toBe(OWN_CLIENT);
    });

    it('is subject to the same directory predicates as everyone else', async () => {
      // Panel finding (GLM, 2026-08-26). An earlier draft fabricated `resolvedClient` from
      // `ctx.user` and returned, which skipped every predicate the scoped path enforces —
      // so a DEACTIVATED account could still act on itself while a trainer could not act on
      // it. Two layers disagreeing about who counts as a client is the class of defect this
      // whole file exists to remove. Self-access now pins the id and uses the same resolver.
      const command = allCommands().find((c) => c.type === 'view_xp_streaks');
      const deactivated = {
        clients: [{ id: OWN_CLIENT, firstName: 'Ada', lastName: 'Own', isActive: false }],
        assignments: [],
      };
      const run = await runAgainstClient(command, 'client', OWN_CLIENT, OWN_CLIENT, {
        directory: deactivated,
      });
      expect(run.dispatchCalls, 'a deactivated account resolved itself').toBe(0);
      expect(run.ctx.stage).toBe('resolve_client');
    });

    it('holds for every non-privileged role on every client-ref command', async () => {
      const leaked = [];
      let pairsTested = 0;
      for (const command of clientRefCommands()) {
        if (UNSYNTHESIZABLE.has(command.type) && !PINNED_PARAMS.has(command.type)) continue;
        for (const role of command.roleRequired) {
          if (role === 'admin' || role === 'trainer') continue;
          pairsTested += 1;
          const run = await runAgainstClient(command, role, OWN_CLIENT, FOREIGN_CLIENT);
          if (run.dispatchedClientId === FOREIGN_CLIENT || run.resolvedClientId === FOREIGN_CLIENT) {
            leaked.push(`${command.type} as ${role}`);
          }
        }
      }
      // Today exactly one such pair exists. If `view_xp_streaks` stops permitting a client
      // — or the classification changes — the loop body would never run and an empty
      // `leaked` would report a clean sweep of nothing. An empty surface is a fact worth
      // failing on, so that whoever removed the last pair decides deliberately.
      expect(pairsTested, 'no non-privileged client-ref pairs remain to test').toBeGreaterThan(0);
      expect(leaked, `non-privileged callers reached a foreign client: ${leaked.join(', ')}`).toEqual([]);
    });
  });

  describe('admin is the superset role, deliberately', () => {
    it('resolves any client, and the query carries no assignment scope', async () => {
      // Asserted so that scoping admins later is a deliberate, visible break rather than
      // an accident. If this ever needs to change, change it here first.
      const command = allCommands().find((c) => c.type === TRAINER_READ);
      const run = await runAgainstClient(command, 'admin', 9001, FOREIGN_CLIENT);
      expect(run.dispatchCalls).toBe(1);
      expect(run.dispatchedClientId).toBe(FOREIGN_CLIENT);
      expect(run.directory.calls.some((call) => call.scopedByAssignment)).toBe(false);
    });
  });
});
