import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/badgeRoutes.mjs'), 'utf8');
const controllerSource = readFileSync(resolve(__dirname, '../../controllers/badgeController.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

describe('badge route access guard', () => {
  it('keeps user badge reads behind assignment-or-self access', () => {
    expect(coreRoutesSource).toContain("app.use('/api/badges', badgeRoutes)");
    expect(routeSource).toContain("import { verifyClientAccessByUserId } from '../middleware/verifyClientAccess.mjs';");
    expect(routeSource).toContain("verifyClientAccessByUserId({ paramName: 'userId' })");
    expect(routeSource).toContain("param('userId').isInt({ min: 1 }).withMessage('Invalid user ID')");
    expect(routeSource).not.toContain("param('userId').isUUID().withMessage('Invalid user ID')");
  });

  it('registers user badge reads before the generic badge detail route', () => {
    const userRouteIndex = routeSource.indexOf("router.get('/user/:userId'");
    const detailRouteIndex = routeSource.indexOf("router.get('/:badgeId'");

    expect(userRouteIndex).toBeGreaterThanOrEqual(0);
    expect(detailRouteIndex).toBeGreaterThanOrEqual(0);
    expect(userRouteIndex).toBeLessThan(detailRouteIndex);
  });

  it('registers badge display selection before the generic badge detail route', () => {
    const displayRouteIndex = routeSource.indexOf("router.put('/user/:userId/:badgeId/display'");
    const detailRouteIndex = routeSource.indexOf("router.get('/:badgeId'");

    expect(displayRouteIndex).toBeGreaterThanOrEqual(0);
    expect(detailRouteIndex).toBeGreaterThanOrEqual(0);
    expect(displayRouteIndex).toBeLessThan(detailRouteIndex);
    expect(routeSource).toContain("body('isDisplayed').isBoolean().withMessage('isDisplayed must be a boolean').toBoolean()");
  });

  it('uses type-safe self comparison in the fallback controller gate', () => {
    expect(controllerSource).toContain('const targetUserId = parsePositiveInteger(userId);');
    expect(controllerSource).toContain('const requesterId = parsePositiveInteger(currentUserId);');
    expect(controllerSource).toContain('const isOwnProfile = targetUserId === requesterId;');
    expect(controllerSource).not.toContain('userId === currentUserId');
    expect(controllerSource).not.toContain('Number(userId) === Number(currentUserId)');
  });
});
