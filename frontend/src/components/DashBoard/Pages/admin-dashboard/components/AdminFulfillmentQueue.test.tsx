import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminFulfillmentQueue from './AdminFulfillmentQueue';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '../../../../../../..');

const mockAuthAxios = {
  get: vi.fn(),
  patch: vi.fn(),
};

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios }),
}));

const source = readFileSync(resolve(__dirname, './AdminFulfillmentQueue.tsx'), 'utf8');
const pendingOrdersSource = readFileSync(resolve(__dirname, './PendingOrdersAdminPanel.tsx'), 'utf8');
const dashboardRoutesSource = readFileSync(
  resolve(repoRoot, 'frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx'),
  'utf8',
);
const adminOrderRoutes = readFileSync(resolve(repoRoot, 'backend/routes/adminOrdersRoutes.mjs'), 'utf8');

const fulfillmentItem = {
  orderId: 900,
  orderNumber: 'SS-ORDER-900',
  orderItemId: 71,
  orderDate: '2026-06-13T12:00:00.000Z',
  customer: { id: 11, name: 'Buyer One', email: 'buyer@example.com' },
  product: { id: 20, name: 'Recovery Drink', itemType: 'physical_product' },
  variant: { id: 7, label: '16oz', sku: 'DRINK-16', stockQuantity: 1 },
  quantity: 2,
  price: 6.5,
  subtotal: 13,
  fulfillmentStatus: 'pending_fulfillment',
  fulfillment: {
    mode: 'local_delivery',
    type: 'local_delivery',
    details: {
      recipientName: 'Buyer One',
      phone: '555-0100',
      streetAddress: '100 Main St',
      city: 'Los Angeles',
      state: 'CA',
      postalCode: '90001',
      notes: 'Front desk',
    },
  },
};

describe('AdminFulfillmentQueue', () => {
  beforeEach(() => {
    mockAuthAxios.get.mockReset();
    mockAuthAxios.patch.mockReset();
    mockAuthAxios.get.mockResolvedValue({
      data: {
        success: true,
        items: [fulfillmentItem],
        stats: { pending: 1, fulfilled: 0, total: 1 },
      },
    });
    mockAuthAxios.patch.mockResolvedValue({ data: { success: true } });
  });

  it('is wired into the mounted pending-orders admin surface and mounted backend route', () => {
    expect(dashboardRoutesSource).toContain("{ path: '/pending-orders', component: PendingOrdersAdminPanel");
    expect(pendingOrdersSource).toContain("import AdminFulfillmentQueue from './AdminFulfillmentQueue'");
    expect(pendingOrdersSource).toContain('<AdminFulfillmentQueue />');
    expect(source).toContain("'/api/admin/orders/fulfillment'");
    expect(source).toContain('`/api/admin/orders/fulfillment-items/${item.orderItemId}/complete`');
    expect(adminOrderRoutes).toContain("router.get('/orders/fulfillment'");
  });

  it('renders variant, inventory, pickup/delivery, and customer detail from the queue', async () => {
    render(<AdminFulfillmentQueue />);

    expect(await screen.findByText('Physical Product Fulfillment')).toBeInTheDocument();
    expect(screen.getByText('Recovery Drink')).toBeInTheDocument();
    expect(screen.getByText(/16oz/)).toBeInTheDocument();
    expect(screen.getByText(/DRINK-16/)).toBeInTheDocument();
    expect(screen.getByText(/Stock: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Low inventory/)).toBeInTheDocument();
    expect(screen.getByText(/Local delivery/)).toBeInTheDocument();
    expect(screen.getByText(/100 Main St/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mark fulfilled/i })).toBeInTheDocument();
  });

  it('marks one fulfillment item complete through the mounted admin endpoint', async () => {
    render(<AdminFulfillmentQueue />);

    fireEvent.click(await screen.findByRole('button', { name: /mark fulfilled/i }));

    await waitFor(() => expect(mockAuthAxios.patch).toHaveBeenCalledWith(
      '/api/admin/orders/fulfillment-items/71/complete',
      expect.objectContaining({
        notes: 'Fulfilled from admin order queue',
      }),
    ));
  });
});
