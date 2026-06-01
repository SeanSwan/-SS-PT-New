import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const componentPath = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-dashboard/components/CancelledSessionsWidget.tsx',
);
const stylesPath = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-dashboard/components/CancelledSessionsWidget.styles.ts',
);
const controlsPath = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-dashboard/components/CancelledSessionsWidget.controls.ts',
);
const cardPath = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-dashboard/components/CancelledSessionCard.tsx',
);
const typesPath = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-dashboard/components/CancelledSessionsWidget.types.ts',
);
const source = readFileSync(
  componentPath,
  'utf8',
);
const stylesSource = existsSync(stylesPath) ? readFileSync(stylesPath, 'utf8') : '';
const controlsSource = existsSync(controlsPath) ? readFileSync(controlsPath, 'utf8') : '';
const cardSource = existsSync(cardPath) ? readFileSync(cardPath, 'utf8') : '';
const typesSource = existsSync(typesPath) ? readFileSync(typesPath, 'utf8') : '';
const combinedSource = `${source}\n${stylesSource}\n${controlsSource}\n${cardSource}\n${typesSource}`;
const parentSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverviewPanel.tsx'),
  'utf8',
);
const coreRoutesSource = readFileSync(resolve(process.cwd(), '../backend/core/routes.mjs'), 'utf8');
const sessionRoutesSource = readFileSync(resolve(process.cwd(), '../backend/routes/sessions.mjs'), 'utf8');

describe('CancelledSessionsWidget active surface truth contract', () => {
  it('is mounted by the admin overview dashboard', () => {
    expect(parentSource).toContain("import CancelledSessionsWidget from '../components/CancelledSessionsWidget'");
    expect(parentSource).toContain('<CancelledSessionsWidget maxItems={10} showChargeButtons={true} />');
  });

  it('uses the mounted unified sessions review endpoints', () => {
    expect(source).toContain("authAxios.get('/api/sessions/admin/cancelled'");
    expect(source).toContain('authAxios.post(`/api/sessions/${sessionId}/charge-cancellation`');
    expect(source).toContain('authAxios.get(`/api/sessions/${session.id}/client-package-price`)');
    expect(coreRoutesSource).toContain("app.use('/api/sessions', sessionsRoutes)");
    expect(sessionRoutesSource).toContain('router.get("/admin/cancelled"');
    expect(sessionRoutesSource).toContain('router.get("/:id/client-package-price"');
    expect(sessionRoutesSource).toContain('router.post("/:sessionId/charge-cancellation"');
  });

  it('does not use blocking alerts or claim that a real card charge was applied', () => {
    expect(combinedSource).not.toContain('alert(');
    expect(combinedSource).not.toContain('applied successfully');
    expect(combinedSource).toContain('operationNotice');
    expect(combinedSource).toContain('recorded for billing review');
  });

  it('does not invent frontend cancellation pricing when package pricing is unavailable', () => {
    expect(combinedSource).not.toContain('fallbackPrice: 175');
    expect(combinedSource).toContain('isPricingAvailable');
    expect(combinedSource).toContain('Pricing unavailable');
    expect(combinedSource).toContain('pricingUnavailable');
  });

  it('keeps cancelled-session behavior, card UI, types, and styles split below line caps', () => {
    expect(existsSync(stylesPath)).toBe(true);
    expect(existsSync(controlsPath)).toBe(true);
    expect(existsSync(cardPath)).toBe(true);
    expect(existsSync(typesPath)).toBe(true);
    expect(source).not.toContain("from 'styled-components'");
    expect(source).not.toContain('style={{');
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(cardSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(stylesSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(controlsSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(typesSource.split(/\r?\n/).length).toBeLessThanOrEqual(120);
  });

  it('keeps cancellation decision controls tokenized and touch-friendly', () => {
    expect(combinedSource).toContain('min-height: 44px');
    expect(combinedSource).toContain('min-width: 44px');
    expect(combinedSource).toContain('&:focus-visible');
    expect(combinedSource).not.toMatch(/rgba\(/);
    expect(combinedSource).not.toContain('color: #');
    expect(combinedSource).not.toContain('background: #');
  });
});
