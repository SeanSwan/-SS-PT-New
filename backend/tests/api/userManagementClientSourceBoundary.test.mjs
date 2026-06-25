import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const controllerSource = readFileSync(resolve(__dirname, '../../controllers/userManagementController.mjs'), 'utf8');
const routeSource = readFileSync(resolve(__dirname, '../../routes/userManagementRoutes.mjs'), 'utf8');
const adminRouteSource = readFileSync(resolve(__dirname, '../../routes/adminRoutes.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');
const userModelSource = readFileSync(resolve(__dirname, '../../models/User.mjs'), 'utf8');

describe('user management clientSource boundary', () => {
  it('blocks controller-based admin user edits from granting paid credits to free-tracking clients', () => {
    const start = controllerSource.indexOf('export const updateUser = async');
    const end = controllerSource.indexOf('/**', start + 1);
    const source = controllerSource.slice(start, end);

    expect(coreRoutesSource).toContain("app.use('/api/admin', adminRoutes)");
    expect(adminRouteSource).toContain("router.put('/users/:id', userManagementController.updateUser)");
    expect(controllerSource).toContain("import { isNonDeductingClient } from '../services/sessionBillingPolicy.mjs';");
    expect(controllerSource).toContain('Admin user management cannot assign paid credits to free-tracking clients');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(source).toContain('isNonDeductingClient(user)');
    expect(source).toContain('message: PAID_CREDIT_FREE_TRACKING_MESSAGE');
    expect(source.indexOf('isNonDeductingClient(user)'))
      .toBeLessThan(source.indexOf('updateData.availableSessions'));
  });

  it('blocks inline auth user edits from granting paid credits to free-tracking clients', () => {
    const start = routeSource.indexOf("router.put('/user/:id'");
    const end = routeSource.indexOf('/**', start + 1);
    const source = routeSource.slice(start, end);

    expect(coreRoutesSource).toContain("app.use('/api/auth', userManagementRoutes)");
    expect(routeSource).toContain("import { isNonDeductingClient } from '../services/sessionBillingPolicy.mjs';");
    expect(routeSource).toContain('Admin user management cannot assign paid credits to free-tracking clients');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(source).toContain('isNonDeductingClient(user)');
    expect(source).toContain('message: PAID_CREDIT_FREE_TRACKING_MESSAGE');
    expect(source.indexOf('isNonDeductingClient(user)'))
      .toBeLessThan(source.indexOf('user.availableSessions ='));
  });

  it('blocks promote-client helpers from minting paid credits for free-tracking users', () => {
    const controllerStart = controllerSource.indexOf('export const promoteToClient = async');
    const controllerEnd = controllerSource.indexOf('/**', controllerStart + 1);
    const controllerSlice = controllerSource.slice(controllerStart, controllerEnd);
    const routeStart = routeSource.indexOf("router.post('/promote-client'");
    const routeEnd = routeSource.indexOf('/**', routeStart + 1);
    const routeSlice = routeSource.slice(routeStart, routeEnd);

    expect(adminRouteSource).toContain("router.post('/promote-client', userManagementController.promoteToClient)");
    expect(controllerSource).toContain('Admin user management cannot assign paid credits to free-tracking clients');
    expect(routeSource).toContain('Admin user management cannot assign paid credits to free-tracking clients');
    expect(controllerSlice).toContain('isNonDeductingClient(user)');
    expect(controllerSlice).toContain('message: PAID_CREDIT_FREE_TRACKING_MESSAGE');
    expect(controllerSlice.indexOf('isNonDeductingClient(user)'))
      .toBeLessThan(controllerSlice.indexOf('availableSessions: requestedAvailableSessions'));
    expect(routeSlice).toContain('isNonDeductingClient(user)');
    expect(routeSlice).toContain('message: PAID_CREDIT_FREE_TRACKING_MESSAGE');
    expect(routeSlice.indexOf('isNonDeductingClient(user)'))
      .toBeLessThan(routeSlice.indexOf('user.availableSessions ='));
  });

  it('keeps active auth user deactivation on six-month soft-delete retention', () => {
    const routeStart = routeSource.indexOf("router.delete('/user/:id'");
    const routeEnd = routeSource.indexOf('export default router', routeStart);
    const routeSlice = routeSource.slice(routeStart, routeEnd);

    expect(coreRoutesSource).toContain("app.use('/api/auth', userManagementRoutes)");
    expect(userModelSource).toContain('accountDeactivatedAt');
    expect(userModelSource).toContain('accountRetentionUntil');
    expect(routeStart).toBeGreaterThan(-1);
    expect(routeEnd).toBeGreaterThan(routeStart);
    expect(routeSlice).toContain('const accountDeactivatedAt = new Date();');
    expect(routeSlice).toContain('retainedUntil.setMonth(retainedUntil.getMonth() + 6);');
    expect(routeSlice).toContain('accountRetentionUntil: retainedUntil');
    expect(routeSlice).toContain('isActive: false');
    expect(routeSlice.indexOf('accountRetentionUntil: retainedUntil'))
      .toBeLessThan(routeSlice.indexOf('await user.destroy()'));
    expect(routeSlice).not.toContain('error.message');
  });

  it('sanitizes active auth user-management route logging across admin workflows', () => {
    const activeRouteStart = routeSource.indexOf("const router = express.Router();");
    const activeRouteEnd = routeSource.indexOf('export default router', activeRouteStart);
    const activeRouteSlice = routeSource.slice(activeRouteStart, activeRouteEnd);

    expect(coreRoutesSource).toContain("app.use('/api/auth', userManagementRoutes)");
    expect(activeRouteSlice).toContain('const logUserManagementRouteError =');
    expect(activeRouteSlice).not.toContain('error.message');
    expect(activeRouteSlice).not.toContain('error.stack');
    expect(activeRouteSlice).not.toContain('stack:');
  });

  it('sanitizes active admin user-management controller errors across mounted admin routes', () => {
    const activeHandlerNames = [
      'getAllUsers',
      'promoteToClient',
      'promoteToAdmin',
      'updateUser',
      'getRecentSignups',
      'getDashboardStats',
      'getDatabaseHealth',
      'getSignupsList'
    ];

    expect(coreRoutesSource).toContain("app.use('/api/admin', adminRoutes)");
    expect(adminRouteSource).toContain("router.get('/users', userManagementController.getAllUsers)");
    expect(adminRouteSource).toContain("router.put('/users/:id', userManagementController.updateUser)");
    expect(adminRouteSource).toContain("router.post('/promote-client', userManagementController.promoteToClient)");
    expect(adminRouteSource).toContain("router.post('/promote-admin', userManagementController.promoteToAdmin)");
    expect(controllerSource).toContain('const logUserManagementControllerError =');

    for (const handlerName of activeHandlerNames) {
      const handlerStart = controllerSource.indexOf(`export const ${handlerName} = async`);
      const nextHandlerStart = controllerSource.indexOf('export const ', handlerStart + 1);
      const handlerEnd = nextHandlerStart > -1
        ? nextHandlerStart
        : controllerSource.indexOf('export default', handlerStart);
      const handlerSlice = controllerSource.slice(handlerStart, handlerEnd);

      expect(handlerStart).toBeGreaterThan(-1);
      expect(handlerEnd).toBeGreaterThan(handlerStart);
      expect(handlerSlice).toContain('logUserManagementControllerError(');
      expect(handlerSlice).not.toContain('error.message');
      expect(handlerSlice).not.toContain('error.stack');
      expect(handlerSlice).not.toContain('stack:');
      expect(handlerSlice).not.toContain('debug:');
      expect(handlerSlice).not.toContain("logger.error('Error fetching signups list:', error)");
    }
  });
});
