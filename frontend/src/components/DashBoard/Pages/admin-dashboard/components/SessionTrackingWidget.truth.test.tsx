
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import SessionTrackingWidget from './SessionTrackingWidget';

const mockAuthAxios = {
  get: vi.fn(),
};

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios }),
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LAYOUT_SOURCE = readFileSync(resolve(process.cwd(), 'src/components/DashBoard/UniversalDashboardLayout.tsx'), 'utf8');
const ROUTE_COMPONENTS_SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/UniversalDashboardLayout.routeComponents.tsx'),
  'utf8',
);
const DASHBOARD_ROUTES_SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/UniversalDashboardLayout.routes.tsx'),
  'utf8',
);
const OVERVIEW_SOURCE = readFileSync(resolve(__dirname, '../overview/AdminOverviewPanel.tsx'), 'utf8');
const SOURCE = readFileSync(resolve(__dirname, './SessionTrackingWidget.tsx'), 'utf8');

describe('SessionTrackingWidget truth handling', () => {
  beforeEach(() => {
    mockAuthAxios.get.mockReset();
  });

  it('renders session values returned by the workout statistics API', async () => {
    mockAuthAxios.get.mockResolvedValueOnce({
      data: {
        data: {
          sessionsToday: 2,
          sessionsThisWeek: 5,
          sessionsThisMonth: 13,
          trainerUtilization: 75,
          avgDuration: 55,
          topClients: [{ name: 'Live Client', sessions: 4 }],
        },
      },
    });

    render(<SessionTrackingWidget />);

    await waitFor(() => expect(screen.getByText('Live Client')).toBeInTheDocument());
    expect(screen.getByText('13')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText(/Avg session:\s*55 min/i)).toBeInTheDocument();
    expect(screen.queryByText('Client A')).not.toBeInTheDocument();
  });

  it('shows unavailable state instead of demo session metrics when the API fails', async () => {
    mockAuthAxios.get.mockRejectedValueOnce(new Error('workout stats unavailable'));

    render(<SessionTrackingWidget />);

    await waitFor(() => expect(screen.getByText('Session tracking data could not be loaded.')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByText('Client A')).not.toBeInTheDocument();
    expect(screen.queryByText(/Avg session:\s*52 min/i)).not.toBeInTheDocument();
  });

  it('shows an empty top-client state instead of demo clients when no rows are returned', async () => {
    mockAuthAxios.get.mockResolvedValueOnce({
      data: {
        data: {
          sessionsToday: 0,
          sessionsThisWeek: 0,
          sessionsThisMonth: 0,
          trainerUtilization: 0,
          avgDuration: 0,
          topClients: [],
        },
      },
    });

    render(<SessionTrackingWidget />);

    await waitFor(() => expect(screen.getByText('No completed client session activity for this period.')).toBeInTheDocument());
    expect(screen.queryByText('Client A')).not.toBeInTheDocument();
  });

  it('does not retain demo session tracking fixtures', () => {
    expect(SOURCE).not.toContain('const DEMO');
    expect(SOURCE).not.toMatch(/Client A|Client B|trainerUtilization:\s*78|avgDuration:\s*52/);
  });

  it('is mounted by the canonical admin overview route', () => {
    expect(LAYOUT_SOURCE).toContain("from './UniversalDashboardLayout.routes'");
    expect(ROUTE_COMPONENTS_SOURCE).toContain("export const RevolutionaryAdminDashboard = React.lazy(() => import('./Pages/admin-dashboard/admin-dashboard-view'))");
    expect(DASHBOARD_ROUTES_SOURCE).toContain("{ path: '/overview', component: RevolutionaryAdminDashboard");
    expect(OVERVIEW_SOURCE).toContain("import SessionTrackingWidget from '../components/SessionTrackingWidget'");
    expect(OVERVIEW_SOURCE).toContain('<BentoHalf><WidgetErrorBoundary name="Session tracking"><SessionTrackingWidget /></WidgetErrorBoundary></BentoHalf>');
    expect(SOURCE).toContain("authAxios.get('/api/admin/analytics/statistics/workouts')");
  });

  it('bridges session cards and rank fallbacks to Crystalline Swan theme tokens', () => {
    expect(SOURCE).toContain("const SESSION_SECONDARY = 'var(--accent-secondary, #8B5CF6)';");
    expect(SOURCE).toContain("const SESSION_GOLD = 'var(--accent-gold, #C6A84B)';");
    expect(SOURCE).toContain("const sessionRankFallbackBackground = 'var(--surface-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 5%, transparent))';");
    expect(SOURCE).toContain("const sessionRankFallbackColor = 'var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 50%, transparent))';");
    expect(SOURCE).toContain('background: color-mix(in srgb, var(--royal-depth, #003080) 30%, transparent);');
    expect(SOURCE).toContain('border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);');
    expect(SOURCE).toContain('background: color-mix(in srgb, var(--warning, #F59E0B) 14%, transparent);');
    expect(SOURCE).toContain('border: 1px solid color-mix(in srgb, var(--warning, #F59E0B) 26%, transparent);');
    expect(SOURCE).toContain('background: ${p => p.$isTop ? `color-mix(in srgb, ${SESSION_GOLD} 20%, transparent)` : sessionRankFallbackBackground};');
    expect(SOURCE).toContain('color: ${p => p.$isTop ? SESSION_GOLD : sessionRankFallbackColor};');
    expect(SOURCE).not.toContain('CHART_COLORS');
    expect(SOURCE).not.toContain('hexAlpha');
    expect(SOURCE).not.toContain('rgba(');
    expect(SOURCE).not.toContain('background: rgba(0, 32, 96, 0.3);');
    expect(SOURCE).not.toContain('border: 1px solid rgba(96, 192, 240, 0.08);');
    expect(SOURCE).not.toContain('background: rgba(198, 168, 75, 0.12);');
    expect(SOURCE).not.toContain('border: 1px solid rgba(198, 168, 75, 0.24);');
    expect(SOURCE).not.toContain(" : 'rgba(255,255,255,0.05)'");
    expect(SOURCE).not.toContain(" : 'rgba(224,236,244,0.5)'");
  });
});
