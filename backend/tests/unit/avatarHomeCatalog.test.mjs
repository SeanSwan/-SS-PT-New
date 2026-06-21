import { describe, expect, it } from 'vitest';
import { FURNITURE_TIERS, HOME_TIER_LEVELS, MARKETPLACE_CATALOG } from '../../utils/avatarHomeCatalog.mjs';
import { registerAvatarHomeMarketplaceRoutes } from '../../utils/avatarHomeMarketplaceRoutes.mjs';

describe('avatarHomeCatalog', () => {
  it('exports the home tier thresholds used by Avatar Home metadata', () => {
    expect(HOME_TIER_LEVELS).toEqual({ starter: 10, mid: 25, premium: 50, luxury: 100 });
  });

  it('keeps furniture tiers keyed by valid Avatar Home rooms', () => {
    expect(Object.keys(FURNITURE_TIERS).sort()).toEqual(['bedroom', 'kitchen', 'training_room']);
    expect(FURNITURE_TIERS.training_room.equipment).toContain('elite_gym');
  });

  it('keeps marketplace catalog item ids unique and priced', () => {
    const ids = MARKETPLACE_CATALOG.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(MARKETPLACE_CATALOG.every((item) => item.price > 0 && item.rarity)).toBe(true);
  });

  it('registers marketplace endpoints on the supplied router', () => {
    const calls = [];
    const router = {
      get: (path) => calls.push(['GET', path]),
      post: (path) => calls.push(['POST', path]),
    };

    registerAvatarHomeMarketplaceRoutes(router, {
      requireUnlockedHome: async () => ({ home: null, status: 404, error: 'missing' }),
      logger: { info: () => {}, error: () => {} },
    });

    expect(calls).toEqual([
      ['GET', '/marketplace'],
      ['GET', '/crystals'],
      ['POST', '/marketplace/purchase'],
      ['POST', '/marketplace/equip'],
    ]);
  });
});
