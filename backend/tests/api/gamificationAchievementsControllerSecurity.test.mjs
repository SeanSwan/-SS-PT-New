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
const trainerGamificationSource = readFrontend('src/components/DashBoard/Pages/trainer-gamification/hooks/useTrainerGamification.ts');

const functionSource = (name, nextName) => {
  const startMarker = `  ${name}: async`;
  const endMarker = `\n  ${nextName}: async`;
  const start = controllerSource.indexOf(startMarker);
  const end = controllerSource.indexOf(endMarker, start + startMarker.length);

  expect(start, `${name} start marker`).toBeGreaterThan(-1);
  expect(end, `${nextName} end marker`).toBeGreaterThan(start);

  return controllerSource.slice(start, end);
};

const achievementSources = {
  getAll: functionSource('getAllAchievements', 'getAchievement'),
  getOne: functionSource('getAchievement', 'createAchievement'),
  create: functionSource('createAchievement', 'updateAchievement'),
  update: functionSource('updateAchievement', 'deleteAchievement'),
  delete: functionSource('deleteAchievement', 'awardAchievement'),
  award: functionSource('awardAchievement', 'updateAchievementProgress'),
  progress: functionSource('updateAchievementProgress', 'getAllRewards')
};

describe('gamification achievements controller security hardening', () => {
  it('locks the active achievement route wiring and frontend callers', () => {
    expect(routeSource).toContain("router.get('/achievements', gamificationController.getAllAchievements)");
    expect(routeSource).toContain("router.post('/achievements', authenticate, requireAdmin, gamificationController.createAchievement)");
    expect(routeSource).toContain("router.post('/users/:userId/achievements/:achievementId', authenticate, requireTrainer, authorizeResourceAccess('userId'), gamificationController.awardAchievement)");
    expect(routeSource).toContain("router.put('/users/:userId/achievements/:achievementId/progress', authenticate, requireTrainer, authorizeResourceAccess('userId'), gamificationController.updateAchievementProgress)");
    expect(adminGamificationSource).toContain("authAxios.get('/api/v1/gamification/achievements')");
    expect(adminGamificationSource).toContain("authAxios.post('/api/v1/gamification/achievements', achievement)");
    expect(trainerGamificationSource).toContain("authAxios.get('/api/v1/gamification/achievements')");
    expect(trainerGamificationSource).toContain('authAxios.post(`/api/v1/gamification/users/${clientId}/achievements/${achievementId}`)');
  });

  it('keeps achievement client-facing failures stable', () => {
    Object.values(achievementSources).forEach((source) => {
      expect(source).toContain('return sendGamificationError(res,');
      expect(source).not.toContain('error: error.message');
      expect(source).not.toContain('safeError(req, error)');
    });
  });

  it('strictly normalizes user-scoped achievement ids and progress values', () => {
    expect(achievementSources.award).toContain('const normalizedUserId = parsePositiveInteger(userId);');
    expect(achievementSources.award).toContain('User.findByPk(normalizedUserId');
    expect(achievementSources.award).toContain('lock: transaction.LOCK.UPDATE');
    expect(achievementSources.award).toContain('userId: normalizedUserId,');
    expect(achievementSources.progress).toContain('const normalizedUserId = parsePositiveInteger(userId);');
    expect(achievementSources.progress).toContain('const normalizedProgress = parseBoundedNumber(progress, 0, 100);');
    expect(achievementSources.progress).toContain('if (normalizedProgress === null)');
    expect(achievementSources.progress).toContain('const transaction = await db.transaction();');
    expect(achievementSources.progress).toContain('User.findByPk(normalizedUserId');
    expect(achievementSources.progress).toContain('lock: transaction.LOCK.UPDATE');
    expect(achievementSources.progress).toContain('progress: normalizedProgress');
    expect(achievementSources.progress).not.toContain('Math.min(100, Math.max(0, progress))');
  });

  it('uses the central point ledger for direct achievement awards', () => {
    expect(achievementSources.award).toContain('GamificationPointsService.recordLedgerEntry({');
    expect(achievementSources.award).toContain("source: 'achievement_earned'");
    expect(achievementSources.award).toContain('sourceId: null');
    expect(achievementSources.award).not.toContain('sourceId: achievement.id');
    expect(achievementSources.award).toContain('idempotencyKey: `achievement:${normalizedUserId}:${achievement.id}`');
    expect(achievementSources.award).not.toContain('await PointTransaction.create({');
  });

  it('normalizes achievement reward point values before ledger awards', () => {
    expect(controllerSource).toContain('const parsed = parseNonNegativeInteger(achievement?.xpReward, 0);');
    expect(controllerSource).not.toContain('const parsed = Number(achievement?.xpReward);');
    expect(achievementSources.award).toContain('const achievementPoints = getAchievementPointValue(achievement);');
    expect(achievementSources.progress).toContain('const achievementPoints = getAchievementPointValue(achievement);');
    expect(achievementSources.progress).toContain('const achievementPoints = getAchievementPointValue(userAchievement.achievement);');
  });

  it('uses the central point ledger for progress-completion achievement awards', () => {
    expect(achievementSources.progress).toContain('GamificationPointsService.recordLedgerEntry({');
    expect(achievementSources.progress).toContain("source: 'achievement_earned'");
    expect(achievementSources.progress).toContain('sourceId: null');
    expect(achievementSources.progress).not.toContain('sourceId: achievement.id');
    expect(achievementSources.progress).not.toContain('sourceId: userAchievement.achievement.id');
    expect(achievementSources.progress).toContain('idempotencyKey: `achievement:${normalizedUserId}:${achievement.id}`');
    expect(achievementSources.progress).toContain('idempotencyKey: `achievement:${normalizedUserId}:${userAchievement.achievement.id}`');
    expect(achievementSources.progress).toContain('}, transaction);');
    expect(achievementSources.progress).not.toContain('await PointTransaction.create({');
    expect(achievementSources.progress).not.toContain('await user.update({ points: newBalance');
  });
});
