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
const coreRoutesSource = readBackend('../../core/routes.mjs');
const gamificationMapperSource = readFrontend('src/hooks/gamification/gamificationMappers.ts');

const functionSource = (name, nextName) => {
  const startMarker = `  ${name}: async`;
  const endMarker = `\n  ${nextName}: async`;
  const start = controllerSource.indexOf(startMarker);
  const end = controllerSource.indexOf(endMarker, start + startMarker.length);

  expect(start, `${name} start marker`).toBeGreaterThan(-1);
  expect(end, `${nextName} end marker`).toBeGreaterThan(start);

  return controllerSource.slice(start, end);
};

const milestoneSources = {
  getAll: functionSource('getAllMilestones', 'getMilestone'),
  getOne: functionSource('getMilestone', 'createMilestone'),
  create: functionSource('createMilestone', 'updateMilestone'),
  update: functionSource('updateMilestone', 'deleteMilestone'),
  delete: functionSource('deleteMilestone', 'checkAndAwardMilestones'),
  checkAndAward: functionSource('checkAndAwardMilestones', 'getUserTransactions')
};

describe('gamification milestones controller security hardening', () => {
  it('locks the active milestone route wiring and profile consumer', () => {
    expect(coreRoutesSource).toContain("app.use('/api/v1/gamification', gamificationV1Routes)");
    expect(routeSource).toContain("router.get('/milestones', gamificationController.getAllMilestones)");
    expect(routeSource).toContain("router.get('/milestones/:id', gamificationController.getMilestone)");
    expect(routeSource).toContain("router.post('/milestones', authenticate, requireAdmin, gamificationController.createMilestone)");
    expect(routeSource).toContain("router.put('/milestones/:id', authenticate, requireAdmin, gamificationController.updateMilestone)");
    expect(routeSource).toContain("router.delete('/milestones/:id', authenticate, requireAdmin, gamificationController.deleteMilestone)");
    expect(routeSource).toContain("router.post('/users/:userId/check-milestones', authenticate, requireTrainer, authorizeResourceAccess('userId'), gamificationController.checkAndAwardMilestones)");
    expect(gamificationMapperSource).toContain('milestones: asArray(raw.milestones)');
  });

  it('keeps milestone client-facing failures stable', () => {
    Object.values(milestoneSources).forEach((source) => {
      expect(source).toContain('return sendGamificationError(res,');
      expect(source).not.toContain('error: error.message');
      expect(source).not.toContain('safeError(req, error)');
    });
  });

  it('strictly normalizes milestone ids and mutable numeric fields', () => {
    expect(milestoneSources.getOne).toContain('const normalizedId = parsePositiveInteger(id);');
    expect(milestoneSources.getOne).toContain('Milestone.findByPk(normalizedId');
    expect(milestoneSources.create).toContain('const normalizedTargetPoints = parseNonNegativeInteger(targetPoints);');
    expect(milestoneSources.create).toContain('const normalizedBonusPoints = bonusPoints === undefined ? 200 : parseNonNegativeInteger(bonusPoints);');
    expect(milestoneSources.create).toContain('targetPoints: normalizedTargetPoints');
    expect(milestoneSources.create).toContain('bonusPoints: normalizedBonusPoints');
    expect(milestoneSources.update).toContain('updatedFields.targetPoints = normalizedTargetPoints;');
    expect(milestoneSources.update).toContain('updatedFields.bonusPoints = normalizedBonusPoints;');
    expect(milestoneSources.delete).toContain('const normalizedId = parsePositiveInteger(id);');
    expect(milestoneSources.delete).toContain('Milestone.findByPk(normalizedId');
  });

  it('strictly normalizes user-scoped milestone award ids', () => {
    expect(milestoneSources.checkAndAward).toContain('const normalizedUserId = parsePositiveInteger(userId);');
    expect(milestoneSources.checkAndAward).toContain('User.findByPk(normalizedUserId');
    expect(milestoneSources.checkAndAward).toContain('where: { userId: normalizedUserId }');
    expect(milestoneSources.checkAndAward).toContain('userId: normalizedUserId,');
  });

  it('uses the central point ledger for milestone bonus awards', () => {
    const normalizedCheckSource = milestoneSources.checkAndAward.replace(/\r\n/g, '\n');

    expect(normalizedCheckSource).toContain(`User.findByPk(normalizedUserId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      })`);
    expect(normalizedCheckSource).toContain('GamificationPointsService.recordLedgerEntry({');
    expect(normalizedCheckSource).toContain("transactionType: 'bonus'");
    expect(normalizedCheckSource).toContain("source: 'milestone_reached'");
    expect(normalizedCheckSource).toContain("idempotencyKey: `milestone:check:${normalizedUserId}:${milestoneKey}`");
    expect(normalizedCheckSource).not.toContain('await PointTransaction.create({');
    expect(normalizedCheckSource).not.toContain('await user.update({ points: finalBalance');
  });
});
