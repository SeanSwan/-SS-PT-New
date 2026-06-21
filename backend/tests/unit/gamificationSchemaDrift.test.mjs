import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../..');

const readBackendFile = (relativePath) =>
  fs.readFileSync(path.join(backendRoot, relativePath), 'utf8');

const sliceBetween = (source, startNeedle, endNeedle) => {
  const start = source.indexOf(startNeedle);
  expect(start).toBeGreaterThan(-1);
  const end = source.indexOf(endNeedle, start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
};

describe('gamification schema drift regressions', () => {
  it('weekly recap reads only safe gamification fields and counts workout_completion', () => {
    const source = readBackendFile('controllers/gamificationController.mjs');
    const weeklyRecapSource = sliceBetween(
      source,
      '  getWeeklyRecap: async',
      '  getActivityFeed: async'
    );

    expect(source).toMatch(/const\s+weeklyRecapWorkoutSources\s*=\s*\[[^\]]*'workout_completion'/);
    expect(weeklyRecapSource).toMatch(/Gamification\.findOne\(\{\s*where:\s*\{\s*userId\s*\},\s*attributes:\s*\[/);
    expect(weeklyRecapSource).toMatch(/attributes:\s*\[[^\]]*'streakCount'/);
    expect(weeklyRecapSource).toMatch(/attributes:\s*\[[^\]]*'longestStreak'/);
    expect(weeklyRecapSource).toMatch(/attributes:\s*\[[^\]]*'level'/);
    expect(weeklyRecapSource).toMatch(/attributes:\s*\[[^\]]*'currentTier'/);
    expect(weeklyRecapSource).not.toMatch(/attributes:\s*\[[^\]]*'totalXP'/);
    expect(weeklyRecapSource).toContain('const latestPointBalance = await PointTransaction.findOne({');
    expect(weeklyRecapSource).toContain("attributes: ['balance']");
    expect(weeklyRecapSource).toContain('totalXP: latestPointBalance?.balance || 0');
  });

  it('companion pet data query avoids unrelated gamification columns', () => {
    const serviceSource = readBackendFile('services/gamification/CompanionPetService.mjs');
    const stateSource = readBackendFile('services/gamification/companionPetState.mjs');

    expect(serviceSource).toContain("from './companionPetState.mjs'");
    expect(stateSource).toMatch(/export\s+const\s+PET_STATE_ATTRIBUTES\s*=\s*\[/);
    expect(stateSource).toMatch(/PET_STATE_ATTRIBUTES\s*=\s*\[[^\]]*'petSpecies'/);
    expect(stateSource).toMatch(/PET_STATE_ATTRIBUTES\s*=\s*\[[^\]]*'petName'/);
    expect(stateSource).toMatch(/PET_STATE_ATTRIBUTES\s*=\s*\[[^\]]*'petState'/);
    expect(stateSource).toMatch(/PET_STATE_ATTRIBUTES\s*=\s*\[[^\]]*'petInventory'/);
    expect(stateSource).toMatch(/PET_STATE_ATTRIBUTES\s*=\s*\[[^\]]*'needsState'/);
    expect(stateSource).toMatch(/PET_STATE_ATTRIBUTES\s*=\s*\[[^\]]*'level'/);
    expect(stateSource).not.toMatch(/PET_STATE_ATTRIBUTES\s*=\s*\[[^\]]*'wisdomXP'/);
    expect(stateSource).not.toMatch(/PET_STATE_ATTRIBUTES\s*=\s*\[[^\]]*'recoveryDaysCompleted'/);
    expect(serviceSource).not.toMatch(/const\s+PET_STATE_ATTRIBUTES\s*=\s*\[/);
    expect(serviceSource).toMatch(/Gamification\.findOne\(\{\s*where:\s*\{\s*userId\s*\},\s*attributes:\s*PET_STATE_ATTRIBUTES\s*\}\)/);
  });

  it('deploy migration exists for missing gamification recovery columns', () => {
    const migrationPath = path.join(backendRoot, 'migrations', '20260408000004-fix-gamification-recovery-columns.cjs');
    expect(fs.existsSync(migrationPath)).toBe(true);

    const source = fs.readFileSync(migrationPath, 'utf8');
    expect(source).toMatch(/addColumn\('Gamifications',\s*'wisdomXP'/);
    expect(source).toMatch(/addColumn\('Gamifications',\s*'recoveryDaysCompleted'/);
    expect(source).toMatch(/defaultValue:\s*0/);
  });

  it('achievement awards use Achievement.xpReward through the central ledger progression path', () => {
    const source = readBackendFile('controllers/gamificationController.mjs');
    const pointsServiceSource = readBackendFile('services/gamification/GamificationPointsService.mjs');

    expect(source).toMatch(/const\s+getAchievementPointValue\s*=\s*\(achievement\)\s*=>/);
    expect(source).not.toMatch(/achievement\.pointValue/);
    expect(source).toContain('GamificationPointsService.recordLedgerEntry({');
    expect(source).toContain("source: 'achievement_earned'");
    expect(source).toContain('sourceId: null');
    expect(source).not.toContain('sourceId: achievement.id');
    expect(source).not.toContain('sourceId: userAchievement.achievement.id');
    expect(pointsServiceSource).toMatch(/const\s+newLevel\s*=\s*calculateLevel\(Math\.max\(newBalance,\s*0\)\)/);
    expect(pointsServiceSource).toMatch(/const\s+newTier\s*=\s*getTier\(newLevel\)/);
    expect(pointsServiceSource).toMatch(/await\s+user\.update\(userUpdates,\s*\{\s*transaction\s*\}/);
  });

  it('challenge completion XP uses the central ledger progression path', () => {
    const source = readBackendFile('controllers/challengeController.mjs');
    const progressSource = sliceBetween(
      source,
      '  updateChallengeProgress: async',
      '  getChallengeLeaderboard: async'
    );

    expect(source).toContain("import GamificationPointsService from '../services/gamification/GamificationPointsService.mjs';");
    expect(progressSource).toContain('GamificationPointsService.recordLedgerEntry({');
    expect(progressSource).toContain("transactionType: 'earn'");
    expect(progressSource).toContain("source: 'challenge_completion'");
    expect(progressSource).toContain("idempotencyKey: `challenge:${userId}:${id}`");
    expect(progressSource).not.toContain('await PointTransaction.create({');
    expect(progressSource).not.toMatch(/user\.update\(\{\s*points:/);
  });

  it('goal progress XP uses the central ledger progression path', () => {
    const source = readBackendFile('controllers/goalController.mjs');
    const progressSource = sliceBetween(
      source,
      '  updateGoalProgress: async',
      '  updateGoal: async'
    );

    expect(source).toContain("import GamificationPointsService from '../services/gamification/GamificationPointsService.mjs';");
    expect(progressSource).toContain('GamificationPointsService.recordLedgerEntry({');
    expect(progressSource).toContain("source: 'goal_milestone'");
    expect(progressSource).toContain("source: 'goal_completed'");
    expect(progressSource).toContain("idempotencyKey: `goal-milestone:${goal.userId}:${goal.id}:${milestone.percentage}`");
    expect(progressSource).toContain("idempotencyKey: `goal-completed:${goal.userId}:${goal.id}`");
    expect(progressSource).not.toContain('await PointTransaction.create({');
    expect(progressSource).not.toMatch(/user\.update\(\{\s*points:/);
  });

  it('goal deletion voids UUID goal XP ledgers by metadata and idempotency', () => {
    const source = readBackendFile('controllers/goalController.mjs');
    const deleteSource = sliceBetween(
      source,
      '  deleteGoal: async',
      '  getGoalAnalytics: async'
    );

    expect(deleteSource).toContain('const goalLedgerMatchers = [');
    expect(deleteSource).toContain('metadata: { [Op.contains]: { goalId: id } }');
    expect(deleteSource).toContain('idempotencyKey: { [Op.like]: `goal-milestone:${goal.userId}:${id}:%` }');
    expect(deleteSource).toContain('idempotencyKey: `goal-completed:${goal.userId}:${id}`');
    expect(deleteSource).toContain('[Op.or]: goalLedgerMatchers');
    expect(deleteSource).not.toContain('sourceId: id');
  });

  it('manual milestone bonus awards use the central ledger progression path', () => {
    const source = readBackendFile('controllers/gamificationController.mjs');
    const pointsServiceSource = readBackendFile('services/gamification/GamificationPointsService.mjs');
    const start = source.indexOf('  checkAndAwardMilestones: async');
    const end = source.indexOf('\n  getUserTransactions: async', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const checkSource = source.slice(start, end);

    expect(checkSource).toMatch(/User\.findByPk\(normalizedUserId,\s*\{\s*transaction,\s*lock:\s*transaction\.LOCK\.UPDATE\s*\}/);
    expect(checkSource).toContain('GamificationPointsService.recordLedgerEntry({');
    expect(checkSource).toContain("transactionType: 'bonus'");
    expect(checkSource).toContain("source: 'milestone_reached'");
    expect(checkSource).toContain('idempotencyKey: `milestone:check:${normalizedUserId}:${milestoneKey}`');
    expect(checkSource).not.toContain('await PointTransaction.create({');
    expect(checkSource).not.toMatch(/user\.update\(\{\s*points:\s*finalBalance/);
    expect(pointsServiceSource).toMatch(/const\s+newLevel\s*=\s*calculateLevel\(Math\.max\(newBalance,\s*0\)\)/);
    expect(pointsServiceSource).toMatch(/const\s+newTier\s*=\s*getTier\(newLevel\)/);
    expect(pointsServiceSource).toMatch(/await\s+user\.update\(userUpdates,\s*\{\s*transaction\s*\}/);
  });
});
