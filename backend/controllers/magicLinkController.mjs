/** Public, enumeration-safe handlers for one-time email authentication. */
import { issueAuthSession } from '../services/auth/authSessionService.mjs';
import {
  consumeMagicLink,
  isMagicLinkEnabled,
  issueMagicLink,
} from '../services/auth/magicLinkService.mjs';
import logger from '../utils/logger.mjs';

const acceptedMessage = 'If an active account matches that email, a sign-in link is on its way.';
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

export async function requestMagicLink(request, response) {
  if (!isMagicLinkEnabled()) {
    return response.status(503).json({ success: false, message: 'Email sign-in is unavailable.' });
  }
  if (!validEmail(request.body?.email)) {
    return response.status(400).json({ success: false, message: 'Enter a valid email address.' });
  }
  void issueMagicLink(request.body.email, request.body.returnUrl)
    .catch((error) => logger.error('[magicLink] request_failed', {
      code: error.code || error.name || 'UNKNOWN',
    }));
  return response.status(202).json({ success: true, message: acceptedMessage });
}

export async function exchangeMagicLink(request, response) {
  if (!isMagicLinkEnabled()) {
    return response.status(503).json({ success: false, message: 'Email sign-in is unavailable.' });
  }
  try {
    const user = await consumeMagicLink(request.body?.token);
    return response.json(await issueAuthSession(user, request));
  } catch (error) {
    logger.warn('[magicLink] exchange_rejected', { code: error.code || 'INVALID_OR_EXPIRED' });
    return response.status(error.status || 401).json({
      success: false,
      message: 'Sign-in link is invalid or expired.',
    });
  }
}