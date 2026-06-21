import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const repoRoot = resolve(__dirname, '../../..');
const authSource = readFileSync(resolve(repoRoot, 'backend/controllers/authController.mjs'), 'utf8');
const gamificationModelSource = readFileSync(resolve(repoRoot, 'backend/models/Gamification.mjs'), 'utf8');

const autoInitDefaultsSlice = () => {
  const start = authSource.indexOf('// Auto-initialize gamification record for admin/trainer users');
  const end = authSource.indexOf('// Return user data and tokens', start);
  return authSource.slice(start, end);
};

describe('auth gamification auto-init defaults', () => {
  it('uses real Gamification model fields when creating admin/trainer rows', () => {
    expect(gamificationModelSource).toContain('experience: {');
    expect(gamificationModelSource).toContain('streakCount: {');
    expect(gamificationModelSource).toContain('currentTier: {');

    const slice = autoInitDefaultsSlice();

    expect(slice).toContain('experience: 0');
    expect(slice).toContain('streakCount: 0');
    expect(slice).toContain("currentTier: 'bronze'");
    expect(slice).not.toContain('currentXP:');
    expect(slice).not.toContain('currentStreak:');
    expect(slice).not.toContain("tier: 'bronze'");
  });
});
