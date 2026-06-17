/**
 * SMS Routes
 * ==========
 * Admin-only endpoints for sending SMS messages and viewing logs.
 */

import express from 'express';
import { Op } from 'sequelize';
import logger from '../utils/logger.mjs';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import { listSmsTemplates, sendSmsMessage, sendTemplatedSMS } from '../services/smsService.mjs';
import { getAllModels } from '../models/index.mjs';
import { isAutomationArmed } from '../services/automationArmState.mjs';
import { resolveMarketingSuppression } from '../services/marketingSuppressionService.mjs';

const router = express.Router();
const DAY_MS = 24 * 60 * 60 * 1000;

const envNonNegInt = (name, fallback) => {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
};

const manualSmsCap = () => envNonNegInt('SWAN_MANUAL_SMS_MAX_PER_WINDOW', envNonNegInt('SWAN_AUTOMATION_MAX_PER_WINDOW', 3));
const manualSmsWindowDays = () => envNonNegInt('SWAN_MANUAL_SMS_WINDOW_DAYS', envNonNegInt('SWAN_AUTOMATION_WINDOW_DAYS', 7));

const normalizeError = (error) => {
  if (!error) return '';
  return typeof error === 'string' ? error : (error.message || 'Unknown error');
};

const normalizeEmail = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

const blocked = (status, reason, message) => ({ allowed: false, status, reason, message });

const recipientEmailFrom = (body) => body?.recipientEmail || body?.email;

const respondWithGateBlock = (res, gate) => res.status(gate.status).json({
  success: false,
  message: gate.message,
  reason: gate.reason,
});

const smsSendSucceeded = (result) => {
  if (!result) return false;
  return result.success === true;
};

const sentAtFor = (sent) => {
  if (sent) return new Date();
  return null;
};

const manualSmsMessageFor = ({ body, result }) => {
  if (body) return body;
  if (result && result.body) return result.body;
  return null;
};

const manualSmsPayloadFor = ({ templateName, variables }) => {
  if (templateName) return { source: 'manual', variables: variables || {} };
  return { source: 'manual' };
};

const manualSmsErrorFor = ({ sent, result }) => {
  if (sent) return null;
  return normalizeError(result ? result.error : null);
};

const recordManualSmsLog = async ({ to, result, body = null, templateName = null, variables = null }) => {
  const { AutomationLog } = getAllModels();
  if (!AutomationLog) return;

  const sent = smsSendSucceeded(result);

  await AutomationLog.create({
    sequenceId: null,
    userId: null,
    stepIndex: null,
    channel: 'sms',
    status: sent ? 'sent' : 'failed',
    scheduledFor: new Date(),
    sentAt: sentAtFor(sent),
    templateName,
    recipient: to,
    message: manualSmsMessageFor({ body, result }),
    payloadJson: manualSmsPayloadFor({ templateName, variables }),
    error: manualSmsErrorFor({ sent, result }),
  });
};

const allowed = () => ({ allowed: true });

const resolveSuppressionGate = async (email, phone) => {
  const suppression = await resolveMarketingSuppression({ email, phone });
  if (suppression && suppression.suppressed) {
    return blocked(403, suppression.reason || 'marketing_suppressed', 'Recipient is suppressed.');
  }
  if (suppression && suppression.checked === false) {
    return blocked(503, 'suppression_unverified', 'Recipient suppression status could not be verified.');
  }
  return allowed();
};

const resolveFrequencyGate = async (to) => {
  const { AutomationLog } = getAllModels();
  if (!AutomationLog) return allowed();

  const cap = manualSmsCap();
  const windowStart = new Date(Date.now() - manualSmsWindowDays() * DAY_MS);
  const sentInWindow = await AutomationLog.count({
    where: {
      channel: 'sms',
      status: 'sent',
      recipient: to,
      sentAt: { [Op.gte]: windowStart },
    },
  });
  if (sentInWindow >= cap) {
    return blocked(429, 'frequency_capped', 'Recipient has reached the SMS frequency cap.');
  }
  return allowed();
};

const ensureManualSmsAllowed = async ({ to, recipientEmail }) => {
  if (!isAutomationArmed()) {
    return blocked(503, 'automation_disarmed', 'SMS automation is disarmed.');
  }

  const email = normalizeEmail(recipientEmail);
  if (!email) {
    return blocked(403, 'suppression_identity_required', 'Recipient email is required for SMS suppression checks.');
  }

  const suppressionGate = await resolveSuppressionGate(email, to);
  if (!suppressionGate.allowed) {
    return suppressionGate;
  }

  return resolveFrequencyGate(to);
};

const mapSendStatus = (result) => {
  if (smsSendSucceeded(result)) return 200;
  const message = normalizeError(result ? result.error : null);
  if (message.toLowerCase().includes('disabled') || message.toLowerCase().includes('configured')) {
    return 503;
  }
  return 500;
};

const sendResultMessageFor = (sent) => {
  if (sent) return 'SMS sent';
  return 'SMS send failed';
};

const sendResultErrorFor = ({ sent, result }) => {
  if (sent) return undefined;
  return normalizeError(result ? result.error : null);
};

const respondWithSendResult = (res, result) => {
  const sent = smsSendSucceeded(result);
  return res.status(mapSendStatus(result)).json({
    success: sent,
    message: sendResultMessageFor(sent),
    error: sendResultErrorFor({ sent, result }),
  });
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

    const gate = await ensureManualSmsAllowed({ to, recipientEmail: recipientEmailFrom(req.body) });
    if (!gate.allowed) {
      return respondWithGateBlock(res, gate);
    }

    const result = await sendSmsMessage({ to, body });
    await recordManualSmsLog({ to, result, body });

    return respondWithSendResult(res, result);
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

    const gate = await ensureManualSmsAllowed({ to, recipientEmail: recipientEmailFrom(req.body) });
    if (!gate.allowed) {
      return respondWithGateBlock(res, gate);
    }

    const result = await sendTemplatedSMS({ to, templateName, variables });
    await recordManualSmsLog({ to, result, templateName, variables });

    return respondWithSendResult(res, result);
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
    const { AutomationLog, AutomationSequence, User, Lead } = getAllModels();
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
        AutomationSequence ? { model: AutomationSequence, as: 'sequence', attributes: ['id', 'name', 'triggerEvent'] } : null,
        User ? { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] } : null,
        Lead ? { model: Lead, as: 'lead', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] } : null,
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
