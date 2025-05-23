// backend/services/twilioService.mjs
import twilio from 'twilio';
import dotenv from 'dotenv';
import logger from '../utils/logger.mjs';

dotenv.config();

let twilioClient = null;
let twilioServiceReady = false;

// Try to initialize the Twilio service
try {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (accountSid && authToken) {
    twilioClient = twilio(accountSid, authToken);
    twilioServiceReady = true;
    logger.info('Twilio service configured successfully.');
  } else {
    logger.warn('Twilio service NOT configured due to missing credentials.');
  }
} catch (error) {
  logger.error(`Failed to configure Twilio: ${error.message}`);
}

/**
 * Sends an SMS using Twilio with the provided options.
 * @param {Object} options - The SMS options.
 * @param {string} options.to - Recipient phone number.
 * @param {string} options.body - SMS body text.
 * @returns {Promise<Object>} - Result of the SMS sending operation.
 */
export async function sendSMS({ to, body }) {
  // Check if Twilio service is configured
  if (!twilioServiceReady || !twilioClient) {
    logger.error('Attempted to send SMS, but Twilio is not configured.');
    // For development, log what would have been sent
    if (process.env.NODE_ENV !== 'production') {
      logger.info('SMS that would have been sent:', {
        to,
        body: body ? body.substring(0, 100) + '...' : 'No body content',
      });
    }
    return { success: false, error: new Error('Twilio service not configured') };
  }

  // Validate parameters
  if (!to || !body) {
    logger.error('Missing required SMS parameters');
    return { success: false, error: new Error('Missing required SMS parameters') };
  }

  // Ensure the phone number includes country code (E.164 format)
  const formattedPhone = to.startsWith('+') ? to : `+1${to.replace(/\D/g, '')}`;

  try {
    const message = await twilioClient.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });
    
    logger.info(`SMS sent via Twilio to: ${formattedPhone} | SID: ${message.sid}`);
    return { success: true, messageSid: message.sid };
  } catch (error) {
    logger.error("Error sending SMS via Twilio:", error);
    return { success: false, error };
  }
}

// Export service status for checking in other modules
export const isTwilioServiceConfigured = () => twilioServiceReady;
