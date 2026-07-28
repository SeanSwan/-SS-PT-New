import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('admin notification broadcast route contract', () => {
  it('delegates broadcasts to the canonical orchestrator-backed service', () => {
    const routeSource = read('routes/adminNotificationsRoutes.mjs');
    const routeLineCount = routeSource.split(/\r?\n/).length;
    const serviceSource = read('services/adminNotificationBroadcastService.mjs');
    const orchestratorSource = read('services/communications/notificationOrchestratorService.mjs');
    const notificationModelSource = read('models/Notification.mjs');
    const adminModelSource = read('models/financial/AdminNotification.mjs');

    expect(routeSource).toContain("import { protect, adminOnly, rateLimiter } from '../middleware/authMiddleware.mjs';");
    expect(routeSource).toContain('const adminNotificationReadLimiter = rateLimiter(');
    expect(routeSource).toContain('const adminNotificationCommandLimiter = rateLimiter(');
    expect(routeSource).toContain('const adminNotificationBroadcastLimiter = rateLimiter(');
    expect(routeSource).toContain("import { broadcastAdminNotification }");
    expect(routeSource).toContain('listAdminNotifications');
    expect(routeSource).toContain('bulkAdminNotificationAction');
    expect(routeSource).toContain('getAdminNotificationDeliveryHealth');
    expect(routeSource).toContain('getAdminNotificationRetentionReport');
    expect(routeLineCount).toBeLessThanOrEqual(300);
    expect(routeSource).toContain("router.post('/notifications/broadcast', protect, adminOnly, adminNotificationBroadcastLimiter");
    expect(routeSource).toContain("router.get('/notifications/delivery-health', protect, adminOnly, adminNotificationReadLimiter");
    expect(routeSource).toContain("router.get('/notifications/retention-policy', protect, adminOnly, adminNotificationReadLimiter");
    expect(routeSource).toContain("router.delete('/notifications/:id', protect, adminOnly, adminNotificationCommandLimiter");
    expect(routeSource).toContain("router.post('/notifications/bulk', protect, adminOnly, adminNotificationCommandLimiter");
    expect(routeSource.indexOf("router.get('/notifications/delivery-health'")).toBeLessThan(routeSource.indexOf("router.get('/notifications/:id'"));
    expect(routeSource.indexOf("router.get('/notifications/retention-policy'")).toBeLessThan(routeSource.indexOf("router.get('/notifications/:id'"));
    expect(routeSource).not.toContain('Notification.bulkCreate');
    expect(routeSource).not.toContain('AdminNotification.create({');
    expect(serviceSource).toContain('AdminNotification.create');
    expect(serviceSource).toContain('createAdminBroadcastNotificationEvent');
    expect(serviceSource).toContain('channels: request.channels');
    expect(serviceSource).toContain('notification.update');
    expect(orchestratorSource).toContain('createAdminBroadcastNotificationEvent');
    expect(orchestratorSource).toContain('createCommunicationEvent');
    expect(orchestratorSource).toContain("channels: ['in-app', 'push']");
    expect(orchestratorSource).toContain('channels,');
    expect(orchestratorSource).toContain("eventType: 'admin.broadcast.created'");
    expect(orchestratorSource).toContain("notificationType: 'admin'");
    expect(orchestratorSource).toContain("entityType: 'admin_broadcast'");
    expect(notificationModelSource).toContain("'admin'");
    expect(adminModelSource).toContain('metadata');
  });
});