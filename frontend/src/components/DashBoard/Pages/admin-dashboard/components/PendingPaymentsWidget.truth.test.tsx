import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PendingPaymentsWidget from './PendingPaymentsWidget';

const mockAuthAxios = {
  get: vi.fn(),
  post: vi.fn(),
};

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios }),
}));

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/components/PendingPaymentsWidget.tsx'),
  'utf8',
);
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
const STYLE_PATH = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-dashboard/components/PendingPaymentsWidget.styles.ts',
);
const readStyleSource = () => (existsSync(STYLE_PATH) ? readFileSync(STYLE_PATH, 'utf8') : '');

describe('PendingPaymentsWidget truth and accessibility', () => {
  beforeEach(() => {
    mockAuthAxios.get.mockReset();
    mockAuthAxios.post.mockReset();
    mockAuthAxios.get.mockResolvedValue({
      data: {
        orders: [
          {
            id: 7,
            orderNumber: 'SS-20260523-ABC123',
            totalAmount: '120.00',
            paymentMethod: 'zelle',
            status: 'pending',
            billingName: 'Private Client',
            billingEmail: null,
            createdAt: '2026-05-23T12:00:00.000Z',
          },
        ],
      },
    });
  });

  it('renders pending offline payments from /api/orders with named actions', async () => {
    render(<PendingPaymentsWidget />);

    expect(await screen.findByText('SS-20260523-ABC123')).toBeInTheDocument();
    expect(mockAuthAxios.get).toHaveBeenCalledWith('/api/orders', {
      params: { status: 'pending', limit: 50 },
    });
    expect(screen.getByRole('button', { name: /refresh pending payments/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm payment for ss-20260523-abc123/i })).toBeInTheDocument();
  });

  it('keeps admin payment controls at 44px minimum touch targets', () => {
    const combinedSource = `${SOURCE}\n${readStyleSource()}`;
    expect(combinedSource).toMatch(/const RefreshBtn[\s\S]*min-height:\s*44px/);
    expect(combinedSource).toMatch(/const ConfirmBtn[\s\S]*min-height:\s*44px/);
  });

  it('shows unavailable state instead of disappearing when pending orders fail to load', async () => {
    mockAuthAxios.get.mockRejectedValueOnce(new Error('orders unavailable'));

    render(<PendingPaymentsWidget />);

    expect(await screen.findByText('Pending payments unavailable.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry pending payments/i })).toBeInTheDocument();
  });

  it('keeps the order visible and reports a failed payment confirmation', async () => {
    mockAuthAxios.post.mockRejectedValueOnce(new Error('confirm failed'));

    render(<PendingPaymentsWidget />);

    fireEvent.click(await screen.findByRole('button', { name: /confirm payment for ss-20260523-abc123/i }));

    await waitFor(() => expect(screen.getByText('Payment confirmation failed.')).toBeInTheDocument());
    expect(screen.getByText('SS-20260523-ABC123')).toBeInTheDocument();
  });

  it('does not keep silent catch blocks for payment operations', () => {
    expect(SOURCE).not.toContain('// silent');
    expect(SOURCE).toContain('const [loadError, setLoadError]');
    expect(SOURCE).toContain('const [confirmError, setConfirmError]');
  });

  it('is mounted by the canonical admin overview route', () => {
    expect(LAYOUT_SOURCE).toContain("from './UniversalDashboardLayout.routes'");
    expect(ROUTE_COMPONENTS_SOURCE).toContain("export const RevolutionaryAdminDashboard = React.lazy(() => import('./Pages/admin-dashboard/admin-dashboard-view'))");
    expect(DASHBOARD_ROUTES_SOURCE).toContain("{ path: '/overview', component: RevolutionaryAdminDashboard");
    expect(OVERVIEW_SOURCE).toContain("import PendingPaymentsWidget from '../components/PendingPaymentsWidget'");
    expect(OVERVIEW_SOURCE).toContain('<BentoThird><WidgetErrorBoundary name="Pending payments"><PendingPaymentsWidget /></WidgetErrorBoundary></BentoThird>');
    expect(SOURCE).toContain("authAxios.get('/api/orders'");
  });

  it('splits styled components and bridges offline payment states to theme tokens', () => {
    expect(SOURCE).toContain("from './PendingPaymentsWidget.styles'");
    expect(SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(existsSync(STYLE_PATH)).toBe(true);

    const styleSource = readStyleSource();
    expect(styleSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(styleSource).toContain('color-mix(in srgb, var(--accent-gold, #C6A84B) 20%, transparent)');
    expect(styleSource).toContain('var(--accent-secondary, #8B5CF6)');
    expect(styleSource).toContain('var(--success, #22C55E)');
    expect(styleSource).toContain('var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 50%, transparent))');
    expect(styleSource).not.toContain('rgba(');
    expect(styleSource).not.toContain('background: rgba(0, 32, 96, 0.45);');
    expect(styleSource).not.toContain("p.$method === 'zelle' ? '#8B5CF6'");
    expect(styleSource).not.toContain('background: rgba(34, 197, 94, 0.1);');
  });
});
