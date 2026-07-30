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
      // Six lanes added since this lock was last updated. Each is declared
      // `method: 'FRONTEND_DISPATCH'` in its registry module (bootcampCommands.mjs,
      // painChartCommands.mjs, workoutCommands.mjs), so having no backend
      // dispatcher is correct for them — they mutate browser-local UI state. The
      // lock is doing its job: it forced this to be acknowledged rather than
      // letting new undispatched commands appear silently.
      frontend_event: [
        'add_exercise_to_form',
        'bootcamp_set_duration',
        'bootcamp_set_format',
        'bootcamp_set_structure',
        'load_phase_template',
        'painchart_select_region',
        'planner_add_exercise',
        'planner_generate_workout',
        'planner_rearrange_workout',
        'planner_remove_exercise',
        'planner_swap_exercise',
        'planner_undo_last_change',
        'planner_update_exercise',
        'rest_adjust',
        'rest_skip',
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
