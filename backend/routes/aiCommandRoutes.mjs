/**
 * AI Command Routes — God-Level AI Secretary Endpoints
 * =====================================================
 * Exposes the command execution pipeline via REST API.
 * Integrates with existing aiChatRoutes for conversational fallback.
 *
 * Endpoints:
 *   POST /api/ai-command/execute    — Execute a natural language command
 *   POST /api/ai-command/confirm    — Confirm a pending destructive operation
 *   POST /api/ai-command/cancel     — Cancel a pending operation
 *   GET  /api/ai-command/commands   — List available commands for current role
 *   GET  /api/ai-command/health     — Command engine health check
 *
 * All routes require authentication via `protect` middleware.
 */
import express from 'express';
import logger from '../utils/logger.mjs';
import { protect } from '../middleware/authMiddleware.mjs';
import { aiCommandLaneKillSwitch, aiCommandRateLimiter } from '../middleware/aiCommandGuards.mjs';
import { assertAssignmentOrAdmin } from '../middleware/verifyClientAccess.mjs';
import { recordCommandAudit } from '../services/ai/commandAudit.mjs';
import { recordUnhandledUtterance } from '../services/ai/unhandledUtteranceAudit.mjs';
import { gateCommandFrontendDispatch, buildDispatchRefusalResponse } from '../services/ai/commandDispatchEligibility.mjs';
import sequelize from '../database.mjs';
import { getModel } from '../models/index.mjs';
import { createAccessibleClientIdentitySanitizer } from '../services/ai/accessibleClientIdentityPrivacy.mjs';
import {
  executeCommandPipeline,
  executeConfirmedOperation,
  checkForConfirmation,
} from '../services/ai/commandExecutor.mjs';
import { buildCommandContextEnvelope } from '../services/ai/commandContextEnvelope.mjs';
import { cancelOperation, getPendingCount } from '../services/ai/destructiveOperations.mjs';
import {
  getCommandsForRole,
  getAllCommandTypes,
  initializeRegistry,
} from '../services/ai/commandRegistry/index.mjs';
import { shouldFallbackNotWiredCommandToChat } from '../services/ai/commandFallbackPolicy.mjs';
import { getCommandExecutionLane } from '../services/ai/commandExecutionLane.mjs';

const router = express.Router();
const AI_COMMAND_MESSAGE_MAX_CHARS = 2000;

const toAICommandRouteErrorMetadata = (err) => ({
  errorName: err?.name || 'Error',
  errorCode: err?.code || err?.type || 'ai_command_route_error',
});

const logAICommandRouteError = (message, err, req, metadata = {}) => {
  logger.error(message, {
    userId: req?.user?.id,
    role: req?.user?.role,
    route: req?.originalUrl || req?.path,
    ...metadata,
    ...toAICommandRouteErrorMetadata(err),
  });
};

const normalizeSelectedClientId = (value) => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

// previousContext reaches the classifier prompt verbatim — cap it so a caller
// can never inflate LLM cost or smuggle a mega-prompt through this channel.
// 2000 chars comfortably fits the Coach Command Center's recent-context use
// and the planner's structural plan snapshot (~600 chars by contract).
const PREVIOUS_CONTEXT_MAX_CHARS = 2000;
/** Exported for tests (same precedent as resolveVoiceUploadScope). */
export const normalizePreviousContext = (value) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > PREVIOUS_CONTEXT_MAX_CHARS
    ? trimmed.slice(0, PREVIOUS_CONTEXT_MAX_CHARS)
    : trimmed;
};

const ROUTE_CONTEXT_KEYS = ['source', 'intent', 'surface'];
const ROUTE_CONTEXT_TOKEN_PATTERN = /^[a-z0-9_-]{1,80}$/i;
const ISO_DATE_PREFIX_PATTERN = /^\d{4}-\d{2}-\d{2}/;

const normalizePositiveIntegerString = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const trimmed = String(value).trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return null;
  return Number.isSafeInteger(Number(trimmed)) ? trimmed : null;
};

const normalizeIsoDate = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!ISO_DATE_PREFIX_PATTERN.test(trimmed)) return null;
  const dateOnly = trimmed.slice(0, 10);
  const parsed = new Date(`${dateOnly}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : dateOnly;
};

const normalizeRouteContext = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const normalized = {};
  for (const key of ROUTE_CONTEXT_KEYS) {
    const raw = value[key];
    if (typeof raw !== 'string') continue;
    const token = raw.trim();
    if (!ROUTE_CONTEXT_TOKEN_PATTERN.test(token)) continue;
    normalized[key] = token;
  }

  const scheduledSessionId = normalizePositiveIntegerString(value.scheduledSessionId);
  if (scheduledSessionId) normalized.scheduledSessionId = scheduledSessionId;
  const scheduledSessionDate = normalizeIsoDate(value.scheduledSessionDate);
  if (scheduledSessionDate) normalized.scheduledSessionDate = scheduledSessionDate;
  const workoutDate = normalizeIsoDate(value.workoutDate);
  if (workoutDate) normalized.workoutDate = workoutDate;
  const scheduledSessionCredits = Number(value.scheduledSessionCredits);
  if (Number.isSafeInteger(scheduledSessionCredits) && scheduledSessionCredits >= 0) {
    normalized.scheduledSessionCredits = scheduledSessionCredits;
  }

  return Object.keys(normalized).length ? normalized : null;
};
const sanitizeCommandPromptInputs = async ({ message, previousContext, user }) => {
  const { sanitize } = await createAccessibleClientIdentitySanitizer({ requester: user, sequelize });
  const normalizedPreviousContext = normalizePreviousContext(previousContext);
  return {
    message: sanitize(message).sanitizedMessage,
    previousContext: normalizedPreviousContext
      ? sanitize(normalizedPreviousContext).sanitizedMessage
      : undefined,
  };
};

const IDENTITY_REDACTION_UNAVAILABLE_RESPONSE = {
  success: false,
  code: 'AI_IDENTITY_REDACTION_UNAVAILABLE',
  error: 'Client identity protection is temporarily unavailable. Please try again.',
};

// Initialize command registry on first import
initializeRegistry();

// ── POST /execute — Main command pipeline ───────────────────────────────────

router.post('/execute', protect, aiCommandLaneKillSwitch, aiCommandRateLimiter, async (req, res) => {
  try {
    const {
      message, selectedClientId, previousContext, routeContext, entityId, entityVersion, correlationId,
    } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        code: 'COMMAND_MESSAGE_REQUIRED',
        error: 'Message is required',
      });
    }

    if (message.length > AI_COMMAND_MESSAGE_MAX_CHARS) {
      return res.status(400).json({
        success: false,
        code: 'COMMAND_MESSAGE_TOO_LONG',
        error: `Message exceeds ${AI_COMMAND_MESSAGE_MAX_CHARS} character limit`,
        maxChars: AI_COMMAND_MESSAGE_MAX_CHARS,
      });
    }

    const normalizedSelectedClientId = normalizeSelectedClientId(selectedClientId);
    const hasSelectedClientId = Object.prototype.hasOwnProperty.call(req.body, 'selectedClientId');
    if (
      hasSelectedClientId
      && selectedClientId !== null
      && selectedClientId !== undefined
      && normalizedSelectedClientId === null
    ) {
      return res.status(400).json({
        success: false,
        code: 'COMMAND_SELECTED_CLIENT_ID_INVALID',
        error: 'selectedClientId must be a positive integer when provided',
      });
    }

    const user = {
      id: req.user.id,
      role: req.user.role,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
    };

    let promptInputs;
    try {
      promptInputs = await sanitizeCommandPromptInputs({ message, previousContext, user });
    } catch (error) {
      logger.error('[AICommand] Identity redaction failed closed', {
        userId: user.id,
        role: user.role,
        errorName: error?.name ?? 'Error',
      });
      return res.status(503).json(IDENTITY_REDACTION_UNAVAILABLE_RESPONSE);
    }

    const normalizedRouteContext = normalizeRouteContext(routeContext);
    const contextEnvelope = await buildCommandContextEnvelope({
      actor: user,
      request: {
        surfaceHint: normalizedRouteContext?.surface ?? null,
        selectedClientId: normalizedSelectedClientId,
        entityId,
        entityVersion,
        correlationId,
      },
      loadPlan: async (id) => {
        const WorkoutPlan = getModel('WorkoutPlan');
        return WorkoutPlan.findByPk(id);
      },
      authorizeClient: assertAssignmentOrAdmin,
    });

    const ctx = await executeCommandPipeline(promptInputs.message, user, {
      selectedClientName: null,
      selectedClientId: normalizedSelectedClientId,
      previousContext: promptInputs.previousContext,
      routeContext: normalizedRouteContext,
      contextEnvelope,
      sequelize,
    });

    if (ctx.error) {
      // F1: an intent the classifier INVENTED (no registry match) is the
      // classifier-drift signal. Fire-and-forget — NOT awaited, so it is not
      // guaranteed to have landed before the response is sent; it is guaranteed
      // not to block or fail the response (recordUnhandledUtterance never throws).
      // Input is ctx.sanitizedInput: identity-sanitized by the route AND
      // PHI-stripped by the executor — the most-scrubbed form of the text that
      // exists (round-1 fix; an earlier version used the pre-PHI-scrub message).
      if ((ctx.result?.code || '') === 'UNKNOWN_INTENT') {
        void recordUnhandledUtterance({
          userId: user.id,
          userRole: user.role,
          input: ctx.sanitizedInput ?? promptInputs.message,
          kind: 'unknown_intent',
          surface: normalizedRouteContext?.surface ?? null,
          phantomIntent: ctx.intent?.intent ?? null,
        });
      }
      return res.json({
        success: false,
        type: 'error',
        error: ctx.error,
        code: ctx.result?.code || 'EXECUTION_FAILED',
        stage: ctx.stage,
        suggestions: ctx.result?.suggestions || null,
        intent: ctx.intent,
        fallbackToChat: false,
        timing: ctx.metadata.timing,
      });
    }

    // Handle different result types
    if (ctx.intent?.intent === 'chat' || ctx.intent?.intent === 'clarification_needed') {
      // F1: the utterance did not become a command — the product's richest
      // roadmap signal, previously discarded here (see unhandledUtteranceAudit.mjs).
      // `chat` means "classified as ordinary conversation", which is NOT a failure;
      // the report keeps kinds separate so readers can filter it out. Same
      // fire-and-forget + most-scrubbed-input rules as the UNKNOWN_INTENT site.
      void recordUnhandledUtterance({
        userId: user.id,
        userRole: user.role,
        input: ctx.sanitizedInput ?? promptInputs.message,
        kind: ctx.intent.intent === 'chat' ? 'chat' : 'clarification_needed',
        surface: normalizedRouteContext?.surface ?? null,
      });
      return res.json({
        success: true,
        type: ctx.intent.intent,
        message: ctx.intent.intent === 'clarification_needed'
          ? ctx.intent.params?.suggestion || 'Could you rephrase that?'
          : null,
        intent: ctx.intent,
        fallbackToChat: true,
        timing: ctx.metadata.timing,
      });
    }

    if (ctx.result?.type === 'debate_started') {
      return res.json({
        success: true,
        type: 'debate_started',
        message: ctx.result.message,
        jobId: ctx.result.jobId,
        debateType: ctx.result.debateType,
        client: ctx.resolvedClient,
        timing: ctx.metadata.timing,
      });
    }

    if (ctx.result?.type === 'not_wired') {
      if (ctx.command?.method === 'FRONTEND_DISPATCH' && !ctx.command?.requiresConfirmation) {
        // H6: the chat lane's eligibility gate, applied to the command lane.
        const gate = await gateCommandFrontendDispatch({
          event: ctx.command.frontendEvent || ctx.command.endpoint,
          payload: ctx.intent?.params || {},
          targetClientId: normalizedSelectedClientId ?? ctx.resolvedClient?.id ?? null,
          user,
        });
        if (!gate.allowed) {
          recordCommandAudit({
            userId: user.id, userRole: user.role, commandType: ctx.command.type,
            targetClientId: normalizedSelectedClientId ?? null, outcome: 'denied',
            errorCode: 'DISPATCH_INELIGIBLE', params: ctx.intent?.params || null,
          });
          return res.json({ ...buildDispatchRefusalResponse(ctx.command, gate.refusals), timing: ctx.metadata.timing });
        }
        return res.json({
          success: true,
          type: 'frontend_dispatch',
          message: `Sent ${ctx.command.description.toLowerCase()} to the workout form.`,
          command: ctx.command.type,
          event: ctx.command.frontendEvent || ctx.command.endpoint,
          payload: ctx.intent?.params || {},
          fallbackToChat: false,
          timing: ctx.metadata.timing,
        });
      }
      if (shouldFallbackNotWiredCommandToChat(ctx.command?.type)) {
        return res.json({
          success: true,
          type: 'chat',
          message: 'Routing this draft request through Swan Coach review.',
          intent: ctx.intent,
          fallbackToChat: true,
          timing: ctx.metadata.timing,
        });
      }
      return res.json({
        success: true,
        type: 'not_wired',
        message: ctx.result.message,
        command: ctx.command?.type,
        manualOnly: ctx.result.manualOnly ?? false,
        reason: ctx.result.reason || null,
        client: ctx.resolvedClient,
        timing: ctx.metadata.timing,
      });
    }

    if (ctx.result?.type === 'confirmation_required') {
      return res.json({
        success: true,
        type: 'confirmation_required',
        message: ctx.result.message,
        operationId: ctx.result.operationId || null,
        expiresAt: ctx.result.expiresAt || null,
        command: ctx.command?.type,
        params: ctx.intent?.params,
        client: ctx.resolvedClient,
        details: ctx.result.details || null,
        isDestructive: ctx.result.isDestructive ?? ctx.command?.destructive ?? false,
        timing: ctx.metadata.timing,
      });
    }

    // Backstop: if a command reached this point with null result, be honest (should not happen after stepExecute fix)
    if (ctx.command && ctx.result === null) {
      return res.json({
        success: true,
        type: 'not_wired',
        message: `${ctx.command.type.replace(/_/g, ' ')} is not yet wired for execution. No data was changed.`,
        command: ctx.command.type,
        manualOnly: false,
        reason: null,
        client: ctx.resolvedClient,
        timing: ctx.metadata.timing,
      });
    }

    // Direct execution result
    return res.json({
      success: true,
      type: 'executed',
      command: ctx.command?.type,
      result: ctx.result,
      client: ctx.resolvedClient,
      timing: ctx.metadata.timing,
    });

  } catch (err) {
    logAICommandRouteError('[AICommand] Execute route error', err, req, {
      selectedClientId: normalizeSelectedClientId(req.body?.selectedClientId),
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error processing your command',
    });
  }
});

// ── POST /confirm — Confirm a pending destructive operation ─────────────────

router.post('/confirm', protect, aiCommandLaneKillSwitch, aiCommandRateLimiter, async (req, res) => {
  try {
    const { operationId } = req.body;

    if (!operationId) {
      return res.status(400).json({
        success: false,
        error: 'operationId is required',
      });
    }

    const result = await executeConfirmedOperation(operationId, req.user, sequelize);

    // H6: a confirmed frontend dispatch gets the same eligibility gate as an
    // unconfirmed one — confirmation is about intent, not about client safety.
    if (result?.type === 'frontend_dispatch' && result?.event) {
      const gate = await gateCommandFrontendDispatch({
        event: result.event, payload: result.payload || {},
        targetClientId: result.client?.id ?? null, user: req.user,
      });
      if (!gate.allowed) {
        return res.json(buildDispatchRefusalResponse({ type: result.command }, gate.refusals));
      }
    }

    res.json(result);
  } catch (err) {
    logAICommandRouteError('[AICommand] Confirm route error', err, req, {
      operationIdPresent: Boolean(req.body?.operationId),
    });
    res.status(500).json({ success: false, error: 'Failed to execute confirmed operation' });
  }
});

// ── POST /cancel — Cancel a pending operation ───────────────────────────────

router.post('/cancel', protect, async (req, res) => {
  try {
    const { operationId } = req.body;

    if (!operationId) {
      return res.status(400).json({ success: false, error: 'operationId is required' });
    }

    const cancelled = await cancelOperation(operationId, req.user.id);
    if (cancelled) {
      recordCommandAudit({
        userId: req.user.id,
        userRole: req.user.role,
        confirmationState: 'cancelled',
        operationId,
        outcome: 'cancelled',
      });
    }
    res.json({
      success: cancelled,
      message: cancelled ? 'Operation cancelled.' : 'Operation not found or already expired.',
    });
  } catch (err) {
    logAICommandRouteError('[AICommand] Cancel route error', err, req, {
      operationIdPresent: Boolean(req.body?.operationId),
    });
    res.status(500).json({ success: false, error: 'Failed to cancel operation' });
  }
});

// ── GET /metrics/summary — Command success metrics (admin-only) ──────────────
// v2 P2.2: read-side aggregation over the append-only AiCommandAuditLog.
// Lazy service import keeps this route's module graph unchanged for existing
// test harnesses that mock only the execute/confirm dependencies.

router.get('/metrics/summary', protect, async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  try {
    const { buildCoachCommandMetricsSummary } = await import('../services/ai/coachCommandMetricsSummary.mjs');
    const summary = await buildCoachCommandMetricsSummary({ days: req.query.days });
    res.json({ success: true, ...summary });
  } catch (err) {
    logAICommandRouteError('[AICommand] Metrics summary error', err, req);
    res.status(500).json({ success: false, error: 'Failed to build command metrics summary' });
  }
});

// ── GET /metrics/unhandled — Top asks Swan Coach could not act on (admin-only) ─
// F1: the weekly product-discovery read. Cadence: read top-10 weekly, convert
// 2-3 recurring asks per sprint into registry commands. Same lazy-import pattern
// as /metrics/summary, same admin gate.

router.get('/metrics/unhandled', protect, async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  try {
    const { buildUnhandledUtteranceTop } = await import('../services/ai/unhandledUtteranceAudit.mjs');
    const report = await buildUnhandledUtteranceTop({ days: req.query.days, limit: req.query.limit });
    res.json({ success: true, ...report });
  } catch (err) {
    logAICommandRouteError('[AICommand] Unhandled-utterance report error', err, req);
    res.status(500).json({ success: false, error: 'Failed to build unhandled-utterance report' });
  }
});

// ── GET /commands — List available commands for current role ─────────────────

router.get('/commands', protect, (req, res) => {
  try {
    const commands = getCommandsForRole(req.user.role);
    res.json({
      success: true,
      role: req.user.role,
      commandCount: commands.length,
      commands: commands.map(cmd => {
        const execution = getCommandExecutionLane(cmd);
        return {
          type: cmd.type,
          description: cmd.description,
          category: cmd.category,
          examples: cmd.naturalLanguagePatterns.slice(0, 2),
          destructive: cmd.destructive,
          requiresClientRef: cmd.requiresClientRef || false,
          ...execution,
        };
      }),
    });
  } catch (err) {
    logAICommandRouteError('[AICommand] Commands list error', err, req);
    res.status(500).json({ success: false, error: 'Failed to list commands' });
  }
});

// ── GET /health — Command engine health check ───────────────────────────────

router.get('/health', protect, async (req, res) => {
  // 0.4b: async — the store contract is async now; a sync handler here would
  // serialise a Promise into the JSON (the exact trap the S2 handoff named).
  const allCommands = getAllCommandTypes();
  res.json({
    success: true,
    engine: 'god-level-ai-command-v1',
    registeredCommands: allCommands.length,
    pendingOperations: await getPendingCount(req.user.id),
    status: allCommands.length > 0 ? 'operational' : 'no_commands_registered',
  });
});

export default router;
