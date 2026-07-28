import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildNotificationDeliveryPayload,
  normalizeDeliveryChannel,
  normalizeDeliveryStatus,
} from '../../services/communications/notificationDeliveryLedgerService.mjs';

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('notification delivery ledger service', () => {
  it('normalizes delivery channels, statuses, attempts, and provider errors', () => {
    expect(normalizeDeliveryChannel('Push')).toBe('push');
    expect(normalizeDeliveryChannel('fax')).toBeNull();
    expect(normalizeDeliveryStatus('DELIVERED')).toBe('delivered');
    expect(normalizeDeliveryStatus('unknown')).toBeNull();

    const payload = buildNotificationDeliveryPayload({
      notificationId: '42',
      userId: '7',
      channel: 'Email',
      status: 'FAILED',
      attemptCount: -4,
      providerMessageId: 'provider-123',
      errorCode: 'smtp_timeout',
      errorMessage: 'Provider timed out',
      metadata: { source: 'unit' },
    });

    expect(payload).toMatchObject({
      notificationId: 42,
      userId: 7,
      channel: 'email',
      status: 'failed',
      attemptCount: 0,
      providerMessageId: 'provider-123',
      errorCode: 'smtp_timeout',
      errorMessage: 'Provider timed out',
      metadata: { source: 'unit' },
    });
  });

  it('declares the NotificationDelivery model and migration with enterprise delivery fields', () => {
    const model = read('models/NotificationDelivery.mjs');
    const migration = read('migrations/20260630060000-create-notification-deliveries.cjs');

    expect(model).toContain("modelName: 'NotificationDelivery'");
    expect(model).toContain("tableName: 'notification_deliveries'");
    expect(model).toContain('notificationId');
    expect(model).toContain('providerMessageId');
    expect(model).toContain('attemptCount');
    expect(model).toContain('lastAttemptAt');
    expect(model).toContain('metadata');

    expect(migration).toContain("const TABLE_NAME = 'notification_deliveries'");
    expect(migration).toContain('queryInterface.createTable(TABLE_NAME');
    expect(migration).toContain('notificationId');
    expect(migration).toContain('providerMessageId');
    expect(migration).toContain('CREATE UNIQUE INDEX IF NOT EXISTS "idx_notification_deliveries_unique_channel"');
    expect(migration).toContain('idx_notification_deliveries_unique_channel');
    expect(migration).toContain('idx_notification_deliveries_status');
  });

  it('wires the model through associations and records delivery from canonical notification creation', () => {
    const associations = read('models/associations.mjs');
    const index = read('models/index.mjs');
    const deliveryService = read('services/notificationDeliveryService.mjs');
    const policyService = read('services/communications/notificationDeliveryPolicyService.mjs');

    expect(associations).toContain("await import('./NotificationDelivery.mjs')");
    expect(associations).toContain('Notification.hasMany(NotificationDelivery');
    expect(associations).toContain('NotificationDelivery.belongsTo(Notification');
    const returnBlocks = associations.match(/NotificationDelivery,\s*NotificationSettings/g) || [];
    expect(returnBlocks).toHaveLength(2);
    expect(index).toContain("export const getNotificationDelivery = () => getModel('NotificationDelivery')");

    expect(deliveryService).toContain("from './communications/notificationDeliveryPolicyService.mjs'");
    expect(deliveryService).toContain('const deliverySummary = await deliverNotificationWithPolicy');
    expect(deliveryService).toContain('deliveryChannels: deliverySummary.channelStatuses');
    expect(policyService).toContain('export async function emitNotificationToUser');
    expect(policyService).toContain('recordNotificationDelivery({');
  });
});