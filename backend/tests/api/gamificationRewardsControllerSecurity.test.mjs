import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readBackend = (path) => readFileSync(resolve(__dirname, path), 'utf8');
const readFrontend = (path) => readFileSync(resolve(process.cwd(), '../frontend', path), 'utf8');

const controllerSource = readBackend('../../controllers/gamificationController.mjs');
const routeSource = readBackend('../../routes/gamificationV1Routes.mjs');
const adminGamificationSource = readFrontend('src/components/DashBoard/Pages/admin-gamification/useAdminGamificationController.ts');
const adminGamificationCatalogActionsSource = readFrontend('src/components/DashBoard/Pages/admin-gamification/useAdminGamificationCatalogActions.ts');
const useGamificationDataSource = readFrontend('src/hooks/gamification/useGamificationData.ts');

const functionSource = (name, nextName) => {
  const startMarker = `  ${name}: async`;
  const endMarker = `\n  ${nextName}: async`;
  const start = controllerSource.indexOf(startMarker);
  const end = controllerSource.indexOf(endMarker, start + startMarker.length);

  expect(start, `${name} start marker`).toBeGreaterThan(-1);
  expect(end, `${nextName} end marker`).toBeGreaterThan(start);

  return controllerSource.slice(start, end);
};

const rewardSources = {
  getAll: functionSource('getAllRewards', 'getReward'),
  getOne: functionSource('getReward', 'createReward'),
  create: functionSource('createReward', 'updateReward'),
  update: functionSource('updateReward', 'deleteReward'),
  delete: functionSource('deleteReward', 'redeemReward'),
  redeem: functionSource('redeemReward', 'getAllMilestones')
};

describe('gamification rewards controller security hardening', () => {
  it('locks the active reward route wiring and frontend callers', () => {
    expect(routeSource).toContain("router.get('/rewards', gamificationController.getAllRewards)");
    expect(routeSource).toContain("router.get('/rewards/:id', gamificationController.getReward)");
    expect(routeSource).toContain("router.post('/rewards', authenticate, requireAdmin, gamificationController.createReward)");
    expect(routeSource).toContain("router.put('/rewards/:id', authenticate, requireAdmin, gamificationController.updateReward)");
    expect(routeSource).toContain("router.delete('/rewards/:id', authenticate, requireAdmin, gamificationController.deleteReward)");
    expect(routeSource).toContain("router.post('/users/:userId/rewards/:rewardId/redeem', authenticate, pointActionLimiter, authorizeResourceAccess('userId'), gamificationController.redeemReward)");
    expect(adminGamificationSource).toContain("authAxios.get('/api/v1/gamification/rewards')");
    expect(adminGamificationCatalogActionsSource).toContain("authAxios.post('/api/v1/gamification/rewards', reward)");
    expect(adminGamificationCatalogActionsSource).toContain("mutationPathFor('rewards', id)");
    expect(adminGamificationCatalogActionsSource).toContain('authAxios.put(path, updatedFields)');
    expect(adminGamificationCatalogActionsSource).toContain('authAxios.delete(path)');
    expect(useGamificationDataSource).toContain('authAxios.post(`/api/v1/gamification/users/${userIdSegment}/rewards/${rewardIdSegment}/redeem`)');
  });

  it('keeps reward client-facing failures stable', () => {
    Object.values(rewardSources).forEach((source) => {
      expect(source).toContain('return sendGamificationError(res,');
      expect(source).not.toContain('error: error.message');
      expect(source).not.toContain('safeError(req, error)');
    });
  });

  it('strictly normalizes reward ids and mutable numeric fields', () => {
    expect(rewardSources.getOne).toContain('const normalizedId = parsePositiveInteger(id);');
    expect(rewardSources.getOne).toContain('Reward.findByPk(normalizedId');
    expect(rewardSources.create).toContain('const normalizedPointCost = pointCost === undefined ? 500 : parseNonNegativeInteger(pointCost);');
    expect(rewardSources.create).toContain('const normalizedStock = stock === undefined ? 10 : parseNonNegativeInteger(stock);');
    expect(rewardSources.create).toContain('pointCost: normalizedPointCost');
    expect(rewardSources.create).toContain('stock: normalizedStock');
    expect(rewardSources.update).toContain('updatedFields.pointCost = normalizedPointCost;');
    expect(rewardSources.update).toContain('updatedFields.stock = normalizedStock;');
    expect(rewardSources.delete).toContain('const normalizedId = parsePositiveInteger(id);');
    expect(rewardSources.delete).toContain('Reward.findByPk(normalizedId');
  });

  it('strictly normalizes user-scoped reward redemption ids', () => {
    expect(rewardSources.redeem).toContain('const normalizedUserId = parsePositiveInteger(userId);');
    expect(rewardSources.redeem).toContain('const normalizedRewardId = parsePositiveInteger(rewardId);');
    expect(rewardSources.redeem).toContain('const rewardPointCost = parseNonNegativeInteger(reward.pointCost);');
    expect(rewardSources.redeem).toContain('User.findByPk(normalizedUserId');
    expect(rewardSources.redeem).toContain('id: normalizedRewardId,');
    expect(rewardSources.redeem).toContain('userId: normalizedUserId,');
    expect(rewardSources.redeem).toContain('rewardId: normalizedRewardId,');
    expect(rewardSources.redeem).toContain('pointsCost: rewardPointCost');
  });

  it('locks user points and reward stock rows before redemption checks', () => {
    const normalizedRedeemSource = rewardSources.redeem.replace(/\r\n/g, '\n');

    expect(normalizedRedeemSource).toContain(`User.findByPk(normalizedUserId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      })`);
    expect(normalizedRedeemSource).toContain(`Reward.findOne({
        where: {
          id: normalizedRewardId,
          isActive: true
        },
        transaction,
        lock: transaction.LOCK.UPDATE
      })`);
  });

  it('uses the central point ledger for reward redemption spends', () => {
    expect(rewardSources.redeem).toContain('GamificationPointsService.recordLedgerEntry({');
    expect(rewardSources.redeem).toContain('if (rewardPointCost > 0) {');
    expect(rewardSources.redeem).toContain('points: rewardPointCost');
    expect(rewardSources.redeem).toContain("transactionType: 'spend'");
    expect(rewardSources.redeem).toContain("source: 'reward_redemption'");
    expect(rewardSources.redeem).toContain('metadata: { rewardId: reward.id, userRewardId: userReward.id }');
    expect(rewardSources.redeem).toContain('idempotencyKey: `reward:${normalizedUserId}:${reward.id}:${userReward.id}`');
    expect(rewardSources.redeem).not.toContain('await PointTransaction.create({');
    expect(rewardSources.redeem).not.toContain('await user.update({ points: newBalance');
  });
});
