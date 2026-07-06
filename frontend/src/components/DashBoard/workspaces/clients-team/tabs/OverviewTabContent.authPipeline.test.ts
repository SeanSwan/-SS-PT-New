import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const read = (path: string) => readFileSync(resolve(__dirname, path), 'utf8');
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const routeComponentsSource = read('../../../UniversalDashboardLayout.routeComponents.tsx');
const routesSource = read('../../../UniversalDashboardLayout.routes.tsx');
const clientsWorkspaceSource = read('../../ClientsWorkspace.tsx');
const clientsWorkspaceTabsSource = read('../../ClientsWorkspaceTabs.tsx');
const clientDetailSource = read('../ClientDetailView.tsx');
const overviewSource = stripComments(read('./OverviewTabContent.tsx'));
const backendMountSource = read('../../../../../../../backend/core/routes.mjs');
const adminClientRoutesSource = read('../../../../../../../backend/routes/adminClientRoutes.mjs');

describe('OverviewTabContent auth pipeline', () => {
  it('is mounted through the canonical admin client-management workspace overview tab', () => {
    expect(routeComponentsSource).toContain(
      "export const ClientsWorkspace = React.lazy(() => import('./workspaces/ClientsWorkspace'))",
    );
    expect(routesSource).toContain("{ path: '/client-management'");
    expect(routesSource).toContain('component: ClientsWorkspace');
    expect(clientsWorkspaceSource).toMatch(
      /useClientsWorkspaceTabRenderers\(\s*selectedClient,\s*getClientTrainingSectionFromSearchParams\(searchParams\),\s*handleViewProgress,\s*scheduleLoggerContext,\s*audience\s*\)/,
    );
    expect(clientsWorkspaceSource).toMatch(/renderOverview=\{renderOverview\}/);
    expect(clientsWorkspaceTabsSource).toMatch(/const OverviewTabContent = lazy\(\(\) => import\('\.\/clients-team\/tabs\/OverviewTabContent'\)\)/);
    expect(clientsWorkspaceTabsSource).toMatch(/const renderOverview = useCallback\(\(clientId: number \| string\) =>/);
    expect(clientsWorkspaceTabsSource).toMatch(
      /<OverviewTabContent clientId=\{clientId\} clientName=\{clientName\(selectedClient\)\} \/>/,
    );
    expect(clientDetailSource).toMatch(/case 'overview':[\s\S]{0,180}renderOverview\s*\?\s*renderOverview\(client\.id\)/);
    expect(backendMountSource).toMatch(/app\.use\('\/api\/admin', adminClientRoutes\)/);
    expect(adminClientRoutesSource).toMatch(/router\.get\('\/clients\/:clientId', adminClientController\.getClientDetails\)/);
  });

  it('loads the selected client overview through shared apiService auth transport', () => {
    expect(overviewSource).toMatch(/import\s+apiService\s+from\s+['"]\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/services\/api\.service['"]/);
    expect(overviewSource).toMatch(/getNumericClientId\(clientId\)/);
    expect(overviewSource).toMatch(/apiService\.get\(`\/api\/admin\/clients\/\$\{numericClientId\}`\)/);
    expect(overviewSource).not.toMatch(/localStorage\.getItem\(['"]token['"]\)/);
    expect(overviewSource).not.toMatch(/Authorization\s*:/);
    expect(overviewSource).not.toMatch(/\bfetch\s*\(/);
  });
});
