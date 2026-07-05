import { MARKETPLACE_CATALOG } from './avatarHomeCatalog.mjs';
import {
  buildMarketplaceEquipUpdate,
  buildMarketplacePurchaseUpdate,
  normalizeCrystalBalance,
  normalizeMarketplaceItemId,
  normalizeOwnedMarketplaceItems,
} from './avatarHomeMarketplaceState.mjs';

function buildSwanCoinBalancePayload(home) {
  const balance = normalizeCrystalBalance(home.crystalBalance);
  return {
    balance,
    swanCoins: balance,
    currencyName: 'SwanCoins',
    legacyCurrencyName: 'Crystals',
    legacyField: 'crystalBalance',
    ownedItems: normalizeOwnedMarketplaceItems(home.ownedItems),
  };
}

export function registerAvatarHomeMarketplaceRoutes(router, { requireUnlockedHome, logger }) {
  router.get('/marketplace', async (_req, res) => {
    res.json({ success: true, data: MARKETPLACE_CATALOG });
  });

  router.get('/crystals', async (req, res) => {
    try {
      const { home, error, status } = await requireUnlockedHome(req.user.id);
      if (!home) return res.status(status).json({ success: false, message: error });
      res.json({
        success: true,
        data: buildSwanCoinBalancePayload(home),
      });
    } catch (err) {
      logger.error('SwanCoin balance error:', err.message);
      res.status(500).json({ success: false, message: 'Failed to fetch balance' });
    }
  });

  router.get('/swan-coins', async (req, res) => {
    try {
      const { home, error, status } = await requireUnlockedHome(req.user.id);
      if (!home) return res.status(status).json({ success: false, message: error });
      res.json({
        success: true,
        data: buildSwanCoinBalancePayload(home),
      });
    } catch (err) {
      logger.error('SwanCoin balance error:', err.message);
      res.status(500).json({ success: false, message: 'Failed to fetch SwanCoin balance' });
    }
  });

  router.post('/marketplace/purchase', async (req, res) => {
    const itemId = normalizeMarketplaceItemId(req.body?.itemId);
    if (!itemId) return res.status(400).json({ success: false, message: 'itemId required' });

    const catalogItem = MARKETPLACE_CATALOG.find((item) => item.id === itemId);
    if (!catalogItem) return res.status(404).json({ success: false, message: 'Item not found in catalog' });

    try {
      const { home, error, status } = await requireUnlockedHome(req.user.id);
      if (!home) return res.status(status).json({ success: false, message: error });

      const purchase = buildMarketplacePurchaseUpdate({
        catalogItem,
        ownedItems: home.ownedItems,
        crystalBalance: home.crystalBalance,
      });
      if (purchase.error) {
        return res.status(purchase.status).json({ success: false, message: purchase.error });
      }

      await home.update(purchase.updates);

      logger.info(`[AUDIT] User ${req.user.id} purchased "${catalogItem.name}" for ${catalogItem.price} SwanCoins`);
      res.json({
        success: true,
        data: {
          ...purchase.data,
          swanCoins: purchase.data.swanCoins,
          balance: purchase.data.balance,
          currencyName: 'SwanCoins',
          legacyField: 'crystalBalance',
        },
      });
    } catch (err) {
      logger.error('Marketplace purchase error:', err.message);
      res.status(500).json({ success: false, message: 'Purchase failed' });
    }
  });

  router.post('/marketplace/equip', async (req, res) => {
    const { itemId, target } = req.body;
    if (!itemId) return res.status(400).json({ success: false, message: 'itemId required' });

    try {
      const { home, error, status } = await requireUnlockedHome(req.user.id);
      if (!home) return res.status(status).json({ success: false, message: error });

      const equip = buildMarketplaceEquipUpdate({ ownedItems: home.ownedItems, itemId, target });
      if (equip.error) return res.status(equip.status).json({ success: false, message: equip.error });

      await home.update(equip.updates);
      res.json({ success: true, data: equip.data });
    } catch (err) {
      logger.error('Equip error:', err.message);
      res.status(500).json({ success: false, message: 'Failed to equip item' });
    }
  });
}
