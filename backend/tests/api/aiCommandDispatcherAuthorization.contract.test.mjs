/**
 * aiCommandDispatcherAuthorization.contract.test.mjs
 * ==================================================
 * Does a below-role caller ever reach a Swan Coach dispatcher?
 *
 * WHY THIS EXISTS
 * ---------------
 * `COACH-ENDPOINT-TRUTH-HANDOFF-2026-08-25.md` §5.1 named this the recommended next
 * slice and stated the gap plainly: `roleRequired` is hand-authored per command, 112
 * command types are wired to 110 dispatcher handlers, three were ever read, and
 * NOTHING asserted that a dispatcher denies a below-role caller. The prior session's
 * only RBAC test (`tests/unit/commandKillSwitch.test.mjs`, "RBAC escalation baseline")
 * proves the mechanism for ONE synthetic command with `getCommand` mocked — so the
 * registry's real `roleRequired` values were never exercised by anything.
 *
 * WHAT IS ASSERTED, AND WHY THAT IS THE RIGHT SHAPE
 * ------------------------------------------------
 * The retracted harness in the 2026-08-23 handoff wanted `roleRequired` compared to
 * route middleware. That premise was false: dispatch selects a handler by command TYPE
 * (`commandDispatcher.mjs`), never by issuing an HTTP request, so a route's middleware
 * never runs for this lane. The authorization that DOES run is the pipeline's own role
 * step. So the load-bearing questions are:
 *
 *   1. Which code paths can reach a dispatcher at all?     (§ single door)
 *   2. Does the request path deny every below-role caller? (§ exhaustive denial)
 *   3. Can a dispatcher calling a peer widen its role?     (§ peer reuse)
 *
 * `dispatch` has THREE call sites, not one, and an earlier draft of this header said the
 * pipeline was the only door. The other two are the confirmation lane — non-destructive
 * and destructive redemption of a pending operationId — which re-check ownership rather
 * than role, and are asserted in `aiCommandConfirmLaneOwnership.contract.test.mjs`.
 *
 * THE VACUITY HAZARD THIS TEST WAS BUILT AROUND
 * ---------------------------------------------
 * Params are validated (step 4) BEFORE role is checked (step 5). A below-role probe
 * sending `{}` is rejected by the schema, not by the role gate — so it passes whether
 * or not authorization exists. Measured 2026-08-26 over 139 commands x 4 caller roles =
 * 303 below-role pairs: with empty params, 116 of 303 (38%) stopped at validation. Such
 * a suite would be 38% vacuous, and vacuous in the safe-looking direction.
 * `tests/helpers/zodParamFixture.mjs` synthesizes schema-valid params, which takes 293
 * of 303 to the role gate; the remaining 10 (five commands whose cross-field `custom`
 * refinements cannot be synthesized) are PINNED BY NAME below rather than absorbed.
 *
 * NOT PROVEN (stated, because silence reads as coverage)
 * - Ownership, not role: nothing here asserts that a correctly-roled trainer cannot
 *   act on a client who is not theirs. That is a separate and still-open slice.
 * - The dispatchers themselves are mocked. This proves the pipeline denies before a
 *   handler runs; it does not prove any handler self-gates as defense in depth.
 * - A role change mid-flight. The confirm lane verifies ownership, not role, so a caller
 *   whose role is revoked after minting an operation can still redeem it inside the 120s
 *   expiry. Bounded and narrow, but real, and asserted nowhere.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';

import AiCommandAuditLog from '../../models/AiCommandAuditLog.mjs';
import { classifyIntent } from '../../services/ai/intentClassifier.mjs';
import { dispatch, hasDispatcher } from '../../services/ai/commandDispatcher.mjs';
import { startDebate } from '../../services/ai/debate/debateOrchestrator.mjs';
import { buildDebateClientContext } from '../../services/ai/debate/debateClientContextService.mjs';
import { resolveClient } from '../../services/ai/clientResolver.mjs';
import { executeCommandPipeline } from '../../services/ai/commandExecutor.mjs';
import { initializeRegistry, getAllCommands } from '../../services/ai/commandRegistry/index.mjs';
import { buildValidParams } from '../helpers/zodParamFixture.mjs';
import sliceBetween from '../helpers/sliceBetween.mjs';
import { stripComments } from '../helpers/sourceScan.mjs';
import {
  DISPATCHER_FILE,
  EXECUTOR_FILE,
  DISPATCHER_REL,
  callerRoles,
  namedImportsOf,
  readDispatcherMap,
  walkBackendSources,
  rel,
} from '../helpers/dispatcherReachability.mjs';

// The registry is real on purpose — mocking it is what made the prior RBAC test
// unable to say anything about the roleRequired values that actually ship.
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
vi.mock('../../services/ai/clientResolver.mjs', () => ({ resolveClient: vi.fn() }));

const createMock = vi.mocked(AiCommandAuditLog.create);
const classifyMock = vi.mocked(classifyIntent);
const dispatchMock = vi.mocked(dispatch);
const hasDispatcherMock = vi.mocked(hasDispatcher);
const startDebateMock = vi.mocked(startDebate);
const buildDebateClientContextMock = vi.mocked(buildDebateClientContext);
const resolveClientMock = vi.mocked(resolveClient);


/**
 * Commands whose schema cannot be satisfied by synthesized params, so the pipeline
 * stops a below-role caller at validation before the role gate is ever reached. Such a
 * caller IS denied — `dispatch` is still never called — but THE DENIAL IS NOT PROOF OF
 * AUTHORIZATION, so these are excluded from the at-the-gate assertion and named here
 * rather than silently absorbed.
 *
 * Pinned by COMMAND, not by command/role: convergence is a property of the schema, so a
 * command that resists synthesis resists it for every role. All five are cross-field
 * `custom` refinements — business rules over multiple params that issue-driven repair
 * cannot invent. A pin that starts converging fails — see "no stale pins".
 */
const SCHEMA_UNSYNTHESIZABLE_COMMANDS = new Map([
  ['update_client', 'root-level custom refinement (at least one updatable field)'],
  ['rest_adjust', 'custom refinement on deltaSeconds'],
  ['create_goal', 'root-level custom refinement'],
  ['update_goal_progress', 'root-level custom refinement'],
  ['log_my_nutrition', 'custom refinement on meals[].description'],
]);

/**
 * Handlers registered in DISPATCHERS that are ALSO imported by a peer dispatcher module
 * rather than only by commandDispatcher.mjs. Peer reuse is legitimate composition, but
 * it routes one command's role through another command's handler, so each edge must be
 * proven non-widening — see "peer reuse cannot widen role".
 *
 * caller command type -> callee command type
 */
const PEER_REUSE_EDGES = [
  ['plaud_list_intake_items', 'view_coach_intake_queue'],
  ['plaud_analyze_clip_set', 'inspect_coach_audio_pieces'],
  ['plaud_propose_clip_order', 'inspect_coach_audio_pieces'],
  ['plaud_group_session_candidates', 'inspect_coach_audio_pieces'],
  ['plaud_merge_candidate_group', 'inspect_coach_audio_pieces'],
  ['plaud_request_confirmation', 'inspect_coach_audio_pieces'],
];

/** Modules allowed to import a registered handler, beyond commandDispatcher.mjs itself. */
const PEER_REUSE_IMPORTERS = new Set([
  'services/ai/dispatchers/plaudStructuredActionDispatchers.mjs',
]);


/**
 * Tests that walk the whole backend tree get an explicit budget. Measured 338ms in
 * isolation and 5642ms under full-suite parallel load — the 5000ms default sits inside
 * that spread, so these would flake intermittently on a busy machine while looking like
 * a real regression. The prior handoff logged the same class: whole-tree scans timing out
 * on a different file each run, all passing in isolation.
 */
const TREE_WALK_TIMEOUT_MS = 30000;

// ── fixtures ─────────────────────────────────────────────────────────────────
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
  hasDispatcherMock.mockReset();
  hasDispatcherMock.mockReturnValue(true);
  startDebateMock.mockReset();
  startDebateMock.mockReturnValue('debate_job_probe');
  buildDebateClientContextMock.mockReset();
  buildDebateClientContextMock.mockResolvedValue({ deIdentified: { alias: 'Client-42' } });
  resolveClientMock.mockReset();
  resolveClientMock.mockResolvedValue({
    resolved: { id: 42, firstName: 'Ava', lastName: 'Strong' },
    suggestions: [],
    error: null,
  });
});

function allCommands() {
  initializeRegistry();
  const all = getAllCommands();
  return Array.isArray(all) ? all : Object.values(all);
}

/** Every (command, role) pair where the role is NOT permitted by the registry. */
function belowRolePairs() {
  const pairs = [];
  for (const command of allCommands()) {
    const required = Array.isArray(command.roleRequired) ? command.roleRequired : [];
    for (const role of callerRoles()) {
      if (!required.includes(role)) pairs.push({ command, role });
    }
  }
  return pairs;
}

async function runBelowRole(command, role) {
  const fixture = buildValidParams(command.inputSchema);
  classifyMock.mockResolvedValue({
    intent: command.type,
    clientRef: null,
    params: fixture.params,
    confidence: 0.95,
  });
  dispatchMock.mockClear();
  const ctx = await executeCommandPipeline('authorization probe', {
    id: 9001,
    role,
    firstName: 'Probe',
    lastName: 'Actor',
  }, {});
  return { ctx, dispatchCalls: dispatchMock.mock.calls.length, schemaConverged: fixture.ok };
}

// ── the contract ─────────────────────────────────────────────────────────────
describe('Swan Coach dispatcher authorization', () => {
  describe('the probe itself', () => {
    it('reaches a dispatcher when the caller IS permitted — the positive control', async () => {
      // Without this, every denial assertion below could pass because the harness is
      // broken rather than because authorization works.
      const readable = allCommands().find(
        (c) => c.roleRequired?.includes('admin')
          && !c.destructive
          && !c.requiresConfirmation
          && !c.isDebateRequired
          && buildValidParams(c.inputSchema).ok,
      );
      expect(readable, 'no permitted command available to run the control').toBeTruthy();

      const { ctx, dispatchCalls } = await runBelowRole(readable, 'admin');
      expect(
        dispatchCalls,
        `control failed on ${readable.type}: a PERMITTED admin never reached dispatch (stopped at ${ctx.stage}: ${ctx.error})`,
      ).toBe(1);
    });

    it('produces below-role pairs to test', () => {
      const pairs = belowRolePairs();
      expect(pairs.length).toBeGreaterThan(100);
    });

    it('reads every caller role, including the default one', () => {
      // Instrument validation. The first run of this suite imported the registry's
      // USER_ROLES, which omitted 'user' — the model's DEFAULT role — and silently
      // skipped that whole dimension while reporting full coverage. A role the model
      // allows but this list misses is an untested role, so assert the floor directly.
      const roles = callerRoles();
      for (const required of ['admin', 'trainer', 'client', 'user']) {
        expect(roles, `caller roles no longer include ${required}`).toContain(required);
      }
      // And no command may require a role this suite cannot generate a caller for.
      const ungeneratable = [];
      for (const command of allCommands()) {
        for (const role of command.roleRequired || []) {
          if (!roles.includes(role)) ungeneratable.push(`${command.type}: ${role}`);
        }
      }
      expect(ungeneratable, `commands gate on roles this suite never tests: ${ungeneratable.join(', ')}`).toEqual([]);
    });
  });

  describe('exhaustive denial', () => {
    it('never reaches a dispatcher for any below-role caller', async () => {
      const breaches = [];
      for (const { command, role } of belowRolePairs()) {
        const { ctx, dispatchCalls } = await runBelowRole(command, role);
        if (dispatchCalls > 0) breaches.push(`${command.type}/${role} (stage ${ctx.stage})`);
        if (ctx.result) breaches.push(`${command.type}/${role} produced a result`);
      }
      expect(breaches, `below-role callers reached execution: ${breaches.join(', ')}`).toEqual([]);
    }, 180000);

    it('denies at the role gate, not incidentally at an earlier step', async () => {
      // The assertion that carries the weight: stopping at `validate` proves nothing
      // about authorization, so every pair must be stopped by the role step itself.
      const notAtGate = [];
      for (const { command, role } of belowRolePairs()) {
        const key = `${command.type}/${role}`;
        if (SCHEMA_UNSYNTHESIZABLE_COMMANDS.has(command.type)) continue;
        const { ctx } = await runBelowRole(command, role);
        if (ctx.stage !== 'rbac') notAtGate.push(`${key} @${ctx.stage}`);
      }
      expect(
        notAtGate,
        `denied somewhere other than the role gate (add a pin with a reason, or fix): ${notAtGate.join(', ')}`,
      ).toEqual([]);
    }, 180000);

    it('names the required roles in the denial message', async () => {
      const silent = [];
      for (const { command, role } of belowRolePairs()) {
        const key = `${command.type}/${role}`;
        if (SCHEMA_UNSYNTHESIZABLE_COMMANDS.has(command.type)) continue;
        const { ctx } = await runBelowRole(command, role);
        const message = String(ctx.error || '');
        const namesEveryRole = command.roleRequired.every((r) => message.includes(r));
        if (!message || !namesEveryRole) silent.push(key);
      }
      expect(silent, `denial did not name the required roles: ${silent.join(', ')}`).toEqual([]);
    }, 180000);

    it('has no stale pins — every pinned command still resists schema synthesis', () => {
      const commands = new Map(allCommands().map((c) => [c.type, c]));
      const stale = [];
      for (const type of SCHEMA_UNSYNTHESIZABLE_COMMANDS.keys()) {
        const command = commands.get(type);
        if (!command) { stale.push(`${type}: no longer registered`); continue; }
        if (buildValidParams(command.inputSchema).ok) {
          stale.push(`${type}: params now synthesize — remove the pin so it is asserted at the gate`);
        }
      }
      expect(stale, `pins have drifted: ${stale.join(', ')}`).toEqual([]);
    });
  });

  describe('the registry values the gate depends on', () => {
    it('gives every command a non-empty roleRequired of known roles', () => {
      const roles = callerRoles();
      const bad = [];
      for (const command of allCommands()) {
        if (!Array.isArray(command.roleRequired) || command.roleRequired.length === 0) {
          bad.push(`${command.type}: missing or empty roleRequired`);
          continue;
        }
        for (const role of command.roleRequired) {
          if (!roles.includes(role)) bad.push(`${command.type}: unknown role ${role}`);
        }
      }
      expect(bad, bad.join(', ')).toEqual([]);
    });

    it('checks role before it executes anything', () => {
      // Structural, so a pipeline reorder fails here rather than silently in production.
      const code = stripComments(fs.readFileSync(EXECUTOR_FILE, 'utf8'));
      const order = sliceBetween(code, 'const PIPELINE_STEPS = [', '];', {
        label: 'PIPELINE_STEPS',
      });
      const roleStep = order.indexOf('stepRBAC');
      const executeStep = order.indexOf('stepExecute');
      expect(roleStep, 'the role step is absent from the pipeline').toBeGreaterThan(-1);
      expect(executeStep, 'the execute step is absent from the pipeline').toBeGreaterThan(-1);
      expect(roleStep).toBeLessThan(executeStep);
    });
  });

  describe('single door', () => {
    it('wires every registered command type to a handler', () => {
      const entries = readDispatcherMap();
      expect(entries.length).toBeGreaterThan(100);
      const types = new Set(allCommands().map((c) => c.type));
      const orphans = entries.filter((e) => !types.has(e.type)).map((e) => e.type);
      expect(orphans, `dispatcher map references unregistered commands: ${orphans.join(', ')}`).toEqual([]);
    });

    it('lets nothing outside the pipeline import a registered handler', () => {
      // If a route or service imported a handler directly it would call it without the
      // role gate — the pipeline's authorization would be advisory rather than binding.
      const handlers = new Set(readDispatcherMap().map((e) => e.handler));
      const importedByDispatcher = new Set();
      const foreign = [];

      for (const file of walkBackendSources()) {
        const relPath = rel(file);
        const names = namedImportsOf(stripComments(fs.readFileSync(file, 'utf8')));
        for (const name of names) {
          if (!handlers.has(name)) continue;
          if (relPath === DISPATCHER_REL) { importedByDispatcher.add(name); continue; }
          if (PEER_REUSE_IMPORTERS.has(relPath)) continue;
          foreign.push(`${name} imported by ${relPath}`);
        }
      }

      // Positive control: the scanner must see the imports it is certain exist. Without
      // this, a broken scanner reports zero foreign importers and reads as a clean result.
      expect(
        importedByDispatcher.size,
        'scanner failed to see commandDispatcher.mjs importing its own handlers',
      ).toBe(handlers.size);

      expect(foreign, `handlers reachable outside the pipeline: ${foreign.join(', ')}`).toEqual([]);
    }, TREE_WALK_TIMEOUT_MS);

    it('is not routed around by an import form the named-specifier scan cannot see', () => {
      // The scan above reads named specifiers only. A namespace import, a dynamic
      // import, a CJS require, or a re-export would each reach a handler while leaving
      // that scan clean — a false absence in the safe-looking direction. None exist
      // today; this keeps it that way rather than trusting that it stays true.
      const alternatives = [
        [/import\s+\*\s+as\s+[A-Za-z0-9_$]+\s+from\s*['"]([^'"]+)['"]/g, 'namespace import'],
        [/import\s*\(\s*['"]([^'"]+)['"]/g, 'dynamic import'],
        [/require\s*\(\s*['"]([^'"]+)['"]/g, 'require'],
        [/export\s*(?:\*|\{[^}]*\})\s*from\s*['"]([^'"]+)['"]/g, 're-export'],
      ];
      const reachesDispatchers = (spec) => spec.includes('dispatchers/') || spec.includes('commandDispatcher');
      const found = [];
      for (const file of walkBackendSources()) {
        const relPath = rel(file);
        if (relPath === DISPATCHER_REL || PEER_REUSE_IMPORTERS.has(relPath)) continue;
        const code = stripComments(fs.readFileSync(file, 'utf8'));
        for (const [pattern, label] of alternatives) {
          for (const match of code.matchAll(pattern)) {
            const spec = match[1] ?? match[2];
            if (spec && reachesDispatchers(spec)) found.push(`${label} of ${spec} in ${relPath}`);
          }
        }
      }
      expect(found, `alternative reachability into the dispatcher layer: ${found.join(', ')}`).toEqual([]);
    }, TREE_WALK_TIMEOUT_MS);
  });


  describe('peer reuse cannot widen role', () => {
    it('keeps every caller role within its callee permission set', () => {
      const commands = new Map(allCommands().map((c) => [c.type, c]));
      const widened = [];
      for (const [callerType, calleeType] of PEER_REUSE_EDGES) {
        const caller = commands.get(callerType);
        const callee = commands.get(calleeType);
        expect(caller, `${callerType} is not registered`).toBeTruthy();
        expect(callee, `${calleeType} is not registered`).toBeTruthy();
        const extra = caller.roleRequired.filter((r) => !callee.roleRequired.includes(r));
        if (extra.length) {
          widened.push(`${callerType} grants ${extra.join('/')} that ${calleeType} does not`);
        }
      }
      expect(widened, widened.join('; ')).toEqual([]);
    });

    it('pins the peer-reuse edges to the modules that actually create them', () => {
      // A new peer importer must be added deliberately, with its edges declared above.
      const handlers = new Set(readDispatcherMap().map((e) => e.handler));
      const importers = new Set();
      for (const file of walkBackendSources()) {
        const relPath = rel(file);
        if (relPath === DISPATCHER_REL) continue;
        const names = namedImportsOf(stripComments(fs.readFileSync(file, 'utf8')));
        if (names.some((n) => handlers.has(n))) importers.add(relPath);
      }
      expect([...importers].sort()).toEqual([...PEER_REUSE_IMPORTERS].sort());
    }, TREE_WALK_TIMEOUT_MS);
  });
});
