import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/orientationRoutes.mjs'), 'utf8');
const controllerSource = readFileSync(resolve(__dirname, '../../controllers/orientationController.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

describe('orientation route access guard', () => {
  it('keeps mounted orientation data routes behind role and assignment gates', () => {
    expect(coreRoutesSource).toContain("app.use('/api/orientation', orientationRoutes)");
    expect(routeSource).toContain("import { protect, authorize } from '../middleware/authMiddleware.mjs';");
    expect(routeSource).toContain("import { verifyClientAccessByUserId } from '../middleware/verifyClientAccess.mjs';");
    expect(routeSource).toContain("router.get('/user/:userId', protect, verifyClientAccessByUserId({ paramName: 'userId' }), getOrientationData)");
    expect(routeSource).toContain("router.get('/all', protect, authorize(['admin']), getAllOrientations)");
    expect(routeSource).toContain("authorize(['admin']),");
    expect(routeSource).toContain("authorize(['admin', 'trainer']),");
  });

  it('does not put auth middleware on the public orientation submit route', () => {
    const submitPath = routeSource.indexOf("'/submit'");
    const submitRouteStart = routeSource.lastIndexOf('router.post(', submitPath);
    const userRouteStart = routeSource.indexOf("router.get('/user/:userId'");
    const submitRoute = routeSource.slice(submitRouteStart, userRouteStart);

    expect(submitRoute).toContain("'/submit'");
    expect(submitRoute).not.toContain('protect');
    expect(submitRoute).not.toContain('authorize(');
  });

  it('uses strict numeric IDs and modern Sequelize operators in update/link controllers', () => {
    expect(controllerSource).toContain('const parsePositiveInt = (value) => {');
    expect(controllerSource).toContain('return Number.isInteger(parsed) && parsed > 0 ? parsed : null;');
    expect(controllerSource).toContain('const isSameUser = Number(req.user.id) === userId;');
    expect(controllerSource).toContain('const requestedUserId = req.body?.userId !== undefined ? parsePositiveInt(req.body.userId) : null;');
    expect(controllerSource).toContain('[Op.or]');
    expect(controllerSource).toContain('[Op.iLike]');
    expect(controllerSource).not.toContain('$or');
    expect(controllerSource).not.toContain('$iLike');
  });
});
