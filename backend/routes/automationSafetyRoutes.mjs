/**
 * Automation Safety Routes
 * ========================
 * Admin-only preview and one-off send gates for outbound automation.
 */

import express from 'express';
import logger from '../utils/logger.mjs';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import {
  previewScheduledMessages,
  processScheduledMessages,
  sendNurtureTestMessage
} from '../services/automationService.mjs';
import { previewSmsTemplates } from '../services/smsService.mjs';

const TEST_SEND_VALIDATION_ERRORS = ['confirm_required', 'invalid_phone', 'unknown_template', 'test_allowlist_missing', 'not_in_test_allowlist'];

const normalizeError = (error) => {
  if (!error) return 'Unknown error';
  return typeof error === 'string' ? error : (error.message || 'Unknown error');
};

const router = express.Router();

/**
 * GET /api/automation/preview
 * Dry-run the automation audience without sending or mutating logs.
 */
router.get('/preview', protect, adminOnly, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const result = await previewScheduledMessages({ limit });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    logger.error('Error previewing automation messages:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to preview automation messages',
      error: normalizeError(error)
    });
  }
});

/**
 * GET /api/automation/templates/preview
 * Render SMS templates for copy review without sending.
 */
router.get('/templates/preview', protect, adminOnly, (req, res) => {
  try {
    const overrides = {};
    for (const key of ['clientName', 'trainerName', 'time', 'message']) {
      if (typeof req.query[key] === 'string') overrides[key] = req.query[key];
    }
    return res.status(200).json({ success: true, data: previewSmsTemplates(overrides) });
  } catch (error) {
    logger.error('Error previewing SMS templates:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to preview SMS templates',
      error: normalizeError(error)
    });
  }
});

/**
 * POST /api/automation/test-send
 * Guarded one-off SMS: confirm:true, valid phone, known template, owner allowlist.
 */
router.post('/test-send', protect, adminOnly, async (req, res) => {
  try {
    const { to, templateName, variables, confirm } = req.body || {};
    const result = await sendNurtureTestMessage({
      to,
      templateName,
      variables,
      confirm,
      triggeredByUserId: req.user?.id,
    });
    const status = result.success
      ? 200
      : (TEST_SEND_VALIDATION_ERRORS.includes(result.error) ? 400 : 502);
    return res.status(status).json({ success: result.success, data: result });
  } catch (error) {
    logger.error('Error sending nurture test message:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send test message',
      error: normalizeError(error)
    });
  }
});

/**
 * POST /api/automation/process
 * Manual admin-only processing for pending automation logs.
 */
router.post('/process', protect, adminOnly, async (_req, res) => {
  try {
    const result = await processScheduledMessages();
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error processing automation messages:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process automation messages',
      error: normalizeError(error)
    });
  }
});

export default router;
