/**
 * Session Reminder Cron Service
 * ==============================
 * Sends automated reminders at 24h and 1h before scheduled sessions.
 * Runs every 30 minutes via setInterval (matches server patterns).
 * Idempotent: tracks sent reminders via session.remindersSent JSON field.
 */

import { Op } from 'sequelize';
import { format } from 'date-fns';
import { getSession, getUser } from '../models/index.mjs';
import sequelize from '../database.mjs';
import { sendEmailNotification, sendSmsNotification } from '../utils/notification.mjs';
import { sessionReminderEmail, SMS } from '../utils/emailTemplates.mjs';
import logger from '../utils/logger.mjs';

const REMINDER_INTERVALS = [
  { key: '24h', hoursBefore: 24, windowMinutes: 60 },
  { key: '1h', hoursBefore: 1, windowMinutes: 90 },
];

const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Process reminders for upcoming sessions
 */
async function processReminders() {
  try {
    const Session = getSession();
    const User = getUser();
    const now = new Date();

    for (const interval of REMINDER_INTERVALS) {
      const targetTime = new Date(now.getTime() + interval.hoursBefore * 60 * 60 * 1000);
      const windowStart = new Date(targetTime.getTime() - interval.windowMinutes * 60 * 1000);
      const windowEnd = new Date(targetTime.getTime() + interval.windowMinutes * 60 * 1000);

      const sessions = await Session.findAll({
        where: {
          sessionDate: { [Op.between]: [windowStart, windowEnd] },
          status: { [Op.in]: ['scheduled', 'confirmed'] },
        },
        include: [
          { model: User, as: 'client', attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'emailNotifications', 'smsNotifications', 'notificationPreferences'] },
          { model: User, as: 'trainer', attributes: ['id', 'firstName', 'lastName'] },
        ],
      });

      for (const session of sessions) {
        // Parse existing reminders sent
        let remindersSent = {};
        try {
          remindersSent = session.remindersSent ? (typeof session.remindersSent === 'string' ? JSON.parse(session.remindersSent) : session.remindersSent) : {};
        } catch { remindersSent = {}; }

        // Skip if already sent this reminder
        if (remindersSent[interval.key]) continue;

        const client = session.client;
        if (!client) continue;

        const trainerName = session.trainer
          ? `${session.trainer.firstName} ${session.trainer.lastName}`
          : 'your trainer';
        const sessionDateFormatted = format(new Date(session.sessionDate), 'EEEE, MMMM d, yyyy h:mm a');
        const timeOnly = format(new Date(session.sessionDate), 'h:mm a');

        // Atomically mark reminder as sent BEFORE sending to prevent race condition.
        // If the process crashes after marking but before sending, we miss one reminder
        // (acceptable) rather than sending duplicates (unacceptable).
        remindersSent[interval.key] = new Date().toISOString();
        try {
          await sequelize.transaction(async (t) => {
            await session.update({ remindersSent }, { transaction: t });
          });
        } catch (updateErr) {
          logger.warn(`[SessionReminder] Could not claim reminder lock for session ${session.id}: ${updateErr.message}`);
          continue; // Skip sending if we can't mark it — another process may have claimed it
        }

        // Send email reminder
        if (client.email && client.emailNotifications !== false) {
          try {
            const html = sessionReminderEmail({
              clientName: client.firstName,
              trainerName,
              sessionDate: sessionDateFormatted,
              duration: session.duration,
              location: session.location,
              hoursUntil: interval.hoursBefore,
            });

            await sendEmailNotification({
              to: client.email,
              subject: `Session Reminder - ${interval.hoursBefore === 1 ? 'Starting Soon' : 'Tomorrow'}`,
              text: `Hi ${client.firstName}, reminder: your session with ${trainerName || 'your trainer'} is ${interval.hoursBefore === 1 ? 'in 1 hour' : 'tomorrow'} at ${timeOnly}.`,
              html,
            });
          } catch (emailErr) {
            logger.warn(`[SessionReminder] Email failed for session ${session.id}: ${emailErr.message}`);
          }
        }

        // Send SMS reminder
        if (client.phone && client.smsNotifications !== false) {
          try {
            const smsTemplate = interval.key === '1h' ? SMS.reminder1h : SMS.reminder24h;
            await sendSmsNotification({
              to: client.phone,
              body: smsTemplate({ trainerName, time: timeOnly }),
            });
          } catch (smsErr) {
            logger.warn(`[SessionReminder] SMS failed for session ${session.id}: ${smsErr.message}`);
          }
        }

        logger.info(`[SessionReminder] Sent ${interval.key} reminder for session ${session.id} to ${client.firstName} ${client.lastName}`);
      }
    }
  } catch (error) {
    logger.error(`[SessionReminder] Error processing reminders: ${error.message}`);
  }
}

let reminderInterval = null;

/**
 * Start the session reminder scheduler
 */
export function startSessionReminderScheduler() {
  if (reminderInterval) {
    logger.warn('[SessionReminder] Scheduler already running');
    return;
  }

  logger.info('[SessionReminder] Starting session reminder scheduler (every 30 min)');

  // Run immediately on start, then every 30 minutes
  setTimeout(() => processReminders(), 5000);
  reminderInterval = setInterval(processReminders, CHECK_INTERVAL_MS);
}

/**
 * Stop the scheduler (for graceful shutdown)
 */
export function stopSessionReminderScheduler() {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
    logger.info('[SessionReminder] Scheduler stopped');
  }
}

export default { startSessionReminderScheduler, stopSessionReminderScheduler };
