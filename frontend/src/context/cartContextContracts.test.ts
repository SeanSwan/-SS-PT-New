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

describe('getCartErrorMessage — no raw transport strings in the cart panel', () => {
  const axiosErr = (data: unknown, message: string) => Object.assign(new Error(message), {
    isAxiosError: true,
    response: { status: 500, data },
  });

  it('prefers server-authored copy (e.g. the quantity ceiling)', () => {
    const err = axiosErr(
      { message: 'Quantity must be 99 or fewer per item. For a larger order, please contact us.' },
      'Request failed with status code 400'
    );
    expect(getCartErrorMessage(err, 'fallback')).toMatch(/99 or fewer/);
  });

  it('never surfaces "Request failed with status code 500" to a buyer', () => {
    const err = axiosErr({}, 'Request failed with status code 500');
    expect(getCartErrorMessage(err, 'We could not update your cart.')).toBe('We could not update your cart.');
  });

  it('never surfaces a bare "Network Error"', () => {
    const err = Object.assign(new Error('Network Error'), { isAxiosError: true, response: undefined });
    expect(getCartErrorMessage(err, 'We could not reach the cart.')).toBe('We could not reach the cart.');
  });

  it('never surfaces an axios timeout string', () => {
    const err = Object.assign(new Error('timeout of 30000ms exceeded'), { isAxiosError: true, response: undefined });
    expect(getCartErrorMessage(err, 'fallback')).toBe('fallback');
  });

  it('STILL shows intentional copy thrown by our own code', () => {
    const err = new Error('Please login to add items to cart');
    expect(getCartErrorMessage(err, 'fallback')).toBe('Please login to add items to cart');
  });
});
