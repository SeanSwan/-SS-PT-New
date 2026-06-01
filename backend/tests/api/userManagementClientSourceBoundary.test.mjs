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

describe('user management clientSource boundary', () => {
  it('blocks controller-based admin user edits from granting paid credits to free-tracking clients', () => {
    const start = controllerSource.indexOf('export const updateUser = async');
    const end = controllerSource.indexOf('/**', start + 1);
    const source = controllerSource.slice(start, end);

    expect(coreRoutesSource).toContain("app.use('/api/admin', adminRoutes)");
    expect(adminRouteSource).toContain("router.put('/users/:id', userManagementController.updateUser)");
    expect(controllerSource).toContain("import { NON_DEDUCTING_CLIENT_SOURCES } from '../services/sessionBillingPolicy.mjs';");
    expect(controllerSource).toContain('Admin user management cannot assign paid credits to free-tracking clients');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(source).toContain('NON_DEDUCTING_CLIENT_SOURCES.has(user.clientSource)');
    expect(source).toContain('message: PAID_CREDIT_FREE_TRACKING_MESSAGE');
    expect(source.indexOf('NON_DEDUCTING_CLIENT_SOURCES.has(user.clientSource)'))
      .toBeLessThan(source.indexOf('updateData.availableSessions'));
  });

  it('blocks inline auth user edits from granting paid credits to free-tracking clients', () => {
    const start = routeSource.indexOf("router.put('/user/:id'");
    const end = routeSource.indexOf('/**', start + 1);
    const source = routeSource.slice(start, end);

    expect(coreRoutesSource).toContain("app.use('/api/auth', userManagementRoutes)");
    expect(routeSource).toContain("import { NON_DEDUCTING_CLIENT_SOURCES } from '../services/sessionBillingPolicy.mjs';");
    expect(routeSource).toContain('Admin user management cannot assign paid credits to free-tracking clients');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(source).toContain('NON_DEDUCTING_CLIENT_SOURCES.has(user.clientSource)');
    expect(source).toContain('message: PAID_CREDIT_FREE_TRACKING_MESSAGE');
    expect(source.indexOf('NON_DEDUCTING_CLIENT_SOURCES.has(user.clientSource)'))
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
    expect(controllerSlice).toContain('NON_DEDUCTING_CLIENT_SOURCES.has(user.clientSource)');
    expect(controllerSlice).toContain('message: PAID_CREDIT_FREE_TRACKING_MESSAGE');
    expect(controllerSlice.indexOf('NON_DEDUCTING_CLIENT_SOURCES.has(user.clientSource)'))
      .toBeLessThan(controllerSlice.indexOf('availableSessions: requestedAvailableSessions'));
    expect(routeSlice).toContain('NON_DEDUCTING_CLIENT_SOURCES.has(user.clientSource)');
    expect(routeSlice).toContain('message: PAID_CREDIT_FREE_TRACKING_MESSAGE');
    expect(routeSlice.indexOf('NON_DEDUCTING_CLIENT_SOURCES.has(user.clientSource)'))
      .toBeLessThan(routeSlice.indexOf('user.availableSessions ='));
  });
});
