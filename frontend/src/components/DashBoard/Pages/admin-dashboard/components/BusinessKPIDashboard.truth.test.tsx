import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import BusinessKPIDashboard from './BusinessKPIDashboard';

const mockAuthAxios = {
  get: vi.fn(),
};

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios }),
}));

vi.mock('../admin-dashboard-view', () => ({
  CommandCard: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SOURCE_PATH = resolve(__dirname, './BusinessKPIDashboard.tsx');
const STYLE_PATH = resolve(__dirname, './BusinessKPIDashboard.styles.ts');
const SOURCE = readFileSync(SOURCE_PATH, 'utf8');
const STYLE_SOURCE = existsSync(STYLE_PATH) ? readFileSync(STYLE_PATH, 'utf8') : '';
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
const COMBINED_SOURCE = `${SOURCE}\n${STYLE_SOURCE}`;
const lineCount = (value: string) => value.split(/\r?\n/).length;

describe('BusinessKPIDashboard truth handling', () => {
  beforeEach(() => {
    mockAuthAxios.get.mockReset();
  });

  it('renders KPI values returned by the business KPI API', async () => {
    mockAuthAxios.get.mockResolvedValueOnce({
      data: {
        data: {
          mrr: 1234,
          mrrChange: 5,
          totalRevenue: 5678,
          revenueChange: 0,
          activeClients: 9,
          newClients: 2,
          churnedClients: 1,
          churnRate: 11.1,
          sessionUtilization: 75,
          avgLTV: 631,
          avgRevenuePerClient: 137,
          sessionsThisMonth: 6,
          sessionsLastMonth: 4,
          revenueSparkline: [100, 200],
          clientSparkline: [8, 9],
        },
      },
    });

    render(<BusinessKPIDashboard />);

    await waitFor(() => expect(screen.getByText('$1,234')).toBeInTheDocument());
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.queryByText('$8,750')).not.toBeInTheDocument();
  });

  it('shows unavailable state instead of demo KPIs when the API fails', async () => {
    mockAuthAxios.get.mockRejectedValueOnce(new Error('analytics unavailable'));

    render(<BusinessKPIDashboard />);

    await waitFor(() => expect(screen.getByText('Business KPI data could not be loaded.')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByText('$8,750')).not.toBeInTheDocument();
    expect(screen.queryByText('$26,250')).not.toBeInTheDocument();
    expect(screen.queryByText('$2,840')).not.toBeInTheDocument();
  });

  it('does not retain demo business KPI data', () => {
    expect(SOURCE).not.toContain('buildDemoData');
    expect(SOURCE).not.toMatch(/8750|26250|2840|sessionUtilization:\s*78/);
  });

  it('keeps behavior separate from extracted dashboard styling', () => {
    expect(SOURCE).toContain("from './BusinessKPIDashboard.styles'");
    expect(existsSync(STYLE_PATH)).toBe(true);
    expect(lineCount(SOURCE)).toBeLessThanOrEqual(300);
    expect(lineCount(STYLE_SOURCE)).toBeLessThanOrEqual(300);
  });

  it('is mounted by the canonical admin overview route', () => {
    expect(LAYOUT_SOURCE).toContain("from './UniversalDashboardLayout.routes'");
    expect(ROUTE_COMPONENTS_SOURCE).toContain("export const RevolutionaryAdminDashboard = React.lazy(() => import('./Pages/admin-dashboard/admin-dashboard-view'))");
    expect(DASHBOARD_ROUTES_SOURCE).toContain("{ path: '/overview', component: RevolutionaryAdminDashboard");
    expect(OVERVIEW_SOURCE).toContain("import BusinessKPIDashboard from '../components/BusinessKPIDashboard'");
    expect(OVERVIEW_SOURCE).toContain('<BentoHalf><WidgetErrorBoundary name="Business KPIs"><BusinessKPIDashboard /></WidgetErrorBoundary></BentoHalf>');
    expect(SOURCE).toContain("authAxios.get('/api/admin/analytics/business-kpis'");
  });

  it('uses theme tokens for KPI colors instead of fixed widget colors', () => {
    expect(COMBINED_SOURCE).toContain("const KPI_SUCCESS = 'var(--success, #10B981)'");
    expect(COMBINED_SOURCE).toContain("const KPI_INFO = 'var(--accent-tertiary, #4070C0)'");
    expect(COMBINED_SOURCE).toContain("const KPI_WARNING = 'var(--warning, #F59E0B)'");
    expect(COMBINED_SOURCE).toContain("const KPI_ERROR = 'var(--error, #EF4444)'");
    expect(COMBINED_SOURCE).toContain("const KPI_GOLD = 'var(--accent-gold, #C6A84B)'");
    expect(COMBINED_SOURCE).toContain("const KPI_PRIMARY = 'var(--accent-primary, #60C0F0)'");
    expect(COMBINED_SOURCE).toContain("const TEXT_MUTED = 'var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 62%, transparent))'");
    expect(COMBINED_SOURCE).toContain('color-mix(in srgb, ${p => p.$color} 22%, transparent)');
    expect(COMBINED_SOURCE).not.toContain('rgba(');
    expect(COMBINED_SOURCE).not.toContain("color: '#10b981'");
    expect(COMBINED_SOURCE).not.toContain("color: '#3b82f6'");
    expect(COMBINED_SOURCE).not.toContain("color: '#8B5CF6'");
    expect(COMBINED_SOURCE).not.toContain("color: d.churnRate > 5 ? '#ef4444' : '#f59e0b'");
    expect(COMBINED_SOURCE).not.toContain("color: '#60C0F0'");
    expect(COMBINED_SOURCE).not.toContain("color: '#C6A84B'");
    expect(COMBINED_SOURCE).not.toContain('color: #f0f0ff;');
    expect(COMBINED_SOURCE).not.toContain("$positive ? '#10b981' : '#ef4444'");
  });
});
