import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

import { getSessionAnalyticsFavoriteExercises } from '../../services/sessionAnalyticsFavoriteExercisesService.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/sessions.mjs'), 'utf8');

describe('session analytics favorite exercises truth', () => {
  it('queries the canonical workout_logs path instead of the empty workout_exercises chain', async () => {
    const query = vi.fn().mockResolvedValue([
      [
        { exerciseName: 'Push-Up', sessions: 5, sets: 20 },
        { exerciseName: 'Goblet Squat', sessions: 3, sets: 12 },
      ],
    ]);

    const favorites = await getSessionAnalyticsFavoriteExercises(42, {
      sequelize: { query },
      limit: 2,
    });

    expect(favorites).toEqual(['Push-Up', 'Goblet Squat']);
    expect(query).toHaveBeenCalledTimes(1);

    const [sql, options] = query.mock.calls[0];
    expect(sql).toMatch(/FROM\s+workout_logs/i);
    expect(sql).toMatch(/JOIN\s+workout_sessions/i);
    expect(sql).toMatch(/wl\."exerciseName"/);
    expect(sql).toMatch(/wl\."sessionId"\s*=\s*ws\.id/);
    expect(sql).toMatch(/ws\."userId"\s*=\s*:userId/);
    expect(sql).toMatch(/ws\.status\s*=\s*'completed'/);
    expect(sql).not.toMatch(/workout_exercises/i);
    expect(sql).not.toMatch(/FROM\s+sets\b/i);
    expect(options).toMatchObject({
      replacements: { userId: 42, limit: 2 },
    });
  });

  it('wires the active sessions analytics route to the real favorite exercise helper', () => {
    const analyticsRoute = routeSource.slice(
      routeSource.indexOf('router.get("/analytics"'),
      routeSource.indexOf('router.post(\'/assign-trainer\'')
    );

    expect(routeSource).toContain("import { getSessionAnalyticsFavoriteExercises } from '../services/sessionAnalyticsFavoriteExercisesService.mjs';");
    expect(analyticsRoute).toContain('const favoriteExercises = await getSessionAnalyticsFavoriteExercises(userId);');
    expect(analyticsRoute).toContain('favoriteExercises,');
    expect(analyticsRoute).not.toContain('favoriteExercises: [], // TODO: Implement when exercise tracking is added');
  });

  it('fails closed to an empty list for invalid users or database errors', async () => {
    const invalidFavorites = await getSessionAnalyticsFavoriteExercises('not-a-user', {
      sequelize: { query: vi.fn() },
    });
    expect(invalidFavorites).toEqual([]);

    const query = vi.fn().mockRejectedValue(new Error('db down'));
    const failedFavorites = await getSessionAnalyticsFavoriteExercises(42, {
      sequelize: { query },
    });
    expect(failedFavorites).toEqual([]);
  });
});
