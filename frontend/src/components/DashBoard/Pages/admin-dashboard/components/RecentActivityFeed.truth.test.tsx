
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import RecentActivityFeed from './RecentActivityFeed';

const mockAuthAxios = {
  get: vi.fn(),
};

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios }),
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SOURCE = readFileSync(resolve(__dirname, './RecentActivityFeed.tsx'), 'utf8');
const LAYOUT_SOURCE = readFileSync(resolve(process.cwd(), 'src/components/DashBoard/UniversalDashboardLayout.tsx'), 'utf8');
const ROUTE_COMPONENTS_SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/UniversalDashboardLayout.routeComponents.tsx'),
  'utf8',
);
const DASHBOARD_ROUTES_SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/UniversalDashboardLayout.routes.tsx'),
  'utf8',
);
const OVERVIEW_SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverviewPanel.tsx'),
  'utf8',
);

describe('RecentActivityFeed truth handling', () => {
  beforeEach(() => {
    mockAuthAxios.get.mockReset();
  });

  it('renders platform activity returned by the gamification feed API', async () => {
    mockAuthAxios.get.mockResolvedValueOnce({
      data: {
        data: [{
          id: 77,
          type: 'workout',
          message: 'Live workout logged',
          timeAgo: '3 min ago',
        }],
      },
    });

    render(<RecentActivityFeed />);

    await waitFor(() => expect(screen.getByText('Live workout logged')).toBeInTheDocument());
    expect(screen.getByText('3 min ago')).toBeInTheDocument();
    expect(mockAuthAxios.get).toHaveBeenCalledWith('/api/gamification/activity-feed', {
      params: { limit: 10 },
    });
    expect(screen.queryByText('New user registered')).not.toBeInTheDocument();
  });

  it('shows unavailable state instead of demo activity when the API fails', async () => {
    mockAuthAxios.get.mockRejectedValueOnce(new Error('activity feed unavailable'));

    render(<RecentActivityFeed />);

    await waitFor(() => expect(screen.getByText('Recent activity could not be loaded.')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /retry recent activity/i })).toBeInTheDocument();
    expect(screen.queryByText('Payment received - $186.00')).not.toBeInTheDocument();
    expect(screen.queryByText('Daily backup completed')).not.toBeInTheDocument();
  });

  it('shows an empty state instead of demo activity when no rows are returned', async () => {
    mockAuthAxios.get.mockResolvedValueOnce({ data: { data: [] } });

    render(<RecentActivityFeed />);

    await waitFor(() => expect(screen.getByText('No recent platform activity yet.')).toBeInTheDocument());
    expect(screen.queryByText('New user registered')).not.toBeInTheDocument();
    expect(screen.queryByText('Training session scheduled')).not.toBeInTheDocument();
  });

  it('does not retain demo recent-activity fixtures', () => {
    expect(SOURCE).not.toContain('DEMO_FEED');
    expect(SOURCE).not.toMatch(/Payment received|Daily backup completed|Upper Body workout|First Workout/);
  });

  it('is mounted by the canonical admin overview route', () => {
    expect(LAYOUT_SOURCE).toContain("from './UniversalDashboardLayout.routes'");
    expect(ROUTE_COMPONENTS_SOURCE).toContain("export const RevolutionaryAdminDashboard = React.lazy(() => import('./Pages/admin-dashboard/admin-dashboard-view'))");
    expect(DASHBOARD_ROUTES_SOURCE).toContain("{ path: '/overview', component: RevolutionaryAdminDashboard");
    expect(OVERVIEW_SOURCE).toContain("import RecentActivityFeed from '../components/RecentActivityFeed'");
    expect(OVERVIEW_SOURCE).toContain('<BentoThird><WidgetErrorBoundary name="Recent activity"><RecentActivityFeed /></WidgetErrorBoundary></BentoThird>');
    expect(SOURCE).toContain("authAxios.get('/api/gamification/activity-feed'");
  });

  it('bridges activity states and hover surfaces to Crystalline Swan theme tokens', () => {
    expect(SOURCE).toContain("const ACTIVITY_COLORS: Record<ActivityType, string> = {");
    expect(SOURCE).toContain("const TEXT_SECONDARY = 'var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 70%, transparent))'");
    expect(SOURCE).toContain("const TEXT_FAINT = 'var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 40%, transparent))'");
    expect(SOURCE).toContain('background: color-mix(in srgb, var(--warning, #F59E0B) 14%, transparent);');
    expect(SOURCE).toContain('border: 1px solid color-mix(in srgb, var(--warning, #F59E0B) 26%, transparent);');
    expect(SOURCE).toContain('border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent);');
    expect(SOURCE).toContain('background: color-mix(in srgb, var(--royal-depth, #003080) 40%, transparent); color: var(--text-primary, #E0ECF4);');
    expect(SOURCE).toContain('border: 1px dashed color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);');
    expect(SOURCE).toContain('&:hover { background: color-mix(in srgb, var(--royal-depth, #003080) 20%, transparent); }');
    expect(SOURCE).toContain('background: color-mix(in srgb, ${p => p.$color} 12%, transparent);');
    expect(SOURCE).not.toContain('rgba(');
    expect(SOURCE).not.toContain('CHART_COLORS');
    expect(SOURCE).not.toContain('hexAlpha');
    expect(SOURCE).not.toContain('background: rgba(198, 168, 75, 0.12);');
    expect(SOURCE).not.toContain('border: 1px solid rgba(198, 168, 75, 0.24);');
    expect(SOURCE).not.toContain('border: 1px solid rgba(96, 192, 240, 0.35);');
    expect(SOURCE).not.toContain('background: rgba(0, 32, 96, 0.4); color: var(--text-primary, #E0ECF4);');
    expect(SOURCE).not.toContain('background: rgba(0, 32, 96, 0.2);');
    expect(SOURCE).not.toContain('color: rgba(224,236,244,0.4);');
  });
});
