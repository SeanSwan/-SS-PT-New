/**
 * commandFallbackPolicy.mjs
 * =========================
 * Keeps legacy command-lane drafts flowing into Swan Coach chat/proposals.
 */

const CHAT_FALLBACK_NOT_WIRED_COMMANDS = new Set([
  'nutrition_advice',
]);

export function shouldFallbackNotWiredCommandToChat(commandType) {
  return CHAT_FALLBACK_NOT_WIRED_COMMANDS.has(commandType);
}

export default {
  shouldFallbackNotWiredCommandToChat,
};
