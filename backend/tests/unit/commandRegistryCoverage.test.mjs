/**
 * commandRegistryCoverage.test.mjs
 * ================================
 * Locks the command registry against silent raw not_wired drift. Any command
 * without a server dispatcher must be explicitly classified into a safe lane.
 */
import { describe, expect, it } from 'vitest';
import { hasDispatcher } from '../../services/ai/commandDispatcher.mjs';
import { getCommandExecutionLane } from '../../services/ai/commandExecutionLane.mjs';
import { getAllCommands, initializeRegistry } from '../../services/ai/commandRegistry/index.mjs';

describe('command registry execution coverage', () => {
  it('classifies every command without a server dispatcher into an intentional lane', () => {
    initializeRegistry();

    const unclassified = getAllCommands()
      .filter((command) => getCommandExecutionLane(command).executionLane === 'not_wired')
      .map((command) => command.type);

    expect(unclassified).toEqual([]);
  });

  it('locks the current non-dispatched command lanes', () => {
    initializeRegistry();

    const lanes = getAllCommands()
      .filter((command) => !hasDispatcher(command.type))
      .reduce((acc, command) => {
        const lane = getCommandExecutionLane(command).executionLane;
        acc[lane] = [...(acc[lane] || []), command.type].sort();
        return acc;
      }, {});

    expect(lanes).toEqual({
      chat_fallback: [
        'nutrition_advice',
      ],
      debate_async: [
        'build_workout_plan',
        'create_nasm_program',
        'create_nutrition_plan',
        'generate_periodization',
      ],
      frontend_event: [
        'add_exercise_to_form',
        'load_phase_template',
        'planner_add_exercise',
        'planner_generate_workout',
        'planner_remove_exercise',
        'planner_swap_exercise',
        'planner_update_exercise',
        'submit_workout_form',
        'toggle_nasm_item',
        'update_set_data',
      ],
      manual_only: [
        'block_user_posting',
        'run_ai_village',
        'update_nasm_level',
        'upload_client_photo',
      ],
    });
  });
});
