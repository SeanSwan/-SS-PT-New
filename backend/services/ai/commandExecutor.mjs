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
import { getCommand } from './commandRegistry/index.mjs';
import { resolveClient } from './clientResolver.mjs';
import { deIdentifyClient, rehydrateResponse } from './deIdentifier.mjs';
import { prepareDestructiveOperation, verifyAndRetrieveOperation } from './destructiveOperations.mjs';
import { startDebate } from './debate/debateOrchestrator.mjs';
import { checkErrorLoop, recordAction } from './errorLoopPrevention.mjs';

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
  return ctx;
}

/** Step 3: Classify intent via AI */
async function stepClassify(ctx) {
  ctx.stage = 'classify';
  ctx.intent = await classifyIntent(ctx.sanitizedInput, ctx.user.role, {
    previousContext: ctx.options.previousContext,
    selectedClientName: ctx.options.selectedClientName,
  });
  return ctx;
}

/** Step 4: Match intent to command registry + Zod validate */
async function stepValidate(ctx) {
  ctx.stage = 'validate';

  // Chat and clarification intents don't map to commands
  if (ctx.intent.intent === 'chat' || ctx.intent.intent === 'clarification_needed') {
    return ctx; // Pass through to conversational handler
  }

  const command = getCommand(ctx.intent.intent);
  if (!command) {
    logger.warn('[CommandExecutor] Unknown command intent', { intent: ctx.intent.intent });
    // Fall back to chat mode
    ctx.intent.intent = 'chat';
    return ctx;
  }

  ctx.command = command;

  // Validate params against command's Zod schema
  if (command.inputSchema) {
    const validation = command.inputSchema.safeParse(ctx.intent.params);
    if (!validation.success) {
      const issues = validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
      ctx.error = `I understood your request but need more details: ${issues}`;
      return ctx;
    }
    ctx.intent.params = validation.data;
  }

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

  // Use explicitly selected client from UI, or extract from intent
  const clientRef = ctx.intent.clientRef || ctx.options.selectedClientName;
  const clientId = ctx.intent.params?.clientId || ctx.options.selectedClientId;

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

  // Debate commands need client context — de-identify before sending
  const clientId = ctx.resolvedClient?.id;
  if (!clientId) return ctx; // Will be caught by confirmation step

  // Map command types to debate types
  const debateTypeMap = {
    build_workout_plan: 'workout_plan',
    create_nasm_program: 'workout_plan',
    generate_periodization: 'workout_plan',
    create_nutrition_plan: 'nutrition_plan',
  };

  const debateType = debateTypeMap[ctx.command.type];
  if (!debateType) return ctx; // No debate mapping — proceed normally

  // De-identify client for debate
  const { deIdentified } = deIdentifyClient(
    { id: clientId, ...(ctx.resolvedClient || {}) },
    {} // Enrichment happens inside the debate route
  );

  // Start debate asynchronously
  const jobId = startDebate(debateType, deIdentified, ctx.user.id, ctx.intent.params || {});

  ctx.result = {
    type: 'debate_started',
    message: `I'm assembling a team of AI specialists to build the best ${debateType.replace('_', ' ')} for ${ctx.resolvedClient.firstName || 'your client'}. This takes 1-3 minutes.\n\nTrack progress at: /api/ai/debate/${jobId}/status`,
    jobId,
    debateType,
  };
  ctx.skipRemainingSteps = true; // Debate is async — don't proceed to confirmation step
  return ctx;
}

/** Step 8: Handle destructive operations (prepare confirmation) */
async function stepConfirmation(ctx) {
  ctx.stage = 'confirmation';
  if (!ctx.command) return ctx;
  if (!ctx.command.destructive && !ctx.command.requiresConfirmation) return ctx;

  // For destructive ops, prepare HMAC-signed operation
  if (ctx.command.destructive) {
    const pending = prepareDestructiveOperation({
      type: ctx.command.method === 'DELETE' ? 'DELETE' : 'UPDATE',
      endpoint: ctx.command.endpoint,
      commandParams: ctx.intent.params,
      userId: ctx.user.id,
      description: `${ctx.command.description}${ctx.resolvedClient ? ` for ${ctx.resolvedClient.firstName || 'Client #' + ctx.resolvedClient.id}` : ''}`,
      affectedRecords: ctx.resolvedClient ? [{ id: ctx.resolvedClient.id, name: `${ctx.resolvedClient.firstName} ${ctx.resolvedClient.lastName || ''}`.trim() }] : [],
    });

    ctx.pendingOperation = pending;
    ctx.result = {
      type: 'confirmation_required',
      message: `⚠️ **Destructive operation:** ${pending.description}\n\nThis will affect ${pending.affectedCount} record(s). The operation expires in 120 seconds.\n\nSay "confirm" or "cancel" to proceed.`,
      operationId: pending.operationId,
      details: pending,
    };
    return ctx;
  }

  // Non-destructive but requires confirmation (creates, etc.)
  ctx.result = {
    type: 'confirmation_required',
    message: `I'll ${ctx.command.description.toLowerCase()}${ctx.resolvedClient ? ` for ${ctx.resolvedClient.firstName || 'Client #' + ctx.resolvedClient.id}` : ''}. Confirm?`,
    command: ctx.command.type,
    params: ctx.intent.params,
  };
  return ctx;
}

// ── Main Pipeline ───────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
  stepSanitize,
  stepPHIScan,
  stepClassify,
  stepValidate,
  stepRBAC,
  stepResolveClient,
  stepDebateRouting,
  stepConfirmation,
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
      ctx.error = `Internal error during ${ctx.stage}: ${err.message}`;
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
}

/**
 * Execute a confirmed operation (after user says "confirm").
 * For destructive ops, verifies HMAC signature.
 *
 * @param {string} operationId - Pending operation ID
 * @param {Object} user - Authenticated user
 * @param {Object} sequelize - Sequelize instance
 * @returns {Promise<{ success: boolean, message: string, data: Object|null }>}
 */
export async function executeConfirmedOperation(operationId, user, sequelize) {
  const { verified, operation, error } = verifyAndRetrieveOperation(operationId, user.id);

  if (!verified) {
    return { success: false, message: error, data: null };
  }

  // Execute via internal API call
  try {
    const command = getCommand(operation.type);
    // The actual API call will be handled by the route layer
    // Return the verified operation for the route to execute
    return {
      success: true,
      message: `Operation confirmed: ${operation.description}`,
      data: {
        endpoint: operation.endpoint,
        method: command?.method || 'POST',
        params: operation.params,
        operationId: operation.id,
      },
    };
  } catch (err) {
    logger.error('[CommandExecutor] Confirmed operation execution failed', {
      operationId,
      error: err.message,
    });
    return { success: false, message: `Execution failed: ${err.message}`, data: null };
  }
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
