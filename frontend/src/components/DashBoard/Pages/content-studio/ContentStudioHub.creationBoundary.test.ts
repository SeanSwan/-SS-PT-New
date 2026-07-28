import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..', '..', '..');
const HUB_FILE = join(
  REPO_ROOT,
  'frontend',
  'src',
  'components',
  'DashBoard',
  'Pages',
  'content-studio',
  'ContentStudioHub.tsx',
);
const ROUTE_COMPONENTS_FILE = join(
  REPO_ROOT,
  'frontend',
  'src',
  'components',
  'DashBoard',
  'UniversalDashboardLayout.routeComponents.tsx',
);
const ROUTES_FILE = join(
  REPO_ROOT,
  'frontend',
  'src',
  'components',
  'DashBoard',
  'UniversalDashboardLayout.routes.tsx',
);

const PROJECT_API_FILE = join(
  REPO_ROOT,
  'frontend',
  'src',
  'components',
  'DashBoard',
  'Pages',
  'content-studio',
  'ContentStudioProjects.api.ts',
);
describe('ContentStudioHub creation boundary contract', () => {
  const hubSource = readFileSync(HUB_FILE, 'utf-8');
  const routeComponentsSource = readFileSync(ROUTE_COMPONENTS_FILE, 'utf-8');
  const routesSource = readFileSync(ROUTES_FILE, 'utf-8');
  const projectApiSource = readFileSync(PROJECT_API_FILE, 'utf-8');

  it('is mounted as the admin Content Studio route', () => {
    expect(routeComponentsSource).toContain("export const ContentStudioHub = React.lazy(() => import('./Pages/content-studio/ContentStudioHub'))");
    expect(routesSource).toContain("path: '/content'");
    expect(routesSource).toContain('component: ContentStudioHub');
  });

  it('states that Content Studio creates assets while Marketing handles distribution', () => {
    expect(hubSource).toContain('Create assets here');
    expect(hubSource).toContain('Marketing Command Center');
    expect(hubSource).toContain('publishing, distribution, lead capture, and performance tracking');
  });

  it('adds the Creator Command Center workflow before the existing tool tabs', () => {
    expect(hubSource).toContain("{ id: 'workflow', label: 'Workflow'");
    expect(hubSource).toContain("useState<StudioTab>('workflow')");
    expect(hubSource).toContain("id: 'youtube_ready'");
    expect(hubSource).toContain('Create Project From Coverage');
    expect(hubSource).toContain('setActiveTab(action.tab)');
    expect(hubSource).toContain('ContentStudioProjectQueue');
    expect(projectApiSource).toContain("api.get(PROJECTS_PATH)");
    expect(projectApiSource).toContain("api.post(PROJECTS_PATH, input)");
    expect(projectApiSource).toContain("api.patch(`${PROJECTS_PATH}/${encodeURIComponent(id)}`, input)");
    expect(projectApiSource).toContain("const PROJECTS_PATH = '/api/content-studio/projects'");
  });
  it('does not import old publishing/settings panels into the creator hub', () => {
    expect(hubSource).not.toContain('SocialDistributionPanel');
    expect(hubSource).not.toContain('DistributionHubPanel');
    expect(hubSource).not.toContain('ContentCalendarPanel');
    expect(hubSource).not.toContain('ContentStudioSettings');
  });
});
