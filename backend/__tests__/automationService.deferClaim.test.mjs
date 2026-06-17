/**
 * automationService defer-claim regression
 * ========================================
 * Models the Sequelize stale-instance edge after an atomic `AutomationLog.update`
 * claim: the database row is `processing`, while the in-memory instance still
 * reads as `pending`. Deferred logs must explicitly release that claim back to
 * `pending` or they keep counting against the recipient's rolling cap.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  logFindAll,
  logCount,
  logUpdate,
  userFindByPk,
  leadFindByPk,
  smsTemplated,
  smsMessage,
  resolveSuppression,
} = vi.hoisted(() => ({
  logFindAll: vi.fn(),
  logCount: vi.fn(),
  logUpdate: vi.fn(),
  userFindByPk: vi.fn(),
  leadFindByPk: vi.fn(),
  smsTemplated: vi.fn(),
  smsMessage: vi.fn(),
  resolveSuppression: vi.fn(),
}));

vi.mock('../models/index.mjs', () => ({
  getAllModels: () => ({
    AutomationSequence: {},
    AutomationLog: { findAll: logFindAll, count: logCount, update: logUpdate },
    User: { findByPk: userFindByPk },
  }),
}));
vi.mock('../models/Lead.mjs', () => ({ default: { findByPk: leadFindByPk } }));
vi.mock('../services/smsService.mjs', () => ({
  sendTemplatedSMS: smsTemplated,
  sendSmsMessage: smsMessage,
}));
vi.mock('../services/marketingSuppressionService.mjs', () => ({
  resolveMarketingSuppression: resolveSuppression,
}));
vi.mock('../utils/logger.mjs', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const { processScheduledMessages } = await import('../services/automationService.mjs');

const ALLOWED = { suppressed: false, reason: null, checked: true };
const USER = {
  id: 10,
  phone: '+15550001111',
  email: 'active@example.com',
  notificationPreferences: { sms: true },
};

const makeClaimableLog = (id) => {
  const persisted = {
    status: 'pending',
    scheduledFor: new Date('2030-01-01T00:00:00Z'),
  };
  const forced = new Set();
  let status = 'pending';
  let scheduledFor = new Date('2030-01-01T00:00:00Z');

  const log = {
    id,
    userId: 10,
    leadId: null,
    channel: 'sms',
    templateName: 'welcome',
    payloadJson: {},
    updatedAt: new Date(`2030-01-01T00:0${id}:00Z`),
    get status() {
      return status;
    },
    set status(value) {
      if (value !== status) forced.add('status');
      status = value;
    },
    get scheduledFor() {
      return scheduledFor;
    },
    set scheduledFor(value) {
      forced.add('scheduledFor');
      scheduledFor = value;
    },
    changed(field, isChanged) {
      if (isChanged) forced.add(field);
    },
    save: vi.fn(async () => {
      if (forced.has('status')) persisted.status = status;
      if (forced.has('scheduledFor')) persisted.scheduledFor = scheduledFor;
      forced.clear();
    }),
  };

  return { log, persisted };
};

describe('processScheduledMessages defer claim release', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SWAN_AUTOMATION_CRON_ENABLED = 'true';
    resolveSuppression.mockResolvedValue(ALLOWED);
    userFindByPk.mockResolvedValue(USER);
    smsTemplated.mockResolvedValue({ success: true, body: 'Rendered body' });
  });

  afterEach(() => {
    delete process.env.SWAN_AUTOMATION_CRON_ENABLED;
  });

  it('returns a deferred claimed log to pending so it does not cap the next recipient log', async () => {
    const first = makeClaimableLog(1);
    const second = makeClaimableLog(2);
    const records = new Map([
      [1, first],
      [2, second],
    ]);

    logFindAll.mockResolvedValue([first.log, second.log]);
    logUpdate.mockImplementation(async (values, { where }) => {
      const record = records.get(where.id);
      if (!record || record.persisted.status !== where.status) return [0];
      record.persisted.status = values.status;
      return [1];
    });

    let countCalls = 0;
    logCount.mockImplementation(async () => {
      countCalls += 1;
      if (countCalls === 1) return 3;
      return first.persisted.status === 'processing' ? 3 : 2;
    });

    const res = await processScheduledMessages();

    expect(first.persisted.status).toBe('pending');
    expect(first.log.save).toHaveBeenCalledTimes(1);
    expect(second.persisted.status).toBe('sent');
    expect(smsTemplated).toHaveBeenCalledTimes(1);
    expect(res.results).toEqual([
      { id: 1, status: 'deferred' },
      { id: 2, status: 'sent' },
    ]);
  });
});
