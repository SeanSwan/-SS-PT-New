import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../../..');

// Normalize CRLF: on autocrlf=true checkouts (fresh Windows worktrees) files
// read back with \r\n and multi-line contains-locks false-fail. Line endings
// are not part of the contract.
const readSource = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), 'utf8').replace(/\r\n/g, '\n');

describe('useSubscription auth pipeline', () => {
  it('is consumed by mounted client/paywall surfaces backed by mounted subscription APIs', () => {
    const hookSource = readSource('frontend/src/hooks/useSubscription.ts');
    const clientHomeSource = readSource('frontend/src/components/UserDashboard/components/HomeTab.tsx');
    const paywallSource = readSource('frontend/src/components/Subscription/FrostedPaywall.tsx');
    const ascensionSource = readSource('frontend/src/pages/AscensionPage/AscensionPage.tsx');
    const successSource = readSource('frontend/src/pages/subscription/SubscriptionSuccessPage.tsx');
    const coreRoutesSource = readSource('backend/core/routes.mjs');
    const subscriptionRoutesSource = readSource('backend/routes/subscriptionRoutes.mjs');

    expect(clientHomeSource).toContain("import { useSubscription } from '../../../hooks/useSubscription'");
    expect(paywallSource).toContain("import useSubscription from '../../hooks/useSubscription'");
    expect(ascensionSource).toContain("import { useSubscription } from '../../hooks/useSubscription'");
    expect(successSource).toContain("import { useSubscription } from '../../hooks/useSubscription'");
    expect(coreRoutesSource).toContain("app.use('/api/subscriptions', subscriptionRoutes)");
    expect(subscriptionRoutesSource).toContain("router.get('/status'");
    expect(subscriptionRoutesSource).toContain("router.get('/tiers'");
    expect(subscriptionRoutesSource).toContain("router.post('/start-trial'");
    expect(subscriptionRoutesSource).toContain("router.post('/checkout'");
    expect(subscriptionRoutesSource).toContain("router.post('/cancel'");
    // Signature gained an options param in the 2026-07-12 lane-1 batch
    // (51938cc82, withTiers); the lock is on the export existing, not arity.
    expect(hookSource).toContain('export function useSubscription(');
  });

  it('keeps subscription reads and mutations on the shared API service', () => {
    const hookSource = readSource('frontend/src/hooks/useSubscription.ts');

    expect(hookSource).toContain("apiService.get('/api/subscriptions/status')");
    expect(hookSource).toContain("apiService.get('/api/subscriptions/tiers')");
    expect(hookSource).toContain("apiService.post('/api/subscriptions/start-trial')");
    expect(hookSource).toContain("apiService.post('/api/subscriptions/checkout', { tier, amount, billingInterval })");
    expect(hookSource).toContain("apiService.post('/api/subscriptions/cancel', { reason })");

    expect(hookSource).not.toContain("localStorage.getItem('token')");
    expect(hookSource).not.toContain('const API_BASE');
    expect(hookSource).not.toContain('const getHeaders');
    expect(hookSource).not.toContain('fetch(`${API_BASE}/api/subscriptions');
  });
});
