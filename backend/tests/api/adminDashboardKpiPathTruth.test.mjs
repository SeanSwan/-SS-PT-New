import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');
const complianceRoutesSource = readFileSync(resolve(__dirname, '../../routes/adminComplianceRoutes.mjs'), 'utf8');
const aiBffSource = readFileSync(resolve(__dirname, '../../routes/aiBffRoutes.mjs'), 'utf8');
const dashboardCommandsSource = readFileSync(resolve(__dirname, '../../services/ai/commandRegistry/dashboardCommands.mjs'), 'utf8');
const commandRegistrySource = readFileSync(resolve(__dirname, '../../services/ai/commandRegistry/index.mjs'), 'utf8');

describe('admin dashboard KPI path truth contracts', () => {
  it('anchors the business KPI route to the mounted admin compliance router', () => {
    expect(coreRoutesSource).toContain("app.use('/api/admin', adminComplianceRoutes)");
    expect(complianceRoutesSource).toContain("router.get('/analytics/business-kpis'");
  });

  it('does not keep AI dashboard consumers pointed at the retired nested KPI path', () => {
    expect(aiBffSource).not.toContain('/api/admin/compliance/analytics/business-kpis');
    expect(dashboardCommandsSource).not.toContain('/api/admin/compliance/analytics/business-kpis');
    expect(aiBffSource).toContain('/api/admin/analytics/business-kpis');
    expect(dashboardCommandsSource).toContain("endpoint: '/api/admin/analytics/business-kpis'");
  });

  it('keeps the dashboard command registry active for the corrected endpoint', () => {
    expect(commandRegistrySource).toContain("import { register as registerDashboard } from './dashboardCommands.mjs'");
    expect(commandRegistrySource).toContain('registerDashboard()');
    expect(coreRoutesSource).toContain("app.use('/api/ai-command', aiCommandRoutes)");
  });
});
