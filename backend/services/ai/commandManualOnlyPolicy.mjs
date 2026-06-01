/**
 * commandManualOnlyPolicy.mjs
 * ===========================
 * Documents commands that are recognized but intentionally not executable by
 * Swan Coach until a safer manual workflow or canonical backend surface exists.
 */

const MANUAL_ONLY_COMMANDS = new Map([
  ['block_user_posting', {
    reason: 'user-level posting bans do not yet have a canonical route or model field; current moderation routes only update individual posts',
  }],
  ['run_ai_village', {
    reason: 'AI Village runs require explicit Sean approval and must be launched through the supervised validation workflow, not automatic command execution',
  }],
  ['update_nasm_level', {
    reason: 'the command uses 1-5 NASM phase language, but ClientProgress stores 0-1000 progress values and no approved phase-to-value mapping exists yet',
  }],
  ['upload_client_photo', {
    reason: 'client photo uploads require explicit browser file selection and a multipart photo payload; AI command text cannot supply the file safely',
  }],
]);

export function getManualOnlyCommand(commandType) {
  return MANUAL_ONLY_COMMANDS.get(commandType) || null;
}

export function isManualOnlyCommand(commandType) {
  return MANUAL_ONLY_COMMANDS.has(commandType);
}

export default {
  getManualOnlyCommand,
  isManualOnlyCommand,
};
