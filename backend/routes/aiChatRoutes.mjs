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
import { protect } from '../middleware/authMiddleware.mjs';
import AiConversation from '../models/AiConversation.mjs';
import { getSystemPrompt, buildPromptMessages, sendChatMessage, enrichWithUserData, getAIChatDiagnostics } from '../services/aiChatService.mjs';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';

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
  trainer: ['general', 'macro_logging', 'form_tips', 'workout_suggestions', 'workout_generation', 'client_review'],
  admin: ['general', 'macro_logging', 'form_tips', 'workout_suggestions', 'workout_generation', 'client_review', 'data_management'],
};

/**
 * POST /api/ai-chat/conversations
 * Create a new conversation thread
 */
router.post('/conversations', async (req, res) => {
  try {
    const { context = 'general', title } = req.body;
    const userRole = req.user.role || 'client';
    const allowedContexts = ROLE_CONTEXTS[userRole] || ROLE_CONTEXTS.client;

    if (!allowedContexts.includes(context)) {
      return res.status(403).json({
        success: false,
        error: `Context "${context}" not available for ${userRole} role`,
        allowedContexts,
      });
    }

    const conversation = await AiConversation.create({
      userId: req.user.id,
      role: userRole,
      title: title || null,
      context,
      messages: [],
      status: 'active',
      messageCount: 0,
    });

    return res.status(201).json({
      success: true,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        context: conversation.context,
        status: conversation.status,
        messageCount: 0,
        createdAt: conversation.createdAt,
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

    const conversations = await AiConversation.findAndCountAll({
      where: {
        userId: req.user.id,
        status,
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
 */
router.post('/conversations/:id/messages', async (req, res) => {
  try {
    const { message } = req.body;

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

    // Build system prompt based on role + context, enriched with user data
    let systemPrompt = getSystemPrompt(conversation.role, conversation.context);
    const userDataContext = await enrichWithUserData(
      req.user.id, conversation.role, conversation.context, sequelize
    );
    if (userDataContext) {
      systemPrompt += userDataContext;
    }
    const promptMessages = buildPromptMessages(systemPrompt, conversation.messages, message.trim());

    // Send to AI provider
    const aiResult = await sendChatMessage(promptMessages);

    // Create message entries
    const now = new Date().toISOString();
    const userMsg = { role: 'user', content: message.trim(), timestamp: now };
    const assistantMsg = {
      role: 'assistant',
      content: aiResult.content,
      timestamp: new Date().toISOString(),
      metadata: {
        provider: aiResult.provider,
        model: aiResult.model,
        tokenUsage: aiResult.tokenUsage,
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

    return res.json({
      success: true,
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      conversationId: conversation.id,
      messageCount: updatedMessages.length,
    });
  } catch (err) {
    logger.error('[AIChatRoutes] Send message error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to send message' });
  }
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
 * Generate a short title from the first user message
 */
function generateTitle(message) {
  const cleaned = message.replace(/\n/g, ' ').trim();
  if (cleaned.length <= 50) return cleaned;
  return cleaned.slice(0, 47) + '...';
}

export default router;
