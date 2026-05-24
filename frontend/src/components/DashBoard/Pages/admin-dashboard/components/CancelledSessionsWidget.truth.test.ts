import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/components/CancelledSessionsWidget.tsx'),
  'utf8',
);
const parentSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverviewPanel.tsx'),
  'utf8',
);

describe('CancelledSessionsWidget active surface truth contract', () => {
  it('is mounted by the admin overview dashboard', () => {
    expect(parentSource).toContain("import CancelledSessionsWidget from '../components/CancelledSessionsWidget'");
    expect(parentSource).toContain('<CancelledSessionsWidget maxItems={10} showChargeButtons={true} />');
  });

  it('uses the mounted unified sessions review endpoints', () => {
    expect(source).toContain("authAxios.get('/api/sessions/admin/cancelled'");
    expect(source).toContain('authAxios.post(`/api/sessions/${sessionId}/charge-cancellation`');
    expect(source).toContain('authAxios.get(`/api/sessions/${session.id}/client-package-price`)');
  });

  it('does not use blocking alerts or claim that a real card charge was applied', () => {
    expect(source).not.toContain('alert(');
    expect(source).not.toContain('applied successfully');
    expect(source).toContain('operationNotice');
    expect(source).toContain('recorded for billing review');
  });

  it('does not invent frontend cancellation pricing when package pricing is unavailable', () => {
    expect(source).not.toContain('fallbackPrice: 175');
    expect(source).toContain('isPricingAvailable');
    expect(source).toContain('Pricing unavailable');
    expect(source).toContain('pricingUnavailable');
  });
});
