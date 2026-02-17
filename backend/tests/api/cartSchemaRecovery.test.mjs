import { describe, expect, it, vi } from 'vitest';
import { safeFindOrCreateActiveCart } from '../../utils/cartSchemaRecovery.mjs';

describe('cart schema recovery', () => {
  it('falls back to raw SQL when model query fails on missing column', async () => {
    const modelError = new Error('column "sessionsGranted" does not exist');
    modelError.parent = { code: '42703', message: modelError.message };

    const query = vi
      .fn()
      // Resolve userId column name
      .mockResolvedValueOnce([[{ column_name: 'userId' }]])
      // Existing cart lookup -> empty
      .mockResolvedValueOnce([[]])
      // Insert fallback cart
      .mockResolvedValueOnce([[{ id: 77, status: 'active' }]]);

    const ShoppingCart = {
      findOrCreate: vi.fn().mockRejectedValue(modelError),
      sequelize: { query }
    };

    const [cart, created] = await safeFindOrCreateActiveCart(
      ShoppingCart,
      '12',
      { warn: vi.fn(), error: vi.fn(), info: vi.fn() }
    );

    expect(created).toBe(true);
    expect(cart.id).toBe(77);
    expect(cart.status).toBe('active');
    expect(cart.userId).toBe(12);
    expect(ShoppingCart.findOrCreate).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledTimes(3);
  });
});
