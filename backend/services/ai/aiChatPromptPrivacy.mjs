import logger from '../../utils/logger.mjs';
import {
  stripIdentityFromMessage,
  stripIdentityFromResponse,
} from '../aiPrivacyService.mjs';

export const CURRENT_MESSAGE_WITHHELD = '[Message withheld: identity redaction unavailable.]';
export const HISTORY_MESSAGE_WITHHELD = '[Previous message withheld: identity redaction unavailable.]';

export async function sanitizePromptHistory({
  messages,
  enrichUserId,
  sequelize,
  maxMessages = 6,
  messageStripper = stripIdentityFromMessage,
  responseStripper = stripIdentityFromResponse,
  log = logger,
} = {}) {
  const sourceMessages = Array.isArray(messages) ? messages.slice(-maxMessages) : [];
  if (!enrichUserId) return { messages: sourceMessages, identitiesStripped: 0 };

  let identitiesStripped = 0;
  const sanitizedMessages = [];

  for (const msg of sourceMessages) {
    if (!msg || typeof msg !== 'object') continue;
    const content = typeof msg.content === 'string' ? msg.content : '';
    if (!content) {
      sanitizedMessages.push(msg);
      continue;
    }

    try {
      if (msg.role === 'assistant') {
        const result = await responseStripper(content, enrichUserId, sequelize);
        identitiesStripped += result.identitiesStripped || 0;
        sanitizedMessages.push({ ...msg, content: result.sanitizedResponse });
      } else {
        const result = await messageStripper(content, enrichUserId, sequelize);
        identitiesStripped += result.identitiesStripped || 0;
        sanitizedMessages.push({ ...msg, content: result.sanitizedMessage });
      }
    } catch (stripErr) {
      identitiesStripped += 1;
      log.warn('[AIChatPromptPrivacy] Prompt history PII stripping failed; withholding history item:', stripErr.message);
      sanitizedMessages.push({ ...msg, content: HISTORY_MESSAGE_WITHHELD });
    }
  }

  return { messages: sanitizedMessages, identitiesStripped };
}
