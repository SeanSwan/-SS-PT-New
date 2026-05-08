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
      const n = Number(raw[key]);
      clean[key] = Number.isFinite(n) ? n : null;
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
import { getSystemPrompt, buildPromptMessages, sendChatMessage, enrichWithUserData, getAIChatDiagnostics } from '../services/aiChatService.mjs';
import { transcribeAudio, isAudioFile, checkAndRecordTranscription } from '../services/voiceTranscriptionService.mjs';
import { stripIdentityFromMessage, stripIdentityFromResponse } from '../services/aiPrivacyService.mjs';
import { strictPiiMiddleware } from '../middleware/piiSanitizationMiddleware.mjs';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';
import {
  buildCoachIntakeContextPromptBlock,
  buildCoachIntakeContextFromResult,
} from '../services/ai/coachIntakeContextService.mjs';
import { listUnifiedCoachIntakeItems } from '../services/coachIntakeItemService.mjs';
import { getCoachIntakeHealth } from '../services/coachIntakeHealthService.mjs';
import { getCoachIntakeRetentionReport } from '../services/coachIntakeRetentionPolicyService.mjs';
import { createCoachActionProposalsFromAiResponse } from '../services/ai/coachActionProposalService.mjs';

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
  client: ['general', 'macro_logging', 'form_tips', 'workout_suggestions'],
  trainer: ['general', 'macro_logging', 'form_tips', 'workout_suggestions', 'workout_generation', 'client_review', 'scheduling', 'progress_analysis', 'exercise_library', 'client_onboarding', 'coach_assistant'],
  admin: ['general', 'macro_logging', 'form_tips', 'workout_suggestions', 'workout_generation', 'client_review', 'data_management', 'scheduling', 'progress_analysis', 'exercise_library', 'gamification', 'client_onboarding', 'coach_assistant'],
};

/**
 * POST /api/ai-chat/conversations
 * Create a new conversation thread
 */
router.post('/conversations', async (req, res) => {
  try {
    const { context = 'general', title, targetUserId, responseStyle = 'both' } = req.body;
    const userRole = req.user.role || 'client';
    const allowedContexts = ROLE_CONTEXTS[userRole] || ROLE_CONTEXTS.client;

    if (!allowedContexts.includes(context)) {
      return res.status(403).json({
        success: false,
        error: `Context "${context}" not available for ${userRole} role`,
        allowedContexts,
      });
    }

    // Validate response style
    const validStyles = ['phd_only', 'simple_only', 'balanced', 'both'];
    const resolvedStyle = validStyles.includes(responseStyle) ? responseStyle : 'balanced';

    // Only trainers/admins can set a target client
    const resolvedTargetUserId = (userRole === 'admin' || userRole === 'trainer') && targetUserId
      ? targetUserId
      : null;

    // Build create payload — only include targetUserId if it has a value
    // (column may not exist yet if migration hasn't run)
    const createPayload = {
      userId: req.user.id,
      role: userRole,
      title: title || null,
      context,
      messages: [],
      status: 'active',
      messageCount: 0,
      metadata: { responseStyle: resolvedStyle },
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
    const { status = 'active', limit = 20, offset = 0 } = req.query;

    // Only allow listing active or archived conversations (not deleted)
    const allowedStatuses = ['active', 'archived'];
    const resolvedStatus = allowedStatuses.includes(status) ? status : 'active';

    const conversations = await AiConversation.findAndCountAll({
      where: {
        userId: req.user.id,
        status: resolvedStatus,
      },
      attributes: ['id', 'title', 'context', 'status', 'messageCount', 'lastMessageAt', 'createdAt'],
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
    const conversation = await AiConversation.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
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
        metadata: conversation.metadata,
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
    const { message, foodContext } = req.body;

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
    const enrichUserId = isAdminOrTrainer
      ? (conversation.targetUserId || null)   // null = no client selected → skip enrichment
      : (conversation.targetUserId || req.user.id);  // clients always enrich with their own data

    // ── TRAINER RBAC: Verify trainer is assigned to target client ──
    if (conversation.targetUserId && conversation.role === 'trainer') {
      try {
        const [assignmentRows] = await sequelize.query(
          `SELECT 1 FROM sessions
           WHERE ("trainerId" = :trainerId OR "userId" = :trainerId)
             AND ("userId" = :clientId OR "trainerId" = :clientId)
           LIMIT 1`,
          { replacements: { trainerId: req.user.id, clientId: conversation.targetUserId }, type: sequelize.QueryTypes.SELECT }
        ).then(r => [r]).catch(() => [[]]);

        // If no session relationship found, also check if admin (admins bypass)
        const hasRelation = Array.isArray(assignmentRows) ? assignmentRows.length > 0 : !!assignmentRows;
        if (!hasRelation && req.user.role === 'trainer') {
          // Soft check — log warning but allow (trainers may be newly assigned)
          logger.warn('[AIChatRoutes] Trainer %d querying Client #%d data — no session relationship found',
            req.user.id, conversation.targetUserId);
        }
      } catch (rbacErr) {
        // Non-fatal: if sessions table structure differs, log and continue
        logger.warn('[AIChatRoutes] RBAC check failed (non-fatal):', rbacErr.message);
      }
    }
    let sanitizedMessage = message.trim();
    let piiStripped = false;
    // Only strip PII when we have a target client to protect
    if (enrichUserId) {
      try {
        const stripResult = await stripIdentityFromMessage(sanitizedMessage, enrichUserId, sequelize);
        sanitizedMessage = stripResult.sanitizedMessage;
        piiStripped = stripResult.identitiesStripped > 0;
      } catch (stripErr) {
        logger.warn('[AIChatRoutes] PII stripping failed (non-fatal):', stripErr.message);
        // Continue with original message — fail open for usability, but log the failure
      }
    }

    // Build system prompt based on role + context, enriched with user data
    // For trainer/admin conversations with a target client, enrich with the CLIENT's data
    const responseStyle = conversation.metadata?.responseStyle || 'both';
    let systemPrompt = getSystemPrompt(conversation.role, conversation.context, responseStyle);
    if (isAdminOrTrainer && conversation.context === 'coach_assistant') {
      let coachIntakeContext = null;
      try {
        const [queueResult, healthResult, retentionResult] = await Promise.all([
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
        ]);
        coachIntakeContext = buildCoachIntakeContextFromResult(queueResult, healthResult, retentionResult);
      } catch (err) {
        logger.warn('[AIChat] Coach intake context unavailable', {
          userId: req.user.id,
          error: err.message,
        });
      }
      systemPrompt += buildCoachIntakeContextPromptBlock(coachIntakeContext);
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
    // Use sanitized message (identity stripped) for the AI prompt
    const promptMessages = buildPromptMessages(systemPrompt, conversation.messages, sanitizedMessage);

    // Send to AI provider
    const aiResult = await sendChatMessage(promptMessages);

    // ── PHASE 2b: Strip identity from AI response (bidirectional scrubbing) ──
    let aiContent = aiResult.content;
    if (enrichUserId) {
      try {
        const responseStrip = await stripIdentityFromResponse(aiContent, enrichUserId, sequelize);
        aiContent = responseStrip.sanitizedResponse;
      } catch (stripErr) {
        logger.warn('[AIChatRoutes] Response PII stripping failed (non-fatal):', stripErr.message);
      }
    }

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
    const updatedMetadata = {
      ...conversation.metadata,
      lastProvider: aiResult.provider,
      lastModel: aiResult.model,
      failoverTrace: aiResult.failoverTrace,
    };

    await conversation.update({
      messages: updatedMessages,
      messageCount: updatedMessages.length,
      lastMessageAt: new Date(),
      metadata: updatedMetadata,
      title: conversation.title || generateTitle(message.trim()),
    });

    let proposalResult = { proposals: [], frontendActions: [] };
    let proposalError = null;
    if (aiResult.content) {
      try {
        proposalResult = await createCoachActionProposalsFromAiResponse({
          content: aiResult.content,
          user: req.user,
          conversation,
          sourceMessageId: assistantMsg.timestamp,
          sequelizeOverride: sequelize,
        });
      } catch (proposalErr) {
        proposalError = {
          code: proposalErr.code || 'COACH_PROPOSAL_CREATE_FAILED',
          message: proposalErr.message || 'Coach proposal creation failed',
        };
        logger.warn('[AIChatRoutes] Coach action proposal creation failed:', proposalError);
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
router.post('/transcribe', aiRateLimiter, audioUpload.single('audio'), async (req, res) => {
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
    const status = err.message?.includes('not configured') ? 503 : 500;
    return res.status(status).json({ success: false, error: err.message || 'Transcription failed' });
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
router.post('/tts', aiRateLimiter, async (req, res) => {
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
      return res.status(501).json({ success: false, error: 'Gemini API key not configured' });
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
      return res.status(502).json({ success: false, error: 'Gemini TTS provider error' });
    }

    const data = await geminiRes.json();

    // Extract base64 audio from Gemini response
    const audioPart = data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!audioPart?.inlineData?.data) {
      logger.error('[AI Chat] Gemini TTS: no audio in response', { data: JSON.stringify(data).slice(0, 500) });
      return res.status(502).json({ success: false, error: 'No audio generated' });
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
    return res.status(500).json({ success: false, error: 'TTS failed' });
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
