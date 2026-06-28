import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');
const unifiedSessionsSource = readFileSync(resolve(__dirname, '../../routes/sessions.mjs'), 'utf8');
const cancellationReviewServiceSource = readFileSync(resolve(__dirname, '../../services/sessions/sessionCancellationReviewService.mjs'), 'utf8');

describe('cancelled sessions widget route truth contracts', () => {
  it('anchors the admin cancelled-session review paths to the mounted unified sessions router', () => {
    expect(coreRoutesSource).toContain("app.use('/api/sessions', sessionsRoutes)");
    expect(coreRoutesSource).not.toContain("\n  app.use('/api/sessions', sessionRoutes)");

    expect(unifiedSessionsSource).toContain('router.get("/admin/cancelled"');
    expect(unifiedSessionsSource).toContain('router.post("/:sessionId/charge-cancellation"');
  });

  it('registers the static admin review route before the dynamic session id route', () => {
    const adminCancelledIndex = unifiedSessionsSource.indexOf('router.get("/admin/cancelled"');
    const dynamicSessionIndex = unifiedSessionsSource.indexOf('router.get("/:id"');

    expect(adminCancelledIndex).toBeGreaterThan(-1);
    expect(dynamicSessionIndex).toBeGreaterThan(-1);
    expect(adminCancelledIndex).toBeLessThan(dynamicSessionIndex);
  });

  it('registers the static sessions health route before the dynamic session id route', () => {
    const healthIndex = unifiedSessionsSource.indexOf('router.get("/health"');
    const dynamicSessionIndex = unifiedSessionsSource.indexOf('router.get("/:id"');

    expect(healthIndex).toBeGreaterThan(-1);
    expect(dynamicSessionIndex).toBeGreaterThan(-1);
    expect(healthIndex).toBeLessThan(dynamicSessionIndex);
  });

  it('records cancellation review decisions against the real cancellation audit fields', () => {
    expect(unifiedSessionsSource).toContain('recordCancellationBillingDecision');
    expect(cancellationReviewServiceSource).toContain('cancellationDecision');
    expect(cancellationReviewServiceSource).toContain('cancellationReviewReason');
    expect(cancellationReviewServiceSource).toContain('cancellationReviewedBy');
    expect(cancellationReviewServiceSource).toContain('getClientPackagePricing');
    expect(cancellationReviewServiceSource).toContain('computeCancellationCharge');
    expect(cancellationReviewServiceSource).toContain('transaction,');
    expect(cancellationReviewServiceSource).toContain('lock: transaction.LOCK.UPDATE');
  });
});
