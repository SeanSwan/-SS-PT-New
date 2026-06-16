/**
 * Automation Service
 * ==================
 * Orchestrates outbound automation sequences (SMS/email/push).
 */

import logger from '../utils/logger.mjs';
import { Op } from 'sequelize';
import { getAllModels } from '../models/index.mjs';
import { sendTemplatedSMS, sendSmsMessage } from './smsService.mjs';
import { evaluateScheduledMessage } from './automationDecisionService.mjs';
import { resolveMarketingSuppression } from './marketingSuppressionService.mjs';
import { sendNurtureTestMessage } from './nurtureTestSendService.mjs';

const DEFAULT_SEQUENCES = [
  {
    name: 'new_client_welcome',
    triggerEvent: 'client_created',
    steps: [
      { dayOffset: 0, templateName: 'welcome', channel: 'sms' }
    ]
  },
  {
    name: 'post_session_followup',
    triggerEvent: 'session_completed',
    steps: [
      { dayOffset: 1, templateName: 'follow_up_day1', channel: 'sms' }
    ]
  },
  {
    name: 'new_client_nurture',
    triggerEvent: 'client_created',
    steps: [
      { dayOffset: 1, templateName: 'follow_up_day1', channel: 'sms' },
      { dayOffset: 3, templateName: 'follow_up_day3', channel: 'sms' },
      { dayOffset: 7, templateName: 'follow_up_day7', channel: 'sms' }
    ]
  }
];

const getModels = () => {
  const models = getAllModels();
  const { AutomationSequence, AutomationLog, User } = models;
  if (!AutomationSequence || !AutomationLog) {
    throw new Error('Automation models not initialized');
  }
  return { AutomationSequence, AutomationLog, User };
};

/**
 * Resolve the recipient (user OR captured lead) for a scheduled log into a normalized
 * target `{ kind, phone, email, notificationPreferences }`. Leads carry no per-channel
 * prefs (null → defaults on); consent for leads is enforced by suppression + phone
 * presence. Returns null for an orphaned log (recipient row gone) → the evaluator then
 * fails it on no_phone. One log is user XOR lead (see triggerSequence).
 */
const resolveAutomationTarget = async (log, { User }) => {
  if (log.userId) {
    const user = await User.findByPk(log.userId);
    if (!user) return null;
    return { kind: 'user', phone: user.phone, email: user.email, notificationPreferences: user.notificationPreferences };
  }
  if (log.leadId) {
    const { default: Lead } = await import('../models/Lead.mjs');
    const lead = await Lead.findByPk(log.leadId);
    if (!lead) return null;
    return { kind: 'lead', phone: lead.phone, email: lead.email, notificationPreferences: null };
  }
  return null;
};

// Rolling per-recipient frequency cap (anti-spam). Conservative defaults — overridable
// via env. Counts automation messages already SENT to this recipient in the window;
// at/over the cap the message DEFERS by a cooldown (re-tried next tick, never dropped).
const FREQ_CAP = Number(process.env.SWAN_AUTOMATION_MAX_PER_WINDOW) || 3;
const FREQ_WINDOW_DAYS = Number(process.env.SWAN_AUTOMATION_WINDOW_DAYS) || 7;
const FREQ_COOLDOWN_HOURS = Number(process.env.SWAN_AUTOMATION_COOLDOWN_HOURS) || 24;
const DAY_MS = 24 * 60 * 60 * 1000;

const resolveFrequencyCap = async (log, { AutomationLog }, now) => {
  const base = { capped: false, sentInWindow: 0, cap: FREQ_CAP, windowDays: FREQ_WINDOW_DAYS };
  const where = { status: 'sent', sentAt: { [Op.gte]: new Date(now.getTime() - FREQ_WINDOW_DAYS * DAY_MS) } };
  if (log.userId) where.userId = log.userId;
  else if (log.leadId) where.leadId = log.leadId;
  else return base; // no resolvable recipient → nothing to cap

  const sentInWindow = await AutomationLog.count({ where });
  return {
    ...base,
    sentInWindow,
    capped: sentInWindow >= FREQ_CAP,
    nextAttempt: new Date(now.getTime() + FREQ_COOLDOWN_HOURS * 60 * 60 * 1000),
  };
};

export const ensureDefaultSequences = async () => {
  const { AutomationSequence } = getModels();
  const count = await AutomationSequence.count();

  if (count > 0) {
    return { seeded: false, count };
  }

  await AutomationSequence.bulkCreate(DEFAULT_SEQUENCES);
  return { seeded: true, count: DEFAULT_SEQUENCES.length };
};

export const triggerSequence = async (eventName, userId, data = {}) => {
  const { AutomationSequence, AutomationLog, User } = getModels();

  const sequences = await AutomationSequence.findAll({
    where: { triggerEvent: eventName, isActive: true }
  });

  if (!sequences.length) {
    return { success: false, message: 'No active sequences for event', created: 0 };
  }

  const leadId = data.leadId != null ? Number(data.leadId) : null;
  const user = userId ? await User.findByPk(userId) : null;

  // Lead-nurture path: when there is no User, resolve the recipient from a captured Lead.
  let lead = null;
  if (!user && leadId) {
    const { default: Lead } = await import('../models/Lead.mjs');
    lead = await Lead.findByPk(leadId);
  }

  const recipient = user?.phone || lead?.phone || lead?.email || null;
  const variables = {
    clientName: data.clientName || user?.firstName || lead?.firstName || 'Client',
    trainerName: data.trainerName || '',
    time: data.time || '',
    message: data.message || ''
  };

  const now = new Date();
  const logs = [];

  sequences.forEach((sequence) => {
    const steps = Array.isArray(sequence.steps) ? sequence.steps : [];
    steps.forEach((step, index) => {
      const dayOffset = Number(step.dayOffset) || 0;
      const scheduledFor = new Date(now);
      scheduledFor.setDate(scheduledFor.getDate() + dayOffset);

      logs.push({
        sequenceId: sequence.id,
        userId: userId || null,
        leadId: user ? null : leadId, // user XOR lead — never both on one log
        stepIndex: index,
        channel: step.channel || 'sms',
        status: 'pending',
        scheduledFor,
        templateName: step.templateName || null,
        recipient,
        payloadJson: {
          variables,
          context: data
        }
      });
    });
  });

  if (logs.length) {
    await AutomationLog.bulkCreate(logs);
  }

  return { success: true, created: logs.length };
};

export const processScheduledMessages = async () => {
  const { AutomationLog, User } = getModels();
  const now = new Date();

  const pendingLogs = await AutomationLog.findAll({
    where: {
      status: 'pending',
      scheduledFor: { [Op.lte]: now }
    },
    limit: 200
  });

  const results = [];

  for (const log of pendingLogs) {
    try {
      const target = await resolveAutomationTarget(log, { User });
      const suppression = await resolveMarketingSuppression({ email: target?.email });
      const frequency = await resolveFrequencyCap(log, { AutomationLog }, now);
      const decision = evaluateScheduledMessage(log, target, now, suppression, frequency);

      if (decision.action === 'cancel') {
        log.status = 'cancelled';
        log.error = decision.reason === 'unsubscribed' || decision.reason === 'marketing_suppressed'
          ? 'Recipient unsubscribed (marketing-suppressed)'
          : 'SMS disabled for recipient';
        await log.save();
        results.push({ id: log.id, status: 'cancelled' });
        continue;
      }

      if (decision.action === 'defer') {
        log.scheduledFor = decision.nextAttempt;
        await log.save();
        results.push({ id: log.id, status: 'deferred' });
        continue;
      }

      if (decision.action === 'fail') {
        log.status = 'failed';
        log.error =
          decision.reason === 'channel_not_implemented' ? 'Channel not implemented'
          : decision.reason === 'suppression_unverified' ? 'Suppression status could not be verified'
          : 'Recipient missing phone number';
        await log.save();
        results.push({ id: log.id, status: 'failed' });
        continue;
      }

      const variables = log.payloadJson?.variables || {};

      let sendResult;
      if (log.templateName) {
        sendResult = await sendTemplatedSMS({
          to: target.phone,
          templateName: log.templateName,
          variables
        });
        if (sendResult?.body) {
          log.message = sendResult.body;
        }
      } else if (log.message) {
        sendResult = await sendSmsMessage({ to: target.phone, body: log.message });
      } else {
        sendResult = { success: false, error: 'No template or message provided' };
      }

      if (sendResult.success) {
        log.status = 'sent';
        log.sentAt = new Date();
        log.recipient = target.phone;
        log.error = null;
      } else {
        log.status = 'failed';
        log.error = sendResult.error || 'SMS send failed';
        log.recipient = target.phone;
      }

      await log.save();
      results.push({ id: log.id, status: log.status });
    } catch (error) {
      logger.error('Error processing automation log:', error);
      log.status = 'failed';
      log.error = error.message;
      await log.save();
      results.push({ id: log.id, status: 'failed' });
    }
  }

  return { processed: results.length, results };
};

/**
 * Dry-run: what WOULD processScheduledMessages do right now? NO sends, NO DB
 * mutation — runs the SAME decision logic (evaluateScheduledMessage) so the preview
 * cannot diverge from reality. PII-safe: reports phone PRESENCE only, never the
 * number. This is the surface to inspect BEFORE arming SWAN_AUTOMATION_CRON_ENABLED.
 */
export const previewScheduledMessages = async ({ limit = 200 } = {}) => {
  const { AutomationLog, User } = getModels();
  const now = new Date();

  const pendingLogs = await AutomationLog.findAll({
    where: {
      status: 'pending',
      scheduledFor: { [Op.lte]: now }
    },
    limit
  });

  const summary = { wouldSend: 0, wouldDefer: 0, wouldCancel: 0, wouldFail: 0 };
  const bucketFor = { send: 'wouldSend', defer: 'wouldDefer', cancel: 'wouldCancel', fail: 'wouldFail' };
  const byReason = {};
  const items = [];

  for (const log of pendingLogs) {
    const target = await resolveAutomationTarget(log, { User });
    const suppression = await resolveMarketingSuppression({ email: target?.email });
    const frequency = await resolveFrequencyCap(log, { AutomationLog }, now);
    const decision = evaluateScheduledMessage(log, target, now, suppression, frequency);
    summary[bucketFor[decision.action]] += 1;
    byReason[decision.reason] = (byReason[decision.reason] || 0) + 1;
    items.push({
      id: log.id,
      userId: log.userId || null,
      leadId: log.leadId || null,
      recipientKind: target?.kind || 'none',
      channel: decision.channel,
      templateName: log.templateName || null,
      action: decision.action,
      reason: decision.reason,
      hasPhone: Boolean(target?.phone),       // PII-safe: presence only, never the number
      suppressed: Boolean(suppression?.suppressed), // PII-safe boolean
      frequencyCapped: Boolean(frequency?.capped),
      sentInWindow: frequency?.sentInWindow ?? 0, // count, not PII
    });
  }

  return { dryRun: true, total: pendingLogs.length, summary, byReason, items };
};

export const cancelSequence = async (userId, sequenceName) => {
  const { AutomationSequence, AutomationLog } = getModels();

  const sequence = await AutomationSequence.findOne({ where: { name: sequenceName } });
  if (!sequence) {
    return { success: false, message: 'Sequence not found' };
  }

  const [updatedCount] = await AutomationLog.update(
    { status: 'cancelled' },
    {
      where: {
        sequenceId: sequence.id,
        userId,
        status: 'pending'
      }
    }
  );

  return { success: true, updatedCount };
};

export { evaluateScheduledMessage, sendNurtureTestMessage };

export default {
  ensureDefaultSequences,
  triggerSequence,
  evaluateScheduledMessage,
  processScheduledMessages,
  previewScheduledMessages,
  sendNurtureTestMessage,
  cancelSequence
};
