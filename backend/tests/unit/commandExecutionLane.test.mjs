import { describe, expect, it } from 'vitest';
import { getCommandExecutionLane } from '../../services/ai/commandExecutionLane.mjs';
import { getCommand, initializeRegistry } from '../../services/ai/commandRegistry/index.mjs';

describe('command execution lane classifier', () => {
  it('classifies server, frontend, manual, debate, and chat-fallback commands', () => {
    initializeRegistry();

    expect(getCommandExecutionLane(getCommand('view_client_profile'))).toMatchObject({
      executionLane: 'server_dispatch',
      canExecute: true,
      manualOnly: false,
    });

    expect(getCommandExecutionLane(getCommand('add_exercise_to_form'))).toMatchObject({
      executionLane: 'frontend_event',
      canExecute: true,
      manualOnly: false,
    });

    expect(getCommandExecutionLane(getCommand('submit_workout_form'))).toMatchObject({
      executionLane: 'frontend_event',
      canExecute: true,
      manualOnly: false,
    });

    expect(getCommandExecutionLane(getCommand('reset_client_password'))).toMatchObject({
      executionLane: 'server_dispatch',
      canExecute: true,
      manualOnly: false,
    });

    expect(getCommandExecutionLane(getCommand('build_workout_plan'))).toMatchObject({
      executionLane: 'debate_async',
      canExecute: true,
      manualOnly: false,
    });

    expect(getCommandExecutionLane(getCommand('nutrition_advice'))).toMatchObject({
      executionLane: 'chat_fallback',
      canExecute: false,
      manualOnly: false,
    });
  });
});
