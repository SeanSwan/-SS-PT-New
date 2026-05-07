/**
 * commandFallbackPolicy.mjs
 * =========================
 * Keeps legacy command-lane drafts flowing into Swan Coach chat/proposals.
 */

const CHAT_FALLBACK_NOT_WIRED_COMMANDS = new Set([
  'add_exercise_to_form',
  'create_client',
  'create_external_client',
  'create_workout_session',
  'load_phase_template',
  'submit_workout_form',
  'toggle_nasm_item',
  'update_client',
  'update_nasm_level',
  'update_set_data',
]);

export function shouldFallbackNotWiredCommandToChat(commandType) {
  return CHAT_FALLBACK_NOT_WIRED_COMMANDS.has(commandType);
}

export default {
  shouldFallbackNotWiredCommandToChat,
};
