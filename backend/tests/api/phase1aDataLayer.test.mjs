import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..', '..');

describe('Phase 1A data layer scaffolding', () => {
  test('includes Phase 1A migration files', () => {
    const migrationOne = path.join(
      repoRoot,
      'backend',
      'migrations',
      '20260222000001-add-is-onboarding-complete.cjs'
    );
    const migrationTwo = path.join(
      repoRoot,
      'backend',
      'migrations',
      '20260222000002-create-workout-logs.cjs'
    );

    expect(fs.existsSync(migrationOne)).toBe(true);
    expect(fs.existsSync(migrationTwo)).toBe(true);
  });

  test('defines User.isOnboardingComplete', async () => {
    const userModule = await import('../../models/User.mjs');
    const User = userModule.default;
    const attr = User.rawAttributes.isOnboardingComplete;

    expect(attr).toBeDefined();
    expect(attr.allowNull).toBe(false);
    expect(attr.defaultValue).toBe(false);
  });

  test('registers WorkoutLog model and session/log associations', async () => {
    const workoutLogModule = await import('../../models/WorkoutLog.mjs');
    expect(workoutLogModule.default).toBeDefined();

    const associationsModule = await import('../../models/associations.mjs');
    const models = await associationsModule.default();

    expect(models.WorkoutLog).toBeDefined();
    expect(models.WorkoutSession).toBeDefined();
    expect(models.WorkoutSession.associations.logs).toBeDefined();
    expect(models.WorkoutLog.associations.session).toBeDefined();
  });
});
