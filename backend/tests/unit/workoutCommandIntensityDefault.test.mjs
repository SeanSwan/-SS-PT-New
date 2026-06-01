/**
 * workoutCommandIntensityDefault.test.mjs
 * =======================================
 * Locks the Swan Coach command-lane workout logging contract: if the trainer
 * does not dictate session intensity, the command schema must not invent a
 * neutral 5/10. The downstream workoutLogService already persists missing
 * intensity as null so charts do not show phantom effort data.
 */
import { describe, expect, it } from 'vitest';
import workoutCommands from '../../services/ai/commandRegistry/workoutCommands.mjs';

const logWorkoutCommand = workoutCommands.find((command) => command.type === 'log_workout');

describe('Swan Coach log_workout command intensity defaults', () => {
  it('does not seed intensity when the dictated workout did not include it', () => {
    const parsed = logWorkoutCommand.inputSchema.parse({
      clientId: 42,
      exercises: [
        {
          name: 'Push-up',
          sets: 3,
          reps: 10,
        },
      ],
    });

    expect(parsed).not.toHaveProperty('intensity');
  });

  it('preserves explicit dictated intensity', () => {
    const parsed = logWorkoutCommand.inputSchema.parse({
      clientId: 42,
      intensity: 7,
      exercises: [
        {
          name: 'Push-up',
          sets: 3,
          reps: 10,
        },
      ],
    });

    expect(parsed.intensity).toBe(7);
  });
});
