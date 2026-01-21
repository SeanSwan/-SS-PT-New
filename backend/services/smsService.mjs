/**
 * SMS Service
 * ===========
 * Centralized SMS sending + template rendering for SwanStudios automation.
 */

import logger from '../utils/logger.mjs';
import { sendSMS, isTwilioServiceConfigured } from './twilioService.mjs';

const SMS_TEMPLATES = {
  welcome: 'Welcome to SwanStudios, {clientName}! Your transformation begins now.',
  session_reminder: 'Reminder: You have a session with {trainerName} tomorrow at {time}.',
  workout_complete: 'Great job completing your workout, {clientName}! {message}',
  follow_up_day1: 'How did your first workout feel, {clientName}? Reply with a number 1-10!',
  follow_up_day3: 'Pro tip: Hydration is key! Aim for 0.5-1oz per lb of bodyweight daily.',
  follow_up_day7: 'You crushed your first week! Ready for your Transformation Pack? Reply YES.'
};

const isSmsEnabled = () => process.env.TWILIO_ENABLED !== 'false';

const renderTemplate = (template, variables = {}) => {
  let body = template || '';
  Object.entries(variables).forEach(([key, value]) => {
    body = body.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  });
  return body;
};

export const listSmsTemplates = () => Object.keys(SMS_TEMPLATES).map((name) => ({
  name,
  body: SMS_TEMPLATES[name]
}));

export const sendSmsMessage = async ({ to, body }) => {
  if (!to || !body) {
    return { success: false, error: 'Missing to or body' };
  }

  if (!isSmsEnabled()) {
    logger.info('SMS sending disabled via TWILIO_ENABLED=false');
    return { success: false, error: 'SMS disabled' };
  }

  if (!isTwilioServiceConfigured()) {
    logger.warn('Twilio not configured. SMS not sent.');
    return { success: false, error: 'Twilio not configured' };
  }

  return sendSMS({ to, body });
};

export const sendTemplatedSMS = async ({ to, templateName, variables = {} }) => {
  const template = SMS_TEMPLATES[templateName];
  if (!template) {
    return { success: false, error: 'Template not found' };
  }

  const body = renderTemplate(template, variables);
  const result = await sendSmsMessage({ to, body });

  return { ...result, body };
};

export default {
  listSmsTemplates,
  sendSmsMessage,
  sendTemplatedSMS
};
