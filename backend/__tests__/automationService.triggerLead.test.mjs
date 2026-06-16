/**
 * automationService.triggerSequence — lead identity (nurture pre-arm slice 1).
 * Verifies a captured Lead (no User yet) can be enrolled in a sequence: the log
 * carries leadId, the recipient resolves from the Lead (phone, else email), and the
 * existing User path is preserved (userId XOR leadId). Models mocked — no DB/sends.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { seqFindAll, seqFindOrCreate, seqCount, logBulkCreate, userFindByPk, leadFindByPk } = vi.hoisted(() => ({
  seqFindAll: vi.fn(),
  seqFindOrCreate: vi.fn(),
  seqCount: vi.fn(),
  logBulkCreate: vi.fn(),
  userFindByPk: vi.fn(),
  leadFindByPk: vi.fn(),
}));

vi.mock('../models/index.mjs', () => ({
  getAllModels: () => ({
    AutomationSequence: { findAll: seqFindAll, findOrCreate: seqFindOrCreate, count: seqCount },
    AutomationLog: { bulkCreate: logBulkCreate },
    User: { findByPk: userFindByPk },
  }),
}));
vi.mock('../models/Lead.mjs', () => ({ default: { findByPk: leadFindByPk } }));
vi.mock('../services/smsService.mjs', () => ({ sendTemplatedSMS: vi.fn(), sendSmsMessage: vi.fn(), listSmsTemplates: vi.fn(() => []) }));
vi.mock('../services/automationDecisionService.mjs', () => ({ evaluateScheduledMessage: vi.fn() }));
vi.mock('../services/nurtureTestSendService.mjs', () => ({ sendNurtureTestMessage: vi.fn() }));
vi.mock('../utils/logger.mjs', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const { triggerSequence, ensureDefaultSequences } = await import('../services/automationService.mjs');

const SEQ = { id: 1, steps: [{ dayOffset: 0, templateName: 'welcome', channel: 'sms' }] };

describe('triggerSequence — lead identity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seqFindAll.mockResolvedValue([SEQ]);
    logBulkCreate.mockResolvedValue([]);
  });

  it('enrolls a captured lead (leadId, no userId) with the recipient resolved from the Lead', async () => {
    userFindByPk.mockResolvedValue(null);
    leadFindByPk.mockResolvedValue({ id: 42, firstName: 'Lee', phone: '+15551234567', email: 'lee@example.com' });

    const res = await triggerSequence('lead_captured', null, { leadId: 42 });

    expect(leadFindByPk).toHaveBeenCalledWith(42);
    expect(logBulkCreate).toHaveBeenCalledTimes(1);
    const log = logBulkCreate.mock.calls[0][0][0];
    expect(log.leadId).toBe(42);
    expect(log.userId).toBe(null);
    expect(log.recipient).toBe('+15551234567');
    expect(res).toEqual({ success: true, created: 1 });
  });

  it('preserves the user path (userId log → leadId null, user phone, no Lead lookup)', async () => {
    userFindByPk.mockResolvedValue({ id: 5, firstName: 'Ada', phone: '+15559990000' });
    await triggerSequence('client_created', 5, {});
    expect(leadFindByPk).not.toHaveBeenCalled();
    const log = logBulkCreate.mock.calls[0][0][0];
    expect(log.userId).toBe(5);
    expect(log.leadId).toBe(null);
    expect(log.recipient).toBe('+15559990000');
  });

  it('falls back to the lead email when the lead has no phone', async () => {
    userFindByPk.mockResolvedValue(null);
    leadFindByPk.mockResolvedValue({ id: 7, firstName: 'No', phone: null, email: 'no@example.com' });
    await triggerSequence('lead_captured', null, { leadId: 7 });
    expect(logBulkCreate.mock.calls[0][0][0].recipient).toBe('no@example.com');
  });

  it('no-ops when no active sequence matches the event', async () => {
    seqFindAll.mockResolvedValue([]);
    const res = await triggerSequence('unknown_event', null, { leadId: 1 });
    expect(res.created).toBe(0);
    expect(logBulkCreate).not.toHaveBeenCalled();
  });
});

describe('ensureDefaultSequences (idempotent ensure-by-name)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seqCount.mockResolvedValue(4);
  });

  it('ensures each default by name (findOrCreate per entry), creating only the missing', async () => {
    // first three already exist; only lead_nurture is new
    seqFindOrCreate.mockImplementation(async ({ where }) => [{ name: where.name }, where.name === 'lead_nurture']);
    const res = await ensureDefaultSequences();
    expect(seqFindOrCreate).toHaveBeenCalledTimes(4); // welcome, post-session, client-nurture, lead-nurture
    expect(res).toMatchObject({ seeded: true, created: 1, count: 4 });
  });

  it('seeds the lead_nurture sequence OFF (isActive:false, triggerEvent lead_captured)', async () => {
    seqFindOrCreate.mockResolvedValue([{}, true]);
    await ensureDefaultSequences();
    const leadCall = seqFindOrCreate.mock.calls.find((c) => c[0].where.name === 'lead_nurture');
    expect(leadCall).toBeTruthy();
    expect(leadCall[0].defaults).toMatchObject({ triggerEvent: 'lead_captured', isActive: false });
  });

  it('is idempotent: when every default already exists, creates nothing (no disruption)', async () => {
    seqFindOrCreate.mockResolvedValue([{}, false]);
    const res = await ensureDefaultSequences();
    expect(res).toMatchObject({ seeded: false, created: 0 });
  });
});