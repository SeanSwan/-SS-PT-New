import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const componentPath = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-dashboard/components/AutomatedCheckInsWidget.tsx',
);
const stylesPath = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-dashboard/components/AutomatedCheckInsWidget.styles.ts',
);
const source = readFileSync(
  componentPath,
  'utf8',
);
const stylesSource = existsSync(stylesPath) ? readFileSync(stylesPath, 'utf8') : '';
const combinedSource = `${source}\n${stylesSource}`;
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
    expect(parentSource).toContain('<BentoHalf><WidgetErrorBoundary name="Automated check-ins"><AutomatedCheckInsWidget /></WidgetErrorBoundary></BentoHalf>');
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

  it('keeps the live widget split below the source line cap', () => {
    expect(existsSync(stylesPath)).toBe(true);
    expect(source).not.toContain("from 'styled-components'");
    expect(source).not.toContain('keyframes');
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(stylesSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });

  it('bridges check-in styling through theme tokens and mobile-safe controls', () => {
    expect(source).not.toMatch(/color="#/);
    expect(stylesSource).toContain("export const CHECKIN_ICE = 'var(--accent-primary, #60C0F0)'");
    expect(stylesSource).toContain("export const CHECKIN_SUCCESS = 'var(--success, #10b981)'");
    expect(stylesSource).toContain("export const CHECKIN_DANGER = 'var(--error, #ef4444)'");
    expect(combinedSource).toContain('min-height: 44px');
    expect(combinedSource).not.toMatch(/rgba\(/);
    expect(combinedSource).not.toContain('color: #');
    expect(combinedSource).not.toContain('background: #');
  });
});
