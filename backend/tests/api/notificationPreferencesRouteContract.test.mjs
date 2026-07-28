import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('notification preferences route contract', () => {
  it('mounts authenticated preference endpoints before dynamic notification routes', () => {
    const routeSource = read('routes/notificationRoutes.mjs');
    const controllerSource = read('controllers/notificationController.mjs');
    const preferenceControllerSource = read('controllers/notificationPreferencesController.mjs');
    const userModelSource = read('models/User.mjs');

    expect(routeSource).toContain("import { protect, rateLimiter } from '../middleware/authMiddleware.mjs';");
    expect(routeSource).toContain('const notificationReadLimiter = rateLimiter(');
    expect(routeSource).toContain('const notificationMutationLimiter = rateLimiter(');
    expect(routeSource).toContain('const notificationPreferencesLimiter = rateLimiter(');
    expect(routeSource).toContain("router.get('/', protect, notificationReadLimiter, getAllNotifications)");
    expect(routeSource).toContain("router.get('/count', protect, notificationReadLimiter, getUnreadNotificationCount)");
    expect(routeSource).toContain("router.put('/:id/snooze', protect, notificationMutationLimiter, snoozeNotification)");

    const getIndex = routeSource.indexOf("router.get('/preferences', protect, notificationReadLimiter, getNotificationPreferences)");
    const putIndex = routeSource.indexOf("router.put('/preferences', protect, notificationPreferencesLimiter, updateNotificationPreferences)");
    const patchIndex = routeSource.indexOf("router.patch('/preferences', protect, notificationPreferencesLimiter, updateNotificationPreferences)");
    const dynamicReadIndex = routeSource.indexOf("router.put('/:id/read', protect, notificationMutationLimiter, markAsRead)");

    expect(getIndex).toBeGreaterThan(-1);
    expect(putIndex).toBeGreaterThan(-1);
    expect(patchIndex).toBeGreaterThan(-1);
    expect(getIndex).toBeLessThan(dynamicReadIndex);
    expect(putIndex).toBeLessThan(dynamicReadIndex);
    expect(patchIndex).toBeLessThan(dynamicReadIndex);
    expect(controllerSource).toContain("from './notificationPreferencesController.mjs'");
    expect(preferenceControllerSource).toContain('normalizeNotificationPreferences');
    expect(preferenceControllerSource).toContain('mergeNotificationPreferences');
    expect(preferenceControllerSource).toContain('notificationPreferences');
    expect(preferenceControllerSource).toContain('body.preferences');
    expect(userModelSource).toContain('notificationPreferences');
  });
});
