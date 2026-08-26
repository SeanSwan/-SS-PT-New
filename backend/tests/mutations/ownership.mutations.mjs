/**
 * ownership.mutations.mjs
 * =======================
 * The 29 mutations that prove the Swan Coach ownership contracts can fail.
 *
 * Run: node scripts/mutation-harness.mjs backend/tests/mutations/ownership.mutations.mjs
 *
 * WHY THESE ARE COMMITTED
 * -----------------------
 * A previous session ran twenty mutations, reported them, and left nothing behind — so the
 * next agent had no way to know which assertions were load-bearing without redoing the work.
 * Committed, they are a claim the next person can re-run in one command: every assertion in
 * the four ownership contracts fails when the thing it guards is broken.
 *
 * Three of these were written because a mutation SURVIVED and exposed an assertion that
 * could not fail: M18 (denial made distinguishable from absence), M21 (the third "no" answer
 * drifting from the other two), M26 (the access lookup failing OPEN, which twelve passing
 * tests agreed with). Keeping them is how those stay closed.
 *
 * Anchors are single lines deliberately — see the harness header for the CRLF rule that cost
 * nine occurrences across five sessions to state precisely.
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export default {
  // backend/, resolved from this file rather than from the caller's working directory.
  cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'),
  suites: [
    'tests/api/aiCommandDispatcherOwnership.contract.test.mjs',
    'tests/api/aiCommandTrainerScopeOwnership.contract.test.mjs',
    'tests/api/aiCommandPlanArchiveOwnership.contract.test.mjs',
    'tests/api/aiCommandConfirmLaneReauthorization.contract.test.mjs',
  ],
  mutations: [
    {
      "id": "M31 confirm lane: read the target from params again, as it did before the panel",
      "file": "services/ai/commandExecutor.mjs",
      "find": "\n  const clientId = operation.clientId ?? null;",
      "replace": "\n  const clientId = operation.params?.clientId ?? null;"
    },
    {
      "id": "M32 confirm lane: stop refusing when operation and params name different clients",
      "file": "services/ai/commandExecutor.mjs",
      "find": "    return 'target_mismatch';",
      "replace": "    return null;"
    },
    {
      "id": "M33 confirm lane: let a malformed stored operation through unchecked",
      "file": "services/ai/commandExecutor.mjs",
      "find": "  if (!commandType) return 'malformed_operation';",
      "replace": "  if (!commandType) return null;"
    },
        {
      "id": "M34 fake ignores isActive AND the resolver drops its own deactivated guard",
      "parts": [
        {
          "file": "tests/helpers/fakeClientDirectory.mjs",
          "find": "    const filtersActive = sql.includes('\"isActive\" = true');",
          "replace": "    const filtersActive = false;"
        },
        {
          "file": "services/ai/clientResolver.mjs",
          "find": "        if (!rows.isActive) {",
          "replace": "        if (false) {"
        }
      ]
    },
    {
      "id": "M35 fixture: break a pinned command's hand-written params",
      "file": "tests/helpers/ownershipFixture.mjs",
      "find": "  ['update_goal_progress', { goalId: '7', currentValue: 5 }],",
      "replace": "  ['update_goal_progress', { goalId: '7' }],"
    },
    {
      "id": "M1 executor: delete the non-privileged self-scope block entirely",
      "file": "services/ai/commandExecutor.mjs",
      "find": "  if (!RESOLVER_SCOPED_ROLES.has(ctx.user.role)) {",
      "replace": "  if (false && !RESOLVER_SCOPED_ROLES.has(ctx.user.role)) {"
    },
    {
      "id": "M2 executor: treat client as a resolver-scoped role",
      "file": "services/ai/commandExecutor.mjs",
      "find": "const RESOLVER_SCOPED_ROLES = new Set(['admin', 'trainer']);",
      "replace": "const RESOLVER_SCOPED_ROLES = new Set(['admin', 'trainer', 'client', 'user']);"
    },
    {
      "id": "M3 executor: silently retarget instead of refusing a foreign id",
      "file": "services/ai/commandExecutor.mjs",
      "find": "    if (clientId && clientId !== selfId) {",
      "replace": "    if (false && clientId !== toPositiveInteger(ctx.user.id)) {"
    },
    {
      "id": "M4 executor: refuse every non-privileged caller, even for their own record",
      "file": "services/ai/commandExecutor.mjs",
      "find": "    if (clientId && clientId !== selfId) {",
      "replace": "    if (true) {"
    },
    {
      "id": "M5 executor: never derive a trainer scope",
      "file": "services/ai/commandExecutor.mjs",
      "find": "    { trainerId: ctx.user.role === 'trainer' ? ctx.user.id : undefined }",
      "replace": "    { trainerId: undefined }"
    },
    {
      "id": "M6 resolver: drop the assignment scope from the direct-id branch",
      "file": "services/ai/clientResolver.mjs",
      "find": "      if (hasTrainerScope) {",
      "replace": "      if (false) {"
    },
    {
      "id": "M7 resolver: drop the assignment scope from the fuzzy list branch",
      "file": "services/ai/clientResolver.mjs",
      "find": "\n    if (hasTrainerScope) {",
      "replace": "\n    if (false) {"
    },
    {
      "id": "M8 fake: stop honouring the assignment scope the SQL carries",
      "file": "tests/helpers/fakeClientDirectory.mjs",
      "find": "    const scopedByAssignment = sql.includes('client_trainer_assignments');",
      "replace": "    const scopedByAssignment = false;"
    },
    {
      "id": "M9 shape reader: stop unwrapping wrapped schemas",
      "file": "tests/helpers/schemaShape.mjs",
      "find": "  if (schema.shape) return schema;",
      "replace": "  if (true) return schema.shape ? schema : null;"
    },
    {
      "id": "M10 fixture: deactivate the client the positive control depends on",
      "file": "tests/helpers/ownershipFixture.mjs",
      "find": "    { id: OWN_CLIENT, firstName: 'Ada', lastName: 'Own' },",
      "replace": "    { id: OWN_CLIENT, firstName: 'Ada', lastName: 'Own', isActive: false },"
    },
    {
      "id": "M11 resolveTrainerId: stop refusing a peer id",
      "file": "services/ai/dispatchers/availabilityDispatchers.mjs",
      "find": "  if (isTrainer && trainerId !== Number(user.id)) {",
      "replace": "  if (false && trainerId !== Number(user.id)) {"
    },
    {
      "id": "M12 resolveTrainerId: default a trainer to the wrong id",
      "file": "services/ai/dispatchers/availabilityDispatchers.mjs",
      "find": "      return user.id;  // trainer self-query: default to own ID",
      "replace": "      return 0;  // trainer self-query: default to own ID"
    },
    {
      "id": "M13 schedule_session: honour the caller-supplied trainer id",
      "file": "services/ai/dispatchers/scheduleWriteDispatchers.mjs",
      "find": "    ? ctx.user.id",
      "replace": "    ? await resolveTrainer(params.trainerId)"
    },
    {
      "id": "M14 set_availability: act on the caller-supplied trainer id unchecked",
      "file": "services/ai/dispatchers/setAvailabilityDispatcher.mjs",
      "find": "  const trainerId = resolveTrainerId(params.trainerId ?? null, ctx.user);",
      "replace": "  const trainerId = Number(params.trainerId);"
    },
    {
      "id": "M15 M14 + handlerBody always slices to EOF (does the window matter?)",
      "parts": [
        {
          "file": "services/ai/dispatchers/setAvailabilityDispatcher.mjs",
          "find": "  const trainerId = resolveTrainerId(params.trainerId ?? null, ctx.user);",
          "replace": "  const trainerId = Number(params.trainerId);"
        },
        {
          "file": "tests/helpers/ownershipFixture.mjs",
          "find": "      hasNextExport ? '\\nexport ' : undefined,",
          "replace": "      undefined,"
        }
      ]
    },
    {
      "id": "M16 plan archive: skip the access check entirely",
      "file": "services/ai/dispatchers/workoutPlanCommandDispatchers.mjs",
      "find": "  if (!permitted) return planNotAvailable(planId);",
      "replace": "  if (false) return planNotAvailable(planId);"
    },
    {
      "id": "M17 plan archive: check access against the wrong id (the plan is not the client)",
      "file": "services/ai/dispatchers/workoutPlanCommandDispatchers.mjs",
      "find": "assertAssignmentOrAdmin(ctx.user?.id, ctx.user?.role, plan.userId)",
      "replace": "assertAssignmentOrAdmin(ctx.user?.id, ctx.user?.role, ctx.user?.id)"
    },
    {
      "id": "M18 plan archive: distinguish denial from absence",
      "file": "services/ai/dispatchers/workoutPlanCommandDispatchers.mjs",
      "find": "  if (!permitted) return planNotAvailable(planId);",
      "replace": "  if (!permitted) return { ...planNotAvailable(planId), denied: true };"
    },
    {
      "id": "M19 assertAssignmentOrAdmin: fail OPEN when the lookup throws",
      "file": "middleware/verifyClientAccess.mjs",
      "find": "    logger.warn('[verifyClientAccess] ClientTrainerAssignment check failed - denying access', {",
      "replace": "    if (err) return true;\n    logger.warn('[verifyClientAccess] ClientTrainerAssignment check failed - denying access', {"
    },
    {
      "id": "M20 assertAssignmentOrAdmin: treat an unknown role as permitted",
      "file": "middleware/verifyClientAccess.mjs",
      "find": "  if (userRole !== 'trainer') return false;",
      "replace": "  if (userRole !== 'trainer') return true;"
    },
    {
      "id": "M21 plan archive: let the service-not-found answer drift from the other two",
      "file": "services/ai/dispatchers/workoutPlanCommandDispatchers.mjs",
      "find": "    return planNotAvailable(planId);",
      "replace": "    return { ...planNotAvailable(planId), viaService: true };"
    },
    {
      "id": "M22 confirm lane: ignore the re-authorization verdict (non-destructive)",
      "file": "services/ai/commandExecutor.mjs",
      "find": "    if (ndDenial) {",
      "replace": "    if (false && ndDenial) {"
    },
    {
      "id": "M23 confirm lane: ignore the re-authorization verdict (destructive)",
      "file": "services/ai/commandExecutor.mjs",
      "find": "    if (denial) {",
      "replace": "    if (false && denial) {"
    },
    {
      "id": "M24 confirm lane: skip the client-relationship check",
      "file": "services/ai/commandExecutor.mjs",
      "find": "  if (clientId != null) {",
      "replace": "  if (false) {"
    },
    {
      "id": "M25 confirm lane: check the CALLER instead of the operation client",
      "file": "services/ai/commandExecutor.mjs",
      "find": "      const permitted = await assertAssignmentOrAdmin(user.id, user.role, clientId);",
      "replace": "      const permitted = await assertAssignmentOrAdmin(user.id, user.role, user.id);"
    },
    {
      "id": "M26 confirm lane: fail OPEN when the access lookup throws",
      "file": "services/ai/commandExecutor.mjs",
      "find": "      return 'client_access_check_failed';",
      "replace": "      return null;"
    },
    {
      "id": "M27 confirm lane: allow a command the registry cannot vouch for",
      "file": "services/ai/commandExecutor.mjs",
      "find": "    return hasDispatcher(commandType) ? 'unregistered_command' : null;",
      "replace": "      return null;"
    },
    {
      "id": "M28 confirm lane: move a dispatch ahead of its gate",
      "file": "services/ai/commandExecutor.mjs",
      "find": "    const denial = await confirmLaneDenialReason(operation, user);",
      "replace": "    const denial = null; await confirmLaneDenialReason(operation, user);"
    },
    {
      "id": "M30 confirm lane: collapse a lookup FAILURE into a revocation in the audit trail",
    "file": "services/ai/commandExecutor.mjs",
    "find": "      return 'client_access_check_failed';",
    "replace": "      return 'client_access_revoked';"
  },
  {
    "id": "M29 confirm lane: add an ungated dispatch call site",
      "file": "services/ai/commandExecutor.mjs",
      "find": "  const ndResult = retrievePendingConfirmation(operationId, user.id);",
      "replace": "  if (globalThis.__never) { await dispatch('x', {}, {}); }\n  const ndResult = retrievePendingConfirmation(operationId, user.id);"
    }
  ],
};
