import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildCommunicationAuditPayload,
  normalizeCommunicationAuditAction,
} from '../../services/communications/communicationAuditLogService.mjs';

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('communication audit log service', () => {
  it('normalizes audit actions, actors, recipients, entities, and metadata', () => {
    expect(normalizeCommunicationAuditAction(' Notification.Created ')).toBe('notification.created');
    expect(normalizeCommunicationAuditAction('')).toBeNull();

    const payload = buildCommunicationAuditPayload({
      eventId: 'event-123',
      actorId: '7',
      recipientId: '9',
      notificationId: '42',
      action: ' Notification.Created ',
      entityType: ' conversation ',
      entityId: 123,
      metadata: { category: 'messages', priority: 'normal' },
    });

    expect(payload).toMatchObject({
      eventId: 'event-123',
      actorId: 7,
      recipientId: 9,
      notificationId: 42,
      action: 'notification.created',
      entityType: 'conversation',
      entityId: '123',
      metadata: { category: 'messages', priority: 'normal' },
    });

    expect(buildCommunicationAuditPayload({ actorId: 1 })).toBeNull();
  });

  it('declares an append-only CommunicationAuditLog model and idempotent migration', () => {
    const model = read('models/CommunicationAuditLog.mjs');
    const migration = read('migrations/20260630070000-create-communication-audit-logs.cjs');

    expect(model).toContain("modelName: 'CommunicationAuditLog'");
    expect(model).toContain("tableName: 'communication_audit_logs'");
    expect(model).toContain('eventId');
    expect(model).toContain('actorId');
    expect(model).toContain('recipientId');
    expect(model).toContain('notificationId');
    expect(model).toContain('metadata');
    expect(model).toContain('updatedAt: false');
    expect(model).toContain('beforeUpdate');
    expect(model).toContain('beforeBulkDestroy');

    expect(migration).toContain("const TABLE_NAME = 'communication_audit_logs'");
    expect(migration).toContain('queryInterface.createTable(TABLE_NAME');
    expect(migration).toContain('eventId');
    expect(migration).toContain('actorId');
    expect(migration).toContain('recipientId');
    expect(migration).toContain('notificationId');
    expect(migration).toContain('CREATE INDEX IF NOT EXISTS "idx_communication_audit_logs_action"');
    expect(migration).toContain('CREATE INDEX IF NOT EXISTS "idx_communication_audit_logs_actor"');
  });

  it('wires audit logging through the model hub and canonical communication actions', () => {
    const associations = read('models/associations.mjs');
    const index = read('models/index.mjs');
    const notificationService = read('services/notificationDeliveryService.mjs');
    const safetyService = read('services/messagingSafetyService.mjs');

    expect(index).toContain("export const getCommunicationAuditLog = () => getModel('CommunicationAuditLog')");
    expect(associations).toContain("await import('./CommunicationAuditLog.mjs')");
    expect(associations).toContain('User.hasMany(CommunicationAuditLog');
    expect(associations).toContain('CommunicationAuditLog.belongsTo(User');
    const returnBlocks = associations.match(/AiCommandAuditLog,\s*CommunicationAuditLog,\s*AdminAccountAuditLog/g) || [];
    expect(returnBlocks).toHaveLength(2);

    expect(notificationService).toContain("from './communications/communicationAuditLogService.mjs'");
    expect(notificationService).toContain('recordCommunicationAudit({');
    expect(notificationService).toContain("action: 'notification.created'");
    expect(safetyService).toContain("from './communications/communicationAuditLogService.mjs'");
    expect(safetyService).toContain("action: 'message.reported'");
    expect(safetyService).toContain("action: 'user.blocked'");
    expect(safetyService).toContain("action: 'conversation.muted'");
    expect(safetyService).toContain("action: 'conversation.unmuted'");
  });
});