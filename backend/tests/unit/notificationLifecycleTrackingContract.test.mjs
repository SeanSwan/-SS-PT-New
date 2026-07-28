import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('notification lifecycle delivery tracking contract', () => {
  it('records open, click, snooze, and action-resolution states through canonical notification routes', () => {
    const controller = read('controllers/notificationController.mjs');
    const routes = read('routes/notificationRoutes.mjs');
    const ledger = read('services/communications/notificationDeliveryLedgerService.mjs');
    const snoozeService = read('services/communications/notificationSnoozeService.mjs');
    const actionStatusService = read('services/communications/notificationActionStatusService.mjs');
    const model = read('models/Notification.mjs');

    expect(ledger).toContain('export const recordNotificationOpened');
    expect(ledger).toContain('export const recordNotificationClicked');
    expect(ledger).toContain("status: 'opened'");
    expect(ledger).toContain("status: 'clicked'");

    expect(controller).toContain('recordNotificationOpened');
    expect(controller).toContain('recordNotificationClicked');
    expect(controller).toContain('applyNotificationSnooze');
    expect(controller).toContain('applyNotificationActionStatus');
    expect(controller).toContain('buildVisibleNotificationWhere');
    expect(controller).toContain('export const getUnreadNotificationCount');
    expect(controller).toContain('export const markAsClicked');
    expect(controller).toContain('export const snoozeNotification');
    expect(controller).toContain('export const resolveNotificationAction');
    expect(controller).toContain('notification.clickedAt = notification.clickedAt || now');
    expect(controller).toContain('await recordNotificationOpened({');
    expect(controller).toContain('await recordNotificationClicked({');
    expect(controller).toContain('notifications.map((notification) => recordNotificationOpened');
    expect(controller).toContain('await notification.save();');

    expect(routes).toContain('getUnreadNotificationCount');
    expect(routes).toContain('markAsClicked');
    expect(routes).toContain('snoozeNotification');
    expect(routes).toContain('resolveNotificationAction');
    expect(routes).toContain("router.get('/count', protect, notificationReadLimiter, getUnreadNotificationCount)");
    expect(routes).toContain("router.put('/:id/click', protect, notificationMutationLimiter, markAsClicked)");
    expect(routes).toContain("router.patch('/:id/click', protect, notificationMutationLimiter, markAsClicked)");
    expect(routes).toContain("router.put('/:id/snooze', protect, notificationMutationLimiter, snoozeNotification)");
    expect(routes).toContain("router.patch('/:id/snooze', protect, notificationMutationLimiter, snoozeNotification)");
    expect(routes).toContain("router.put('/:id/action-status', protect, notificationMutationLimiter, resolveNotificationAction)");
    expect(routes).toContain("router.patch('/:id/action-status', protect, notificationMutationLimiter, resolveNotificationAction)");
    expect(routes.indexOf("router.put('/:id/click'")).toBeLessThan(routes.indexOf("router.delete('/:id'"));
    expect(routes.indexOf("router.patch('/:id/snooze'")).toBeLessThan(routes.indexOf("router.delete('/:id'"));
    expect(routes.indexOf("router.patch('/:id/action-status'")).toBeLessThan(routes.indexOf("router.delete('/:id'"));

    expect(snoozeService).toContain('export const SNOOZE_ACTION_STATUS');
    expect(snoozeService).toContain('export const normalizeSnoozeDurationMinutes');
    expect(snoozeService).toContain('export const applyNotificationSnooze');
    expect(snoozeService).toContain('export const buildVisibleNotificationWhere');
    expect(snoozeService).toContain('status: SNOOZE_ACTION_STATUS');
    expect(snoozeService).toContain('actionStatus: { [Op.ne]: SNOOZE_ACTION_STATUS }');

    expect(actionStatusService).toContain('export const ACTION_STATUS_RESOLVED');
    expect(actionStatusService).toContain('export const ACTION_STATUS_DISMISSED');
    expect(actionStatusService).toContain('export const applyNotificationActionStatus');
    expect(actionStatusService).toContain('notification.actionStatus = normalizedStatus');
    expect(actionStatusService).toContain('status: normalizedStatus');

    expect(model).toContain('metadata');
    expect(model).toContain('actionStatus');
    expect(model).toContain('expiresAt');
  });
});