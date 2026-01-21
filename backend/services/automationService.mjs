/**
 * Automation Service
 * ==================
 * Orchestrates outbound automation sequences (SMS/email/push).
 */

import logger from '../utils/logger.mjs';
import { Op } from 'sequelize';
import { getAllModels } from '../models/index.mjs';
import { sendTemplatedSMS, sendSmsMessage } from './smsService.mjs';

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

const normalizePreferences = (prefs) => {
  if (!prefs || typeof prefs !== 'object') {
    return { email: true, sms: true, push: true, quietHours: null };
  }

  return {
    email: prefs.email !== false,
    sms: prefs.sms !== false,
    push: prefs.push !== false,
    quietHours: prefs.quietHours || null
  };
};

const parseTime = (value) => {
  if (!value || typeof value !== 'string') return null;
  const [hours, minutes] = value.split(':').map((part) => Number(part));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return { hours, minutes };
};

const isWithinQuietHours = (quietHours, now = new Date()) => {
  if (!quietHours || typeof quietHours !== 'object') return false;
  const start = parseTime(quietHours.start);
  const end = parseTime(quietHours.end);
  if (!start || !end) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
};

const getNextAllowedTime = (quietHours, now = new Date()) => {
  const start = parseTime(quietHours?.start);
  const end = parseTime(quietHours?.end);
  if (!start || !end) return now;

  const next = new Date(now);
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (startMinutes < endMinutes) {
    next.setHours(end.hours, end.minutes, 0, 0);
    if (currentMinutes >= endMinutes) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  }

  if (currentMinutes >= startMinutes) {
    next.setDate(next.getDate() + 1);
  }
  next.setHours(end.hours, end.minutes, 0, 0);
  return next;
};

const getModels = () => {
  const models = getAllModels();
  const { AutomationSequence, AutomationLog, User } = models;
  if (!AutomationSequence || !AutomationLog) {
    throw new Error('Automation models not initialized');
  }
  return { AutomationSequence, AutomationLog, User };
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

  const user = userId ? await User.findByPk(userId) : null;
  const variables = {
    clientName: data.clientName || user?.firstName || 'Client',
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
        stepIndex: index,
        channel: step.channel || 'sms',
        status: 'pending',
        scheduledFor,
        templateName: step.templateName || null,
        recipient: user?.phone || null,
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
      const user = log.userId ? await User.findByPk(log.userId) : null;
      const prefs = normalizePreferences(user?.notificationPreferences);

      if (log.channel === 'sms' && prefs.sms === false) {
        log.status = 'cancelled';
        log.error = 'SMS disabled for user';
        await log.save();
        results.push({ id: log.id, status: 'cancelled' });
        continue;
      }

      if (log.channel === 'sms' && isWithinQuietHours(prefs.quietHours, now)) {
        log.scheduledFor = getNextAllowedTime(prefs.quietHours, now);
        await log.save();
        results.push({ id: log.id, status: 'deferred' });
        continue;
      }

      if (log.channel !== 'sms') {
        log.status = 'failed';
        log.error = 'Channel not implemented';
        await log.save();
        results.push({ id: log.id, status: 'failed' });
        continue;
      }

      if (!user?.phone) {
        log.status = 'failed';
        log.error = 'User missing phone number';
        await log.save();
        results.push({ id: log.id, status: 'failed' });
        continue;
      }

      const variables = log.payloadJson?.variables || {};

      let sendResult;
      if (log.templateName) {
        sendResult = await sendTemplatedSMS({
          to: user.phone,
          templateName: log.templateName,
          variables
        });
        if (sendResult?.body) {
          log.message = sendResult.body;
        }
      } else if (log.message) {
        sendResult = await sendSmsMessage({ to: user.phone, body: log.message });
      } else {
        sendResult = { success: false, error: 'No template or message provided' };
      }

      if (sendResult.success) {
        log.status = 'sent';
        log.sentAt = new Date();
        log.recipient = user.phone;
        log.error = null;
      } else {
        log.status = 'failed';
        log.error = sendResult.error || 'SMS send failed';
        log.recipient = user.phone;
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

export default {
  ensureDefaultSequences,
  triggerSequence,
  processScheduledMessages,
  cancelSequence
};
