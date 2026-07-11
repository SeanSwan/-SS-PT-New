// backend/services/sendgridService.mjs
import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';
import logger from '../utils/logger.mjs';

dotenv.config();

let sendgridServiceReady = false;

// Try to initialize the SendGrid service
try {
  if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    sendgridServiceReady = true;
    logger.info('SendGrid service configured successfully.');
  } else {
    logger.warn('SendGrid service NOT configured due to missing API key.');
  }
} catch (error) {
  logger.error(`Failed to configure SendGrid: ${error.message}`);
}

/**
 * Sends an email using SendGrid with the provided options.
 * @param {Object} options - The email options.
 * @param {string} options.to - Recipient email address.
 * @param {string} options.subject - Email subject.
 * @param {string} options.text - Email body text.
 * @param {string} options.html - HTML version of the email (optional).
 * @returns {Promise<Object>} - Result of the email sending operation.
 */
export async function sendGridEmail({ to, subject, text, html, headers }) {
  // Check if SendGrid service is configured
  if (!sendgridServiceReady) {
    logger.error('Attempted to send email via SendGrid, but it is not configured.');
    // For development, log what would have been sent
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Email that would have been sent:', {
        to,
        subject,
        text: text ? text.substring(0, 100) + '...' : 'No text content',
      });
    }
    return { success: false, error: new Error('SendGrid service not configured') };
  }

  // Validate parameters
  if (!to || !subject || (!text && !html)) {
    logger.error('Missing required email parameters');
    return { success: false, error: new Error('Missing required email parameters') };
  }

  // Validate from address
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  if (!fromEmail || !fromEmail.includes('@')) {
    logger.error(`Invalid 'from' address: ${fromEmail}`);
    return { success: false, error: new Error('Invalid sender email address configured') };
  }

  const msg = {
    to, // string OR array — @sendgrid/mail accepts multiple recipients as an array
    from: fromEmail,
    subject,
    text,
    ...(html && { html }), // Add HTML if provided
    ...(headers && typeof headers === 'object' && { headers }), // e.g. List-Unsubscribe (RFC 8058)
  };

  try {
    await sgMail.send(msg);
    logger.info(`Email sent via SendGrid to: ${to} | Subject: ${subject}`);
    return { success: true };
  } catch (error) {
    logger.error("Error sending email via SendGrid:", error);
    // Transient (rate-limit / server / network) errors are retryable so the caller can DEFER
    // rather than permanently drop the message; a 4xx (e.g. bad recipient) stays terminal.
    const status = error?.code || error?.response?.statusCode;
    const retryable = !status || status === 429 || Number(status) >= 500;
    return { success: false, error, retryable };
  }
}

// Export service status for checking in other modules
export const isSendGridServiceConfigured = () => sendgridServiceReady;
