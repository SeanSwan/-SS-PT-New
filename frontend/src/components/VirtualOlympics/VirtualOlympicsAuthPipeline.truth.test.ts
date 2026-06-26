import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const read = (path: string) => readFileSync(resolve(__dirname, path), 'utf8');
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const layoutSource = read('../DashBoard/UniversalDashboardLayout.tsx');
const routeComponentsSource = read('../DashBoard/UniversalDashboardLayout.routeComponents.tsx');
const dashboardRoutesSource = read('../DashBoard/UniversalDashboardLayout.routes.tsx');
const pageSource = stripComments(read('./VirtualOlympicsPage.tsx'));
const backendMountSource = read('../../../../backend/core/routes.mjs');
const olympicRoutesSource = read('../../../../backend/routes/olympicRoutes.mjs');

describe('VirtualOlympicsPage auth pipeline', () => {
  it('is mounted for dashboard users and backed by authenticated olympics routes', () => {
    expect(layoutSource).toContain("from './UniversalDashboardLayout.routes'");
    expect(routeComponentsSource).toMatch(/export const VirtualOlympicsPage = React\.lazy\(\(\) => import\('\.\.\/VirtualOlympics\/VirtualOlympicsPage'\)\)/);
    const dashboardRouteMatches = dashboardRoutesSource.match(/path: '\/virtual-olympics', component: VirtualOlympicsPage/g) || [];
    expect(dashboardRouteMatches.length).toBeGreaterThanOrEqual(3);

    expect(backendMountSource).toMatch(/app\.use\('\/api\/olympics', olympicRoutes\)/);
    expect(olympicRoutesSource).toMatch(/router\.get\('\/events', ensureAuth,/);
    expect(olympicRoutesSource).toMatch(/router\.get\('\/leaderboard\/:eventType', ensureAuth,/);
    expect(olympicRoutesSource).toMatch(/router\.post\('\/submit', ensureAuth,/);
    expect(olympicRoutesSource).toMatch(/router\.get\('\/recovery-status', ensureAuth,/);
    expect(olympicRoutesSource).toMatch(/router\.post\('\/recovery-day', ensureAuth,/);
  });

  it('keeps olympics reads and mutations on shared apiService auth transport', () => {
    expect(pageSource).toMatch(/import\s+apiService\s+from\s+['"]\.\.\/\.\.\/services\/api\.service['"]/);
    expect(pageSource).toMatch(/apiService\.get[\s\S]{0,140}\('\/api\/olympics\/events'\)/);
    expect(pageSource).toMatch(/apiService\.get[\s\S]{0,220}\(`\/api\/olympics\/leaderboard\/\$\{eventType\}\?limit=20`\)/);
    expect(pageSource).toMatch(/apiService\.post[\s\S]{0,180}\('\/api\/olympics\/submit',\s*\{\s*eventType: activeEvent,\s*score: s,\s*duration: d,\s*\}\)/);
    expect(pageSource).toMatch(/apiService\.get[\s\S]{0,140}\('\/api\/olympics\/recovery-status'\)/);
    expect(pageSource).toMatch(/apiService\.post[\s\S]{0,140}\('\/api\/olympics\/recovery-day'/);

    expect(pageSource).not.toMatch(/localStorage\.getItem\(['"]token['"]\)/);
    expect(pageSource).not.toMatch(/Authorization\s*:/);
    expect(pageSource).not.toMatch(/\bfetch\s*\(/);
  });
});
