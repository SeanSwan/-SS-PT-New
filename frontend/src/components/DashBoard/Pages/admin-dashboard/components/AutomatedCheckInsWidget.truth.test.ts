import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/components/AutomatedCheckInsWidget.tsx'),
  'utf8',
);
const parentSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverviewPanel.tsx'),
  'utf8',
);
const backendSource = readFileSync(
  resolve(process.cwd(), '../backend/routes/adminComplianceRoutes.mjs'),
  'utf8',
);

describe('AutomatedCheckInsWidget active surface truth contract', () => {
  it('is mounted by the admin overview telemetry dashboard', () => {
    expect(parentSource).toContain("import AutomatedCheckInsWidget from '../components/AutomatedCheckInsWidget'");
    expect(parentSource).toContain('<BentoHalf><AutomatedCheckInsWidget /></BentoHalf>');
  });

  it('uses the mounted read-only check-in dashboard endpoint', () => {
    expect(source).toContain("authAxios.get('/api/admin/check-ins/dashboard')");
    expect(backendSource).toContain("router.get('/check-ins/dashboard'");
  });

  it('does not render write-action controls without mounted backend handlers', () => {
    expect(source).not.toContain('title="Send now"');
    expect(source).not.toContain('<SendBtn');
    expect(source).not.toContain('Create New Trigger');
    expect(source).not.toContain('<AddTriggerBtn');
  });

  it('treats check-in API failure as unavailable data, not a clean empty queue', () => {
    expect(source).toContain('<ErrorMsg role="alert">');
    expect(source).toContain('Check-in automation data unavailable.');
    expect(source).toContain('<RetryInline type="button" onClick={fetchData}>');
    expect(source).not.toContain('{error && <EmptyMsg>');
  });
});
