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
import { processAIDataUpdates } from '../services/aiDataWriteService.mjs';

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
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    if (message.length > 5000) {
      return res.status(400).json({ success: false, error: 'Message too long (max 5000 characters)' });
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
    // Only enrich with client data if a client is actually selected
    if (enrichUserId) {
      const userDataContext = await enrichWithUserData(
        enrichUserId, conversation.role, conversation.context, sequelize,
        foodContext && typeof foodContext === 'object' ? foodContext : null
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

    // Check if the AI response contains a data update action block
    let dataUpdateResult = null;
    if (aiResult.content && (conversation.role === 'admin' || conversation.role === 'trainer')) {
      try {
        const actionMatch = aiResult.content.match(/```json\s*(\{[\s\S]*?"action"\s*:\s*"update_client_data"[\s\S]*?\})\s*```/);
        if (actionMatch) {
          const actionPayload = JSON.parse(actionMatch[1]);
          // Security: Only allow data writes to the conversation's designated target user
          // Never trust targetUserId from the AI response (prompt injection risk)
          const targetId = conversation.targetUserId;
          if (targetId && actionPayload.updates) {
            dataUpdateResult = await processAIDataUpdates(
              targetId,
              actionPayload.updates,
              req.user.id,
              sequelize
            );
            logger.info('[AIChatRoutes] AI data update processed for user %d: %d updates, %d errors',
              targetId, dataUpdateResult.successful, dataUpdateResult.errors.length);
          }
        }
      } catch (parseErr) {
        logger.warn('[AIChatRoutes] Failed to parse AI data update action:', parseErr.message);
      }
    }

    // Check if the AI response contains a create_client / ONBOARD_CLIENT action block
    let clientCreateResult = null;
    if (aiResult.content && (req.user.role === 'admin' || req.user.role === 'trainer')) {
      try {
        const createMatch = aiResult.content.match(/```json\s*(\{[\s\S]*?"action"\s*:\s*"(?:create_client|ONBOARD_CLIENT)"[\s\S]*?\})\s*```/);
        if (createMatch) {
          const rawPayload = JSON.parse(createMatch[1]);
          const payload = rawPayload.data || rawPayload;
          const {
            firstName, lastName, email, phone, clientSource,
            fitnessGoal, healthConcerns, dateOfBirth, gender,
            weight, height, trainingExperience, trainerNotes,
            // Questionnaire fields the AI may extract
            preferredName, emergencyContactName, emergencyContactPhone,
            occupation, sleepHours, stressLevel, activityLevel,
            mealsPerDay, waterIntake, dietaryPreferences, foodAllergies,
            workoutsPerWeek, workoutTypes, favoriteExercises, dislikedExercises,
            movementLimitations, medications, doctorClearance,
          } = payload;

          if (!firstName || !lastName) {
            logger.warn('[AIChatRoutes] AI create_client missing required fields (firstName/lastName)');
          } else {
            // Email may be '[EMAIL-REDACTED]' due to PII middleware stripping it from the AI response.
            // Generate a clean email from the name if the provided email is invalid/redacted.
            const isValidEmail = email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && !email.includes('REDACTED');
            const cryptoForEmail = await import('crypto');
            const emailSuffix = cryptoForEmail.default.randomBytes(3).toString('hex');
            // Sanitize name parts for email: strip non-alpha, collapse dots, trim dots
            const emailFirst = firstName.toLowerCase().replace(/[^a-z]/g, '') || 'client';
            const emailLast = lastName.toLowerCase().replace(/[^a-z]/g, '') || 'user';
            const clientEmail = isValidEmail
              ? email
              : `${emailFirst}.${emailLast}.${emailSuffix}@clients.swanstudios.com`;
            const { getAllModels } = await import('../models/index.mjs');
            const models = getAllModels();
            const User = models.User;

            // Check if email already exists
            const existing = await User.findOne({ where: { email: clientEmail.toLowerCase() } });
            if (existing) {
              logger.info('[AIChatRoutes] Client with email %s already exists (id=%d)', clientEmail, existing.id);
              clientCreateResult = { success: false, reason: 'email_exists', existingId: existing.id };
            } else {
              // Generate unique username (handle collisions)
              let username = `${firstName.toLowerCase().replace(/[^a-z]/g, '')}.${lastName.toLowerCase().replace(/[^a-z]/g, '')}`.replace(/\.{2,}/g, '.').replace(/^\.|\.$/, '');
              const existingUsername = await User.findOne({ where: { username } });
              if (existingUsername) {
                const crypto = await import('crypto');
                username += '.' + crypto.default.randomBytes(3).toString('hex');
              }

              // Generate temp password
              const cryptoMod = await import('crypto');
              const tempPassword = cryptoMod.default.randomBytes(12).toString('base64url');
              const bcrypt = await import('bcryptjs');
              const hashedPassword = await bcrypt.default.hash(tempPassword, 12);

              // Generate claim code (Crystalline Link Protocol)
              const { generateClaimToken } = await import('../services/claimTokenService.mjs');
              const claimToken = generateClaimToken();

              const newClient = await User.create({
                firstName,
                lastName,
                email: clientEmail.toLowerCase(),
                username,
                password: hashedPassword,
                phone: phone || null,
                role: 'client',
                isActive: true,
                accountStatus: 'invited',
                clientSource: clientSource || 'swanstudios',
                fitnessGoal: fitnessGoal || null,
                healthConcerns: healthConcerns || null,
                dateOfBirth: dateOfBirth || null,
                gender: gender || null,
                weight: weight ? parseFloat(weight) : null,
                height: height ? parseFloat(height) : null,
                trainingExperience: trainingExperience || null,
                forcePasswordChange: true,
                claimTokenHash: claimToken.hash,
                claimTokenExpires: claimToken.expires,
                availableSessions: (clientSource === 'move_fitness') ? 0 : (payload.availableSessions || 0),
              });

              // ── Pre-fill onboarding questionnaire with AI-extracted data ──
              let sectionsPreFilled = 0;
              const totalSections = 8;
              const responsesJson = {};

              // Stage 1: Basic Info
              if (firstName) responsesJson.firstName = firstName;
              if (lastName) responsesJson.lastName = lastName;
              if (preferredName) responsesJson.preferredName = preferredName;
              if (email) responsesJson.email = clientEmail;
              if (phone) responsesJson.phone = phone;
              if (dateOfBirth) responsesJson.dateOfBirth = dateOfBirth;
              if (gender) responsesJson.gender = gender;
              if (emergencyContactName) responsesJson.emergencyContactName = emergencyContactName;
              if (emergencyContactPhone) responsesJson.emergencyContactPhone = emergencyContactPhone;
              // Stage 1 counts as filled if we have name + at least one more field
              if (firstName && lastName && (dateOfBirth || gender || phone || email)) sectionsPreFilled++;

              // Stage 2: Goals
              if (fitnessGoal) {
                responsesJson.primaryGoal = fitnessGoal;
                sectionsPreFilled++;
              }

              // Stage 3: Health
              if (healthConcerns || medications || doctorClearance) {
                if (healthConcerns) responsesJson.injuries = healthConcerns;
                if (medications) responsesJson.medications = medications;
                if (doctorClearance) responsesJson.doctorClearance = doctorClearance;
                sectionsPreFilled++;
              }

              // Stage 4: Nutrition
              if (mealsPerDay || waterIntake || dietaryPreferences || foodAllergies) {
                if (mealsPerDay) responsesJson.mealsPerDay = mealsPerDay;
                if (waterIntake) responsesJson.waterIntake = waterIntake;
                if (dietaryPreferences) responsesJson.dietaryPreferences = dietaryPreferences;
                if (foodAllergies) responsesJson.foodAllergies = foodAllergies;
                sectionsPreFilled++;
              }

              // Stage 5: Lifestyle
              if (occupation || sleepHours || stressLevel || activityLevel) {
                if (occupation) responsesJson.occupation = occupation;
                if (sleepHours) responsesJson.sleepHours = sleepHours;
                if (stressLevel) responsesJson.stressLevel = stressLevel;
                if (activityLevel) responsesJson.activityLevel = activityLevel;
                sectionsPreFilled++;
              }

              // Stage 6: Training
              if (trainingExperience || workoutsPerWeek || workoutTypes || favoriteExercises || movementLimitations) {
                if (trainingExperience) responsesJson.trainingExperience = trainingExperience;
                if (workoutsPerWeek) responsesJson.workoutsPerWeek = workoutsPerWeek;
                if (workoutTypes) responsesJson.workoutTypes = workoutTypes;
                if (favoriteExercises) responsesJson.favoriteExercises = favoriteExercises;
                if (dislikedExercises) responsesJson.dislikedExercises = dislikedExercises;
                if (movementLimitations) responsesJson.movementLimitations = movementLimitations;
                sectionsPreFilled++;
              }

              // Stage 7: AI Consent — not pre-filled (client must consent personally)
              // Stage 8: Summary — not pre-filled (client provides their own notes)

              const completionPercentage = Math.round((sectionsPreFilled / totalSections) * 100);

              // Create the questionnaire record
              if (models.ClientOnboardingQuestionnaire) {
                try {
                  await models.ClientOnboardingQuestionnaire.create({
                    userId: newClient.id,
                    createdBy: req.user.id,
                    status: 'in_progress',
                    responsesJson,
                    primaryGoal: fitnessGoal || null,
                    trainingTier: trainingExperience || null,
                    healthRisk: healthConcerns ? 'medium' : 'low',
                  });
                  logger.info('[AIChatRoutes] Pre-filled questionnaire for client %d (%d/%d sections)',
                    newClient.id, sectionsPreFilled, totalSections);
                } catch (qErr) {
                  logger.warn('[AIChatRoutes] Questionnaire creation failed (non-fatal):', qErr.message);
                }
              }

              // Create ClientProgress record
              if (models.ClientProgress) {
                try {
                  await models.ClientProgress.create({ userId: newClient.id });
                } catch { /* non-fatal */ }
              }

              // Assign trainer (admin assigns to self by default)
              if (models.ClientTrainerAssignment) {
                try {
                  await models.ClientTrainerAssignment.create({
                    clientId: newClient.id,
                    trainerId: req.user.id,
                    status: 'active',
                    assignedBy: req.user.id,
                    assignedAt: new Date(),
                  });
                } catch { /* non-fatal — may fail if table missing or constraint */ }
              }

              // Store trainer NASM notes
              if (trainerNotes) {
                try {
                  await sequelize.query(
                    `INSERT INTO client_notes ("userId", "trainerId", "noteType", "content", "createdAt", "updatedAt")
                     VALUES (:userId, :trainerId, 'nasm_assessment', :content, NOW(), NOW())`,
                    { replacements: { userId: newClient.id, trainerId: req.user.id, content: trainerNotes } }
                  );
                } catch { /* non-fatal — table may not exist */ }
              }

              const claimUrl = `https://sswanstudios.com/claim/${claimToken.plainToken}`;
              const isMoveFitness = (clientSource === 'move_fitness');

              logger.info('[AIChatRoutes] AI-created client: %s %s (id=%d, source=%s, pre-filled=%d/%d) via %s %d',
                firstName, lastName, newClient.id, clientSource || 'swanstudios',
                sectionsPreFilled, totalSections, req.user.role, req.user.id);

              clientCreateResult = {
                success: true,
                clientId: newClient.id,
                firstName,
                lastName,
                username,
                temporaryPassword: tempPassword,
                claimCode: claimToken.plainToken,
                claimUrl,
                claimExpires: claimToken.expires,
                isMoveFitness,
                sectionsPreFilled,
                totalSections,
                completionPercentage,
              };
            }
          }
        }
      } catch (createErr) {
        logger.warn('[AIChatRoutes] Failed to process AI create_client action:', createErr.message);
        clientCreateResult = { success: false, reason: createErr.message };
      }
    }

    // Check if AI response contains import_workout_log action blocks (historical workout import)
    let workoutImportResults = [];
    if (aiResult.content && (req.user.role === 'admin' || req.user.role === 'trainer')) {
      try {
        const importRegex = /```json\s*(\{[\s\S]*?"action"\s*:\s*"import_workout_log"[\s\S]*?\})\s*```/g;
        let importMatch;
        while ((importMatch = importRegex.exec(aiResult.content)) !== null) {
          try {
            const payload = JSON.parse(importMatch[1]);
            const { clientId, title, date, duration, intensity, notes, exercises } = payload;

            if (!clientId || !date || !exercises?.length) {
              workoutImportResults.push({ success: false, date, reason: 'Missing clientId, date, or exercises' });
              continue;
            }

            // Validate date is not in the future
            const workoutDate = new Date(date);
            if (workoutDate > new Date()) {
              workoutImportResults.push({ success: false, date, reason: 'Date cannot be in the future' });
              continue;
            }

            const { getAllModels } = await import('../models/index.mjs');
            const models = getAllModels();
            const WorkoutSession = models.WorkoutSession;
            const WorkoutLog = models.WorkoutLog;

            if (!WorkoutSession || !WorkoutLog) {
              workoutImportResults.push({ success: false, date, reason: 'Workout models not available' });
              continue;
            }

            // Check for duplicate (same client + same date)
            const { Op } = await import('sequelize');
            const dayStart = new Date(workoutDate); dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(workoutDate); dayEnd.setHours(23, 59, 59, 999);
            const existing = await WorkoutSession.findOne({
              where: { userId: clientId, date: { [Op.between]: [dayStart, dayEnd] } }
            });
            if (existing) {
              workoutImportResults.push({ success: false, date, reason: `Workout already exists for this date (session #${existing.id})` });
              continue;
            }

            // Calculate aggregates
            let totalSets = 0, totalReps = 0, totalWeight = 0;
            const logRows = [];
            for (const ex of exercises) {
              const sets = ex.sets || [{ setNumber: 1, reps: ex.reps || 0, weight: ex.weight || 0 }];
              for (const s of sets) {
                totalSets++;
                totalReps += (s.reps || 0);
                totalWeight += (s.reps || 0) * (s.weight || 0);
                logRows.push({
                  exerciseName: ex.name || ex.exerciseName,
                  setNumber: s.setNumber || totalSets,
                  reps: s.reps || 0,
                  weight: s.weight || 0,
                  tempo: s.tempo || null,
                  rest: s.rest || null,
                  rpe: s.rpe || null,
                  notes: s.notes || null,
                });
              }
            }

            // Create session
            const session = await WorkoutSession.create({
              userId: clientId,
              trainerId: req.user.id,
              title: title || `Imported Workout — ${date}`,
              date: workoutDate,
              duration: duration || 60,
              intensity: intensity || 5,
              notes: notes || 'Imported from previous training platform',
              status: 'completed',
              completedAt: workoutDate,
              sessionType: 'trainer-led',
              totalSets,
              totalReps,
              totalWeight: Math.round(totalWeight),
            });

            // Bulk create log rows
            const logsWithSession = logRows.map(r => ({ ...r, sessionId: session.id }));
            await WorkoutLog.bulkCreate(logsWithSession);

            logger.info('[AIChatRoutes] Imported workout for client %d on %s: %d exercises, %d sets',
              clientId, date, exercises.length, totalSets);

            workoutImportResults.push({
              success: true,
              date,
              sessionId: session.id,
              exerciseCount: exercises.length,
              totalSets,
              totalReps,
              totalWeight: Math.round(totalWeight),
            });
          } catch (importErr) {
            workoutImportResults.push({ success: false, reason: importErr.message });
          }
        }
        if (workoutImportResults.length > 0) {
          logger.info('[AIChatRoutes] Processed %d workout imports', workoutImportResults.length);
        }
      } catch (bulkErr) {
        logger.warn('[AIChatRoutes] Workout import processing failed:', bulkErr.message);
      }
    }

    // Extract FRONTEND_DISPATCH action blocks (AI_ADD_EXERCISE, AI_LOAD_TEMPLATE, etc.)
    // These are passed back to the frontend which dispatches them as CustomEvents
    let frontendActions = [];
    if (aiResult.content) {
      try {
        const dispatchRegex = /```json\s*(\{[\s\S]*?"action"\s*:\s*"frontend_dispatch"[\s\S]*?\})\s*```/g;
        let match;
        while ((match = dispatchRegex.exec(aiResult.content)) !== null) {
          try {
            const parsed = JSON.parse(match[1]);
            if (parsed.event && parsed.payload) {
              // Whitelist allowed events for security
              const ALLOWED_EVENTS = [
                'AI_ADD_EXERCISE', 'AI_LOAD_TEMPLATE', 'AI_UPDATE_SET',
                'AI_TOGGLE_NASM_ITEM', 'AI_SUBMIT_WORKOUT',
              ];
              if (ALLOWED_EVENTS.includes(parsed.event)) {
                frontendActions.push({ event: parsed.event, payload: parsed.payload });
              }
            }
          } catch { /* skip malformed individual blocks */ }
        }
        if (frontendActions.length > 0) {
          logger.info('[AIChatRoutes] Extracted %d frontend dispatch actions', frontendActions.length);
        }
      } catch (parseErr) {
        logger.warn('[AIChatRoutes] Failed to parse frontend dispatch actions:', parseErr.message);
      }
    }

    return res.json({
      success: true,
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      conversationId: conversation.id,
      messageCount: updatedMessages.length,
      dataUpdateResult,
      clientCreateResult: clientCreateResult || undefined,
      workoutImportResults: workoutImportResults.length > 0 ? workoutImportResults : undefined,
      frontendActions: frontendActions.length > 0 ? frontendActions : undefined,
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
