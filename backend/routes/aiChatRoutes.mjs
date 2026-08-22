/**
 * AI Chat Routes
 * ==============
 * REST endpoints for AI assistant conversations.
 * Supports client, trainer, and admin roles with context-based permissions.
 *
 * Endpoints:
 *   POST   /api/ai-chat/conversations           - Create new conversation
 *   GET    /api/ai-chat/conversations           - List user's conversations
 *   GET    /api/ai-chat/conversations/:id       - Get conversation with messages
 *   POST   /api/ai-chat/conversations/:id/messages - Send message + get AI response
 *   PATCH  /api/ai-chat/conversations/:id       - Update conversation (title, status)
 *   DELETE /api/ai-chat/conversations/:id       - Soft-delete conversation
 */
import express from 'express';
import multer from 'multer';
import { Op } from 'sequelize';
import { parsePlainDecimalNumber } from '../services/nutrition/numericInputValidation.mjs';

// Allowlist sanitizer — prevents prompt injection via foodContext fields
const FOOD_CONTEXT_ALLOWED_KEYS = new Set([
  'type', 'foodName', 'restaurantBrand', 'serving',
  'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'saturatedFat',
]);
const FOOD_CONTEXT_NUMERIC_KEYS = new Set([
  'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'saturatedFat',
]);
const FOOD_CONTEXT_MAX_STR_LEN = 120;
// Food-safe characters: word chars, spaces, common food punctuation, extended Latin for accents
const FOOD_SAFE_RE = /[^\w\s.,'\-+%/()&\u00C0-\u017E]/g;
function sanitizeFoodContext(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const clean = {};
  for (const key of FOOD_CONTEXT_ALLOWED_KEYS) {
    if (!(key in raw)) continue;
    if (FOOD_CONTEXT_NUMERIC_KEYS.has(key)) {
      const n = parsePlainDecimalNumber(raw[key]);
      clean[key] = n !== null && n >= 0 ? n : null;
    } else {
      // Two-pass: strip control chars + backticks, then restrict to food-safe chars
      const s = String(raw[key] ?? '')
        .replace(/[\r\n\t`\\]/g, ' ')
        .replace(FOOD_SAFE_RE, '')
        .trim()
        .slice(0, FOOD_CONTEXT_MAX_STR_LEN);
      clean[key] = s || null;
    }
  }
  return Object.keys(clean).length ? clean : null;
}
import { protect } from '../middleware/authMiddleware.mjs';
import { aiRateLimiter } from '../middleware/aiRateLimiter.mjs';
import { requireSubscription } from '../middleware/requireSubscription.mjs';
import AiConversation from '../models/AiConversation.mjs';
import {
  getSystemPrompt,
  buildPromptMessages,
  sendChatMessage,
  enrichWithUserData,
  getAIChatDiagnostics,
  sanitizeAiChatMetadataForClient,
  sanitizeAiFailoverTrace,
} from '../services/aiChatService.mjs';
import { transcribeAudio, isAudioFile, checkAndRecordTranscription } from '../services/voiceTranscriptionService.mjs';
import { stripIdentityFromMessage, stripIdentityFromResponse, scrubGenericPII } from '../services/aiPrivacyService.mjs';
import { createAccessibleClientIdentitySanitizer } from '../services/ai/accessibleClientIdentityPrivacy.mjs';
import {
  checkClientAccess,
  CLIENT_ACCESS_DENIED_MESSAGE,
  parseContextClientId,
} from '../services/ai/contextEngine/clientAccess.mjs';
import {
  CURRENT_MESSAGE_WITHHELD,
  RESPONSE_MESSAGE_WITHHELD,
  sanitizePromptHistory,
} from '../services/ai/aiChatPromptPrivacy.mjs';
import { strictPiiMiddleware } from '../middleware/piiSanitizationMiddleware.mjs';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';
import {
  buildCoachIntakeContextPromptBlock,
  buildCoachIntakeContextFromResult,
} from '../services/ai/coachIntakeContextService.mjs';
import { sanitizeNutritionChatCopy } from '../services/nutrition/nutritionCareCopy.mjs';
import { listUnifiedCoachIntakeItems } from '../services/coachIntakeItemService.mjs';
import { getCoachIntakeHealth } from '../services/coachIntakeHealthService.mjs';
import { getCoachIntakeRetentionReport } from '../services/coachIntakeRetentionPolicyService.mjs';
import { purgeCoachIntakeRawArtifacts } from '../services/coachIntakeRetentionPurgeService.mjs';
import { createCoachActionProposalsFromAiResponse } from '../services/ai/coachActionProposalService.mjs';
import { buildSwanCoachCoveragePromptBlockFromModels } from '../services/contentStudioCoverageService.mjs';

// Phase 2 Slice 2.1 (2026-05-03): chart/KPI truthfulness guard.
// Legacy direct workout import writes stay removed from aiChatRoutes; workout
// logs now flow through review-gated Coach action proposals.

// Multer config for audio uploads (memory storage, 25MB max)
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/flac', 'audio/m4a', 'audio/x-m4a'];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(mp3|m4a|wav|webm|ogg|flac)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported audio format. Accepted: mp3, m4a, wav, webm, ogg, flac'));
    }
  },
});

const router = express.Router();
const AI_CHAT_MESSAGE_MAX_CHARS = 12000;
const COACH_ACTION_PROPOSAL_FAILED_CODE = 'COACH_PROPOSAL_CREATE_FAILED';
const COACH_ACTION_PROPOSAL_FAILED_MESSAGE = 'Coach could not prepare that draft safely. Review the message and try again.';
const AI_CHAT_TTS_UNAVAILABLE_MESSAGE = 'Voice playback is temporarily unavailable.';
const AI_CHAT_EQUIPMENT_CONTEXTS = new Set([
  'coach_assistant',
  'exercise_library',
  'workout_generation',
  'workout_suggestions',
]);
const AI_CHAT_SCHEDULE_CONTEXTS = new Set(['coach_assistant', 'workout_generation']);
const AI_CHAT_WORKOUT_DATE_CONTEXTS = new Set([
  'coach_assistant',
  'workout_generation',
  'workout_suggestions',
]);
const AI_CHAT_COVERAGE_CONTEXTS = new Set(['coach_assistant', 'workout_generation']);

function parseOptionalPositiveInteger(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function hasEquipmentProfileRequest(raw) {
  return raw
    && typeof raw === 'object'
    && !Array.isArray(raw)
    && Object.prototype.hasOwnProperty.call(raw, 'equipmentProfileId');
}

function hasScheduledSessionRequest(raw) {
  return raw
    && typeof raw === 'object'
    && !Array.isArray(raw)
    && Object.prototype.hasOwnProperty.call(raw, 'scheduledSessionId');
}

function hasWorkoutDateRequest(raw) {
  return raw
    && typeof raw === 'object'
    && !Array.isArray(raw)
    && Object.prototype.hasOwnProperty.call(raw, 'workoutDate');
}

function parseOptionalIsoDate(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return null;
  const dateOnly = value.trim();
  const parsed = new Date(`${dateOnly}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : dateOnly;
}

function parseOptionalCredits(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

const ROUTE_CONTEXT_TOKEN_PATTERN = /^[a-z0-9_-]{1,80}$/i;

function parseOptionalRouteToken(value) {
  if (typeof value !== 'string') return null;
  const token = value.trim();
  return ROUTE_CONTEXT_TOKEN_PATTERN.test(token) ? token : null;
}

function sanitizePromptLine(value, maxLength = 160) {
  return String(value ?? '')
    .replace(/[\r\n\t`\\]/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function buildSelectedScheduledSessionPromptBlock({
  context,
  scheduledSessionId,
  scheduledSessionDate,
  scheduledSessionCredits,
}) {
  if (!scheduledSessionId || !AI_CHAT_SCHEDULE_CONTEXTS.has(context)) return '';
  const dateLine = scheduledSessionDate ? `\nSession date: ${scheduledSessionDate}` : '';
  const hasScheduledSessionCredits = scheduledSessionCredits !== null && scheduledSessionCredits !== undefined;
  const creditLine = hasScheduledSessionCredits ? `\nCredit hint: ${scheduledSessionCredits}` : '';
  return `\n--- SELECTED BOOKED SESSION ---\nScheduled Session ID: ${scheduledSessionId}${dateLine}${creditLine}\nInstruction: when preparing a workout_log proposal for this booked session, include "scheduledSessionId": "${scheduledSessionId}". Do not invent or change scheduled session ids. Final approval will verify ownership, attendance status, and session deduction server-side.\n--- END SELECTED BOOKED SESSION ---`;
}

function buildSelectedWorkoutDatePromptBlock({
  context,
  workoutDate,
}) {
  if (!workoutDate || !AI_CHAT_WORKOUT_DATE_CONTEXTS.has(context)) return '';
  return `\n--- SELECTED WORKOUT DATE ---\nWorkout date: ${workoutDate}\nInstruction: when preparing a workout_log proposal from this logger session, use "date": "${workoutDate}". Do not invent or change workout dates.\n--- END SELECTED WORKOUT DATE ---`;
}

function buildCoachProposalRouteContext({
  source,
  intent,
  surface,
  scheduledSessionId,
  scheduledSessionDate,
  scheduledSessionCredits,
  workoutDate,
}) {
  const routeContext = {};
  if (source) routeContext.source = source;
  if (intent) routeContext.intent = intent;
  if (surface) routeContext.surface = surface;
  if (workoutDate) routeContext.workoutDate = workoutDate;
  if (scheduledSessionId) routeContext.scheduledSessionId = String(scheduledSessionId);
  if (scheduledSessionDate) routeContext.scheduledSessionDate = scheduledSessionDate;
  if (scheduledSessionCredits !== null && scheduledSessionCredits !== undefined) {
    routeContext.scheduledSessionCredits = scheduledSessionCredits;
  }
  if (Object.keys(routeContext).length === 0) return null;
  return {
    source: source || 'workout-logger',
    intent: intent || 'log_workout',
    surface: surface || 'workout-logger-coach-terminal',
    ...routeContext,
  };
}

async function buildSelectedEquipmentProfilePromptBlock({
  context,
  equipmentProfileId,
  requesterId,
  requesterRole,
}) {
  if (!equipmentProfileId || !AI_CHAT_EQUIPMENT_CONTEXTS.has(context)) return '';

  try {
    const profiles = await sequelize.query(
      `SELECT ep.id, ep."locationType",
              COALESCE(
                (SELECT json_agg(json_build_object(
                  'name', ei.name,
                  'category', ei.category,
                  'quantity', ei.quantity,
                  'resistanceType', ei."resistanceType"
                ) ORDER BY ei.category, ei.name)
                 FROM equipment_items ei
                 WHERE ei."profileId" = ep.id
                   AND ei."isActive" = true
                   AND (ei."approvalStatus" = 'approved' OR ei."approvalStatus" = 'manual')),
                '[]'
              ) AS items
       FROM equipment_profiles ep
       WHERE ep.id = :equipmentProfileId
         AND ep."isActive" = true
         AND (:isAdmin = true OR ep."trainerId" = :requesterId)
       LIMIT 1`,
      {
        replacements: {
          equipmentProfileId,
          requesterId,
          isAdmin: requesterRole === 'admin',
        },
        type: sequelize.QueryTypes.SELECT,
      },
    );
    const profile = profiles[0];
    if (!profile) {
      return `\n--- SELECTED EQUIPMENT PROFILE ---\nSelected Profile ID: ${equipmentProfileId}\nProfile details are unavailable to this account. Ask for a visible equipment profile before planning instead of inventing equipment.\n--- END SELECTED EQUIPMENT PROFILE ---`;
    }

    const rawItems = typeof profile.items === 'string' ? JSON.parse(profile.items) : profile.items;
    const itemLines = (rawItems || []).map((item) => {
      const quantity = Number(item.quantity);
      const count = Number.isFinite(quantity) && quantity > 1 ? ` x${quantity}` : '';
      const resistance = item.resistanceType ? `, ${sanitizePromptLine(item.resistanceType, 40)}` : '';
      return `- ${sanitizePromptLine(item.name)} (${sanitizePromptLine(item.category, 50)}${count}${resistance})`;
    });

    return `\n--- SELECTED EQUIPMENT PROFILE ---\nSelected Profile: #${profile.id} (${sanitizePromptLine(profile.locationType, 40) || 'custom'})\nAvailable Equipment:\n${itemLines.length ? itemLines.join('\n') : '- No equipment listed'}\nInstruction: build plans only with the selected profile equipment above. If the equipment is insufficient, ask one brief clarification or offer bodyweight-safe alternatives.\n--- END SELECTED EQUIPMENT PROFILE ---`;
  } catch (err) {
    logger.warn('[AIChatRoutes] Selected equipment profile context failed:', err.message);
    return `\n--- SELECTED EQUIPMENT PROFILE ---\nSelected Profile ID: ${equipmentProfileId}\nProfile details could not be loaded. Ask for a visible equipment profile before planning instead of inventing equipment.\n--- END SELECTED EQUIPMENT PROFILE ---`;
  }
}

const buildTranscriptionErrorResponse = (err) => {
  const isConfigError = err?.message?.includes('not configured');
  return {
    status: isConfigError ? 503 : 500,
    body: {
      success: false,
      error: isConfigError ? 'Transcription service unavailable' : 'Transcription failed',
      code: isConfigError ? 'TRANSCRIPTION_NOT_CONFIGURED' : 'TRANSCRIPTION_FAILED',
    },
  };
};

// All routes require authentication
router.use(protect);

/**
 * GET /api/ai-chat/diagnostics
 * Admin-only endpoint to check AI service health
 */
router.get('/diagnostics', (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin only' });
  }
  const diag = getAIChatDiagnostics();
  res.json({ success: true, data: diag });
});

// Context permissions by role
const ROLE_CONTEXTS = {
  client: ['general', 'macro_logging', 'form_tips', 'workout_suggestions', 'coach_assistant'],
  trainer: ['general', 'macro_logging', 'form_tips', 'workout_suggestions', 'workout_generation', 'client_review', 'scheduling', 'progress_analysis', 'exercise_library', 'client_onboarding', 'coach_assistant'],
  admin: ['general', 'macro_logging', 'form_tips', 'workout_suggestions', 'workout_generation', 'client_review', 'data_management', 'scheduling', 'progress_analysis', 'exercise_library', 'gamification', 'client_onboarding', 'coach_assistant'],
};

function resolveConversationAudienceRole(userRole, requestedRole) {
  if (requestedRole === undefined || requestedRole === null || requestedRole === '') return userRole;
  if (requestedRole === userRole) return userRole;
  if (userRole === 'admin' && (requestedRole === 'trainer' || requestedRole === 'client')) return requestedRole;
  if (userRole === 'trainer' && requestedRole === 'client') return 'client';
  return null;
}

/**
 * POST /api/ai-chat/conversations
 * Create a new conversation thread
 */
router.post('/conversations', async (req, res) => {
  try {
    const { context = 'general', title, targetUserId, responseStyle = 'both', audienceRole } = req.body;
    const userRole = req.user.role || 'client';
    const conversationRole = resolveConversationAudienceRole(userRole, audienceRole);
    if (!conversationRole) {
      return res.status(403).json({ success: false, code: 'INVALID_AUDIENCE_ROLE', error: 'Conversation audience is not available for this account.' });
    }
    const allowedContexts = ROLE_CONTEXTS[conversationRole] || ROLE_CONTEXTS.client;

    if (!allowedContexts.includes(context)) {
      return res.status(403).json({
        success: false,
        error: `Context "${context}" not available for ${conversationRole} role`,
        allowedContexts,
      });
    }

    // Validate response style
    const validStyles = ['phd_only', 'simple_only', 'balanced', 'both'];
    const resolvedStyle = validStyles.includes(responseStyle) ? responseStyle : 'balanced';

    let resolvedTargetUserId = null;
    const canTargetClient = userRole === 'admin' || userRole === 'trainer';
    const hasRequestedTarget = targetUserId !== undefined && targetUserId !== null && targetUserId !== '';

    if (canTargetClient && hasRequestedTarget) {
      resolvedTargetUserId = parseContextClientId(targetUserId);
      if (!resolvedTargetUserId) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_TARGET_USER_ID',
          error: 'targetUserId must be a strict positive integer.',
        });
      }

      if (userRole === 'trainer') {
        const access = await checkClientAccess(req.user, resolvedTargetUserId, sequelize);
        if (!access.allowed) {
          if (process.env.AI_CHAT_CLIENT_ACCESS_SOFT === 'true') {
            logger.warn('[AIChatRoutes] SOFT MODE: trainer %d not verified for Client #%d at conversation creation (reason: %s) - allowing per AI_CHAT_CLIENT_ACCESS_SOFT',
              req.user.id, resolvedTargetUserId, access.reason);
          } else {
            logger.warn('[AIChatRoutes] Trainer %d DENIED conversation target Client #%d (reason: %s)',
              req.user.id, resolvedTargetUserId, access.reason);
            return res.status(403).json({
              success: false,
              code: 'CLIENT_ACCESS_DENIED',
              error: CLIENT_ACCESS_DENIED_MESSAGE,
            });
          }
        }
      }
    }
    // Build create payload — only include targetUserId if it has a value
    // (column may not exist yet if migration hasn't run)
    const createPayload = {
      userId: req.user.id,
      role: conversationRole,
      title: title || null,
      context,
      messages: [],
      status: 'active',
      messageCount: 0,
      metadata: { responseStyle: resolvedStyle, audienceRole: conversationRole },
    };
    if (resolvedTargetUserId) {
      createPayload.targetUserId = resolvedTargetUserId;
    }

    let conversation;
    try {
      conversation = await AiConversation.create(createPayload);
    } catch (createErr) {
      // If targetUserId column doesn't exist yet, retry without it
      if (createErr.message?.includes('targetUserId') || createErr.original?.code === '42703') {
        logger.error('MIGRATION REQUIRED: targetUserId column missing from ai_conversations table', {
          environment: process.env.NODE_ENV,
          timestamp: new Date().toISOString(),
        });
        delete createPayload.targetUserId;
        conversation = await AiConversation.create(createPayload);
      } else {
        throw createErr;
      }
    }

    return res.status(201).json({
      success: true,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        context: conversation.context,
        role: conversation.role,
        targetUserId: conversation.targetUserId,
        status: conversation.status,
        messageCount: 0,
        createdAt: conversation.createdAt,
        responseStyle: resolvedStyle,
      },
    });
  } catch (err) {
    logger.error('[AIChatRoutes] Create conversation error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to create conversation' });
  }
});

/**
 * GET /api/ai-chat/conversations
 * List user's conversations (most recent first)
 */
router.get('/conversations', async (req, res) => {
  try {
    const { status = 'active', limit = 20, offset = 0, audienceRole } = req.query;
    const conversationRole = audienceRole ? resolveConversationAudienceRole(req.user.role || 'client', audienceRole) : null;
    if (audienceRole && !conversationRole) {
      return res.status(403).json({ success: false, code: 'INVALID_AUDIENCE_ROLE', error: 'Conversation audience is not available for this account.' });
    }

    // Only allow listing active or archived conversations (not deleted)
    const allowedStatuses = ['active', 'archived'];
    const resolvedStatus = allowedStatuses.includes(status) ? status : 'active';

    const conversations = await AiConversation.findAndCountAll({
      where: {
        userId: req.user.id,
        status: resolvedStatus,
        ...(conversationRole ? { role: conversationRole } : {}),
      },
      attributes: ['id', 'title', 'context', 'role', 'status', 'messageCount', 'lastMessageAt', 'createdAt', 'targetUserId'],
      order: [['lastMessageAt', 'DESC NULLS LAST'], ['createdAt', 'DESC']],
      limit: Math.min(Number(limit) || 20, 50),
      offset: Number(offset) || 0,
    });

    return res.json({
      success: true,
      conversations: conversations.rows,
      total: conversations.count,
    });
  } catch (err) {
    logger.error('[AIChatRoutes] List conversations error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to list conversations' });
  }
});

/**
 * GET /api/ai-chat/conversations/:id
 * Get a conversation with full message history
 */
router.get('/conversations/:id', async (req, res) => {
  try {
    const conversationRole = req.query.audienceRole
      ? resolveConversationAudienceRole(req.user.role || 'client', req.query.audienceRole)
      : null;
    if (req.query.audienceRole && !conversationRole) {
      return res.status(403).json({ success: false, code: 'INVALID_AUDIENCE_ROLE', error: 'Conversation audience is not available for this account.' });
    }
    const conversation = await AiConversation.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
        status: { [Op.ne]: 'deleted' },
        ...(conversationRole ? { role: conversationRole } : {}),
      },
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    return res.json({
      success: true,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        context: conversation.context,
        role: conversation.role,
        targetUserId: conversation.targetUserId,
        status: conversation.status,
        messages: conversation.messages,
        messageCount: conversation.messageCount,
        metadata: sanitizeAiChatMetadataForClient(conversation.metadata),
        lastMessageAt: conversation.lastMessageAt,
        createdAt: conversation.createdAt,
      },
    });
  } catch (err) {
    logger.error('[AIChatRoutes] Get conversation error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to get conversation' });
  }
});

/**
 * POST /api/ai-chat/conversations/:id/messages
 * Send a message and get AI response
 *
 * PRIVACY: Identity-blind AI — body-aware but never knows who the client is.
 * - Consent enforced: checks AiPrivacyProfile before processing
 * - Outbound PII stripping: client names replaced with Client #ID before AI sees the message
 * - Inbound PII stripping: AI responses scrubbed for any leaked identity data
 */
router.post('/conversations/:id/messages', requireSubscription('pro', { feature: 'chat' }), aiRateLimiter, strictPiiMiddleware, async (req, res) => {
  try {
    const { message, foodContext, requestContext } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        code: 'MESSAGE_REQUIRED',
        error: 'Message is required',
      });
    }

    if (message.length > AI_CHAT_MESSAGE_MAX_CHARS) {
      return res.status(400).json({
        success: false,
        code: 'MESSAGE_TOO_LONG',
        error: `Message too long (max ${AI_CHAT_MESSAGE_MAX_CHARS} characters)`,
        maxChars: AI_CHAT_MESSAGE_MAX_CHARS,
      });
    }

    const hasEquipmentContext = hasEquipmentProfileRequest(requestContext);
    const selectedEquipmentProfileId = hasEquipmentContext
      ? parseOptionalPositiveInteger(requestContext.equipmentProfileId)
      : null;
    if (hasEquipmentContext && !selectedEquipmentProfileId) {
      return res.status(400).json({
        success: false,
        code: 'VALID_EQUIPMENT_PROFILE_ID_REQUIRED',
        error: 'Valid equipment profile ID is required',
      });
    }
    const hasScheduledContext = hasScheduledSessionRequest(requestContext);
    const selectedScheduledSessionId = hasScheduledContext
      ? parseOptionalPositiveInteger(requestContext.scheduledSessionId)
      : null;
    if (hasScheduledContext && !selectedScheduledSessionId) {
      return res.status(400).json({
        success: false,
        code: 'VALID_SCHEDULED_SESSION_ID_REQUIRED',
        error: 'Valid scheduled session ID is required',
      });
    }
    const hasScheduledDate = requestContext
      && typeof requestContext === 'object'
      && Object.prototype.hasOwnProperty.call(requestContext, 'scheduledSessionDate');
    const selectedScheduledSessionDate = hasScheduledDate
      ? parseOptionalIsoDate(requestContext.scheduledSessionDate)
      : null;
    if (hasScheduledDate && !selectedScheduledSessionDate) {
      return res.status(400).json({
        success: false,
        code: 'VALID_SCHEDULED_SESSION_DATE_REQUIRED',
        error: 'Valid scheduled session date is required',
      });
    }
    const hasScheduledCredits = requestContext
      && typeof requestContext === 'object'
      && Object.prototype.hasOwnProperty.call(requestContext, 'scheduledSessionCredits');
    const selectedScheduledSessionCredits = hasScheduledCredits
      ? parseOptionalCredits(requestContext.scheduledSessionCredits)
      : null;
    if (hasScheduledCredits && selectedScheduledSessionCredits === null) {
      return res.status(400).json({
        success: false,
        code: 'VALID_SCHEDULED_SESSION_CREDITS_REQUIRED',
        error: 'Valid scheduled session credits are required',
      });
    }
    const hasWorkoutDateContext = hasWorkoutDateRequest(requestContext);
    const selectedWorkoutDate = hasWorkoutDateContext
      ? parseOptionalIsoDate(requestContext.workoutDate)
      : null;
    if (hasWorkoutDateContext && !selectedWorkoutDate) {
      return res.status(400).json({
        success: false,
        code: 'VALID_WORKOUT_DATE_REQUIRED',
        error: 'Valid workout date is required',
      });
    }
    const routeContextSource = requestContext && typeof requestContext === 'object'
      ? parseOptionalRouteToken(requestContext.source)
      : null;
    const routeContextIntent = requestContext && typeof requestContext === 'object'
      ? parseOptionalRouteToken(requestContext.intent)
      : null;
    const routeContextSurface = requestContext && typeof requestContext === 'object'
      ? parseOptionalRouteToken(requestContext.surface)
      : null;
    const coachProposalRouteContext = buildCoachProposalRouteContext({
      source: routeContextSource,
      intent: routeContextIntent,
      surface: routeContextSurface,
      scheduledSessionId: selectedScheduledSessionId,
      scheduledSessionDate: selectedScheduledSessionDate,
      scheduledSessionCredits: selectedScheduledSessionCredits,
      workoutDate: selectedWorkoutDate,
    });

    const conversation = await AiConversation.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
        status: 'active',
      },
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Active conversation not found' });
    }

    // ── PHASE 1: CONSENT ENFORCEMENT ──
    // Check that the target user (or self) has granted AI consent
    const consentTargetId = conversation.targetUserId || req.user.id;
    try {
      const [consentRows] = await sequelize.query(
        `SELECT "aiEnabled", "withdrawnAt" FROM ai_privacy_profiles WHERE "userId" = :userId LIMIT 1`,
        { replacements: { userId: consentTargetId }, type: sequelize.QueryTypes.SELECT }
      ).then(r => [r]).catch(() => [[]]);

      const consent = Array.isArray(consentRows) ? consentRows[0] : consentRows;
      if (consent) {
        if (!consent.aiEnabled || consent.withdrawnAt) {
          return res.status(403).json({
            success: false,
            error: 'AI consent has been withdrawn for this user. Please re-enable AI features in privacy settings.',
            code: 'AI_CONSENT_WITHDRAWN',
          });
        }
      }
      // If no consent record exists, allow (backwards-compatible — user may not have been through onboarding yet)
    } catch (consentErr) {
      // Non-fatal: if consent table doesn't exist yet (migration pending), allow through
      logger.warn('[AIChatRoutes] Consent check failed (non-fatal):', consentErr.message);
    }

    // Guard against unbounded conversation growth
    if (conversation.messages && conversation.messages.length >= 200) {
      return res.status(400).json({ success: false, error: 'Conversation limit reached (100 exchanges). Please start a new conversation.' });
    }

    // ── PHASE 2: IDENTITY-BLIND AI — strip PII from outbound message ──
    // For admin/trainer: ONLY enrich with client data when a target client is explicitly selected.
    // Without this guard, the admin's own user ID is used as the "client", causing
    // the AI to say "Client #2" (the admin's ID) instead of operating in general coach mode.
    const isAdminOrTrainer = conversation.role === 'admin' || conversation.role === 'trainer';
    const requesterIsStaff = req.user.role === 'admin' || req.user.role === 'trainer';
    const enrichUserId = requesterIsStaff
      ? (conversation.targetUserId || null)   // null = no client selected → skip enrichment
      : (conversation.targetUserId || req.user.id);  // clients always enrich with their own data

    // ── TRAINER RBAC: Verify trainer is assigned to target client ──
    // Slice A1 (2026-06-10): HARDENED from soft warn-and-continue to the
    // canonical fail-closed gate (contextEngine/clientAccess.mjs — active
    // ClientTrainerAssignment OR session history; pending grants nothing).
    // Escape hatch: AI_CHAT_CLIENT_ACCESS_SOFT=true restores legacy
    // warn-only behavior if a real workflow breaks. Admins bypass.
    //
    // SWA-192 P0-2: this branch used to also require
    // `conversation.role === 'trainer'`, which keyed AUTHORIZATION on the
    // thread's audience while `enrichUserId` above keys ENRICHMENT on the
    // ACTOR (`requesterIsStaff`). resolveConversationAudienceRole() explicitly
    // lets a trainer open a `role: 'client'` thread, so for that shape this
    // gate was never entered at all — while enrichWithUserData() below still
    // loaded the target client's live data into the prompt on every message.
    // Authorization must key on the actor and the subject, never on the
    // audience label. This RESTORES the fail-closed gate on a path that
    // skipped it; it does not narrow clientAccess itself (the bounded
    // session-history fallback is Sean's ruling of 2026-07-30 and is untouched).
    if (conversation.targetUserId && req.user.role === 'trainer') {
      const access = await checkClientAccess(req.user, conversation.targetUserId, sequelize);
      if (!access.allowed) {
        if (process.env.AI_CHAT_CLIENT_ACCESS_SOFT === 'true') {
          logger.warn('[AIChatRoutes] SOFT MODE: trainer %d not verified for Client #%d (reason: %s) — allowing per AI_CHAT_CLIENT_ACCESS_SOFT',
            req.user.id, conversation.targetUserId, access.reason);
        } else {
          logger.warn('[AIChatRoutes] Trainer %d DENIED access to Client #%d (reason: %s)',
            req.user.id, conversation.targetUserId, access.reason);
          return res.status(403).json({
            success: false,
            code: 'CLIENT_ACCESS_DENIED',
            error: CLIENT_ACCESS_DENIED_MESSAGE,
          });
        }
      }
    }
    let generalIdentitySanitizer = null;
    if (requesterIsStaff) {
      try {
        const identityPrivacy = await createAccessibleClientIdentitySanitizer({ requester: req.user, sequelize });
        generalIdentitySanitizer = identityPrivacy.sanitize;
      } catch (error) {
        logger.error('[AIChatRoutes] General identity redaction failed closed', {
          userId: req.user.id,
          role: req.user.role,
          errorName: error?.name ?? 'Error',
        });
        return res.status(503).json({
          success: false,
          code: 'AI_IDENTITY_REDACTION_UNAVAILABLE',
          error: 'Client identity protection is temporarily unavailable. Please try again.',
        });
      }
    }

    let sanitizedMessage = message.trim();
    let piiStripped = false;
    // Strip client-identity terms only when we have a target client to name-map.
    if (enrichUserId) {
      try {
        const stripResult = await stripIdentityFromMessage(sanitizedMessage, enrichUserId, sequelize);
        sanitizedMessage = stripResult.sanitizedMessage;
        piiStripped = stripResult.identitiesStripped > 0;
      } catch (stripErr) {
        logger.warn('[AIChatRoutes] PII stripping failed (non-fatal):', stripErr.message);
        sanitizedMessage = CURRENT_MESSAGE_WITHHELD;
        piiStripped = true;
      }
    } else {
      // No selected client to name-map, but the message must STILL never carry raw
      // contact PII (emails/phones/SSNs/cards) to an external LLM (Rule 8). Fail-closed:
      // withhold the message if the generic scrub throws.
      try {
        const generic = await scrubGenericPII(sanitizedMessage);
        sanitizedMessage = generic.sanitizedText;
        piiStripped = generic.piiRemoved > 0;
      } catch (scrubErr) {
        logger.warn('[AIChatRoutes] Generic PII scrub failed (non-fatal):', scrubErr.message);
        sanitizedMessage = CURRENT_MESSAGE_WITHHELD;
        piiStripped = true;
      }
    }
    if (generalIdentitySanitizer) {
      const stripResult = generalIdentitySanitizer(sanitizedMessage);
      sanitizedMessage = stripResult.sanitizedMessage;
      if (stripResult.identitiesStripped > 0) piiStripped = true;
    }

    // Build system prompt based on role + context, enriched with user data
    // For trainer/admin conversations with a target client, enrich with the CLIENT's data
    const responseStyle = conversation.metadata?.responseStyle || 'both';
    let systemPrompt = getSystemPrompt(conversation.role, conversation.context, responseStyle);
    if (isAdminOrTrainer && conversation.context === 'coach_assistant') {
      let coachIntakeContext = null;
      try {
        const [queueResult, healthResult, retentionResult, retentionPurgePlanResult] = await Promise.all([
          listUnifiedCoachIntakeItems({
            userId: req.user.id,
            scope: 'actionable',
            limit: 6,
            sequelizeOverride: sequelize,
          }),
          getCoachIntakeHealth({
            userId: req.user.id,
            sequelizeOverride: sequelize,
          }).catch(() => null),
          getCoachIntakeRetentionReport({
            userId: req.user.id,
            sequelizeOverride: sequelize,
          }).catch(() => null),
          purgeCoachIntakeRawArtifacts({
            userId: req.user.id,
            dryRun: true,
            sequelizeOverride: sequelize,
          }).catch(() => null),
        ]);
        coachIntakeContext = buildCoachIntakeContextFromResult(
          queueResult,
          healthResult,
          retentionResult,
          retentionPurgePlanResult,
        );
      } catch (err) {
        logger.warn('[AIChat] Coach intake context unavailable', {
          userId: req.user.id,
          error: err.message,
        });
      }
      systemPrompt += buildCoachIntakeContextPromptBlock(coachIntakeContext);
    }
    if (isAdminOrTrainer && AI_CHAT_COVERAGE_CONTEXTS.has(conversation.context)) {
      try {
        systemPrompt += await buildSwanCoachCoveragePromptBlockFromModels();
      } catch (err) {
        logger.warn('[AIChatRoutes] Content Studio coverage context unavailable', {
          userId: req.user.id,
          error: err.message,
        });
      }
    }
    // Only enrich with client data if a client is actually selected
    if (enrichUserId) {
      const userDataContext = await enrichWithUserData(
        enrichUserId, conversation.role, conversation.context, sequelize,
        sanitizeFoodContext(foodContext)
      );
      if (userDataContext) {
        systemPrompt += userDataContext;
      }
    }
    systemPrompt += await buildSelectedEquipmentProfilePromptBlock({
      context: conversation.context,
      equipmentProfileId: selectedEquipmentProfileId,
      requesterId: req.user.id,
      requesterRole: conversation.role,
    });
    systemPrompt += buildSelectedScheduledSessionPromptBlock({
      context: conversation.context,
      scheduledSessionId: selectedScheduledSessionId,
      scheduledSessionDate: selectedScheduledSessionDate,
      scheduledSessionCredits: selectedScheduledSessionCredits,
    });
    systemPrompt += buildSelectedWorkoutDatePromptBlock({
      context: conversation.context,
      workoutDate: selectedWorkoutDate,
    });
    if (generalIdentitySanitizer) {
      const systemStrip = generalIdentitySanitizer(systemPrompt);
      systemPrompt = systemStrip.sanitizedMessage;
      if (systemStrip.identitiesStripped > 0) piiStripped = true;
    }
    const promptHistory = await sanitizePromptHistory({
      messages: conversation.messages,
      enrichUserId,
      sequelize,
      generalMessageStripper: generalIdentitySanitizer,
    });
    if (promptHistory.identitiesStripped > 0) piiStripped = true;

    // Use sanitized message/history (identity stripped) for the AI prompt
    const promptMessages = buildPromptMessages(systemPrompt, promptHistory.messages, sanitizedMessage);

    // Send to AI provider
    const aiResult = await sendChatMessage(promptMessages);

    // ── PHASE 2b: Strip identity from AI response (bidirectional scrubbing) ──
    let aiContent = aiResult.content;
    if (enrichUserId) {
      try {
        const responseStrip = await stripIdentityFromResponse(aiContent, enrichUserId, sequelize);
        aiContent = responseStrip.sanitizedResponse;
        if (responseStrip.identitiesStripped > 0) piiStripped = true;
      } catch (stripErr) {
        logger.warn('[AIChatRoutes] Response PII stripping failed (non-fatal):', stripErr.message);
        aiContent = RESPONSE_MESSAGE_WITHHELD;
        piiStripped = true;
      }
    }
    if (generalIdentitySanitizer) {
      const responseStrip = generalIdentitySanitizer(aiContent);
      aiContent = responseStrip.sanitizedMessage;
      if (responseStrip.identitiesStripped > 0) piiStripped = true;
    }
    aiContent = sanitizeNutritionChatCopy(aiContent, {
      context: conversation.context,
      foodContext,
      message: sanitizedMessage,
      maxLength: AI_CHAT_MESSAGE_MAX_CHARS,
    });

    // Create message entries
    // Store the ORIGINAL user message in conversation history (trainer sees what they typed)
    // but the AI only ever saw the sanitized version
    const now = new Date().toISOString();
    const userMsg = { role: 'user', content: message.trim(), timestamp: now };
    const assistantMsg = {
      role: 'assistant',
      content: aiContent,
      timestamp: new Date().toISOString(),
      metadata: {
        provider: aiResult.provider,
        model: aiResult.model,
        tokenUsage: aiResult.tokenUsage,
        privacyApplied: piiStripped,
      },
    };

    // Update conversation
    const updatedMessages = [...conversation.messages, userMsg, assistantMsg];
    const safeFailoverTrace = sanitizeAiFailoverTrace(aiResult.failoverTrace);
    const updatedMetadata = sanitizeAiChatMetadataForClient({
      ...conversation.metadata,
      lastProvider: aiResult.provider,
      lastModel: aiResult.model,
      failoverTrace: safeFailoverTrace,
    });

    await conversation.update({
      messages: updatedMessages,
      messageCount: updatedMessages.length,
      lastMessageAt: new Date(),
      metadata: updatedMetadata,
      title: conversation.title || generateTitle(message.trim()),
    });

    let proposalResult = { proposals: [], frontendActions: [] };
    let proposalError = null;
    const proposalContent = aiContent === RESPONSE_MESSAGE_WITHHELD ? '' : aiContent;
    if (proposalContent) {
      try {
        proposalResult = await createCoachActionProposalsFromAiResponse({
          content: proposalContent,
          user: req.user,
          conversation,
          sourceMessageId: assistantMsg.timestamp,
          routeContext: coachProposalRouteContext,
          sequelizeOverride: sequelize,
        });
      } catch (proposalErr) {
        proposalError = {
          code: COACH_ACTION_PROPOSAL_FAILED_CODE,
          message: COACH_ACTION_PROPOSAL_FAILED_MESSAGE,
        };
        logger.warn('[AIChatRoutes] Coach action proposal creation failed:', {
          internalErrorCode: proposalErr.code || null,
          error: proposalErr.message,
        });
      }
    }

    return res.json({
      success: true,
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      conversationId: conversation.id,
      messageCount: updatedMessages.length,
      coachActionProposals: proposalResult.proposals.length > 0 ? proposalResult.proposals : undefined,
      coachActionProposalError: proposalError || undefined,
      frontendActions: proposalResult.frontendActions.length > 0 ? proposalResult.frontendActions : undefined,
      // Cortex P0 §5.4: refused dispatches (registry/pain/safety) so the coach
      // UI can explain the refusal and offer the eligible alternatives.
      frontendActionRefusals: proposalResult.frontendActionRefusals?.length > 0
        ? proposalResult.frontendActionRefusals
        : undefined,
    });
  } catch (err) {
    logger.error('[AIChatRoutes] Send message error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to send message' });
  }
  // Lock auto-released by aiRateLimiter middleware on res finish/close
});

/**
 * PATCH /api/ai-chat/conversations/:id
 * Update conversation title or status
 */
router.patch('/conversations/:id', async (req, res) => {
  try {
    const { title, status } = req.body;

    const conversation = await AiConversation.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
        status: { [Op.ne]: 'deleted' },
      },
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (status && ['active', 'archived'].includes(status)) updates.status = status;

    await conversation.update(updates);

    return res.json({ success: true, conversation: { id: conversation.id, ...updates } });
  } catch (err) {
    logger.error('[AIChatRoutes] Update conversation error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to update conversation' });
  }
});

/**
 * DELETE /api/ai-chat/conversations/:id
 * Soft-delete a conversation
 */
router.delete('/conversations/:id', async (req, res) => {
  try {
    const conversation = await AiConversation.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
        status: { [Op.ne]: 'deleted' },
      },
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    await conversation.update({ status: 'deleted' });

    return res.json({ success: true, message: 'Conversation deleted' });
  } catch (err) {
    logger.error('[AIChatRoutes] Delete conversation error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to delete conversation' });
  }
});

/**
 * POST /api/ai-chat/transcribe
 * Transcribe an uploaded audio file using Gemini Flash multimodal.
 * Rate limited to 10 transcriptions per hour per user.
 */
// S7/A9 (JARVIS): strictPiiMiddleware closes the voice-audit gap — any text
// fields riding the multipart body are sanitized like every other AI route.
router.post('/transcribe', requireSubscription('pro', { feature: 'generation' }), aiRateLimiter, audioUpload.single('audio'), strictPiiMiddleware, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No audio file provided' });
    }

    // Atomic check-and-record: prevents race condition between check and record
    const { allowed, remaining } = checkAndRecordTranscription(req.user.id);
    if (!allowed) {
      return res.status(429).json({
        success: false,
        error: 'Transcription rate limit reached (10/hour). Please try again later.',
        remaining: 0,
      });
    }

    logger.info('[AI Chat] Transcription request', {
      userId: req.user?.id,
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      remaining,
    });

    const transcript = await transcribeAudio(req.file.buffer, req.file.originalname);

    return res.json({
      success: true,
      text: transcript,
      remaining,
      metadata: {
        filename: req.file.originalname,
        size: req.file.size,
      },
    });
  } catch (err) {
    logger.error('[AI Chat] Transcription failed', { error: err.message, userId: req.user?.id });
    const response = buildTranscriptionErrorResponse(err);
    return res.status(response.status).json(response.body);
  }
});

/**
 * POST /api/ai-chat/tts
 * Text-to-speech using Gemini 2.5 Flash TTS (native AI voice).
 * Uses GEMINI_API_KEY or GOOGLE_API_KEY — same key as chat.
 * 30 voice options, returns WAV audio.
 * Rate limited to 20 TTS requests per hour per user.
 *
 * Gemini TTS voices (female-sounding, warm picks):
 * Kore — warm, confident female (default)
 * Aoede — smooth, gentle female
 * Leda — bright, energetic female
 * Fenrir — deeper, authoritative
 * Puck — playful, youthful
 */
router.post('/tts', requireSubscription('pro', { feature: 'generation' }), aiRateLimiter, strictPiiMiddleware, async (req, res) => {
  try {
    const { text, voice = 'Kore' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ success: false, error: 'Text is required' });
    }
    if (text.length > 5000) {
      return res.status(400).json({ success: false, error: 'Text too long (max 5000 chars)' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        error: AI_CHAT_TTS_UNAVAILABLE_MESSAGE,
        code: 'TTS_NOT_CONFIGURED',
      });
    }

    // Validate voice name from Gemini's 30 available voices
    const validVoices = [
      'Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Leda', 'Orus', 'Aoede',
      'Callirrhoe', 'Autonoe', 'Enceladus', 'Iapetus', 'Umbriel', 'Algieba',
      'Despina', 'Erinome', 'Algenib', 'Rasalgethi', 'Laomedeia', 'Achernar',
      'Alnilam', 'Schedar', 'Gacrux', 'Pulcherrima', 'Achird', 'Zubenelgenubi',
      'Vindemiatrix', 'Sadachbia', 'Sadaltager', 'Sulafat',
    ];
    const voiceName = validVoices.includes(voice) ? voice : 'Kore';

    logger.info('[AI Chat] Gemini TTS request', {
      userId: req.user?.id,
      textLength: text.length,
      voice: voiceName,
    });

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: text.slice(0, 5000) }],
          }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => 'Unknown error');
      logger.error('[AI Chat] Gemini TTS failed', { status: geminiRes.status, error: errText });
      return res.status(502).json({
        success: false,
        error: AI_CHAT_TTS_UNAVAILABLE_MESSAGE,
        code: 'TTS_PROVIDER_FAILED',
      });
    }

    const data = await geminiRes.json();

    // Extract base64 audio from Gemini response
    const audioPart = data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!audioPart?.inlineData?.data) {
      logger.error('[AI Chat] Gemini TTS: no audio in response', { data: JSON.stringify(data).slice(0, 500) });
      return res.status(502).json({
        success: false,
        error: AI_CHAT_TTS_UNAVAILABLE_MESSAGE,
        code: 'TTS_AUDIO_UNAVAILABLE',
      });
    }

    const pcmBase64 = audioPart.inlineData.data;
    const mimeType = audioPart.inlineData.mimeType || 'audio/L16;rate=24000';
    const pcmBuffer = Buffer.from(pcmBase64, 'base64');

    // Convert raw PCM (24kHz, 16-bit, mono) to WAV for browser playback
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmBuffer.length;
    const wavHeaderSize = 44;

    const wavBuffer = Buffer.alloc(wavHeaderSize + dataSize);
    // RIFF header
    wavBuffer.write('RIFF', 0);
    wavBuffer.writeUInt32LE(36 + dataSize, 4);
    wavBuffer.write('WAVE', 8);
    // fmt chunk
    wavBuffer.write('fmt ', 12);
    wavBuffer.writeUInt32LE(16, 16);           // chunk size
    wavBuffer.writeUInt16LE(1, 20);            // PCM format
    wavBuffer.writeUInt16LE(numChannels, 22);
    wavBuffer.writeUInt32LE(sampleRate, 24);
    wavBuffer.writeUInt32LE(byteRate, 28);
    wavBuffer.writeUInt16LE(blockAlign, 32);
    wavBuffer.writeUInt16LE(bitsPerSample, 34);
    // data chunk
    wavBuffer.write('data', 36);
    wavBuffer.writeUInt32LE(dataSize, 40);
    pcmBuffer.copy(wavBuffer, 44);

    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', wavBuffer.length);
    res.setHeader('Cache-Control', 'no-cache');
    return res.send(wavBuffer);
  } catch (err) {
    logger.error('[AI Chat] TTS error', { error: err.message, userId: req.user?.id });
    return res.status(500).json({
      success: false,
      error: AI_CHAT_TTS_UNAVAILABLE_MESSAGE,
      code: 'TTS_FAILED',
    });
  }
});

/**
 * Generate a short title from the first user message
 */
function generateTitle(message) {
  const cleaned = message.replace(/\n/g, ' ').trim();
  if (cleaned.length <= 50) return cleaned;
  return cleaned.slice(0, 47) + '...';
}

export default router;
