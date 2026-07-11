/**
 * processScheduledMessages — REAL emailTemplateService fail-closed integration (#10)
 * ==================================================================================
 * The other email test mocks emailTemplateService, so the COMPOSED fail-closed path was never
 * exercised. This wires the REAL emailTemplateService + automationDecisionService into the
 * processor and mocks only the external senders + models: with compliance env unset, SendGrid
 * must NOT be called and the lead's matured log must DEFER (env-fixable), never burn.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { logFindAll, logCount, logUpdate, userFindByPk, leadFindByPk, sendGrid, resolveSuppression } = vi.hoisted(() => ({
  logFindAll: vi.fn(), logCount: vi.fn(), logUpdate: vi.fn(),
  userFindByPk: vi.fn(), leadFindByPk: vi.fn(), sendGrid: vi.fn(), resolveSuppression: vi.fn(),
}));

vi.mock('../models/index.mjs', () => ({
  getAllModels: () => ({ AutomationSequence: {}, AutomationLog: { findAll: logFindAll, count: logCount, update: logUpdate }, User: { findByPk: userFindByPk } }),
}));
vi.mock('../models/Lead.mjs', () => ({ default: { findByPk: leadFindByPk } }));
vi.mock('../services/sendgridService.mjs', () => ({ sendGridEmail: sendGrid, isSendGridServiceConfigured: () => true }));
vi.mock('../services/smsService.mjs', () => ({ sendTemplatedSMS: vi.fn(), sendSmsMessage: vi.fn() }));
vi.mock('../services/marketingSuppressionService.mjs', () => ({ resolveMarketingSuppression: resolveSuppression }));
vi.mock('../utils/logger.mjs', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

// REAL emailTemplateService + automationDecisionService (the integration seam under test).
const { processScheduledMessages } = await import('../services/automationService.mjs');

const makeEmailLog = () => ({
  id: 1, userId: null, leadId: 5, channel: 'email', templateName: 'welcome',
  payloadJson: { variables: { clientName: 'Alex' } },
  status: 'pending', scheduledFor: new Date('2020-01-01T00:00:00Z'), updatedAt: new Date('2020-01-01T00:00:00Z'),
  message: null, sentAt: null, recipient: null, error: null,
  changed() {}, save: vi.fn(async function save() {}),
});

describe('processScheduledMessages — real email fail-closed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SWAN_AUTOMATION_CRON_ENABLED = 'true';
    delete process.env.SWAN_UNSUBSCRIBE_SECRET; // → no unsubscribeUrl → fail closed before send
    delete process.env.SWAN_BUSINESS_ADDRESS;
    resolveSuppression.mockResolvedValue({ suppressed: false, checked: true });
    leadFindByPk.mockResolvedValue({ id: 5, email: 'lead@example.com', phone: null, firstName: 'Alex' });
    logCount.mockResolvedValue(0);
    logUpdate.mockResolvedValue([1]);
  });
  afterEach(() => { delete process.env.SWAN_AUTOMATION_CRON_ENABLED; });

  it('does NOT call SendGrid and DEFERS when compliance env is unset', async () => {
    const log = makeEmailLog();
    logFindAll.mockResolvedValue([log]);

    const res = await processScheduledMessages();

    expect(sendGrid).not.toHaveBeenCalled();                       // fail-closed: nothing sent
    expect(res.results).toEqual([{ id: 1, status: 'deferred' }]);  // env-fixable → deferred, not burned
  });
});

describe('processScheduledMessages — real email HAPPY PATH (compliant send)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SWAN_AUTOMATION_CRON_ENABLED = 'true';
    process.env.SWAN_UNSUBSCRIBE_SECRET = 'sekret';
    process.env.API_URL = 'https://api.sswanstudios.com';
    process.env.SWAN_BUSINESS_ADDRESS = '123 Main St, City, ST 00000';
    resolveSuppression.mockResolvedValue({ suppressed: false, checked: true });
    leadFindByPk.mockResolvedValue({ id: 5, email: 'lead@example.com', phone: null, firstName: 'Alex' });
    logCount.mockResolvedValue(0);
    logUpdate.mockResolvedValue([1]);
    sendGrid.mockResolvedValue({ success: true });
  });
  afterEach(() => {
    delete process.env.SWAN_AUTOMATION_CRON_ENABLED;
    delete process.env.SWAN_UNSUBSCRIBE_SECRET;
    delete process.env.API_URL;
    delete process.env.SWAN_BUSINESS_ADDRESS;
  });

  it('SENDS via SendGrid to the lead email WITH the List-Unsubscribe header, marks the log sent (M2)', async () => {
    const log = makeEmailLog();
    logFindAll.mockResolvedValue([log]);

    const res = await processScheduledMessages();

    expect(sendGrid).toHaveBeenCalledTimes(1);
    const arg = sendGrid.mock.calls[0][0];
    expect(arg.to).toBe('lead@example.com');
    expect(arg.headers['List-Unsubscribe']).toMatch(/^<https:\/\/api\.sswanstudios\.com\/api\/marketing\/unsubscribe\?lead=5&token=[a-f0-9]{32}>$/);
    expect(arg.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    expect(res.results).toEqual([{ id: 1, status: 'sent' }]);
  });
});
