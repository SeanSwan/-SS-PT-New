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

  it('supports admin-library query mode without treating it as a real client id', () => {
    const controllerSource = readFileSync(resolve(__dirname, '../../controllers/workoutController.mjs'), 'utf8');
    const serviceSource = readFileSync(resolve(__dirname, '../../services/workoutService.mjs'), 'utf8');

    expect(controllerSource).toContain('req.query.userId');
    expect(controllerSource).toContain("const userId = libraryMode ? 'admin-library' : (requestedUserId || req.user.id);");
    expect(controllerSource).toContain('admin-library');
    expect(controllerSource).toContain('libraryMode');
    expect(serviceSource).toContain('libraryMode = false');
    expect(serviceSource).toMatch(/libraryMode\s*\?\s*null\s*:\s*await\s+ClientProgress\.findOne/);
  });

  it('normalizes recommendation limits before passing them to Sequelize', () => {
    const controllerSource = readFileSync(resolve(__dirname, '../../controllers/workoutController.mjs'), 'utf8');

    expect(controllerSource).toContain('const parsedLimit = Number.parseInt(String(limit), 10);');
    expect(controllerSource).toContain('const normalizedLimit = Number.isFinite(parsedLimit)');
    expect(controllerSource).toContain('Math.min(Math.max(parsedLimit, 1), 100)');
    expect(controllerSource).toContain('limit: limit ? normalizedLimit : undefined');
    expect(controllerSource).not.toContain('limit: limit ? parseInt(limit) : undefined');
  });

  it('forwards trainer-friendly recommendation filters from the direct workout API', () => {
    const controllerSource = readFileSync(resolve(__dirname, '../../controllers/workoutController.mjs'), 'utf8');

    expect(controllerSource).toContain('muscleGroupNames');
    expect(controllerSource).toContain('bodyRegions');
    expect(controllerSource).toContain("muscleGroupNames: muscleGroupNames ? (Array.isArray(muscleGroupNames) ? muscleGroupNames : [muscleGroupNames]) : undefined");
    expect(controllerSource).toContain("bodyRegions: bodyRegions ? (Array.isArray(bodyRegions) ? bodyRegions : [bodyRegions]) : undefined");
  });
});
