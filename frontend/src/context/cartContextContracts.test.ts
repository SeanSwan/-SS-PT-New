import { describe, expect, it } from 'vitest';
import {
  getCartErrorMessage,
  normalizeCartResponse,
  parsePositiveCartInteger,
} from './cartContextContracts';

describe('cart context contracts', () => {
  it('normalizes Sequelize decimal strings at the API boundary', () => {
    const cart = normalizeCartResponse({
      id: 12,
      status: 'active',
      items: [{
        id: 9,
        quantity: 2,
        price: '19.95',
        storefrontItemId: 42,
        productVariantId: null,
        storefrontItem: {
          name: 'Four-session package',
          description: 'Training package',
          type: 'package',
          sessions: 4,
        },
      }],
      total: '39.90',
      totalSessions: '8',
      itemCount: 999,
    });

    expect(cart).toMatchObject({
      id: 12,
      status: 'active',
      total: 39.9,
      totalSessions: 8,
      itemCount: 1,
    });
    expect(cart?.items[0]).toMatchObject({ price: 19.95, quantity: 2 });
  });

  it('rejects malformed cart envelopes instead of storing partial data', () => {
    expect(normalizeCartResponse({ id: 1, status: 'active', items: 'bad' })).toBeNull();
    expect(normalizeCartResponse({
      id: 1,
      status: 'active',
      items: [{ id: 2, quantity: 1, price: 'not-money', storefrontItemId: 3 }],
      total: 0,
    })).toBeNull();
  });

  it('preserves a safe server message without exposing the raw Axios object', () => {
    const error = {
      isAxiosError: true,
      message: 'Request failed',
      response: { data: { message: 'This item is sold out.' } },
      config: { headers: { Authorization: 'Bearer secret' } },
    };

    expect(getCartErrorMessage(error, 'Fallback')).toBe('This item is sold out.');
    expect(getCartErrorMessage(new Error('Offline'), 'Fallback')).toBe('Offline');
    expect(getCartErrorMessage({ reason: 'unknown' }, 'Fallback')).toBe('Fallback');
  });

  it('accepts only positive whole-number identifiers and quantities', () => {
    expect(parsePositiveCartInteger('7')).toBe(7);
    expect(parsePositiveCartInteger(2)).toBe(2);
    expect(parsePositiveCartInteger(0)).toBeNull();
    expect(parsePositiveCartInteger(-1)).toBeNull();
    expect(parsePositiveCartInteger('2.5')).toBeNull();
  });
});
