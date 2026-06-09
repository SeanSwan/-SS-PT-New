import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  order: { findOne: vi.fn() },
  orderItem: {},
  storefrontItem: { findAll: vi.fn() },
  user: { findByPk: vi.fn() },
  session: { bulkCreate: vi.fn() },
  financialTransaction: { create: vi.fn() },
}));

vi.mock('../../models/index.mjs', () => ({
  getOrder: () => mocks.order,
  getOrderItem: () => mocks.orderItem,
  getStorefrontItem: () => mocks.storefrontItem,
  getUser: () => mocks.user,
  getSession: () => mocks.session,
  getFinancialTransaction: () => mocks.financialTransaction,
}));

const { SessionAllocationService } = await import('../../services/SessionAllocationService.mjs');

describe('SessionAllocationService offline payment note fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.order.findOne.mockResolvedValue({
      id: 91,
      userId: 42,
      orderNumber: 'SS-20260609-LEGACY',
      totalAmount: '200.00',
      paymentMethod: 'zelle',
      status: 'completed',
      orderItems: [],
      notes: JSON.stringify({
        type: 'offline_payment',
        items: [
          { storefrontItemId: 10, quantity: 2, name: 'Ten Session Pack' },
        ],
      }),
    });
    mocks.user.findByPk.mockResolvedValue({
      id: 42,
      firstName: 'Private',
      lastName: 'Client',
    });
    mocks.storefrontItem.findAll.mockResolvedValue([
      {
        id: 10,
        name: 'Ten Session Pack',
        packageType: 'fixed',
        sessions: 10,
        totalSessions: null,
        price: '100.00',
      },
    ]);
    mocks.session.bulkCreate.mockImplementation(async (sessions) =>
      sessions.map((session, index) => ({ id: index + 1, ...session }))
    );
    mocks.financialTransaction.create.mockResolvedValue({ id: 501 });
  });

  it('allocates sessions for legacy offline orders whose items only exist in notes', async () => {
    const service = new SessionAllocationService();

    const result = await service.allocateSessionsFromOrder(91, 42);

    expect(result.success).toBe(true);
    expect(result.allocated).toBe(20);
    expect(result.totalSessions).toBe(20);
    expect(mocks.storefrontItem.findAll).toHaveBeenCalledWith({
      where: { id: [10] },
    });
    expect(mocks.session.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          userId: 42,
          status: 'available',
        }),
      ]),
      { returning: true },
    );
    expect(mocks.session.bulkCreate.mock.calls[0][0]).toHaveLength(20);
  });

  it('allocates sessions for legacy ACH orders whose items only exist in notes', async () => {
    mocks.order.findOne.mockResolvedValueOnce({
      id: 92,
      userId: 42,
      orderNumber: 'SS-20260609-ACH-LEGACY',
      totalAmount: '200.00',
      paymentMethod: 'ach',
      status: 'completed',
      orderItems: [],
      notes: JSON.stringify({
        items: [
          { storefrontItemId: 10, quantity: 2, name: 'Ten Session Pack' },
        ],
      }),
    });
    const service = new SessionAllocationService();

    const result = await service.allocateSessionsFromOrder(92, 42);

    expect(result.success).toBe(true);
    expect(result.allocated).toBe(20);
    expect(result.totalSessions).toBe(20);
  });
});
