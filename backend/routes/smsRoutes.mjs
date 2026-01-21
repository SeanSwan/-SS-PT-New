/**
 * SMS Routes
 * ==========
 * Admin-only endpoints for sending SMS messages and viewing logs.
 */

import express from 'express';
import logger from '../utils/logger.mjs';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import { listSmsTemplates, sendSmsMessage, sendTemplatedSMS } from '../services/smsService.mjs';
import { getAllModels } from '../models/index.mjs';

const router = express.Router();

const normalizeError = (error) => {
  if (!error) return '';
  return typeof error === 'string' ? error : (error.message || 'Unknown error');
};

const mapSendStatus = (result) => {
  if (result?.success) return 200;
  const message = normalizeError(result?.error);
  if (message.toLowerCase().includes('disabled') || message.toLowerCase().includes('configured')) {
    return 503;
  }
  return 500;
};

/**
 * GET /api/sms/templates
 * Returns available SMS templates.
 */
router.get('/templates', protect, adminOnly, async (_req, res) => {
  return res.status(200).json({
    success: true,
    data: listSmsTemplates()
  });
});

/**
 * POST /api/sms/send
 * Send a single SMS message.
 */
router.post('/send', protect, adminOnly, async (req, res) => {
  try {
    const { to, body } = req.body || {};
    if (!to || !body) {
      return res.status(400).json({ success: false, message: 'Missing to or body' });
    }

    const result = await sendSmsMessage({ to, body });
    const { AutomationLog } = getAllModels();

    if (AutomationLog) {
      await AutomationLog.create({
        sequenceId: null,
        userId: null,
        stepIndex: null,
        channel: 'sms',
        status: result?.success ? 'sent' : 'failed',
        scheduledFor: new Date(),
        sentAt: result?.success ? new Date() : null,
        templateName: null,
        recipient: to,
        message: body,
        payloadJson: { source: 'manual' },
        error: result?.success ? null : normalizeError(result?.error)
      });
    }

    return res.status(mapSendStatus(result)).json({
      success: Boolean(result?.success),
      message: result?.success ? 'SMS sent' : 'SMS send failed',
      error: result?.success ? undefined : normalizeError(result?.error)
    });
  } catch (error) {
    logger.error('SMS send failed:', error);
    return res.status(500).json({
      success: false,
      message: 'SMS send failed',
      error: normalizeError(error)
    });
  }
});

/**
 * POST /api/sms/send-template
 * Send a templated SMS message.
 */
router.post('/send-template', protect, adminOnly, async (req, res) => {
  try {
    const { to, templateName, variables } = req.body || {};
    if (!to || !templateName) {
      return res.status(400).json({ success: false, message: 'Missing to or templateName' });
    }

    const result = await sendTemplatedSMS({ to, templateName, variables });
    const { AutomationLog } = getAllModels();

    if (AutomationLog) {
      await AutomationLog.create({
        sequenceId: null,
        userId: null,
        stepIndex: null,
        channel: 'sms',
        status: result?.success ? 'sent' : 'failed',
        scheduledFor: new Date(),
        sentAt: result?.success ? new Date() : null,
        templateName,
        recipient: to,
        message: result?.body || null,
        payloadJson: { source: 'manual', variables: variables || {} },
        error: result?.success ? null : normalizeError(result?.error)
      });
    }

    return res.status(mapSendStatus(result)).json({
      success: Boolean(result?.success),
      message: result?.success ? 'SMS sent' : 'SMS send failed',
      error: result?.success ? undefined : normalizeError(result?.error)
    });
  } catch (error) {
    logger.error('Templated SMS send failed:', error);
    return res.status(500).json({
      success: false,
      message: 'SMS send failed',
      error: normalizeError(error)
    });
  }
});

/**
 * GET /api/sms/logs
 * Fetch SMS delivery logs.
 */
router.get('/logs', protect, adminOnly, async (req, res) => {
  try {
    const { AutomationLog, AutomationSequence, User } = getAllModels();
    if (!AutomationLog) {
      return res.status(500).json({ success: false, message: 'Automation log model not available' });
    }

    const limit = Number(req.query.limit) || 100;
    const status = req.query.status;
    const userId = req.query.userId ? Number(req.query.userId) : null;

    const where = { channel: 'sms' };
    if (status) {
      where.status = status;
    }
    if (userId) {
      where.userId = userId;
    }

    const logs = await AutomationLog.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      include: [
        AutomationSequence ? {
          model: AutomationSequence,
          as: 'sequence',
          attributes: ['id', 'name', 'triggerEvent']
        } : null,
        User ? {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        } : null
      ].filter(Boolean)
    });

    return res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    logger.error('SMS logs fetch failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch SMS logs',
      error: normalizeError(error)
    });
  }
});

export default router;
