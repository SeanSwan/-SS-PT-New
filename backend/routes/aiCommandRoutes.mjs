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
import sequelize from '../database.mjs';
import {
  executeCommandPipeline,
  executeConfirmedOperation,
  checkForConfirmation,
} from '../services/ai/commandExecutor.mjs';
import { cancelOperation, getPendingCount } from '../services/ai/destructiveOperations.mjs';
import {
  getCommandsForRole,
  getAllCommandTypes,
  initializeRegistry,
} from '../services/ai/commandRegistry/index.mjs';

const router = express.Router();

// Initialize command registry on first import
initializeRegistry();

// ── POST /execute — Main command pipeline ───────────────────────────────────

router.post('/execute', protect, async (req, res) => {
  try {
    const { message, selectedClientName, selectedClientId, previousContext } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        success: false,
        error: 'Message exceeds 2000 character limit',
      });
    }

    const user = {
      id: req.user.id,
      role: req.user.role,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
    };

    // Get Sequelize instance from app
    const ctx = await executeCommandPipeline(message, user, {
      selectedClientName,
      selectedClientId,
      previousContext,
      sequelize,
    });

    if (ctx.error) {
      return res.json({
        success: false,
        type: 'error',
        error: ctx.error,
        stage: ctx.stage,
        suggestions: ctx.result?.suggestions || null,
        intent: ctx.intent,
        timing: ctx.metadata.timing,
      });
    }

    // Handle different result types
    if (ctx.intent?.intent === 'chat' || ctx.intent?.intent === 'clarification_needed') {
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
      return res.json({
        success: true,
        type: 'not_wired',
        message: ctx.result.message,
        command: ctx.command?.type,
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
        command: ctx.command?.type,
        params: ctx.intent?.params,
        client: ctx.resolvedClient,
        details: ctx.result.details || null,
        isDestructive: ctx.result.isDestructive ?? ctx.command?.destructive ?? false,
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
    logger.error('[AICommand] Execute route error', { error: err.message, stack: err.stack });
    res.status(500).json({
      success: false,
      error: 'Internal server error processing your command',
    });
  }
});

// ── POST /confirm — Confirm a pending destructive operation ─────────────────

router.post('/confirm', protect, async (req, res) => {
  try {
    const { operationId } = req.body;

    if (!operationId) {
      return res.status(400).json({
        success: false,
        error: 'operationId is required',
      });
    }

    const result = await executeConfirmedOperation(operationId, req.user, sequelize);

    res.json(result);
  } catch (err) {
    logger.error('[AICommand] Confirm route error', { error: err.message });
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

    const cancelled = cancelOperation(operationId, req.user.id);
    res.json({
      success: cancelled,
      message: cancelled ? 'Operation cancelled.' : 'Operation not found or already expired.',
    });
  } catch (err) {
    logger.error('[AICommand] Cancel route error', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to cancel operation' });
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
      commands: commands.map(cmd => ({
        type: cmd.type,
        description: cmd.description,
        category: cmd.category,
        examples: cmd.naturalLanguagePatterns.slice(0, 2),
        destructive: cmd.destructive,
        requiresClientRef: cmd.requiresClientRef || false,
      })),
    });
  } catch (err) {
    logger.error('[AICommand] Commands list error', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to list commands' });
  }
});

// ── GET /health — Command engine health check ───────────────────────────────

router.get('/health', protect, (req, res) => {
  const allCommands = getAllCommandTypes();
  res.json({
    success: true,
    engine: 'god-level-ai-command-v1',
    registeredCommands: allCommands.length,
    pendingOperations: getPendingCount(req.user.id),
    status: allCommands.length > 0 ? 'operational' : 'no_commands_registered',
  });
});

export default router;
