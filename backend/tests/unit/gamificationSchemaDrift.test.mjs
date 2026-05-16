import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../..');

const readBackendFile = (relativePath) =>
  fs.readFileSync(path.join(backendRoot, relativePath), 'utf8');

describe('gamification schema drift regressions', () => {
  it('weekly recap reads only safe gamification fields and counts workout_completion', () => {
    const source = readBackendFile('controllers/gamificationController.mjs');

    expect(source).toMatch(/const\s+weeklyRecapWorkoutSources\s*=\s*\[[^\]]*'workout_completion'/);
    expect(source).toMatch(/Gamification\.findOne\(\{\s*where:\s*\{\s*userId\s*\},\s*attributes:\s*\[/);
    expect(source).toMatch(/attributes:\s*\[[^\]]*'streakCount'/);
    expect(source).toMatch(/attributes:\s*\[[^\]]*'longestStreak'/);
    expect(source).toMatch(/attributes:\s*\[[^\]]*'level'/);
    expect(source).toMatch(/attributes:\s*\[[^\]]*'currentTier'/);
    expect(source).toMatch(/attributes:\s*\[[^\]]*'totalXP'/);
  });

  it('companion pet data query avoids unrelated gamification columns', () => {
    const source = readBackendFile('services/gamification/CompanionPetService.mjs');

    expect(source).toMatch(/const\s+PET_STATE_ATTRIBUTES\s*=\s*\[/);
    expect(source).toMatch(/PET_STATE_ATTRIBUTES\s*=\s*\[[^\]]*'petSpecies'/);
    expect(source).toMatch(/PET_STATE_ATTRIBUTES\s*=\s*\[[^\]]*'petName'/);
    expect(source).toMatch(/PET_STATE_ATTRIBUTES\s*=\s*\[[^\]]*'petState'/);
    expect(source).toMatch(/PET_STATE_ATTRIBUTES\s*=\s*\[[^\]]*'petInventory'/);
    expect(source).toMatch(/PET_STATE_ATTRIBUTES\s*=\s*\[[^\]]*'needsState'/);
    expect(source).toMatch(/PET_STATE_ATTRIBUTES\s*=\s*\[[^\]]*'level'/);
    expect(source).not.toMatch(/PET_STATE_ATTRIBUTES\s*=\s*\[[^\]]*'wisdomXP'/);
    expect(source).not.toMatch(/PET_STATE_ATTRIBUTES\s*=\s*\[[^\]]*'recoveryDaysCompleted'/);
    expect(source).toMatch(/Gamification\.findOne\(\{\s*where:\s*\{\s*userId\s*\},\s*attributes:\s*PET_STATE_ATTRIBUTES\s*\}\)/);
  });

  it('deploy migration exists for missing gamification recovery columns', () => {
    const migrationPath = path.join(backendRoot, 'migrations', '20260408000004-fix-gamification-recovery-columns.cjs');
    expect(fs.existsSync(migrationPath)).toBe(true);

    const source = fs.readFileSync(migrationPath, 'utf8');
    expect(source).toMatch(/addColumn\('Gamifications',\s*'wisdomXP'/);
    expect(source).toMatch(/addColumn\('Gamifications',\s*'recoveryDaysCompleted'/);
    expect(source).toMatch(/defaultValue:\s*0/);
  });

  it('achievement awards use Achievement.xpReward and update derived user progression fields', () => {
    const source = readBackendFile('controllers/gamificationController.mjs');

    expect(source).toMatch(/const\s+getAchievementPointValue\s*=\s*\(achievement\)\s*=>/);
    expect(source).not.toMatch(/achievement\.pointValue/);
    expect(source).toMatch(/const\s+newLevel\s*=\s*calculateLevel\(newBalance\)/);
    expect(source).toMatch(/const\s+newTier\s*=\s*getTier\(newLevel\)/);
    expect(source).toMatch(/user\.update\(\{\s*points:\s*newBalance,\s*level:\s*newLevel,\s*tier:\s*newTier\s*\}/);
  });

  it('challenge completion XP updates derived user progression fields', () => {
    const source = readBackendFile('controllers/challengeController.mjs');

    expect(source).toMatch(/import\s+\{\s*calculateLevel,\s*getTier\s*\}\s+from\s+'..\/utils\/levelingAlgorithm\.mjs'/);
    expect(source).toMatch(/const\s+newLevel\s*=\s*calculateLevel\(newBalance\)/);
    expect(source).toMatch(/const\s+newTier\s*=\s*getTier\(newLevel\)/);
    expect(source).toMatch(/user\.update\(\{\s*points:\s*newBalance,\s*level:\s*newLevel,\s*tier:\s*newTier\s*\}/);
  });

  it('manual milestone bonus awards update derived user progression fields', () => {
    const source = readBackendFile('controllers/gamificationController.mjs');

    expect(source).toMatch(/let\s+finalBalance\s*=\s*user\.points/);
    expect(source).toMatch(/finalBalance\s*=\s*user\.points\s*\+\s*totalBonusPoints/);
    expect(source).toMatch(/const\s+newLevel\s*=\s*calculateLevel\(finalBalance\)/);
    expect(source).toMatch(/const\s+newTier\s*=\s*getTier\(newLevel\)/);
    expect(source).toMatch(/user\.update\(\{\s*points:\s*finalBalance,\s*level:\s*newLevel,\s*tier:\s*newTier\s*\}/);
  });
});
