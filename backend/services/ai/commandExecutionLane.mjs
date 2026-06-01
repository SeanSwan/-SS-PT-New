/**
 * commandExecutionLane.mjs
 * ========================
 * Classifies registered Swan Coach commands by how they can be acted on.
 * This keeps command discovery honest for UI surfaces and operator tooling.
 */
import { hasDispatcher } from './commandDispatcher.mjs';
import { shouldFallbackNotWiredCommandToChat } from './commandFallbackPolicy.mjs';
import { getManualOnlyCommand } from './commandManualOnlyPolicy.mjs';

export function getCommandExecutionLane(command) {
  if (hasDispatcher(command.type)) {
    return {
      executionLane: 'server_dispatch',
      canExecute: true,
      manualOnly: false,
      manualOnlyReason: null,
    };
  }

  if (command.isDebateRequired) {
    return {
      executionLane: 'debate_async',
      canExecute: true,
      manualOnly: false,
      manualOnlyReason: null,
    };
  }

  const manualOnly = getManualOnlyCommand(command.type);
  if (manualOnly) {
    return {
      executionLane: 'manual_only',
      canExecute: false,
      manualOnly: true,
      manualOnlyReason: manualOnly.reason,
    };
  }

  if (command.method === 'FRONTEND_DISPATCH') {
    return {
      executionLane: 'frontend_event',
      canExecute: true,
      manualOnly: false,
      manualOnlyReason: null,
    };
  }

  if (shouldFallbackNotWiredCommandToChat(command.type)) {
    return {
      executionLane: 'chat_fallback',
      canExecute: false,
      manualOnly: false,
      manualOnlyReason: null,
    };
  }

  return {
    executionLane: 'not_wired',
    canExecute: false,
    manualOnly: false,
    manualOnlyReason: null,
  };
}

export default {
  getCommandExecutionLane,
};
