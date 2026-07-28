import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');
const migrationPath = 'migrations/20260630050000-add-enterprise-notification-fields.cjs';

describe('enterprise notification field contract', () => {
  it('adds the enterprise notification fields to the model and migration', () => {
    const model = read('models/Notification.mjs');
    const migrationExists = existsSync(resolve(process.cwd(), migrationPath));

    expect(migrationExists).toBe(true);
    const migration = read(migrationPath);

    for (const field of [
      'category',
      'priority',
      'status',
      'metadata',
      'actions',
      'groupKey',
      'idempotencyKey',
      'requiresAction',
      'actionStatus',
      'expiresAt',
      'deliveredAt',
      'openedAt',
      'clickedAt',
      'archivedAt',
    ]) {
      expect(model).toContain(`${field}: {`);
      expect(migration).toContain(`'${field}'`);
    }

    expect(model).toMatch(/category:\s*{\s*type:\s*DataTypes\.STRING\(40\)/s);
    expect(model).toMatch(/priority:\s*{\s*type:\s*DataTypes\.STRING\(20\)/s);
    expect(model).toMatch(/status:\s*{\s*type:\s*DataTypes\.STRING\(20\)/s);
    expect(model).toContain('DataTypes.JSONB');
    expect(model).toContain("defaultValue: 'unread'");
    expect(migration).toContain("const TABLE_NAME = 'notifications'");
    expect(migration).toContain('describeTable(TABLE_NAME)');
    expect(migration).toContain('idx_notifications_user_idempotency_key');
    expect(migration).toContain('WHERE "idempotencyKey" IS NOT NULL');
  });

  it('normalizes createNotification payloads and dedupes by idempotency key', () => {
    const deliveryService = read('services/notificationDeliveryService.mjs');

    expect(deliveryService).toContain('normalizeNotificationCreateOptions');
    expect(deliveryService).toContain('notificationPayload = normalizeNotificationCreateOptions(options)');
    expect(deliveryService).toContain('idempotencyKey');
    expect(deliveryService).toContain('Notification.findOne');
    expect(deliveryService).toContain('idempotentReplay: true');
    expect(deliveryService).toContain('Notification.create(notificationPayload)');
    expect(deliveryService).toContain('export const createAndEmit = createNotification;');
  });

  it('stamps messaging and admin-broadcast notifications with category, actions, grouping, and idempotency', () => {
    const source = read('services/communications/notificationOrchestratorService.mjs');
    const eventService = read('services/communications/communicationEventService.mjs');

    expect(source).toContain("category: 'messages'");
    expect(source).toContain("priority: 'normal'");
    expect(source).toContain("status: 'unread'");
    expect(source).toContain('metadata: {');
    expect(source).toContain('actions: [');
    expect(source).toContain('groupKey: `conversation:${normalizedConversationId}`');
    expect(source).toContain('idempotencyKey: `message:${normalizedMessageId}:recipient:${recipient.userId}`');
    expect(source).toContain("category: 'admin'");
    expect(source).toContain("priority: 'high'");
    expect(source).toContain('idempotencyKey: relatedEntityId ? `admin-broadcast:${relatedEntityId}` : null');
    expect(eventService).toContain('const idempotencyKeyForRecipient = (baseKey, userId) => (');
    expect(eventService).toContain('baseKey ? `${baseKey}:recipient:${userId}` : null');
    expect(eventService).toContain('idempotencyKey: idempotencyKeyForRecipient(value.idempotencyKey, recipient.userId)');
  });
});
