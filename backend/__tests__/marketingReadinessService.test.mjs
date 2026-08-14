/**
 * marketingReadinessService unit tests.
 * Drives the read-only aggregation via the injected factory (models / publisher /
 * armedCheck / env) — no DB, no native publisher singleton. Locks: subsystem status
 * derivation, worst-of overall rollup (demo never worsens; blocked propagates),
 * honest demo/broadcast/email-sender flags, graceful per-subsystem degradation, and
 * PII/secret safety (no emails, phones, or secret values in the payload).
 *
 * Heavy imports (models registry, native publisher) are mocked so the module loads
 * without a database connection.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('../models/index.mjs', () => ({ getAllModels: () => ({}) }));

vi.mock('../services/nativeSocialPublishingService.mjs', () => ({
  default: {},
  PROVIDER_CAPABILITIES: [
    { id: 'bluesky', name: 'Bluesky', implementationStatus: 'available' },
    { id: 'youtube', name: 'YouTube', implementationStatus: 'oauth_required' },
    { id: 'facebook', name: 'Facebook', implementationStatus: 'oauth_required' },
    { id: 'instagram', name: 'Instagram', implementationStatus: 'oauth_required' },
    { id: 'tiktok', name: 'TikTok', implementationStatus: 'approval_required' },
    { id: 'nextdoor', name: 'Nextdoor', implementationStatus: 'partner_required' },
  ],
}));

vi.mock('../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { createMarketingReadinessService } = await import('../services/marketingReadinessService.mjs');

const makeModels = (over = {}) => ({
  AutomationSequence: {
    count: vi.fn().mockResolvedValue(3),
    findOne: vi.fn().mockResolvedValue({ isActive: false }),
  },
  AutomationLog: { count: vi.fn().mockResolvedValue(0) },
  Subscriber: { count: vi.fn().mockResolvedValue(0) },
  Lead: { count: vi.fn().mockResolvedValue(42) },
  MarketingCalendarItem: { count: vi.fn().mockResolvedValue(0) },
  MarketingCampaign: { count: vi.fn().mockResolvedValue(0) },
  ...over,
});

const makePublisher = (over = {}) => ({
  getHealth: vi.fn().mockResolvedValue({ encryption: true, scheduler: { enabled: true } }),
  listAccounts: vi.fn().mockResolvedValue([{ provider: 'bluesky', status: 'connected' }]),
  ...over,
});

const svc = (opts = {}) => createMarketingReadinessService({
  models: opts.models ?? makeModels(),
  publisher: opts.publisher ?? makePublisher(),
  armedCheck: opts.armedCheck ?? (() => false),
  env: opts.env ?? { SENDGRID_API_KEY: 'present' },
});

describe('marketingReadinessService', () => {
  it('reports READY overall when every operational subsystem is healthy', async () => {
    const r = await svc().getReadiness();
    expect(r.overall).toBe('ready');
    expect(r.subsystems.socialPublishing.status).toBe('ready');
    expect(r.subsystems.email.status).toBe('ready');
    expect(r.subsystems.contentTools.status).toBe('demo');
    expect(r.generatedAt).toEqual(expect.any(String));
  });

  it('marks social BLOCKED and rolls overall up to BLOCKED when encryption is missing', async () => {
    const r = await svc({
      publisher: makePublisher({
        getHealth: vi.fn().mockResolvedValue({ encryption: false }),
        listAccounts: vi.fn().mockResolvedValue([]),
      }),
    }).getReadiness();
    expect(r.subsystems.socialPublishing.status).toBe('blocked');
    expect(r.subsystems.socialPublishing.nextAction).toMatch(/SOCIAL_TOKEN_ENCRYPTION_KEY/);
    expect(r.overall).toBe('blocked');
  });

  it('marks social DEGRADED when encryption is configured but no accounts are connected', async () => {
    const r = await svc({
      publisher: makePublisher({ listAccounts: vi.fn().mockResolvedValue([]) }),
    }).getReadiness();
    expect(r.subsystems.socialPublishing.status).toBe('degraded');
    expect(r.subsystems.socialPublishing.connectedAccounts).toBe(0);
    expect(r.overall).toBe('degraded');
  });

  it('computes per-provider connected counts and marks only Bluesky usable', async () => {
    const r = await svc({
      publisher: makePublisher({
        listAccounts: vi.fn().mockResolvedValue([
          { provider: 'bluesky', status: 'connected' },
          { provider: 'bluesky', status: 'connected' },
          { provider: 'facebook', status: 'needs_reauth' },
        ]),
      }),
    }).getReadiness();
    const providers = r.subsystems.socialPublishing.providers;
    const bsky = providers.find((p) => p.id === 'bluesky');
    const fb = providers.find((p) => p.id === 'facebook');
    expect(bsky.connected).toBe(2);
    expect(bsky.usable).toBe(true);
    expect(fb.usable).toBe(false);
    expect(fb.connected).toBe(0); // needs_reauth is not a connected account
  });

  it('reports automation disarmed-by-default with an honest email-sender flag', async () => {
    const r = await svc().getReadiness();
    const a = r.subsystems.automation;
    expect(a.armed).toBe(false);
    expect(a.status).toBe('ready');
    expect(a.emailSenderBuilt).toBe(false);
    expect(a.leadNurtureActive).toBe(false);
    expect(a.note).toMatch(/disarmed/i);
  });

  it('surfaces the ARMED state without degrading the subsystem', async () => {
    const r = await svc({ armedCheck: () => true }).getReadiness();
    expect(r.subsystems.automation.armed).toBe(true);
    expect(r.subsystems.automation.status).toBe('ready');
    expect(r.subsystems.automation.note).toMatch(/armed/i);
  });

  it('reflects an active lead_nurture sequence from the DB', async () => {
    const r = await svc({
      models: makeModels({
        AutomationSequence: {
          count: vi.fn().mockResolvedValue(1),
          findOne: vi.fn().mockResolvedValue({ isActive: true }),
        },
      }),
    }).getReadiness();
    expect(r.subsystems.automation.leadNurtureActive).toBe(true);
  });

  it('marks email BLOCKED when SENDGRID_API_KEY is absent (presence-only, value never read)', async () => {
    const r = await svc({ env: {} }).getReadiness();
    expect(r.subsystems.email.status).toBe('blocked');
    expect(r.subsystems.email.sendgridConfigured).toBe(false);
    expect(r.subsystems.email.broadcastBuilt).toBe(false);
  });

  it('degrades only the failing subsystem (not the whole call) when a count throws', async () => {
    const r = await svc({
      models: makeModels({ Lead: { count: vi.fn().mockRejectedValue(new Error('db down')) } }),
    }).getReadiness();
    expect(r.subsystems.leadCapture.status).toBe('degraded');
    expect(r.subsystems.calendar.status).toBe('ready'); // sibling still resolves
  });

  it('degrades social gracefully when the publisher throws', async () => {
    const r = await svc({
      publisher: { getHealth: vi.fn().mockRejectedValue(new Error('storage down')), listAccounts: vi.fn() },
    }).getReadiness();
    expect(r.subsystems.socialPublishing.status).toBe('degraded');
    expect(r.subsystems.socialPublishing.error).toBeTruthy();
  });

  it('never emits PII or a secret value anywhere in the payload', async () => {
    const r = await svc({
      models: makeModels({ Subscriber: { count: vi.fn().mockResolvedValue(5) } }),
      env: { SENDGRID_API_KEY: 'present', SENDGRID_FROM_EMAIL: 'secretfrom@sswanstudios.com' },
    }).getReadiness();

    // Guidance fields (note / nextAction) intentionally NAME env vars so the
    // operator knows which switch to flip — that convention predates this test
    // (`buildEmail` and `buildSocial` both do it on origin/main). Naming a var
    // is not disclosing its VALUE. Strip guidance, then assert the remaining
    // payload — the actual data surface — carries no credential of any kind.
    const guidance = [];
    const stripped = JSON.parse(JSON.stringify(r), (key, value) => {
      if ((key === 'note' || key === 'nextAction') && typeof value === 'string') {
        guidance.push(value);
        return undefined;
      }
      return value;
    });
    const json = JSON.stringify(stripped).toLowerCase();

    expect(json).not.toContain('@'); // no email addresses in the data surface
    expect(json).not.toMatch(/"phone"/);

    // The real invariant: no secret VALUE may surface, guidance included.
    const whole = JSON.stringify(r).toLowerCase();
    expect(whole).not.toContain('present'); // mock SENDGRID_API_KEY value
    expect(whole).not.toContain('secretfrom'); // mock SENDGRID_FROM_EMAIL value
  });

  it('reports speed-to-lead as dark-but-safe by default, and blocks when armed without a sender', async () => {
    const dark = await svc({ env: { SENDGRID_API_KEY: 'present' } }).getReadiness();
    expect(dark.subsystems.speedToLead.enabled).toBe(false);
    expect(dark.subsystems.speedToLead.status).toBe('ready');
    expect(dark.overall).toBe('ready'); // dark must never drag the cockpit down

    const armedBroken = await svc({ env: { SPEED_TO_LEAD_REPLY_ENABLED: 'true' } }).getReadiness();
    expect(armedBroken.subsystems.speedToLead.status).toBe('blocked');
    expect(armedBroken.overall).toBe('blocked'); // and it MUST propagate
  });

  it('reports campaign totals from the model registry', async () => {
    const r = await svc({
      models: makeModels({
        MarketingCampaign: { count: vi.fn().mockResolvedValueOnce(4).mockResolvedValueOnce(2) },
      }),
    }).getReadiness();
    expect(r.subsystems.campaigns.status).toBe('ready');
    expect(r.subsystems.campaigns.totalCampaigns).toBe(4);
    expect(r.subsystems.campaigns.activeCampaigns).toBe(2);
  });
});
