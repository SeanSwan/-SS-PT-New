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
    expect(adminGamificationSource).toContain("authAxios.post('/api/v1/gamification/rewards', reward)");
    expect(adminGamificationSource).toContain('authAxios.put(`/api/v1/gamification/rewards/${id}`, updatedFields)');
    expect(adminGamificationSource).toContain('authAxios.delete(`/api/v1/gamification/rewards/${id}`)');
    expect(useGamificationDataSource).toContain('authAxios.post(`/api/v1/gamification/users/${targetUserId}/rewards/${rewardId}/redeem`)');
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
    expect(rewardSources.redeem).toContain('User.findByPk(normalizedUserId');
    expect(rewardSources.redeem).toContain('id: normalizedRewardId,');
    expect(rewardSources.redeem).toContain('userId: normalizedUserId,');
    expect(rewardSources.redeem).toContain('rewardId: normalizedRewardId,');
  });
});
