/**
 * Cart session count == granted session count (Lane 4 audit, hostile round 25)
 * ============================================================================
 * The session count shown in the cart and the count actually credited after
 * payment used to come from two different implementations. cartHelpers keyed on
 * `typeof … === 'number'`, which disagrees with the grant helper:
 *
 *   sessions: 0, totalSessions: 48 -> cart showed 0, grant credited 48
 *     (0 IS a number, so the old branch was taken and totalSessions never
 *      considered — a monthly package rendering as "$8,400 for 0 sessions")
 *   sessions: '8' (string)         -> cart showed 0, grant credited 8
 *
 * Neither overcharges, but a cart that disagrees with what the buyer receives is
 * a truth defect and, at 0, a conversion defect. cartHelpers now calls the same
 * canonical helper the grant uses.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../models/index.mjs', () => ({
  getShoppingCart: () => ({ name: 'ShoppingCart' }),
  getCartItem: () => ({ name: 'CartItem' }),
  getStorefrontItem: () => ({ name: 'StorefrontItem' }),
  getUser: () => ({ name: 'User' }),
}));
vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { calculateCartTotals } = await import('../../utils/cartHelpers.mjs');
const { getStorefrontSessionCredits, calculateCartSessionCredits } =
  await import('../../services/SessionGrantService.mjs');

const item = (storefrontItem, quantity = 1, price = '175.00') => ({
  id: 1, storefrontItemId: 9, price, quantity, storefrontItem,
});

describe('cart session count agrees with what is actually granted', () => {
  it.each([
    ['fixed package', { sessions: 8, totalSessions: null }],
    ['monthly package (sessions null)', { sessions: null, totalSessions: 48 }],
    ['sessions 0 with totalSessions 48', { sessions: 0, totalSessions: 48 }],
    ['sessions as a string', { sessions: '8', totalSessions: null }],
    ['neither set', { sessions: null, totalSessions: null }],
  ])('%s: displayed == credited', (_label, sf) => {
    const cartItems = [item(sf)];

    const displayed = calculateCartTotals(cartItems).totalSessions;
    const credited = calculateCartSessionCredits(cartItems);

    expect(displayed).toBe(credited);
  });

  it('the regression case specifically: sessions 0 must display 48, not 0', () => {
    const cartItems = [item({ sessions: 0, totalSessions: 48 })];
    expect(calculateCartTotals(cartItems).totalSessions).toBe(48);
  });

  it('multiplies by quantity the same way the grant does', () => {
    const cartItems = [item({ sessions: 8, totalSessions: null }, 3)];
    expect(calculateCartTotals(cartItems).totalSessions).toBe(24);
    expect(calculateCartSessionCredits(cartItems)).toBe(24);
  });

  it('the audit breakdown reports the same per-item credit as the grant helper', () => {
    const sf = { sessions: 0, totalSessions: 48 };
    const { itemBreakdown } = calculateCartTotals([item(sf, 2)]);
    expect(itemBreakdown[0].sessionsPerItem).toBe(getStorefrontSessionCredits(sf));
    expect(itemBreakdown[0].totalSessionsForItem).toBe(96);
  });

  it('still totals money correctly alongside the session change', () => {
    const { total } = calculateCartTotals([item({ sessions: 8 }, 2, '175.00')]);
    expect(total).toBe(350);
  });
});
