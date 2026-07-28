import { describe, expect, it } from 'vitest';
import { Op } from 'sequelize';

import {
  applyNotificationSnooze,
  buildVisibleNotificationWhere,
  normalizeSnoozeDurationMinutes,
  SNOOZE_ACTION_STATUS,
  SNOOZE_DEFAULT_MINUTES,
  SNOOZE_MAX_MINUTES,
  SNOOZE_MIN_MINUTES,
} from '../../services/communications/notificationSnoozeService.mjs';

describe('notificationSnoozeService', () => {
  it('normalizes snooze durations to a bounded minute window', () => {
    expect(normalizeSnoozeDurationMinutes(undefined)).toBe(SNOOZE_DEFAULT_MINUTES);
    expect(normalizeSnoozeDurationMinutes(null)).toBe(SNOOZE_DEFAULT_MINUTES);
    expect(normalizeSnoozeDurationMinutes('45')).toBe(45);
    expect(normalizeSnoozeDurationMinutes(SNOOZE_MIN_MINUTES)).toBe(SNOOZE_MIN_MINUTES);
    expect(normalizeSnoozeDurationMinutes(SNOOZE_MAX_MINUTES)).toBe(SNOOZE_MAX_MINUTES);
    expect(normalizeSnoozeDurationMinutes(SNOOZE_MIN_MINUTES - 1)).toBeNull();
    expect(normalizeSnoozeDurationMinutes(SNOOZE_MAX_MINUTES + 1)).toBeNull();
    expect(normalizeSnoozeDurationMinutes(15.5)).toBeNull();
  });

  it('applies a snooze state and preserves a metadata receipt', () => {
    const now = new Date('2026-07-01T00:00:00.000Z');
    const notification = {
      read: false,
      status: 'unread',
      actionStatus: 'open',
      metadata: { existing: true, notificationAction: { source: 'waiver' } },
    };

    const result = applyNotificationSnooze(notification, { durationMinutes: 30, now });

    expect(result).toMatchObject({ success: true, durationMinutes: 30 });
    expect(notification.read).toBe(true);
    expect(notification.status).toBe(SNOOZE_ACTION_STATUS);
    expect(notification.actionStatus).toBe(SNOOZE_ACTION_STATUS);
    expect(notification.expiresAt.toISOString()).toBe('2026-07-01T00:30:00.000Z');
    expect(notification.metadata).toEqual({
      existing: true,
      notificationAction: {
        source: 'waiver',
        type: 'snooze',
        durationMinutes: 30,
        snoozedAt: '2026-07-01T00:00:00.000Z',
        snoozedUntil: '2026-07-01T00:30:00.000Z',
      },
    });
  });

  it('builds a visible-notification where clause that excludes active snoozes', () => {
    const now = new Date('2026-07-01T00:00:00.000Z');
    const where = buildVisibleNotificationWhere(7, now);

    expect(where.userId).toBe(7);
    expect(where[Op.or]).toEqual([
      { actionStatus: { [Op.ne]: SNOOZE_ACTION_STATUS } },
      { actionStatus: null },
      { expiresAt: { [Op.lte]: now } },
      { expiresAt: null },
    ]);
  });
});
