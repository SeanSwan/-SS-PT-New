/**
 * Sends a real-time notification to the admin dashboard via socket.io
 * 
 * @param {Object} options - The notification options
 * @param {string} options.type - Notification type (e.g., 'ADMIN_NOTIFICATION', 'PURCHASE', 'CLIENT_UPDATE')
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message
 * @param {Object} options.data - Additional data relevant to the notification
 * @param {Array|string} options.recipients - 'admin', 'trainer', or specific user IDs
 * @returns {Promise<Object>} Result of the notification operation
 */
export async function sendNotification({ type, title, message, data = {}, recipients = [], subject, text, html, phone, smsBody }) {
  const results = {
    email: { sent: false },
    sms: { sent: false },
    realtime: { sent: false }
  };

  // Handle legacy email/SMS functionality
  if (subject || text || html || phone || smsBody) {
    try {
      const traditionalResults = await sendTraditionalNotification({ 
        to: recipients?.includes?.('email') ? recipients : undefined, 
        subject, 
        text, 
        html, 
        phone, 
        smsBody 
      });
      results.email = traditionalResults.email;
      results.sms = traditionalResults.sms;
    } catch (error) {
      logger.error('Error sending traditional notification:', error);
    }
  }

  // Handle real-time dashboard notifications
  if (type && title && message) {
    try {
      const io = getIO();
      if (!io) {
        logger.warn('Socket.io not initialized, real-time notification not sent');
        results.realtime = { sent: false, error: 'Socket.io not initialized' };
        return results;
      }

      // Format the notification
      const notification = {
        id: Date.now().toString(),
        type,
        title,
        message,
        data,
        timestamp: new Date().toISOString(),
        read: false
      };

      // Determine recipients for real-time notification
      let targetRooms = [];

      // If recipients includes 'admin', send to admin room
      if (typeof recipients === 'string' && recipients === 'admin') {
        targetRooms.push('admin');
      } 
      // If recipients is an array
      else if (Array.isArray(recipients)) {
        // Check for role-based recipients
        if (recipients.includes('admin')) targetRooms.push('admin');
        if (recipients.includes('trainer')) targetRooms.push('trainer');
        
        // Add individual user IDs as rooms
        const userIds = recipients.filter(r => r !== 'admin' && r !== 'trainer');
        targetRooms = [...targetRooms, ...userIds];
      }

      // No valid recipients specified
      if (targetRooms.length === 0) {
        logger.warn('No valid recipients for real-time notification');
        results.realtime = { sent: false, error: 'No valid recipients' };
        return results;
      }

      // Send notification to each target room
      for (const room of targetRooms) {
        io.to(room).emit('notification', notification);
      }

      // Also trigger dashboard update for client sessions or purchases
      if (type === 'ADMIN_NOTIFICATION' && data?.type === 'purchase') {
        io.to('admin').emit('dashboard:update', { 
          type: 'purchase',
          data: { ...data }
        });
      }

      results.realtime = { sent: true, recipients: targetRooms };
      logger.info(`Real-time notification sent to ${targetRooms.join(', ')}`);
    } catch (error) {
      logger.error('Error sending real-time notification:', error);
      results.realtime = { sent: false, error: error.message };
    }
  }

  return results;
}

/**
 * Legacy notification function for email and SMS
 * @private
 */
async function sendTraditionalNotification({ to, subject, text, html, phone, smsBody }) {
  const results = {
    email: { sent: false },
    sms: { sent: false }
  };

  // Send email notification
  if (to) {
    try {
      // Try SendGrid first, fall back to nodemailer
      if (isSendGridServiceConfigured()) {
        const emailResult = await sendGridEmail({ to, subject, text, html });
        results.email = { sent: emailResult.success, provider: 'sendgrid' };
      } else if (isEmailServiceConfigured()) {
        const emailResult = await sendEmail({ to, subject, text, html });
        results.email = { sent: emailResult.success, provider: 'nodemailer' };
      } else {
        logger.warn('No email service is configured. Email notification not sent.');
        results.email = { sent: false, error: 'No email service configured' };
      }
    } catch (error) {
      logger.error('Error sending email notification:', error);
      results.email = { sent: false, error: error.message };
    }
  }

  // Send SMS notification
  if (phone && smsBody) {
    try {
      if (isTwilioServiceConfigured()) {
        const smsResult = await sendSMS({ to: phone, body: smsBody });
        results.sms = { sent: smsResult.success, provider: 'twilio' };
      } else {
        logger.warn('Twilio service is not configured. SMS notification not sent.');
        results.sms = { sent: false, error: 'Twilio service not configured' };
      }
    } catch (error) {
      logger.error('Error sending SMS notification:', error);
      results.sms = { sent: false, error: error.message };
    }
  }

  return results;
}

/**
 * Sends notification to primary recipients only (priority contacts)
 * This is useful for urgent notifications that should only go to primary contacts
 * 
 * @param {Object} options - The notification options.
 * @param {string} options.subject - Email subject.
 * @param {string} options.text - Email body text.
 * @param {string} options.html - HTML version of the email (optional).
 * @param {string} options.smsBody - SMS body text.
 * @returns {Promise<Object>} - Result of the notification sending operation.
 */
export async function sendPriorityNotification({ subject, text, html, smsBody }) {
  const results = {
    emails: [],
    sms: []
  };

  try {
    // Get primary recipients
    const { emails: primaryEmails, phones: primaryPhones } = await getPrimaryRecipients();

    // Send emails to primary contacts
    for (const email of primaryEmails) {
      try {
        const emailResult = await sendNotification({
          recipients: [email.trim()],
          subject,
          text,
          html
        });
        results.emails.push({ email, result: emailResult.email });
      } catch (error) {
        logger.error(`Error sending priority email to ${email}:`, error);
        results.emails.push({ email, result: { sent: false, error: error.message } });
      }
    }

    // Send SMS to primary phones
    if (smsBody) {
      for (const phone of primaryPhones) {
        try {
          const smsResult = await sendNotification({
            recipients: [],
            phone: phone.trim(),
            smsBody
          });
          results.sms.push({ phone, result: smsResult.sms });
        } catch (error) {
          logger.error(`Error sending priority SMS to ${phone}:`, error);
          results.sms.push({ phone, result: { sent: false, error: error.message } });
        }
      }
    }

    return results;
  } catch (error) {
    logger.error('Error in sendPriorityNotification:', error);
    return results;
  }
}// backend/services/notificationService.mjs
import { sendEmail, isEmailServiceConfigured } from '../emailService.mjs';
import { sendGridEmail, isSendGridServiceConfigured } from './sendgridService.mjs';
import { sendSMS, isTwilioServiceConfigured } from './twilioService.mjs';
import { getNotificationRecipients, getPrimaryRecipients } from './notificationSettingsService.mjs';
import logger from '../utils/logger.mjs';
import { getIO } from '../socket/socketManager.mjs';
// 🚀 ENHANCED: Coordinated model imports for consistent associations
import { getUser } from '../models/index.mjs';

// Get User model with coordinated associations
const User = getUser();

// Legacy function moved to sendTraditionalNotification and no longer exported separately
// Instead, unified sendNotification above handles both real-time and traditional notifications

/**
 * Sends admin notifications (to all configured admin emails and phones).
 * 
 * @param {Object} options - The notification options.
 * @param {string} options.subject - Email subject.
 * @param {string} options.text - Email body text.
 * @param {string} options.html - HTML version of the email (optional).
 * @param {string} options.smsBody - SMS body text.
 * @param {string} options.title - Title for real-time notification.
 * @param {string} options.message - Message for real-time notification.
 * @param {Object} options.data - Additional data for the notification.
 * @param {string} options.notificationType - Type of notification (ADMIN, ORIENTATION, ORDER, SYSTEM, ALL).
 * @returns {Promise<Object>} - Result of the notification sending operation.
 */
export async function sendAdminNotification({ subject, text, html, smsBody, title, message, data = {}, notificationType = 'ADMIN' }) {
  const results = {
    emails: [],
    sms: [],
    realtime: { sent: false }
  };

  try {
    // Get admin recipients from database (or fallback to environment variables)
    const { emails: adminEmails, phones: adminPhones } = await getNotificationRecipients(notificationType);

    // If this is a modern notification with title/message, send it via the unified system
    if (title && message) {
      try {
        const notificationResult = await sendNotification({
          type: 'ADMIN_NOTIFICATION',
          title,
          message,
          data,
          recipients: ['admin']
        });
        results.realtime = notificationResult.realtime;
      } catch (error) {
        logger.error('Error sending real-time admin notification:', error);
        results.realtime = { sent: false, error: error.message };
      }
    }

    // Send emails to all admins (traditional method)
    if (subject || text || html) {
      for (const email of adminEmails) {
        try {
          const emailResult = await sendNotification({
            recipients: [email.trim()],
            subject,
            text,
            html
          });
          results.emails.push({ email, result: emailResult.email });
        } catch (error) {
          logger.error(`Error sending admin email to ${email}:`, error);
          results.emails.push({ email, result: { sent: false, error: error.message } });
        }
      }
    }

    // Send SMS to all admin phones
    if (smsBody) {
      for (const phone of adminPhones) {
        try {
          const smsResult = await sendNotification({
            recipients: [],
            phone: phone.trim(),
            smsBody
          });
          results.sms.push({ phone, result: smsResult.sms });
        } catch (error) {
          logger.error(`Error sending admin SMS to ${phone}:`, error);
          results.sms.push({ phone, result: { sent: false, error: error.message } });
        }
      }
    }

    return results;
  } catch (error) {
    logger.error('Error in sendAdminNotification:', error);
    return results;
  }
}
