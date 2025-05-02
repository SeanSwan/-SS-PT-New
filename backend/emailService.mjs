// backend/emailService.mjs
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import logger from "./utils/logger.mjs";

dotenv.config();

let transporter = null;
let emailServiceReady = false;

// Try to initialize the email service
try {
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST, // e.g., smtp.example.com
      port: process.env.EMAIL_PORT || 587, // e.g., 465 for secure or 587 for TLS
      secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    emailServiceReady = true;
    logger.info('Nodemailer email service configured successfully.');
  } else {
    logger.warn('Nodemailer email service NOT configured due to missing credentials.');
  }
} catch (error) {
  logger.error(`Failed to configure Nodemailer: ${error.message}`);
}

/**
 * Sends an email with the provided options.
 * @param {Object} options - The email options.
 * @param {string} options.to - Recipient email address.
 * @param {string} options.subject - Email subject.
 * @param {string} options.text - Email body text.
 * @param {string} options.html - HTML version of the email (optional).
 * @returns {Promise<Object>} - Result of the email sending operation.
 */
export async function sendEmail({ to, subject, text, html }) {
  // Check if email service is configured
  if (!emailServiceReady || !transporter) {
    logger.error('Attempted to send email, but Nodemailer is not configured/ready.');
    // For development, log what would have been sent
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Email that would have been sent:', {
        to,
        subject,
        text: text ? text.substring(0, 100) + '...' : 'No text content',
      });
    }
    return { success: false, error: new Error('Email service not configured') };
  }

  // Validate parameters
  if (!to || !subject || (!text && !html)) {
    logger.error('Missing required email parameters');
    return { success: false, error: new Error('Missing required email parameters') };
  }

  // Validate from address
  const fromAddress = process.env.EMAIL_FROM;
  if (!fromAddress || !fromAddress.includes('@')) {
    logger.error(`Invalid 'from' address: ${fromAddress}`);
    return { success: false, error: new Error('Invalid sender email address configured') };
  }

  const mailOptions = {
    from: fromAddress,
    to,
    subject,
    text,
    ...(html && { html }), // Add HTML if provided
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    logger.info(`Email sent via Nodemailer to: ${to} | Subject: ${subject}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    logger.error("Error sending email:", error);
    return { success: false, error };
  }
}

// Export service status for checking in other modules
export const isEmailServiceConfigured = () => emailServiceReady;
