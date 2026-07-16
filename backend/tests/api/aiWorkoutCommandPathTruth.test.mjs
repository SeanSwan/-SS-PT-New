import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Swan Coach workout command route truth', () => {
  it('keeps trainer/admin workout command endpoints aligned to mounted backend routes', () => {
    const coreRoutesSource = read('backend/core/routes.mjs');
    const workoutRoutesSource = read('backend/routes/workoutRoutes.mjs');
    const workoutPlanRoutesSource = read('backend/routes/workoutPlanRoutes.mjs');
    const workoutCommandsSource = read('backend/services/ai/commandRegistry/workoutCommands.mjs');

    expect(coreRoutesSource).toContain("app.use('/api/workout-plans', workoutPlanRoutes)");
    expect(coreRoutesSource).toContain("app.use('/api/workout', workoutRoutes)");
    expect(workoutPlanRoutesSource).toContain("router.post('/', protect, trainerOrAdminOnly");
    expect(workoutPlanRoutesSource).toMatch(
      /router\.delete\(\s*'\/:id',\s*protect,\s*trainerOrAdminOnly,\s*verifyClientAccessByPlanId\(\{ paramName: 'id' \}\),\s*workoutPlanArchiveHandler,\s*\);/,
    );
    expect(workoutRoutesSource).toContain("router.get('/sessions/user/:userId', protect, authorize(['admin', 'trainer'])");
    expect(workoutRoutesSource).toContain("router.get('/recommendations/:userId', protect, authorize(['admin', 'trainer'])");
    expect(workoutRoutesSource).toContain("router.post('/sessions', protect, workoutController.createWorkoutSession)");
    expect(workoutRoutesSource).toContain("router.get('/statistics/:userId', protect, authorizeResourceAccess('userId')");

    expect(workoutCommandsSource).toContain("endpoint: '/api/workout-plans'");
    expect(workoutCommandsSource).toContain("endpoint: '/api/workout/sessions/user/:clientId'");
    expect(workoutCommandsSource).toContain("endpoint: '/api/workout/recommendations/:clientId'");
    expect(workoutCommandsSource).toContain("endpoint: '/api/workout/sessions'");
    expect(workoutCommandsSource).toContain("endpoint: '/api/workout-plans/:planId'");
    expect(workoutCommandsSource).toContain("endpoint: '/api/workout/statistics/:clientId'");

    expect(workoutCommandsSource).not.toContain("endpoint: '/api/workouts/plans'");
    expect(workoutCommandsSource).not.toContain("endpoint: '/api/workouts/sessions/user/:clientId'");
    expect(workoutCommandsSource).not.toContain("endpoint: '/api/workouts/recommendations/:clientId'");
    expect(workoutCommandsSource).not.toContain("endpoint: '/api/workouts/sessions'");
    expect(workoutCommandsSource).not.toContain("endpoint: '/api/workouts/plans/:planId'");
    expect(workoutCommandsSource).not.toContain("endpoint: '/api/workouts/statistics/:clientId'");
  });
});
