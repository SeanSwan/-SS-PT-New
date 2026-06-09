/**
 * Workout Read Dispatcher Extraction Source Locks
 * ===============================================
 *
 * Guards Swan Coach workout read commands against accumulating workout
 * statistics logic in the central command dispatcher.
 */

import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..', '..');

const read = (relativePath) => fs.readFileSync(path.join(backendRoot, relativePath), 'utf-8');
const exists = (relativePath) => fs.existsSync(path.join(backendRoot, relativePath));

describe('workout read command dispatcher extraction locks', () => {
  const commandDispatcherSource = read('services/ai/commandDispatcher.mjs');

  test('view_workout_statistics lives outside the central command dispatcher', () => {
    const dispatcherPath = 'services/ai/dispatchers/workoutStatisticsReadDispatcher.mjs';
    expect(exists(dispatcherPath)).toBe(true);
    expect(commandDispatcherSource).toContain(
      "from './dispatchers/workoutStatisticsReadDispatcher.mjs'"
    );
    expect(commandDispatcherSource).not.toContain('const dispatchViewWorkoutStatistics = async');
    expect(read(dispatcherPath)).toContain('export const dispatchViewWorkoutStatistics');
    expect(read(dispatcherPath)).toContain("where: { userId: clientId, status: 'completed' }");
  });
});
