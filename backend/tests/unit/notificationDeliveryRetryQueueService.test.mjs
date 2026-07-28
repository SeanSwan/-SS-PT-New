import { beforeEach, describe, expect, it, vi } from 'vitest';

const findAllMock = vi.fn();
const updateMock = vi.fn();
const findByPkMock = vi.fn();
const opIn = Symbol.for('swan.op.in');
const opLt = Symbol.for('swan.op.lt');

vi.mock('../../models/index.mjs', () => ({
  getNotificationDelivery: () => ({
    findAll: findAllMock,
    findByPk: findByPkMock,
    update: updateMock,
  }),
  Op: {
    in: opIn,
    lt: opLt,
  },
}));

const {
  claimNotificationDeliveryRetry,
  getNotificationDeliveryRetryDelayMs,
  getRetryableNotificationDeliveries,
  selectRetryableNotificationDeliveries,
} = await import('../../services/communications/notificationDeliveryRetryQueueService.mjs');

const now = new Date('2026-06-30T19:00:00.000Z');

const deliveryRow = (overrides = {}) => ({
  id: 1,
  notificationId: 100,
  userId: 200,
  channel: 'push',
  status: 'failed',
  attemptCount: 0,
  lastAttemptAt: null,
  metadata: {},
  ...overrides,
});

describe('notification delivery retry queue service', () => {
  beforeEach(() => {
    findAllMock.mockReset();
    updateMock.mockReset();
    findByPkMock.mockReset();
  });

  it('selects only due failed or pending deliveries using max attempts and exponential backoff', () => {
    const rows = [
      deliveryRow({ id: 1, status: 'failed', attemptCount: 0, lastAttemptAt: null }),
      deliveryRow({ id: 2, status: 'failed', attemptCount: 1, lastAttemptAt: '2026-06-30T18:58:00.000Z' }),
      deliveryRow({ id: 3, status: 'pending', attemptCount: 2, lastAttemptAt: '2026-06-30T18:58:45.000Z' }),
      deliveryRow({ id: 4, status: 'sent', attemptCount: 1, lastAttemptAt: '2026-06-30T18:00:00.000Z' }),
      deliveryRow({ id: 5, status: 'failed', attemptCount: 3, lastAttemptAt: '2026-06-30T18:00:00.000Z' }),
      deliveryRow({ id: 6, status: 'failed', attemptCount: 2, lastAttemptAt: '2026-06-30T18:55:00.000Z' }),
    ];

    expect(getNotificationDeliveryRetryDelayMs(0, { baseDelayMs: 60_000 })).toBe(0);
    expect(getNotificationDeliveryRetryDelayMs(1, { baseDelayMs: 60_000 })).toBe(60_000);
    expect(getNotificationDeliveryRetryDelayMs(2, { baseDelayMs: 60_000 })).toBe(120_000);

    const due = selectRetryableNotificationDeliveries(rows, {
      now,
      baseDelayMs: 60_000,
      maxAttempts: 3,
      limit: 10,
    });

    expect(due.map((row) => row.id)).toEqual([1, 2, 6]);
  });

  it('claims a retry attempt atomically by expected status and attempt count', async () => {
    updateMock.mockResolvedValue([1]);
    findByPkMock.mockResolvedValue(deliveryRow({ id: 9, status: 'pending', attemptCount: 3 }));
    const delivery = deliveryRow({
      id: 9,
      status: 'failed',
      attemptCount: 2,
      errorCode: 'push_timeout',
      errorMessage: 'Provider timed out',
      metadata: { broadcastId: 77 },
    });

    const result = await claimNotificationDeliveryRetry(delivery, { now, maxAttempts: 4 });

    expect(result.success).toBe(true);
    expect(updateMock).toHaveBeenCalledWith({
      status: 'pending',
      attemptCount: 3,
      lastAttemptAt: now,
      errorCode: null,
      errorMessage: null,
      metadata: {
        broadcastId: 77,
        retry: {
          claimedAt: now.toISOString(),
          previousAttemptCount: 2,
          previousStatus: 'failed',
        },
      },
    }, {
      where: {
        id: 9,
        status: { [opIn]: ['failed', 'pending'] },
        attemptCount: 2,
      },
    });
    expect(findByPkMock).toHaveBeenCalledWith(9);
    expect(result.delivery).toMatchObject({ id: 9, status: 'pending', attemptCount: 3 });
  });

  it('refuses a stale retry claim when another worker has already incremented the attempt', async () => {
    updateMock.mockResolvedValue([0]);

    const result = await claimNotificationDeliveryRetry(deliveryRow({ id: 10, attemptCount: 1 }), {
      now,
      maxAttempts: 3,
    });

    expect(result).toEqual({
      success: false,
      error: 'NotificationDelivery row was already claimed or is no longer retryable.',
    });
  });

  it('loads retry candidates from NotificationDelivery and applies the due filter after the indexed query', async () => {
    findAllMock.mockResolvedValue([
      deliveryRow({ id: 11, status: 'failed', attemptCount: 1, lastAttemptAt: '2026-06-30T18:57:00.000Z' }),
      deliveryRow({ id: 12, status: 'failed', attemptCount: 2, lastAttemptAt: '2026-06-30T18:59:00.000Z' }),
    ]);

    const due = await getRetryableNotificationDeliveries({
      now,
      baseDelayMs: 60_000,
      maxAttempts: 3,
      limit: 5,
    });

    expect(findAllMock).toHaveBeenCalledWith(expect.objectContaining({
      limit: 25,
      order: [
        ['lastAttemptAt', 'ASC'],
        ['createdAt', 'ASC'],
        ['id', 'ASC'],
      ],
    }));
    const where = findAllMock.mock.calls[0][0].where;
    expect(where.status[opIn]).toEqual(['failed', 'pending']);
    expect(where.attemptCount[opLt]).toBe(3);
    expect(due.map((row) => row.id)).toEqual([11]);
  });
});