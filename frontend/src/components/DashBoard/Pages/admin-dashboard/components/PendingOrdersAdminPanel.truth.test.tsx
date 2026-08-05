import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PendingOrdersAdminPanel from './PendingOrdersAdminPanel';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '../../../../../../..');

const mockAuthAxios = {
  get: vi.fn(),
  post: vi.fn(),
};

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios }),
}));

const source = readFileSync(resolve(__dirname, './PendingOrdersAdminPanel.tsx'), 'utf8');
const layoutSource = readFileSync(
  resolve(repoRoot, 'frontend/src/components/DashBoard/UniversalDashboardLayout.tsx'),
  'utf8',
);
const routeComponentsSource = readFileSync(
  resolve(repoRoot, 'frontend/src/components/DashBoard/UniversalDashboardLayout.routeComponents.tsx'),
  'utf8',
);
const dashboardRoutesSource = readFileSync(
  resolve(repoRoot, 'frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx'),
  'utf8',
);
const coreRoutes = readFileSync(resolve(repoRoot, 'backend/core/routes.mjs'), 'utf8');
const adminOrdersRoutes = readFileSync(resolve(repoRoot, 'backend/routes/adminOrdersRoutes.mjs'), 'utf8');

const makeOrder = (overrides = {}) => ({
  id: 42,
  userId: 9,
  status: 'pending_payment',
  checkoutSessionId: 'cs_test_pending_order',
  total: '240.00',
  totalAmount: '240.00',
  createdAt: '2026-05-23T12:00:00.000Z',
  expiresAt: '2026-05-24T12:00:00.000Z',
  user: {
    id: 9,
    firstName: 'Private',
    lastName: 'Client',
    email: 'private@example.com',
  },
  cartItems: [
    {
      id: 70,
      quantity: 1,
      price: '240.00',
      storefrontItem: {
        id: 4,
        name: 'Gold Training Package',
        sessions: 8,
      },
    },
  ],
  ...overrides,
});

const okOrders = (orders: unknown[]) => Promise.resolve({ data: { success: true, orders } });

describe('PendingOrdersAdminPanel truth handling', () => {
  beforeEach(() => {
    mockAuthAxios.get.mockReset();
    mockAuthAxios.post.mockReset();
    mockAuthAxios.get.mockImplementation((url: string) => {
      if (url === '/api/admin/orders/pending') return okOrders([makeOrder()]);
      if (url === '/api/admin/orders/completed') return okOrders([]);
      if (url === '/api/admin/orders/fulfillment') {
        return Promise.resolve({ data: { success: true, items: [], stats: { pending: 0, fulfilled: 0, total: 0 } } });
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });
    mockAuthAxios.post.mockResolvedValue({ data: { success: true } });
  });

  it('is mounted by the admin dashboard and backed by mounted admin order routes', () => {
    expect(layoutSource).toContain("from './UniversalDashboardLayout.routes'");
    expect(routeComponentsSource).toContain("export const PendingOrdersAdminPanel = React.lazy(() => import('./Pages/admin-dashboard/components/PendingOrdersAdminPanel'))");
    expect(dashboardRoutesSource).toContain("{ path: '/pending-orders', component: PendingOrdersAdminPanel");
    expect(coreRoutes).toContain("app.use('/api/admin', adminOrdersRoutes)");
    expect(adminOrdersRoutes).toContain("router.get('/orders/pending'");
    expect(adminOrdersRoutes).toContain("router.get('/orders/completed'");
    expect(adminOrdersRoutes).toContain("router.post('/orders/:id(\\\\d+)/complete'");
    expect(source).toContain("'/api/admin/orders/pending'");
    expect(source).toContain("'/api/admin/orders/completed'");
    expect(source).toContain("authAxios.post(`/api/admin/orders/${orderId}/complete`");
  });

  it('normalizes backend pending_payment carts into actionable pending orders', async () => {
    render(<PendingOrdersAdminPanel />);

    expect(await screen.findByText('#42')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mark paid/i })).toBeInTheDocument();
  });

  it('uses the mounted admin completion endpoint when an admin marks a cart paid', async () => {
    mockAuthAxios.get.mockImplementation((url: string) => {
      if (url === '/api/admin/orders/pending') return okOrders([makeOrder({ status: 'pending' })]);
      if (url === '/api/admin/orders/completed') return okOrders([]);
      if (url === '/api/admin/orders/fulfillment') {
        return Promise.resolve({ data: { success: true, items: [], stats: { pending: 0, fulfilled: 0, total: 0 } } });
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    render(<PendingOrdersAdminPanel />);

    fireEvent.click(await screen.findByRole('button', { name: /mark paid/i }));

    await waitFor(() => expect(mockAuthAxios.post).toHaveBeenCalledWith(
      '/api/admin/orders/42/complete',
      expect.objectContaining({
        adminNotes: 'Manually verified payment',
      }),
    ));
  });

  it('shows a partial warning when all-orders mode cannot load completed orders', async () => {
    mockAuthAxios.get.mockImplementation((url: string) => {
      if (url === '/api/admin/orders/pending') return okOrders([makeOrder()]);
      if (url === '/api/admin/orders/completed') return Promise.reject(new Error('completed down'));
      if (url === '/api/admin/orders/fulfillment') {
        return Promise.resolve({ data: { success: true, items: [], stats: { pending: 0, fulfilled: 0, total: 0 } } });
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    render(<PendingOrdersAdminPanel />);

    expect(await screen.findByText('Completed orders unavailable. The list below may exclude completed orders.')).toBeInTheDocument();
    expect(screen.getByText('#42')).toBeInTheDocument();
  });

  it('only sends sort fields accepted by the admin orders backend validator', async () => {
    render(<PendingOrdersAdminPanel />);

    await screen.findByText('#42');
    fireEvent.change(screen.getByDisplayValue('Created Date'), {
      target: { value: 'total' },
    });

    await waitFor(() => expect(mockAuthAxios.get).toHaveBeenCalledWith(
      '/api/admin/orders/pending',
      expect.objectContaining({
        params: expect.objectContaining({ sortBy: 'total' }),
      }),
    ));
  });

  it('keeps source guards against silent partial failures and status drift', () => {
    // SWA-138 S6: mapping/normalization moved to the .logic module (Rule 4 split).
    const logicSource = readFileSync(resolve(__dirname, './PendingOrdersAdminPanel.logic.ts'), 'utf8');
    expect(source).toContain("from './PendingOrdersAdminPanel.logic'");
    expect(logicSource).toContain('normalizeOrderStatus');
    expect(logicSource).toContain("case 'pending_payment':");
    expect(logicSource).toContain("case 'active':");
    expect(source).toContain('const [partialWarning, setPartialWarning]');
    expect(source).toContain('<option value="total">Amount</option>');
    expect(source).toContain('<option value="status">Status</option>');
    expect(source).not.toContain('<option value="amount">Amount</option>');
    expect(source).not.toContain('<option value="customer">Customer</option>');
    expect(source).not.toContain('Completed endpoint may not exist yet');
  });
});
