import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const routeSource = readFileSync(resolve(here, '../utils/avatarHomeMarketplaceRoutes.mjs'), 'utf8');
const accessSource = readFileSync(resolve(here, '../services/avatarHomeAccessService.mjs'), 'utf8');
const mountedRouteSource = readFileSync(resolve(here, '../routes/avatarHomeRoutes.mjs'), 'utf8');

describe('avatar home marketplace transaction contract', () => {
  it('keeps marketplace endpoints on the mounted avatar-home router', () => {
    expect(mountedRouteSource).toContain('registerAvatarHomeMarketplaceRoutes(router, { requireUnlockedHome, logger });');
    expect(routeSource).toContain("router.post('/marketplace/purchase'");
    expect(routeSource).toContain("router.post('/marketplace/equip'");
  });

  it('locks the canonical home row and commits purchase/equip mutations transactionally', () => {
    expect(routeSource).toContain("import sequelize from '../database.mjs';");
    expect(routeSource).toContain('sequelize.transaction(async (transaction) =>');
    expect(routeSource).toContain('requireUnlockedHome(req.user.id, { transaction })');
    expect(routeSource).toContain('transaction');
    expect(accessSource).toContain('query.lock = transaction.LOCK.UPDATE');
  });

  it('does not acknowledge a mutation until the managed transaction has completed', () => {
    expect(routeSource).toContain('const result = await sequelize.transaction(async (transaction) =>');
    expect(routeSource).toContain('res.json({ success: true, data: result.data });');
  });
});
