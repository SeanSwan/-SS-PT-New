/**
 * Command Executor — Sandboxed Intent-to-API Pipeline
 * ====================================================
 * The core middleware chain that processes AI commands from raw input to execution.
 *
 * Pipeline: InputSanitizer → PhiScanner → IntentClassifier → ZodValidator →
 *           RbacChecker → ClientResolver → DeIdentifier → ConfirmationGenerator →
 *           Executor → Auditor
 *
 * Each step receives CommandContext and returns CommandContext | CommandError.
 * Pipeline short-circuits on first error.
 *
 * V3: Each middleware is independently testable. No god function.
 */
import logger from '../../utils/logger.mjs';
import { sanitizeInput } from './inputSanitizer.mjs';
import { scanForPHI, stripPHI } from './phiScanner.mjs';
import { classifyIntent } from './intentClassifier.mjs';
import { routeDeterministicSurfaceCommand } from './deterministicSurfaceCommandRouter.mjs';
import { applySurfaceIntentRemap } from './surfaceIntentRemap.mjs';
import { getCommand } from './commandRegistry/index.mjs';
import { createCommandErrorOutcome } from './commandOutcomeContract.mjs';
import { authorizeCommandCapability } from './commandCapabilityPolicy.mjs';
import { resolveClient } from './clientResolver.mjs';
import { rehydrateResponse } from './deIdentifier.mjs';
import {
  prepareDestructiveOperation,
  verifyAndRetrieveOperation,
  preparePendingConfirmation,
  retrievePendingConfirmation,
} from './destructiveOperations.mjs';
import { startDebate } from './debate/debateOrchestrator.mjs';
import { buildDebateClientContext } from './debate/debateClientContextService.mjs';
import { checkErrorLoop, recordAction } from './errorLoopPrevention.mjs';
import { dispatch, hasDispatcher } from './commandDispatcher.mjs';
import { getManualOnlyCommand } from './commandManualOnlyPolicy.mjs';
import { areCommandWritesEnabled, COMMAND_WRITES_PAUSED_MESSAGE } from './commandLaneControls.mjs';
import { recordCommandAudit } from './commandAudit.mjs';

const COMMAND_PIPELINE_FAILED_MESSAGE = 'Swan Coach command lane failed. No data was changed.';
const COMMAND_CONFIRM_FAILED_MESSAGE = 'Swan Coach could not complete that confirmed operation. No data was changed.';
const CLASSIFIER_FAILURE_CODES = new Set(['PARSE_FAIL', 'CLASSIFICATION_FAILED']);

function setTypedPipelineError(ctx, code) {
  const outcome = createCommandErrorOutcome(code);
  ctx.error = outcome.message;
  ctx.result = outcome;
  return ctx;
}

function classifierFailureCode(intent) {
  const code = intent?.params?.code;
  return CLASSIFIER_FAILURE_CODES.has(code) ? code : 'PARSE_FAIL';
}

const DEBATE_TYPE_BY_COMMAND = {
  build_workout_plan: 'workout_plan',
  create_nasm_program: 'workout_plan',
  generate_periodization: 'workout_plan',
  create_nutrition_plan: 'nutrition_plan',
};

// ── Command Context (flows through pipeline) ────────────────────────────────

/**
 * @typedef {Object} CommandContext
 * @property {string} rawInput - Original user input
 * @property {string} sanitizedInput - After input sanitization
 * @property {Object} user - { id, role, firstName, lastName }
 * @property {Object|null} intent - Classified intent { intent, clientRef, params, confidence }
 * @property {Object|null} command - Matched CommandDefinition from registry
 * @property {Object|null} resolvedClient - { id, firstName, lastName, version }
 * @property {Object|null} deIdentified - De-identified client data for AI
 * @property {Object|null} aliasMap - { "Client-61": "Jackie" } for re-hydration
 * @property {Object|null} pendingOperation - For destructive ops awaiting confirmation
 * @property {Object|null} result - Execution result
 * @property {string|null} error - Error message if pipeline failed
 * @property {string} stage - Current pipeline stage
 * @property {Object} metadata - { threats, phiMatches, timing }
 */

/**
 * Create initial command context from user input.
 *
 * @param {string} rawInput
 * @param {Object} user - { id, role, firstName, lastName }
 * @param {Object} [options]
 * @param {string} [options.selectedClientName] - Currently selected client in drawer
 * @param {number} [options.selectedClientId] - Currently selected client ID
 * @param {string} [options.previousContext] - Recent conversation context
 * @param {Object} [options.routeContext] - Safe UI route context tokens
 * @param {Object} [options.sequelize] - Sequelize instance for DB operations
 * @returns {CommandContext}
 */
function createContext(rawInput, user, options = {}) {
  return {
    rawInput,
    sanitizedInput: '',
    user,
    intent: null,
    command: null,
    resolvedClient: null,
    deIdentified: null,
    aliasMap: null,
    pendingOperation: null,
    result: null,
    error: null,
    stage: 'init',
    options,
    metadata: {
      threats: [],
      phiMatches: [],
      timing: { start: Date.now() },
    },
  };
}

const CLIENT_ID_VALIDATION_SENTINEL = 1;

const toPositiveInteger = (value) => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

const debateTypeForCommandType = (commandType) => (
  typeof commandType === 'string' ? DEBATE_TYPE_BY_COMMAND[commandType] || null : null
);

const debateTypeForCommand = (command) => (
  command?.isDebateRequired ? debateTypeForCommandType(command.type) : null
);

function debateStartedMessage({ debateType, jobId, clientName }) {
  const subject = debateType.replace('_', ' ');
  const title = `${subject.charAt(0).toUpperCase()}${subject.slice(1)}`;
  const target = clientName || 'your client';
  return `${title} debate started for ${target}. This takes 1-3 minutes.\n\nTrack progress at: /api/ai/debate/${jobId}/status`;
}
async function startDebateForClient({ commandType, clientId, userId, sequelize, params = {}, resolvedClient = null }) {
  const debateType = debateTypeForCommandType(commandType);
  if (!debateType) return null;

  const parsedClientId = toPositiveInteger(clientId);
  if (!parsedClientId) throw new Error('Debate command requires a confirmed client id');

  const { deIdentified } = await buildDebateClientContext(
    parsedClientId,
    sequelize,
    { id: parsedClientId, ...(resolvedClient || {}) },
  );
  const debateParams = params && typeof params === 'object' && !Array.isArray(params)
    ? { ...params, clientId: parsedClientId }
    : { clientId: parsedClientId };
  const jobId = startDebate(debateType, deIdentified, userId, debateParams);

  return {
    jobId,
    debateType,
    message: debateStartedMessage({
      debateType,
      jobId,
      clientName: resolvedClient?.firstName || null,
    }),
  };
}

const routeScheduledSessionId = (routeContext) => {
  const id = toPositiveInteger(routeContext?.scheduledSessionId);
  return id ? String(id) : null;
};

const routeScheduledSessionDate = (routeContext) => {
  const value = typeof routeContext?.scheduledSessionDate === 'string'
    ? routeContext.scheduledSessionDate.trim()
    : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : value;
};

const routeWorkoutDate = (routeContext) => {
  const value = typeof routeContext?.workoutDate === 'string'
    ? routeContext.workoutDate.trim()
    : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : value;
};

const buildParamsForValidation = (ctx, command) => {
  const params = (
    ctx.intent?.params &&
    typeof ctx.intent.params === 'object' &&
    !Array.isArray(ctx.intent.params)
  )
    ? { ...ctx.intent.params }
    : {};

  if (command.type === 'log_workout') {
    const scheduledSessionId = routeScheduledSessionId(ctx.options.routeContext);
    if (scheduledSessionId && params.scheduledSessionId == null) {
      params.scheduledSessionId = scheduledSessionId;
    }
    const scheduledSessionDate = routeScheduledSessionDate(ctx.options.routeContext);
    if (scheduledSessionDate && params.date == null) {
      params.date = scheduledSessionDate;
    }
    const workoutDate = routeWorkoutDate(ctx.options.routeContext);
    if (workoutDate && params.date == null) {
      params.date = workoutDate;
    }
  }

  let insertedClientId = false;

  if (command.requiresClientRef && params.clientId == null) {
    const selectedClientId = toPositiveInteger(ctx.options.selectedClientId);
    if (selectedClientId) {
      params.clientId = selectedClientId;
    } else {
      params.clientId = CLIENT_ID_VALIDATION_SENTINEL;
      insertedClientId = true;
    }
  }

  return { params, insertedClientId };
};

// ── Pipeline Steps ──────────────────────────────────────────────────────────

/** Step 1: Sanitize input for prompt injection */
async function stepSanitize(ctx) {
  ctx.stage = 'sanitize';
  const { sanitized, threats, blocked } = sanitizeInput(ctx.rawInput);

  ctx.sanitizedInput = sanitized;
  ctx.metadata.threats = threats;

  if (blocked) {
    ctx.error = 'Your message was blocked for security reasons. Please rephrase without system instructions or code.';
    return ctx;
  }
  return ctx;
}

/** Step 2: Scan for PHI in user input */
async function stepPHIScan(ctx) {
  ctx.stage = 'phi_scan';
  const { hasPHI, matches, categories } = scanForPHI(ctx.sanitizedInput);

  ctx.metadata.phiMatches = matches;

  if (hasPHI) {
    // Strip PHI from the message before it reaches AI
    ctx.sanitizedInput = stripPHI(ctx.sanitizedInput, matches);
    logger.info('[CommandExecutor] PHI stripped from input', {
      userId: ctx.user.id,
      categories,
      matchCount: matches.length,
    });
  }

  // H5 (2026-08-21 hostile round 1 — Sol + Grok independently): previousContext is
  // a prompt channel too. The route applies roster IDENTITY replacement to it, but
  // this generic PHI scan ran only on the current message — so an email, phone,
  // payment or medical detail from an earlier turn reached the classifier
  // unscrubbed. Every text channel that reaches a model gets the same scrub.
  const previous = ctx.options?.previousContext;
  if (typeof previous === 'string' && previous.length > 0) {
    const prior = scanForPHI(previous);
    if (prior.hasPHI) {
      ctx.options.previousContext = stripPHI(previous, prior.matches);
      ctx.metadata.previousContextPhiMatches = prior.matches.length;
      logger.info('[CommandExecutor] PHI stripped from previousContext', {
        userId: ctx.user.id,
        categories: prior.categories,
        matchCount: prior.matches.length,
      });
    }
  }
  return ctx;
}

/** Step 3: Classify intent via AI */
async function stepClassify(ctx) {
  ctx.stage = 'classify';
  const deterministicIntent = routeDeterministicSurfaceCommand(
    ctx.sanitizedInput,
    ctx.options.contextEnvelope,
  );
  if (deterministicIntent) {
    ctx.intent = deterministicIntent;
    return ctx;
  }
  ctx.intent = await classifyIntent(ctx.sanitizedInput, ctx.user.role, {
    previousContext: ctx.options.previousContext,
    routeContext: ctx.options.routeContext,
    selectedClientName: ctx.options.selectedClientName,
  });
  // Deterministic guarantee: ambiguous verbs resolve to the command family of
  // the ACTIVE surface (planner dock vs logger), whatever the LLM picked.
  ctx.intent = applySurfaceIntentRemap(ctx.intent, ctx.options.routeContext);
  return ctx;
}

/** Step 4: Match intent to command registry + Zod validate */
async function stepValidate(ctx) {
  ctx.stage = 'validate';

  if (!ctx.intent || typeof ctx.intent.intent !== 'string') {
    return setTypedPipelineError(ctx, 'PARSE_FAIL');
  }

  if (ctx.intent.intent === 'classification_error') {
    const code = classifierFailureCode(ctx.intent);
    return setTypedPipelineError(ctx, code);
  }

  // Chat and clarification intents don't map to commands
  if (ctx.intent.intent === 'chat' || ctx.intent.intent === 'clarification_needed') {
    return ctx; // Pass through to conversational handler
  }

  const command = getCommand(ctx.intent.intent);
  if (!command) {
    logger.warn('[CommandExecutor] Unknown command intent', { intent: ctx.intent.intent });
    return setTypedPipelineError(ctx, 'UNKNOWN_INTENT');
  }

  ctx.command = command;

  // Validate params against command's Zod schema
  if (command.inputSchema) {
    const { params, insertedClientId } = buildParamsForValidation(ctx, command);
    const validation = command.inputSchema.safeParse(params);
    if (!validation.success) {
      const issues = validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
      ctx.error = `I understood your request but need more details: ${issues}`;
      return ctx;
    }
    const validatedParams = validation.data || {};
    if (
      insertedClientId &&
      validatedParams &&
      typeof validatedParams === 'object' &&
      !Array.isArray(validatedParams)
    ) {
      delete validatedParams.clientId;
    }
    ctx.intent.params = validatedParams;
  }

  return ctx;
}

/** Step 4.5: Write kill switch — block write/destructive commands when paused.
 *
 * A command counts as a write when its registry entry declares
 * `destructive: true` OR `requiresConfirmation: true` (per the V1 spec,
 * reads never require confirmation). Read commands keep working.
 * Uses ctx.error so the route returns the standard error envelope the
 * Coach UI already renders (same path as an RBAC denial).
 */
async function stepWriteKillSwitch(ctx) {
  ctx.stage = 'write_kill_switch';
  if (!ctx.command) return ctx;
  if (!ctx.command.destructive && !ctx.command.requiresConfirmation) return ctx;
  if (areCommandWritesEnabled()) return ctx;

  ctx.error = COMMAND_WRITES_PAUSED_MESSAGE;
  return ctx;
}

/** Step 5: RBAC check — does user have permission for this command? */
async function stepRBAC(ctx) {
  ctx.stage = 'rbac';
  if (!ctx.command) return ctx; // Chat mode, no RBAC needed

  if (!ctx.command.roleRequired.includes(ctx.user.role)) {
    ctx.error = `You don't have permission to ${ctx.command.description.toLowerCase()}. This requires ${ctx.command.roleRequired.join(' or ')} role.`;
    return ctx;
  }
  return ctx;
}

/** Step 5.5: Enforce active-surface capability after identity RBAC. */
async function stepCapabilityGate(ctx) {
  ctx.stage = 'capability_gate';
  if (!ctx.command) return ctx;

  const decision = authorizeCommandCapability(
    ctx.command,
    ctx.options.contextEnvelope,
    ctx.user,
  );
  ctx.metadata.capabilityPolicy = decision.policy;
  if (!decision.allowed) {
    return setTypedPipelineError(ctx, 'CAPABILITY_DENIED');
  }
  return ctx;
}

/** Step 6: Resolve client reference if needed */
async function stepResolveClient(ctx) {
  ctx.stage = 'resolve_client';
  if (!ctx.command) return ctx;

  // Self-service commands use the requesting user
  if (ctx.command.selfService) {
    ctx.resolvedClient = {
      id: ctx.user.id,
      firstName: ctx.user.firstName,
      lastName: ctx.user.lastName,
    };
    return ctx;
  }

  if (!ctx.command.requiresClientRef) return ctx;

  const selectedClientId = toPositiveInteger(ctx.options.selectedClientId);
  const paramsClientId = toPositiveInteger(ctx.intent.params?.clientId);

  // H1 (2026-08-21): client/user-role callers are scoped to THEMSELVES, always.
  //
  // Trainer scoping is enforced inside resolveClient via `trainerId`, and the
  // route's envelope check (assertAssignmentOrAdmin) covers `selectedClientId`.
  // Neither covered a client-role caller on the LLM-extracted params path: a
  // client saying "show client #99's XP" reached resolveClient UNSCOPED (trainerId
  // is only set for trainers) and read another user's gamification profile — the
  // command lane mirrored GET /gamification/users/:userId/profile without that
  // route's authorizeResourceAccess guard. Found in the whole-Coach hostile round 1.
  //
  // The guard lives HERE, at the root, so every current and future client-allowed
  // command with requiresClientRef inherits it — not one-off fixes per command.
  // A mismatched reference is refused with an honest message rather than silently
  // rewritten, so a confused client learns the boundary instead of getting the
  // wrong person's data with no error.
  if (ctx.user.role === 'client' || ctx.user.role === 'user') {
    const requested = selectedClientId || paramsClientId;
    if (requested && requested !== ctx.user.id) {
      logger.warn('[CommandExecutor] Client-role caller referenced another user', {
        userId: ctx.user.id,
        requestedClientId: requested,
        commandType: ctx.command.type,
      });
      ctx.error = 'You can only run this for your own account.';
      return ctx;
    }
    if (ctx.intent.clientRef && !requested) {
      // A name-based reference from a client is never resolved against the roster.
      ctx.error = 'You can only run this for your own account.';
      return ctx;
    }
    ctx.resolvedClient = { id: ctx.user.id, firstName: ctx.user.firstName, lastName: ctx.user.lastName };
    if (ctx.intent.params) ctx.intent.params.clientId = ctx.user.id;
    return ctx;
  }

  const clientId = selectedClientId || paramsClientId;
  const clientRef = selectedClientId ? null : (ctx.intent.clientRef || ctx.options.selectedClientName);

  if (clientId) {
    // Direct ID provided — use it
    ctx.resolvedClient = { id: clientId };
    // Still need to resolve for name
  }

  if (!clientRef && !clientId) {
    ctx.error = `Which client? Please specify a client name or select one from the client picker.`;
    return ctx;
  }

  const sequelize = ctx.options.sequelize;
  if (!sequelize) {
    ctx.error = 'Database connection not available. Please try again.';
    return ctx;
  }

  const { resolved, suggestions, error } = await resolveClient(
    clientRef || `#${clientId}`,
    sequelize,
    { trainerId: ctx.user.role === 'trainer' ? ctx.user.id : undefined }
  );

  if (error) {
    ctx.error = error;
    ctx.result = { suggestions };
    return ctx;
  }

  ctx.resolvedClient = resolved;

  // Inject resolved clientId into params
  if (resolved && ctx.intent.params) {
    ctx.intent.params.clientId = resolved.id;
  }

  return ctx;
}

/** Step 7: Route debate-required commands to debate engine */
async function stepDebateRouting(ctx) {
  ctx.stage = 'debate_routing';
  if (!ctx.command || !ctx.command.isDebateRequired) return ctx;
  if (ctx.command.destructive || ctx.command.requiresConfirmation) return ctx;

  const clientId = ctx.resolvedClient?.id;
  if (!clientId) return ctx;

  const debate = await startDebateForClient({
    commandType: ctx.command.type,
    clientId,
    userId: ctx.user.id,
    sequelize: ctx.options.sequelize,
    params: ctx.intent.params || {},
    resolvedClient: ctx.resolvedClient,
  });
  if (!debate) return ctx;

  ctx.result = {
    type: 'debate_started',
    message: debate.message,
    jobId: debate.jobId,
    debateType: debate.debateType,
  };
  ctx.skipRemainingSteps = true;
  return ctx;
}
/** Step 8: Handle destructive operations (prepare confirmation) */
async function stepConfirmation(ctx) {
  ctx.stage = 'confirmation';
  if (!ctx.command) return ctx;
  if (!ctx.command.destructive && !ctx.command.requiresConfirmation) return ctx;

  // Never mint confirmation operations for commands that cannot actually run.
  // Frontend-dispatch commands are the exception: /confirm returns a typed
  // browser event, and the browser performs the explicit UI action.
  const isConfirmedFrontendDispatch = ctx.command.method === 'FRONTEND_DISPATCH' && ctx.command.frontendEvent;
  const isConfirmedDebate = Boolean(debateTypeForCommand(ctx.command));
  if (!hasDispatcher(ctx.command.type) && !isConfirmedFrontendDispatch && !isConfirmedDebate) {
    const manualOnly = getManualOnlyCommand(ctx.command.type);
    ctx.result = {
      type: 'not_wired',
      command: ctx.command.type,
      manualOnly: Boolean(manualOnly),
      reason: manualOnly?.reason || null,
      message: manualOnly
        ? `"${ctx.command.description}" is recognized but requires a manual admin workflow: ${manualOnly.reason}. No data was changed.`
        : `"${ctx.command.description}" is recognized but not yet wired for execution. No data was changed.`,
    };
    ctx.skipRemainingSteps = true;
    return ctx;
  }

  // For destructive ops, prepare HMAC-signed operation
  if (ctx.command.destructive) {
    const pending = await prepareDestructiveOperation({
      type: ctx.command.method === 'DELETE' ? 'DELETE' : 'UPDATE',
      endpoint: ctx.command.endpoint,
      commandParams: ctx.intent.params,
      commandType: ctx.command.type,   // exec-substrate-v9: signed in HMAC payload
      userId: ctx.user.id,
      description: `${ctx.command.description}${ctx.resolvedClient ? ` for ${ctx.resolvedClient.firstName || 'Client #' + ctx.resolvedClient.id}` : ''}`,
      affectedRecords: ctx.resolvedClient ? [{ id: ctx.resolvedClient.id, name: `${ctx.resolvedClient.firstName} ${ctx.resolvedClient.lastName || ''}`.trim() }] : [],
    });

    ctx.pendingOperation = pending;
    ctx.result = {
      type: 'confirmation_required',
      message: `⚠️ **Destructive operation:** ${pending.description}\n\nThis will affect ${pending.affectedCount} record(s). The operation expires in 120 seconds.\n\nSay "confirm" or "cancel" to proceed.`,
      operationId: pending.operationId,
      expiresAt: pending.expiresAt,
      details: pending,
    };
    return ctx;
  }

  // Non-destructive but requires confirmation
  const clientName = ctx.resolvedClient
    ? (ctx.resolvedClient.firstName || `Client #${ctx.resolvedClient.id}`)
    : null;

  const pending = await preparePendingConfirmation({
    commandType: ctx.command.type,
    params: ctx.intent.params,
    clientId: ctx.resolvedClient?.id ?? null,
    userId: ctx.user.id,
    description: `${ctx.command.description}${clientName ? ` for ${clientName}` : ''}`,
    frontendEvent: isConfirmedFrontendDispatch ? ctx.command.frontendEvent : null,
  });

  ctx.result = {
    type: 'confirmation_required',
    message: `I'll ${ctx.command.description.toLowerCase()}${clientName ? ` for ${clientName}` : ''}. Confirm?`,
    operationId: pending.operationId,
    expiresAt: pending.expiresAt,
    command: ctx.command.type,
    params: ctx.intent.params,
    isDestructive: false,
  };
  return ctx;
}

/** Step 9: Execute the command via the registered dispatcher.
 *
 * Only runs when:
 *   - A command was matched (ctx.command is set)
 *   - The command is not FRONTEND_DISPATCH (handled by frontend event bus)
 *   - No prior step already set ctx.result (debate_started / confirmation_required)
 *
 * Commands with no dispatcher entry return an explicit not_wired receipt so
 * command surfaces never report fake execution.
 */
async function stepExecute(ctx) {
  ctx.stage = 'execute';
  if (!ctx.command) return ctx;          // chat / clarification — no command to execute
  if (ctx.result !== null) return ctx;   // debate_started or confirmation_required already set

  const manualOnly = getManualOnlyCommand(ctx.command.type);
  if (manualOnly) {
    ctx.result = {
      type: 'not_wired',
      command: ctx.command.type,
      manualOnly: true,
      reason: manualOnly.reason,
      message: `"${ctx.command.description}" is recognized but requires a manual admin workflow: ${manualOnly.reason}. No data was changed.`,
    };
    return ctx;
  }

  // FRONTEND_DISPATCH commands are handled by the browser event bus, not the server.
  // Returning a not_wired result here is honest — we never execute these server-side.
  if (ctx.command.method === 'FRONTEND_DISPATCH') {
    ctx.result = {
      type: 'not_wired',
      message: `${ctx.command.type.replace(/_/g, ' ')} is handled client-side and does not require server confirmation.`,
    };
    return ctx;
  }

  const result = await dispatch(ctx.command.type, ctx.intent?.params || {}, ctx);
  if (result !== null) {
    ctx.result = result;
  } else {
    // No registered dispatcher — honest not_wired response instead of fake 'executed'
    ctx.result = {
      type: 'not_wired',
      message: `${ctx.command.type.replace(/_/g, ' ')} is not yet wired for execution. No data was changed.`,
    };
  }
  return ctx;
}

// ── Main Pipeline ───────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
  stepSanitize,
  stepPHIScan,
  stepClassify,
  stepValidate,
  stepWriteKillSwitch,
  stepRBAC,
  stepCapabilityGate,
  stepResolveClient,
  stepDebateRouting,
  stepConfirmation,
  stepExecute,
];

/**
 * Execute the full command pipeline.
 * Returns a CommandContext with either a result or error.
 *
 * @param {string} rawInput - User's raw message
 * @param {Object} user - Authenticated user { id, role, firstName, lastName }
 * @param {Object} [options] - { selectedClientName, selectedClientId, previousContext, sequelize }
 * @returns {Promise<CommandContext>}
 */
export async function executeCommandPipeline(rawInput, user, options = {}) {
  const ctx = createContext(rawInput, user, options);
  const conversationId = options.conversationId || null;

  // Error loop prevention — check before running pipeline
  if (conversationId) {
    const loopCheck = checkErrorLoop(conversationId, 'pipeline');
    if (loopCheck.blocked) {
      ctx.error = loopCheck.reason;
      ctx.result = { type: 'error_loop', suggestion: loopCheck.suggestion };
      ctx.stage = 'error_loop_prevention';
      ctx.metadata.timing.end = Date.now();
      ctx.metadata.timing.totalMs = ctx.metadata.timing.end - ctx.metadata.timing.start;
      auditPipelineResult(ctx);
      return ctx;
    }
  }

  for (const step of PIPELINE_STEPS) {
    try {
      await step(ctx);
      if (ctx.error || ctx.skipRemainingSteps) {
        ctx.metadata.timing.end = Date.now();
        ctx.metadata.timing.totalMs = ctx.metadata.timing.end - ctx.metadata.timing.start;
        auditPipelineResult(ctx);
        return ctx;
      }
    } catch (err) {
      ctx.error = COMMAND_PIPELINE_FAILED_MESSAGE;
      ctx.metadata.timing.end = Date.now();
      ctx.metadata.timing.totalMs = ctx.metadata.timing.end - ctx.metadata.timing.start;
      logger.error('[CommandExecutor] Pipeline exception', {
        stage: ctx.stage,
        error: err.message,
        stack: err.stack,
      });
      auditPipelineResult(ctx);
      return ctx;
    }
  }

  ctx.metadata.timing.end = Date.now();
  ctx.metadata.timing.totalMs = ctx.metadata.timing.end - ctx.metadata.timing.start;

  // Audit trail — structured log for every pipeline execution
  auditPipelineResult(ctx);

  return ctx;
}

// ── Audit Logging ──────────────────────────────────────────────────────────

/**
 * Log structured audit trail for every command pipeline execution.
 * Uses existing logger (feeds into production log aggregation).
 */
function auditPipelineResult(ctx) {
  // Record for error loop prevention
  const conversationId = ctx.options?.conversationId;
  if (conversationId) {
    recordAction(conversationId, ctx.stage || 'pipeline', ctx.error || null);
  }

  const audit = {
    userId: ctx.user?.id,
    role: ctx.user?.role,
    intent: ctx.intent?.intent || 'unknown',
    command: ctx.command?.type || null,
    confidence: ctx.intent?.confidence || null,
    stage: ctx.stage,
    success: !ctx.error,
    error: ctx.error || null,
    resultType: ctx.result?.type || null,
    clientId: ctx.resolvedClient?.id || null,
    routeSource: ctx.options?.routeContext?.source || null,
    routeIntent: ctx.options?.routeContext?.intent || null,
    routeSurface: ctx.options?.routeContext?.surface || null,
    threats: ctx.metadata.threats.length,
    phiStripped: ctx.metadata.phiMatches.length,
    totalMs: ctx.metadata.timing.totalMs,
    destructive: ctx.command?.destructive || false,
  };

  if (ctx.error) {
    logger.warn('[CommandAudit] Pipeline failed', audit);
  } else if (ctx.command?.destructive) {
    logger.info('[CommandAudit] Destructive operation', audit);
  } else {
    logger.info('[CommandAudit] Pipeline complete', audit);
  }

  // DB audit row — only when an actual command was involved (pure chat is
  // logger-only). Best-effort by design: recordCommandAudit never throws.
  if (ctx.command) {
    const outcome = outcomeFromPipelineCtx(ctx);
    recordCommandAudit({
      userId: ctx.user?.id,
      userRole: ctx.user?.role,
      commandType: ctx.command.type,
      targetClientId: ctx.resolvedClient?.id ?? null,
      destructive: ctx.command.destructive || false,
      requiresConfirmation: ctx.command.requiresConfirmation || false,
      confirmationState: outcome === 'confirmation_required' ? 'pending' : 'none',
      operationId: ctx.result?.operationId || ctx.pendingOperation?.operationId || null,
      outcome,
      errorCode: ctx.error ? ctx.stage : null,
      params: ctx.intent?.params || null,
      durationMs: ctx.metadata?.timing?.totalMs ?? null,
    });
  }
}

/** Map a finished pipeline context to an audit outcome string. */
function outcomeFromPipelineCtx(ctx) {
  if (ctx.error) {
    if (ctx.stage === 'rbac') return 'denied';
    if (ctx.stage === 'write_kill_switch') return 'blocked_killswitch';
    return 'failed';
  }
  const resultType = ctx.result?.type;
  if (resultType === 'confirmation_required') return 'confirmation_required';
  if (resultType === 'not_wired') return 'not_wired';
  if (resultType === 'debate_started') return 'debate_started';
  return 'success';
}

/**
 * Execute a confirmed operation (after user hits Confirm).
 *
 * Handles two kinds:
 *   1. Non-destructive pending confirmation (kind: 'pending_confirmed')
 *      — minted by stepConfirmation for requiresConfirmation: true, destructive: false commands
 *      — dispatches to the registered service function or returns a confirmed browser event
 *
 *   2. Destructive HMAC-signed operation (no kind field)
 *      — minted by prepareDestructiveOperation for destructive: true commands
 *      — verifies HMAC, dispatches to service function if a dispatcher entry exists
 *      — if no dispatcher entry, returns explicit 'not_wired' (honest, not routing metadata)
 *
 * @param {string} operationId - Pending operation ID
 * @param {Object} user - Authenticated user { id, role, firstName, lastName }
 * @param {Object} sequelize - Sequelize instance
 * @returns {Promise<{
 *   success: boolean,
 *   type: 'executed' | 'error' | 'not_wired' | 'frontend_dispatch',
 *   command?: string,
 *   result?: Object|null,
 *   client?: Object|null,
 *   message: string,
 * }>}
 */
export async function executeConfirmedOperation(operationId, user, sequelize) {
  // Audit helper for the confirm lane — best-effort, never throws.
  const auditConfirm = (outcome, extras = {}) => {
    recordCommandAudit({
      userId: user?.id,
      userRole: user?.role,
      confirmationState: 'confirmed',
      operationId,
      outcome,
      ...extras,
    });
  };

  // Write kill switch covers the confirm lane too: a pending operation minted
  // before the switch flipped must NOT execute after.
  if (!areCommandWritesEnabled()) {
    auditConfirm('blocked_killswitch');
    return { success: false, type: 'error', message: COMMAND_WRITES_PAUSED_MESSAGE };
  }

  // ── Path 1: Non-destructive pending confirmation ─────────────────────────
  const ndResult = await retrievePendingConfirmation(operationId, user.id);
  if (ndResult.verified) {
    const { operation } = ndResult;
    if (operation.frontendEvent) {
      auditConfirm('success', {
        commandType: operation.commandType,
        targetClientId: operation.clientId ?? null,
        requiresConfirmation: true,
        params: operation.params || null,
      });
      return {
        success: true,
        type: 'frontend_dispatch',
        command: operation.commandType,
        event: operation.frontendEvent,
        payload: operation.params || {},
        result: null,
        client: operation.clientId ? { id: operation.clientId } : null,
        message: `${operation.description} confirmed. Sent to the workout logger.`,
      };
    }

    const debateType = debateTypeForCommandType(operation.commandType);
    if (debateType) {
      try {
        const debate = await startDebateForClient({
          commandType: operation.commandType,
          clientId: operation.clientId ?? operation.params?.clientId,
          userId: user.id,
          sequelize,
          params: operation.params || {},
        });
        auditConfirm('debate_started', {
          commandType: operation.commandType,
          targetClientId: operation.clientId ?? null,
          requiresConfirmation: true,
          params: operation.params || null,
        });
        return {
          success: true,
          type: 'debate_started',
          command: operation.commandType,
          result: { jobId: debate.jobId, debateType: debate.debateType },
          client: operation.clientId ? { id: operation.clientId } : null,
          message: debate.message,
        };
      } catch (err) {
        logger.error('[CommandExecutor] Confirmed debate start failed', {
          commandType: operation.commandType,
          operationId,
          error: err.message,
        });
        auditConfirm('failed', {
          commandType: operation.commandType,
          targetClientId: operation.clientId ?? null,
          requiresConfirmation: true,
          errorCode: 'confirm_debate_failed',
        });
        return {
          success: false,
          type: 'error',
          message: COMMAND_CONFIRM_FAILED_MESSAGE,
        };
      }
    }
    if (!hasDispatcher(operation.commandType)) {
      logger.warn('[CommandExecutor] Confirmed pending op has no dispatcher entry', {
        commandType: operation.commandType,
        operationId,
      });
      auditConfirm('not_wired', {
        commandType: operation.commandType,
        targetClientId: operation.clientId ?? null,
        requiresConfirmation: true,
      });
      return {
        success: false,
        type: 'not_wired',
        command: operation.commandType,
        client: operation.clientId ? { id: operation.clientId } : null,
        message: `${operation.commandType.replace(/_/g, ' ')} is no longer wired for execution. No data was changed.`,
      };
    }

    try {
      const result = await dispatch(operation.commandType, operation.params, {
        user,
        options: { sequelize },
        resolvedClient: operation.clientId ? { id: operation.clientId } : null,
      });
      logger.info('[CommandExecutor] Non-destructive confirmed op executed', {
        commandType: operation.commandType,
        userId: user.id,
        clientId: operation.clientId,
      });
      auditConfirm('success', {
        commandType: operation.commandType,
        targetClientId: operation.clientId ?? null,
        requiresConfirmation: true,
        params: operation.params || null,
      });
      return {
        success: true,
        type: 'executed',
        command: operation.commandType,
        result,
        client: operation.clientId ? { id: operation.clientId } : null,
        message: `${operation.description} completed.`,
      };
    } catch (err) {
      logger.error('[CommandExecutor] Non-destructive confirm execution failed', {
        commandType: operation.commandType,
        operationId,
        error: err.message,
      });
      auditConfirm('failed', {
        commandType: operation.commandType,
        targetClientId: operation.clientId ?? null,
        requiresConfirmation: true,
        errorCode: 'confirm_dispatch_failed',
      });
      return {
        success: false,
        type: 'error',
        message: COMMAND_CONFIRM_FAILED_MESSAGE,
      };
    }
  }

  // ── Path 2: Destructive HMAC-signed operation ─────────────────────────────
  const { verified, operation, error } = await verifyAndRetrieveOperation(operationId, user.id);

  if (!verified) {
    auditConfirm('failed', { errorCode: 'verification_failed', destructive: true });
    return { success: false, type: 'error', message: error };
  }

  // Attempt to dispatch if a handler exists.
  // Destructive ops store operation.type = 'DELETE'|'UPDATE'; operation.commandType
  // stores the command-lane dispatcher key signed into the pending operation.
  const commandType = operation.commandType || null;
  if (commandType && hasDispatcher(commandType)) {
    const clientId = operation.params?.clientId ?? null;
    try {
      const result = await dispatch(commandType, operation.params, {
        user,
        options: { sequelize },
        resolvedClient: clientId ? { id: clientId } : null,
      });
      auditConfirm('success', {
        commandType,
        targetClientId: clientId,
        destructive: true,
        requiresConfirmation: true,
        params: operation.params || null,
      });
      return {
        success: true,
        type: 'executed',
        command: commandType,
        result,
        client: clientId ? { id: clientId } : null,
        message: `Operation confirmed: ${operation.description}`,
      };
    } catch (err) {
      logger.error('[CommandExecutor] Destructive confirm dispatch failed', {
        commandType,
        operationId,
        error: err.message,
      });
      auditConfirm('failed', {
        commandType,
        targetClientId: clientId,
        destructive: true,
        requiresConfirmation: true,
        errorCode: 'confirm_dispatch_failed',
      });
      return {
        success: false,
        type: 'error',
        message: COMMAND_CONFIRM_FAILED_MESSAGE,
      };
    }
  }

  // No dispatcher entry for this destructive op yet — return honest not_wired
  // rather than silently returning routing metadata as if the op executed.
  logger.warn('[CommandExecutor] Destructive op confirmed but no dispatcher entry', {
    operationId,
    commandType,
    operationType: operation.type,
  });
  auditConfirm('not_wired', {
    commandType,
    destructive: true,
    requiresConfirmation: true,
  });
  return {
    success: false,
    type: 'not_wired',
    message: 'This operation was verified but execution is not yet wired. No data was changed.',
  };
}

/**
 * Check if a message is a confirmation/cancellation response.
 *
 * @param {string} message
 * @returns {{ isConfirmation: boolean, isCancellation: boolean }}
 */
export function checkForConfirmation(message) {
  const lower = (message || '').toLowerCase().trim();
  return {
    isConfirmation: /^(yes|confirm|do it|go ahead|proceed|ok|sure|yeah|yep|y)$/i.test(lower),
    isCancellation: /^(no|cancel|nevermind|stop|nope|n|abort)$/i.test(lower),
  };
}

export { rehydrateResponse };
