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
          to: email.trim(),
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

/**
 * Sends a notification via email and SMS.
 * Falls back to nodemailer if SendGrid is not configured.
 * 
 * @param {Object} options - The notification options.
 * @param {string} options.to - Recipient email address.
 * @param {string} options.subject - Email subject.
 * @param {string} options.text - Email body text.
 * @param {string} options.html - HTML version of the email (optional).
 * @param {string} options.phone - Recipient phone number.
 * @param {string} options.smsBody - SMS body text.
 * @returns {Promise<Object>} - Result of the notification sending operation.
 */
export async function sendNotification({ to, subject, text, html, phone, smsBody }) {
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
 * Sends admin notifications (to all configured admin emails and phones).
 * 
 * @param {Object} options - The notification options.
 * @param {string} options.subject - Email subject.
 * @param {string} options.text - Email body text.
 * @param {string} options.html - HTML version of the email (optional).
 * @param {string} options.smsBody - SMS body text.
 * @param {string} options.notificationType - Type of notification (ADMIN, ORIENTATION, ORDER, SYSTEM, ALL).
 * @returns {Promise<Object>} - Result of the notification sending operation.
 */
export async function sendAdminNotification({ subject, text, html, smsBody, notificationType = 'ADMIN' }) {
  const results = {
    emails: [],
    sms: []
  };

  try {
    // Get admin recipients from database (or fallback to environment variables)
    const { emails: adminEmails, phones: adminPhones } = await getNotificationRecipients(notificationType);

    // Send emails to all admins
    for (const email of adminEmails) {
      try {
        const emailResult = await sendNotification({
          to: email.trim(),
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

    // Send SMS to all admin phones
    if (smsBody) {
      for (const phone of adminPhones) {
        try {
          const smsResult = await sendNotification({
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
