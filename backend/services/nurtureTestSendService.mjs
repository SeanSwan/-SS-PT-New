/**
 * Nurture Test Send Service
 * =========================
 * Guarded one-off SMS test send for Sean-approved automation arming.
 */

import logger from '../utils/logger.mjs';
import { sendTemplatedSMS, listSmsTemplates } from './smsService.mjs';

const TEST_SEND_PHONE_RE = /^\+?[1-9]\d{6,14}$/;

const maskTestPhone = (phone) => {
  const value = String(phone || '');
  return value.length <= 4 ? '****' : `***${value.slice(-4)}`;
};

const configuredTestSendAllowlist = () => [process.env.OWNER_PHONE, process.env.OWNER_WIFE_PHONE]
  .filter(Boolean)
  .map((phone) => String(phone).trim())
  .filter(Boolean);

const safeVariables = (variables) => {
  if (!variables || typeof variables !== 'object' || Array.isArray(variables)) return {};
  return variables;
};

/**
 * Sends exactly one templated SMS only after every guard passes.
 * @returns {Promise<{success:boolean, error?:string, to?:string, body?:string|null, templateName?:string, allowed?:string[]}>}
 */
export const sendNurtureTestMessage = async ({ to, templateName, variables = {}, confirm = false, triggeredByUserId = null } = {}) => {
  if (confirm !== true) {
    return { success: false, error: 'confirm_required', message: 'Set confirm:true to send a real test message.' };
  }

  const phone = String(to || '').trim();
  if (!TEST_SEND_PHONE_RE.test(phone)) {
    return { success: false, error: 'invalid_phone', message: 'Provide a single valid E.164-style phone number.' };
  }

  const known = listSmsTemplates().map((template) => template.name);
  if (!known.includes(templateName)) {
    return { success: false, error: 'unknown_template', allowed: known };
  }

  const allowlist = configuredTestSendAllowlist();
  if (!allowlist.length) {
    return { success: false, error: 'test_allowlist_missing', message: 'Configure OWNER_PHONE or OWNER_WIFE_PHONE before sending a real test message.' };
  }
  if (!allowlist.includes(phone)) {
    return { success: false, error: 'not_in_test_allowlist', message: 'Test sends are restricted to configured owner number(s).' };
  }

  const result = await sendTemplatedSMS({ to: phone, templateName, variables: safeVariables(variables) });
  logger.info(`[NurtureTestSend] admin#${triggeredByUserId ?? '?'} -> ${maskTestPhone(phone)} template=${templateName} success=${Boolean(result?.success)}`);
  return {
    success: Boolean(result?.success),
    templateName,
    to: maskTestPhone(phone),
    body: result?.body || null,
    error: result?.success ? undefined : (result?.error || 'send_failed'),
  };
};
