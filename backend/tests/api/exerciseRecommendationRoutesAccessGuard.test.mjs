import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/exerciseRoutes.mjs'), 'utf8');
const workoutRouteSource = readFileSync(resolve(__dirname, '../../routes/workoutRoutes.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

describe('exercise recommendation route access guard', () => {
  it('keeps exercise recommendations protected and ordered before the generic id route', () => {
    expect(coreRoutesSource).toContain("app.use('/api/exercises', exerciseRoutes)");
    expect(routeSource).toContain("import { protect, authorize, authorizeResourceAccess, trainerOrAdminOnly } from '../middleware/authMiddleware.mjs';");
    expect(routeSource).toContain("router.get('/recommended', protect, workoutController.getExerciseRecommendations)");
    expect(routeSource).toContain("router.get('/recommended/:userId', protect, authorize(['admin', 'trainer']), authorizeResourceAccess('userId'), workoutController.getExerciseRecommendations)");
    expect(routeSource.indexOf("router.get('/recommended'")).toBeLessThan(routeSource.indexOf("router.get('/:id'"));
  });

  it('matches the canonical workout recommendation access contract', () => {
    expect(workoutRouteSource).toContain("router.get('/recommendations/:userId', protect, authorize(['admin', 'trainer']), authorizeResourceAccess('userId'), workoutController.getExerciseRecommendations)");
  });
});
