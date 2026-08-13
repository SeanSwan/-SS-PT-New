/**
 * adminSocialPublishingRoutes.publishTruth.test.mjs
 * =================================================
 * The publish endpoint must never claim an outcome it did not achieve.
 *
 * WHY THIS FILE EXISTS: the route hardcoded `success: true` and discarded the
 * truthful `status` the service returns, so a publish where EVERY platform
 * failed answered "success". The frontend branches on `data.success` and clears
 * the composer on success — so a total failure told the user it published AND
 * destroyed their draft, with nothing in history to recover from.
 *
 * CONTRACT PINNED HERE (decided after review, deliberately NOT HTTP-coded):
 *   - Business outcomes are DATA, not transport. `failed`, `partial_failed` and
 *     `published` all return HTTP 200 with a top-level `status`. Non-2xx is
 *     reserved for 400 (bad request), 422 (compliance refusal) and 500 (route
 *     fault). This is because the frontend's handler is a bare `catch {}` that
 *     reports ANY rejection as "Network error" — axios rejects non-2xx, so
 *     returning 502 for a failed publish would have replaced one lie with a
 *     different one.
 *   - `success` is mechanically derived from `status` so the two can never
 *     diverge again. It is not independently assignable.
 *   - Compliance blocks on REAL violations only. A promotional post that the
 *     checker auto-remedies with #ad must still publish — blocking on
 *     `!compliant` would refuse nearly every marketing post, because
 *     `compliant` is `warnings.length === 0` and the auto-remedy also pushes a
 *     warning.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const nativePublisherMock = vi.hoisted(() => ({
  getHealth: vi.fn(),
  listAccounts: vi.fn(),
  getHistory: vi.fn(),
  publish: vi.fn(),
  retryJob: vi.fn(),
}));

const loggerMock = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  log: vi.fn(),
}));

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 1, role: 'admin' };
    next();
  },
  adminOnly: (_req, _res, next) => next(),
}));

vi.mock('../services/nativeSocialPublishingService.mjs', () => ({
  default: nativePublisherMock,
  PROVIDER_CAPABILITIES: [
    {
      id: 'bluesky',
      name: 'Bluesky',
      native: true,
      implementationStatus: 'available',
      connectionType: 'app_password',
    },
  ],
}));

vi.mock('../utils/logger.mjs', () => ({ default: loggerMock }));

const { default: adminSocialPublishingRoutes } = await import('../routes/adminSocialPublishingRoutes.mjs');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/social-publishing', adminSocialPublishingRoutes);
  return app;
};

const post = (body) => request(buildApp()).post('/api/admin/social-publishing/publish').send(body);

/** Benign content: trips no FDA term and no FTC testimonial/promo pattern. */
const PLAIN = 'Morning mobility work by the water today.';

const auditLines = () => loggerMock.info.mock.calls.map(args => String(args[0])).filter(line => line.includes('[AUDIT]'));

describe('POST /publish — the response must match what actually happened', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports failure when EVERY platform failed', async () => {
    // The service already derives this truthfully; the route used to throw it away.
    nativePublisherMock.publish.mockResolvedValueOnce({
      status: 'failed',
      results: [
        { provider: 'bluesky', accountId: 'a1', status: 'failed', error: 'Bluesky createRecord failed (401): ExpiredToken' },
      ],
    });

    const response = await post({ content: PLAIN, platformIds: ['a1'] });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('failed');
    expect(response.body.success).toBe(false);
    // The per-platform truth must reach the caller — it is what tells Sean WHY.
    expect(response.body.data.results[0].error).toMatch(/401/);
  });

  it('reports partial failure distinctly, so a half-published post is not called a win', async () => {
    nativePublisherMock.publish.mockResolvedValueOnce({
      status: 'partial_failed',
      results: [
        { provider: 'bluesky', accountId: 'a1', status: 'published', providerPostId: 'at://x' },
        { provider: 'bluesky', accountId: 'a2', status: 'failed', error: 'rate limited' },
      ],
    });

    const response = await post({ content: PLAIN, platformIds: ['a1', 'a2'] });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('partial_failed');
    expect(response.body.success).toBe(false);
  });

  it('reports success only when the post genuinely published', async () => {
    nativePublisherMock.publish.mockResolvedValueOnce({
      status: 'published',
      results: [{ provider: 'bluesky', accountId: 'a1', status: 'published', providerPostId: 'at://x' }],
    });

    const response = await post({ content: PLAIN, platformIds: ['a1'] });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('published');
    expect(response.body.success).toBe(true);
  });

  it('keeps scheduling truthful too', async () => {
    nativePublisherMock.publish.mockResolvedValueOnce({
      status: 'scheduled',
      jobId: 'job-1',
      data: { id: 'job-1', status: 'scheduled' },
    });

    const response = await post({ content: PLAIN, platformIds: ['a1'], scheduledAt: '2099-01-01T00:00:00.000Z' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('scheduled');
    expect(response.body.success).toBe(true);
  });

  it('never lets success diverge from status', async () => {
    // Guards the actual root cause: `success` was independently assignable.
    for (const [status, expected] of [['published', true], ['scheduled', true], ['partial_failed', false], ['failed', false]]) {
      vi.clearAllMocks();
      nativePublisherMock.publish.mockResolvedValueOnce({ status, results: [] });
      const response = await post({ content: PLAIN, platformIds: ['a1'] });
      expect(response.body.success, `${status} must derive success=${expected}`).toBe(expected);
    }
  });
});

describe('POST /publish — the audit trail must record the real outcome', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not write "published" to the audit log when the publish failed', async () => {
    nativePublisherMock.publish.mockResolvedValueOnce({
      status: 'failed',
      results: [{ provider: 'bluesky', accountId: 'a1', status: 'failed', error: 'boom' }],
    });

    await post({ content: PLAIN, platformIds: ['a1'] });

    const lines = auditLines();
    expect(lines.length).toBeGreaterThan(0);
    // The old line said "published" unconditionally, before the outcome was read.
    expect(lines.join('\n')).not.toMatch(/\bpublished\b/);
    expect(lines.join('\n')).toMatch(/failed/);
  });

  it('records the real outcome on success', async () => {
    nativePublisherMock.publish.mockResolvedValueOnce({
      status: 'published',
      results: [{ provider: 'bluesky', accountId: 'a1', status: 'published' }],
    });

    await post({ content: PLAIN, platformIds: ['a1'] });

    expect(auditLines().join('\n')).toMatch(/published/);
  });
});

describe('POST /publish — compliance is a gate, not a suggestion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nativePublisherMock.publish.mockResolvedValue({
      status: 'published',
      results: [{ provider: 'bluesky', accountId: 'a1', status: 'published' }],
    });
  });

  it('BLOCKS an FDA medical claim and does not publish it', async () => {
    const response = await post({ content: 'This program treats chronic back pain.', platformIds: ['a1'] });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(nativePublisherMock.publish).not.toHaveBeenCalled();
    expect(JSON.stringify(response.body)).toMatch(/FDA/);
  });

  it('does NOT block a promotional post the checker auto-remedies with #ad', async () => {
    // `compliant` is warnings.length===0, and the #ad auto-remedy ALSO pushes a
    // warning — so blocking on !compliant would refuse nearly every marketing
    // post. The remedy is the point: it is already fixed.
    // Verified against the real checker: this trips /use (code|coupon|promo)/i,
    // yielding warnings=1 AND autoTags=['#ad'] — i.e. compliant===false with a
    // remedy already applied. An earlier draft of this test used "Limited time
    // offer — 20% off" which trips NOTHING, so it proved nothing.
    const response = await post({ content: 'Ready to train? Use code SWAN20 for your first month.', platformIds: ['a1'] });

    expect(response.status).toBe(200);
    expect(nativePublisherMock.publish).toHaveBeenCalled();
    // And the tag the checker added must actually be on the content that went out.
    expect(nativePublisherMock.publish.mock.calls[0][0].content).toMatch(/#ad/);
  });

  it('allows an explicit admin override, and records it', async () => {
    const response = await post({
      content: 'This program treats chronic back pain.',
      platformIds: ['a1'],
      complianceOverride: true,
    });

    expect(response.status).toBe(200);
    expect(nativePublisherMock.publish).toHaveBeenCalled();
    expect(auditLines().join('\n')).toMatch(/override/i);
  });
});

describe('POST /publish/:jobId/retry — recovery must not duplicate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const retry = (jobId = 'job-1') =>
    request(buildApp()).post('/api/admin/social-publishing/publish/' + jobId + '/retry').send({});

  it('reports the merged outcome with the same truthful contract as publish', async () => {
    nativePublisherMock.retryJob.mockResolvedValueOnce({
      status: 'published',
      jobId: 'job-1',
      retried: ['acct-2'],
      results: [
        { provider: 'bluesky', accountId: 'acct-1', status: 'published' },
        { provider: 'bluesky', accountId: 'acct-2', status: 'published' },
      ],
    });

    const response = await retry();

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('published');
    expect(response.body.success).toBe(true);
    expect(response.body.data.retried).toEqual(['acct-2']);
  });

  it('still reports failure honestly when the retry fails again', async () => {
    nativePublisherMock.retryJob.mockResolvedValueOnce({
      status: 'partial_failed',
      jobId: 'job-1',
      retried: ['acct-2'],
      results: [
        { provider: 'bluesky', accountId: 'acct-1', status: 'published' },
        { provider: 'bluesky', accountId: 'acct-2', status: 'failed', error: 'rate limited' },
      ],
    });

    const response = await retry();

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('partial_failed');
    expect(response.body.success).toBe(false);
  });

  it('404s an unknown job instead of pretending it retried', async () => {
    nativePublisherMock.retryJob.mockRejectedValueOnce(new Error('Social publishing job nope not found'));

    const response = await retry('nope');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it('records the retry in the audit trail', async () => {
    nativePublisherMock.retryJob.mockResolvedValueOnce({ status: 'published', jobId: 'job-1', retried: ['acct-2'], results: [] });

    await retry();

    expect(auditLines().join('\n')).toMatch(/retry/i);
  });
});
