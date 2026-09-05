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
 *   GET  /api/ai-command/intents    — Read bounded durable intent receipts
 *   GET  /api/ai-command/intents/:intentId — Read one authorized receipt
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
import sequelize, { Op } from '../database.mjs';
import { getModel } from '../models/index.mjs';
import { createAccessibleClientIdentitySanitizer } from '../services/ai/accessibleClientIdentityPrivacy.mjs';
import {
  executeCommandPipeline,
  executeConfirmedOperation,
  checkForConfirmation,
} from '../services/ai/commandExecutor.mjs';
import { buildCommandContextEnvelope } from '../services/ai/commandContextEnvelope.mjs';
import { cancelOperation, getPendingCount, peekOperation } from '../services/ai/destructiveOperations.mjs';
import { renderDigestOf, digestMatches } from '../services/ai/renderDigest.mjs';
import { describeLaneControls } from '../services/ai/commandLaneControls.mjs';
import { getPendingOperationStore } from '../services/ai/pendingOperationStore.mjs';
import { recordApprovalEvent, APPROVAL_EVENTS } from '../services/ai/approvalEvents.mjs';
import {
  getCommandsForRole,
  getAllCommandTypes,
  initializeRegistry,
} from '../services/ai/commandRegistry/index.mjs';
import { shouldFallbackNotWiredCommandToChat } from '../services/ai/commandFallbackPolicy.mjs';
import { getCommandExecutionLane } from '../services/ai/commandExecutionLane.mjs';
import {
  readCoachIntent,
  toPublicCoachIntent,
} from '../services/ai/coachIntentService.mjs';

const router = express.Router();
const AI_COMMAND_MESSAGE_MAX_CHARS = 2000;
const INTENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const parseIntentLimit = (value) => {
  const parsed = Number(value ?? 20);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 50 ? parsed : null;
};

const encodeIntentCursor = (row) => Buffer.from(JSON.stringify({
  createdAt: new Date(row.createdAt).toISOString(), id: row.id,
})).toString('base64url');

const decodeIntentCursor = (value) => {
  if (typeof value !== 'string' || value.length > 512) return null;
  try {
    const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    const date = new Date(decoded?.createdAt);
    if (!decoded?.id || Number.isNaN(date.getTime())) return null;
    return { createdAt: date, id: String(decoded.id) };
  } catch {
    return null;
  }
};

const intentNotFound = (res) => res.status(404).json({
  success: false,
  error: 'Intent not found or unavailable.',
});

const canReadIntent = async (intent, user) => {
  if (!intent || !user?.id) return false;
  if (Number(intent.actorId) === Number(user.id) && intent.targetClientId == null) return true;
  if (intent.targetClientId == null) return false;
  try {
    return await assertAssignmentOrAdmin(user.id, user.role, intent.targetClientId);
  } catch {
    return false;
  }
};

const intentCursorWhere = (cursor) => ({
  [Op.or]: [
    { createdAt: { [Op.lt]: cursor.createdAt } },
    { createdAt: cursor.createdAt, id: { [Op.lt]: cursor.id } },
  ],
});

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

// `inputMode` (card 1.2) tells the tier resolver WHICH CHANNEL produced the
// utterance, so an identity-crossing write by voice can demand a physical
// confirm (M3). It is a hint about provenance, never about authority: the tier
// itself is computed server-side, and a `tier` field in the body is ignored and
// audited (see stepConfirmation).
const ROUTE_CONTEXT_KEYS = ['source', 'intent', 'surface', 'inputMode', 'commandType'];
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

    // Card 1.2: a `tier` in the request body is IGNORED — the server resolves it
    // from the pre-collapse client pair. Recorded because naming your own tier is
    // the shape of an attack on the ceremony, not a client bug.
    if (req.body?.tier !== undefined || routeContext?.tier !== undefined) {
      void recordApprovalEvent({
        event: APPROVAL_EVENTS.TIER_SPOOF, userId: req.user.id, userRole: req.user.role,
      });
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
        // Card 1.2: the SERVER's tier verdict travels with the envelope so the
        // sheet renders the ceremony the server actually resolved — a client
        // that computed its own could soften a deliberate write into a silent one.
        tier: ctx.confirmationTier?.tier ?? null,
        tierReasons: ctx.confirmationTier?.reasons ?? [],
        physical: ctx.confirmationTier?.physical ?? false,
        readBackSlots: ctx.confirmationTier?.readBackSlots ?? [],
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

// ── GET /pending/:operationId — read-back of the STORED operation (card 1.1) ──
// The confirmation UI must render what the server will EXECUTE, not what the user
// asked for. Owner-gated, non-consuming, signature never returned. Not-found and
// not-owner are indistinguishable so this is not an existence oracle.
router.get('/pending/:operationId', protect, aiCommandLaneKillSwitch, aiCommandRateLimiter, async (req, res) => {
  try {
    const { found, operation } = await peekOperation(req.params.operationId, req.user.id);
    if (!found) {
      return res.status(404).json({ success: false, error: 'Operation not found or expired.' });
    }
    void recordApprovalEvent({
      event: APPROVAL_EVENTS.READ_BACK, userId: req.user.id, userRole: req.user.role,
      commandType: operation.commandType ?? null, operationId: operation.id,
      // F-09, corrected by R2-7: the record now actually carries this (the
      // destructive mint stamps it; a pending confirmation is non-destructive by
      // construction and stamps nothing). No fallback heuristic, because there
      // is no longer anything to fall back FROM.
      destructive: Boolean(operation.destructive),
    });
    res.json({ success: true, operation });
  } catch (err) {
    logAICommandRouteError('[AICommand] Pending read-back error', err, req);
    res.status(500).json({ success: false, error: 'Failed to read the pending operation' });
  }
});

// ── GET /intents — bounded durable receipt list (S3/C5) ────────────────────
// The default scope is the authenticated actor. Staff may request one target
// client only after a fresh assignment check; there is no unscoped roster.
router.get('/intents', protect, aiCommandRateLimiter, async (req, res) => {
  try {
    const limit = parseIntentLimit(req.query.limit);
    if (!limit) return res.status(400).json({ success: false, error: 'limit must be an integer from 1 to 50.' });

    const requestedTarget = req.query.targetClientId === undefined
      ? null
      : normalizeSelectedClientId(req.query.targetClientId);
    if (req.query.targetClientId !== undefined && !requestedTarget) {
      return res.status(400).json({ success: false, error: 'targetClientId must be a positive integer.' });
    }
    if (requestedTarget && !(await assertAssignmentOrAdmin(req.user.id, req.user.role, requestedTarget))) {
      return intentNotFound(res);
    }

    const cursor = req.query.cursor === undefined ? null : decodeIntentCursor(req.query.cursor);
    if (req.query.cursor !== undefined && !cursor) {
      return res.status(400).json({ success: false, error: 'cursor is invalid.' });
    }

    const baseWhere = requestedTarget
      ? { targetClientId: requestedTarget }
      : { actorId: req.user.id };

    const Model = getModel('CoachIntent');
    const readableRows = [];
    let scanWhere = cursor ? { ...baseWhere, ...intentCursorWhere(cursor) } : baseWhere;
    let lastTailKey = null;
    while (readableRows.length < limit + 1) {
      const rows = await Model.findAll({
        where: scanWhere,
        order: [['createdAt', 'DESC'], ['id', 'DESC']],
        limit: limit + 1,
      });
      if (!rows.length) break;
      const visible = requestedTarget
        ? rows
        : (await Promise.all(rows.map(async (intent) => ((await canReadIntent(intent, req.user)) ? intent : null)))).filter(Boolean);
      readableRows.push(...visible);
      if (rows.length < limit + 1) break;
      const tail = rows[rows.length - 1];
      const tailKey = `${new Date(tail.createdAt).toISOString()}|${String(tail.id)}`;
      if (tailKey === lastTailKey) break;
      lastTailKey = tailKey;
      scanWhere = { ...baseWhere, ...intentCursorWhere({ createdAt: new Date(tail.createdAt), id: String(tail.id) }) };
    }
    const page = readableRows.slice(0, limit);
    const nextCursor = readableRows.length > limit && page.length ? encodeIntentCursor(page[page.length - 1]) : null;
    return res.json({
      success: true,
      intents: page.map(toPublicCoachIntent),
      nextCursor,
    });
  } catch (err) {
    logAICommandRouteError('[AICommand] Intent list error', err, req);
    return res.status(500).json({ success: false, error: 'Failed to read coach intents.' });
  }
});

// ── GET /intents/:intentId — owner/assignment-gated receipt (S3/C5) ────────
router.get('/intents/:intentId', protect, aiCommandRateLimiter, async (req, res) => {
  try {
    if (!INTENT_ID_PATTERN.test(String(req.params.intentId || ''))) return intentNotFound(res);
    const Model = getModel('CoachIntent');
    const intent = await readCoachIntent({ model: Model, intentId: req.params.intentId });
    if (!(await canReadIntent(intent, req.user))) return intentNotFound(res);
    return res.json({ success: true, intent: toPublicCoachIntent(intent) });
  } catch (err) {
    logAICommandRouteError('[AICommand] Intent read error', err, req);
    return res.status(500).json({ success: false, error: 'Failed to read coach intent.' });
  }
});

router.post('/confirm', protect, aiCommandLaneKillSwitch, aiCommandRateLimiter, async (req, res) => {
  try {
    const { operationId, renderedDigest, confirmChannel } = req.body;

    if (!operationId) {
      return res.status(400).json({
        success: false,
        error: 'operationId is required',
      });
    }

    // Card 1.1 / M1 — proof-of-render. The client sends a digest of the operation
    // it RENDERED; the server recomputes from the operation it STORED and refuses
    // on mismatch, so a stale tab cannot confirm op A while displaying op B.
    //
    // MODE: `observe` (default) accepts a missing digest and only counts it, so
    // this can ship before the sheet does; `enforce` requires one. Either way a
    // digest that is PRESENT and WRONG is always refused — accepting a known-bad
    // digest would make the check theatre.
    const digestMode = process.env.APPROVAL_RENDER_DIGEST === 'enforce' ? 'enforce' : 'observe';
    // One read serves both the render proof and the channel split below; two
    // peeks meant two store round-trips per confirmation for the same record.
    const { found, operation: peeked } = await peekOperation(operationId, req.user.id);
    if (renderedDigest !== undefined && renderedDigest !== null) {
      const stored = peeked;
      // SELF-REVIEW FIX (Opus, 2026-09-02): an operation that EXPIRED between
      // render and confirm was reported as `render_mismatch` — "what you approved
      // does not match" — which sends the operator hunting for a discrepancy that
      // does not exist. The remedies differ (re-open vs re-issue), so the codes
      // must too. `expired` is also what the sheet's state machine already
      // distinguishes from `mismatch`.
      if (!found) {
        void recordApprovalEvent({
          event: APPROVAL_EVENTS.EXPIRED, userId: req.user.id, userRole: req.user.role, operationId,
        });
        return res.status(400).json({
          success: false,
          code: 'expired',
          error: 'This approval expired or is no longer available. Re-issue the request.',
        });
      }
      if (!digestMatches(String(renderedDigest), renderDigestOf(stored))) {
        void recordApprovalEvent({
          event: APPROVAL_EVENTS.RENDER_MISMATCH, userId: req.user.id, userRole: req.user.role,
          operationId, commandType: stored?.commandType ?? null,
        });
        return res.status(400).json({
          success: false,
          code: 'render_mismatch',
          error: 'What you approved does not match the pending operation. Re-open it and confirm again.',
        });
      }
    } else if (digestMode === 'observe') {
      /**
       * R2-2 (GLM 5.3 round 2): the comment above promised observe mode
       * "accepts a missing digest and only counts it". Nothing counted it. The
       * ONLY record of a missing digest lived in the enforce branch, so in the
       * DEFAULT configuration a confirmation with no render proof was accepted
       * in silence — and the number an operator would use to decide whether it
       * is safe to flip enforce (how many callers still send no digest?) did not
       * exist. An observe mode that observes nothing is not a rollout plan, it
       * is an off switch with a comment on it.
       *
       * Same shape as APPROVAL_CHANNEL_MODE's observe branch, which I did get
       * right one commit earlier in this same file.
       */
      void recordApprovalEvent({
        event: APPROVAL_EVENTS.RENDER_MISMATCH, userId: req.user.id, userRole: req.user.role,
        operationId, commandType: peeked?.commandType ?? null,
        errorCode: 'render_digest_absent_observed',
      });
    } else if (digestMode === 'enforce') {
      void recordApprovalEvent({
        event: APPROVAL_EVENTS.RENDER_MISMATCH, userId: req.user.id, userRole: req.user.role, operationId,
      });
      return res.status(400).json({
        success: false,
        code: 'render_digest_required',
        error: 'This confirmation is missing its render proof. Re-open the operation and confirm again.',
      });
    }

    /**
     * M3 CHANNEL SPLIT — enforced (F-03, GLM 5.3 round 1).
     *
     * The rule "the mishearing channel cannot authorize an identity-crossing
     * act" existed as an exported client helper that nothing called, plus a
     * comment. Both halves are now real: the mint stamped
     * `requiresPhysicalConfirm` (signed), and this refuses a voice-declared
     * confirmation of such an operation.
     *
     * HONEST SCOPE — read this before describing the guarantee. `confirmChannel`
     * is the CLIENT'S WORD. A hostile client omits it or says 'tap' and passes.
     * What this closes is the ACCIDENTAL path, which is the one the incident
     * actually took: ambient speech, a misheard "yes", a surface that never knew
     * the rule. Making it unforgeable needs a second factor the audio channel
     * cannot produce (card 4.2), and until that lands nobody may call this
     * authentication. It is a seatbelt, not a lock.
     *
     * A MISSING channel is treated as unproven, not as safe: an operation that
     * requires physical confirmation is refused unless the caller positively
     * declares a non-voice channel. Fail-closed, so a surface that has not been
     * taught the contract cannot confirm by silence.
     */
    const channelMode = process.env.APPROVAL_CHANNEL_MODE === 'observe' ? 'observe' : 'enforce';
    if (peeked?.requiresPhysicalConfirm) {
      const declared = typeof confirmChannel === 'string' ? confirmChannel : null;
      const permitted = declared === 'tap' || declared === 'keyboard';
      if (!permitted && channelMode === 'observe') {
        /**
         * OBSERVE — count who WOULD have been refused, and let them through.
         *
         * The default is `enforce`, unlike the render digest next door, and the
         * asymmetry is deliberate: `requiresPhysicalConfirm` can only be true on
         * operations minted by THIS release, and both confirm callers in the
         * repo declare a channel as of this commit (swept:
         * useConfirmationSheet and useCoachCommand). Shipping a security control
         * switched off is how `allowedConfirmChannels` became decoration in the
         * first place.
         *
         * The hatch exists so an incident — a caller nobody swept, a client we
         * do not build — can be defused by env var instead of a deploy, while
         * still recording every occurrence so the gap is visible rather than
         * merely survivable.
         */
        void recordApprovalEvent({
          event: APPROVAL_EVENTS.TIER_SPOOF, userId: req.user.id, userRole: req.user.role,
          operationId, commandType: peeked?.commandType ?? null,
          errorCode: 'physical_confirm_observed',
        });
      }
      if (!permitted && channelMode === 'enforce') {
        void recordApprovalEvent({
          event: APPROVAL_EVENTS.TIER_SPOOF, userId: req.user.id, userRole: req.user.role,
          operationId, commandType: peeked?.commandType ?? null,
          errorCode: 'physical_confirm_required',
        });
        return res.status(400).json({
          success: false,
          code: 'physical_confirm_required',
          error: 'This action affects a different client than the one you have open. Tap to confirm — saying so is not enough.',
        });
      }
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

// Card 1.5 (finding F14g): /cancel ran with `protect` ONLY while /execute and
// /confirm both carried the kill switch and the rate limiter — so a paused lane
// still mutated pending-operation state, and an authenticated endpoint whose
// failures are unaudited had no rate limit at all. A kill switch that does not
// kill the whole lane is a footnote waiting to become an incident.
// aiCommandRouteGuardContract.test.mjs now walks the router and fails any
// mutating route missing either guard, so this cannot regress one route at a time.
router.post('/cancel', protect, aiCommandLaneKillSwitch, aiCommandRateLimiter, async (req, res) => {
  try {
    const { operationId } = req.body;

    if (!operationId) {
      return res.status(400).json({ success: false, error: 'operationId is required' });
    }

    const cancelled = await cancelOperation(operationId, req.user.id, req.user?.role ?? null);
    if (cancelled) {
      /**
       * F-11 (GLM 5.3 round 1): this wrote a bare `cancelled` outcome while
       * every other lifecycle point wrote `approval:*`. The approval funnel
       * reads by prefix, so cancellations — the denominator that says how often
       * operators back out — were invisible to it, and the funnel looked
       * complete while missing an entire exit. The write was also a floating
       * promise; `void` marks the best-effort contract deliberately rather than
       * leaving an unhandled rejection to chance.
       */
      void recordApprovalEvent({
        event: APPROVAL_EVENTS.CANCELLED,
        userId: req.user.id,
        userRole: req.user.role,
        operationId,
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
          policy: {
            ...cmd.policy,
            requiredDomainStates: [...(cmd.policy?.requiredDomainStates || [])],
          },
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

  /**
   * The operational posture is ADMIN-ONLY (self-review, 2026-09-03).
   *
   * This block answers "is the destructive-approval proof actually enforcing,
   * and are approvals durable?" — which is exactly the reconnaissance an insider
   * wants before trying a stale-tab replay. It was behind `protect` alone, so
   * any authenticated account, including a CLIENT, could read it. Health for
   * everyone; posture for the people who respond to incidents.
   *
   * The endpoint still answers 200 for every authenticated caller so an existing
   * uptime monitor cannot be broken by this narrowing — the detail disappears,
   * the liveness signal does not.
   */
  const isOperator = req.user?.role === 'admin' || req.user?.role === 'trainer';

  res.json({
    success: true,
    engine: 'god-level-ai-command-v1',
    registeredCommands: allCommands.length,
    pendingOperations: await getPendingCount(req.user.id),
    status: allCommands.length > 0 ? 'operational' : 'no_commands_registered',
    ...(isOperator ? {
      // Card 1.5: during an incident the operator needs the EFFECTIVE state, not
      // the env string they think they set — and needs to know whether approvals
      // are durable, because an in-process store silently voids them on deploy.
      controls: describeLaneControls(),
      // F-06: a control that defaults to advisory and is invisible in /health is
      // a rollout plan, not a control. An incident commander must be able to see
      // whether each check is ENFORCING or merely counting.
      approvalModes: {
        renderDigest: process.env.APPROVAL_RENDER_DIGEST === 'enforce' ? 'enforce' : 'observe',
        /**
         * ADVISORY ONLY — say so, because an incident commander will otherwise
         * flip it and believe they hardened something.
         *
         * Self-review round 3, 2026-09-03: `APPROVAL_TIER_MODE` is read in
         * exactly one place in the executor, a LOG LINE. F-01 made a tier
         * refusal short-circuit in BOTH modes (authorization must never be a
         * rollout flag), and the ceremony the sheet renders comes from the
         * envelope regardless of mode. So the flag changes a log field and this
         * string, and nothing else.
         *
         * Reporting it beside renderDigest and channel — which DO gate
         * behaviour — invited exactly the wrong inference during the one moment
         * you cannot afford it. Either wire it or retire it; until then it says
         * what it is.
         */
        tier: {
          mode: process.env.APPROVAL_TIER_MODE === 'enforce' ? 'enforce' : 'observe',
          effect: 'advisory — refusals short-circuit in both modes; this flag changes logging only',
        },
        // Added after catching myself: I wrote the rule directly above, then
        // shipped APPROVAL_CHANNEL_MODE one commit later without surfacing it —
        // an invisible control, by the same definition, in the same file.
        channel: process.env.APPROVAL_CHANNEL_MODE === 'observe' ? 'observe' : 'enforce',
      },
      approvalStore: getPendingOperationStore().kind,
      approvalStoreDurable: Boolean(getPendingOperationStore().durable),
    } : {}),
  });
});

export default router;
