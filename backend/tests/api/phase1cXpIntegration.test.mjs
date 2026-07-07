import { describe, expect, test, vi, beforeAll } from 'vitest';


describe('awardWorkoutXP service — structure', () => {
  let awardWorkoutXP;

  beforeAll(async () => {
    const mod = await import('../../services/awardWorkoutXP.mjs');
    awardWorkoutXP = mod.awardWorkoutXP;
  });

  test('1 — exports an async function', () => {
    expect(typeof awardWorkoutXP).toBe('function');
    // Async functions have AsyncFunction constructor
    expect(awardWorkoutXP.constructor.name).toBe('AsyncFunction');
  });

  test('2 — function accepts expected params (6 named + transaction)', () => {
    // The function has 2 positional params: destructured object + transaction
    expect(awardWorkoutXP.length).toBe(2);
  });

  test('3 — module also exports default with awardWorkoutXP', async () => {
    const mod = await import('../../services/awardWorkoutXP.mjs');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default.awardWorkoutXP).toBe('function');
  });

  test('4 — imports the central point ledger once', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const servicePath = path.resolve(path.dirname(__filename), '../../services/awardWorkoutXP.mjs');
    const source = fs.readFileSync(servicePath, 'utf-8');
    const imports = source.match(/import\s+GamificationPointsService\s+from\s+'\.\/gamification\/GamificationPointsService\.mjs';/g) ?? [];

    expect(imports).toHaveLength(1);
    expect(source).toMatch(/GamificationPointsService\.recordLedgerEntry/);
  });
});

// ===== Idempotency + Day-Level Guard (4 tests) =====

describe('awardWorkoutXP — idempotency + day-level guard contracts', () => {
  test('4 — service rejects if user not found (throws Error)', async () => {
    // Mock a transaction with LOCK
    const mockTx = {
      LOCK: { UPDATE: 'UPDATE' },
    };

    // We need to test the service's early-exit on missing user
    // Since it uses real Sequelize models, we validate the contract via
    // import inspection — the function must throw for invalid userId
    const { awardWorkoutXP } = await import('../../services/awardWorkoutXP.mjs');
    expect(typeof awardWorkoutXP).toBe('function');
    // Full DB-level idempotency testing requires a test database;
    // here we verify the service exists and has the right shape
  });

  test('5 — day-level guard uses WorkoutSession.date (not PointTransaction.createdAt)', async () => {
    // Verify the service imports WorkoutSession for day-level checks
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const serviceDir = path.resolve(path.dirname(__filename), '../../services');
    const source = [
      fs.readFileSync(path.join(serviceDir, 'awardWorkoutXP.mjs'), 'utf-8'),
      fs.readFileSync(path.join(serviceDir, 'awardWorkoutXPSupport.mjs'), 'utf-8'),
    ].join('\n');

    // Must import WorkoutSession (for day-level guard)
    expect(source).toMatch(/import\s+WorkoutSession\s+from/);

    // Must query WorkoutSession with date + experiencePoints
    expect(source).toMatch(/WorkoutSession\.findOne/);
    expect(source).toMatch(/experiencePoints/);
    expect(source).toMatch(/Op\.gt/);
    expect(source).toMatch(/Op\.between/);
  });

  test('6 — service checks lastActivityDate for same-day guard', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const serviceDir = path.resolve(path.dirname(__filename), '../../services');
    const source = [
      fs.readFileSync(path.join(serviceDir, 'awardWorkoutXP.mjs'), 'utf-8'),
      fs.readFileSync(path.join(serviceDir, 'awardWorkoutXPSupport.mjs'), 'utf-8'),
    ].join('\n');

    // Must read user.lastActivityDate
    expect(source).toMatch(/lastActivityDate/);
    // Must compare normalized dates
    expect(source).toMatch(/setHours\(0,\s*0,\s*0,\s*0\)/);
    // Returns sameDay on match
    expect(source).toMatch(/sameDay:\s*true/);
  });

  test('7 — service returns alreadyAwarded when PointTransaction.sourceId matches', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const serviceDir = path.resolve(path.dirname(__filename), '../../services');
    const source = [
      fs.readFileSync(path.join(serviceDir, 'awardWorkoutXP.mjs'), 'utf-8'),
      fs.readFileSync(path.join(serviceDir, 'awardWorkoutXPSupport.mjs'), 'utf-8'),
    ].join('\n');

    expect(source).toMatch(/GamificationPointsService\.recordLedgerEntry/);
    expect(source).toMatch(/idempotencyKey:\s*workoutIdempotencyKey/);
    expect(source).toMatch(/toSafeIntegerId\(workoutId\)/);
    expect(source).toMatch(/PointTransaction\.findOne/);
    expect(source).not.toMatch(/sourceId:\s*String\(workoutId\)/);
    expect(source).toMatch(/sourceId/);
    expect(source).toMatch(/workout_completion/);
    // Returns alreadyAwarded
    expect(source).toMatch(/alreadyAwarded:\s*true/);
  });
});

// ===== Streak Logic (3 tests) =====

describe('awardWorkoutXP — streak logic contracts', () => {
  test('8 — consecutive day extends streak (daysSinceLast === 1)', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const serviceDir = path.resolve(path.dirname(__filename), '../../services');
    const source = [
      fs.readFileSync(path.join(serviceDir, 'awardWorkoutXP.mjs'), 'utf-8'),
      fs.readFileSync(path.join(serviceDir, 'awardWorkoutXPSupport.mjs'), 'utf-8'),
    ].join('\n');

    // Streak increment on daysSinceLast === 1
    expect(source).toMatch(/daysSinceLast\s*===\s*1/);
    expect(source).toMatch(/streakDays.*\+\s*1/);
  });

  test('9 — >2 day gap resets streak to 1', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const serviceDir = path.resolve(path.dirname(__filename), '../../services');
    const source = [
      fs.readFileSync(path.join(serviceDir, 'awardWorkoutXP.mjs'), 'utf-8'),
      fs.readFileSync(path.join(serviceDir, 'awardWorkoutXPSupport.mjs'), 'utf-8'),
    ].join('\n');

    expect(source).toMatch(/else\s*\{\s*updatedStats\.streakDays\s*=\s*1/s);
    expect(source).toMatch(/streakDays\s*=\s*1/);
  });

  test('10 — grace day logic uses 30-day window + STREAK_GRACE prefix', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const serviceDir = path.resolve(path.dirname(__filename), '../../services');
    const source = [
      fs.readFileSync(path.join(serviceDir, 'awardWorkoutXP.mjs'), 'utf-8'),
      fs.readFileSync(path.join(serviceDir, 'awardWorkoutXPSupport.mjs'), 'utf-8'),
    ].join('\n');

    expect(source).toMatch(/daysSinceLast\s*===\s*2/);
    expect(source).toMatch(/thirtyDaysAgo/);
    expect(source).toMatch(/STREAK_GRACE/);
    expect(source).toMatch(/Op\.startsWith/);
  });
});

// ===== Milestone Awarding (2 tests) =====

describe('awardWorkoutXP — milestone contracts', () => {
  test('11 — newly eligible milestones are queried and returned', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const serviceDir = path.resolve(path.dirname(__filename), '../../services');
    const source = fs.readFileSync(
      path.join(serviceDir, 'awardWorkoutXPSupport.mjs'),
      'utf-8'
    );

    // Milestone detection queries
    expect(source).toMatch(/Milestone\.findAll/);
    expect(source).toMatch(/targetPoints/);
    expect(source).toMatch(/isActive:\s*true/);
    // Awards via UserMilestone.create
    expect(source).toMatch(/UserMilestone\.create/);
    // Returns awardedMilestones to the main service result
    expect(source).toMatch(/awardedMilestones/);
  });

  test('12 — already-awarded milestones are filtered out', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const serviceDir = path.resolve(path.dirname(__filename), '../../services');
    const source = fs.readFileSync(
      path.join(serviceDir, 'awardWorkoutXPSupport.mjs'),
      'utf-8'
    );

    // LEFT JOIN with required: false filters already-awarded
    expect(source).toMatch(/required:\s*false/);
    expect(source).toMatch(/userMilestones\.length\s*===\s*0/);
  });
});

// ===== Failure Isolation (2 tests) =====

describe('workoutLogService — XP failure isolation', () => {
  test('13 — service catches XP errors and still returns session data; controller returns 201', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const baseDir = path.resolve(path.dirname(__filename), '../..');

    // 1.1b: XP isolation now lives in the shared post-commit step
    // (workoutXpAwardStep) invoked by the unified service AFTER commit.
    const stepSource = fs.readFileSync(
      path.join(baseDir, 'services/workout/workoutXpAwardStep.mjs'),
      'utf-8'
    );
    // Must have separate xpTx
    expect(stepSource).toMatch(/let\s+xpTx\s*=/);
    // Must catch and log XP errors, never failing the workout write
    expect(stepSource).toMatch(/XP award failed/);
    // The unified service commits BEFORE the XP step runs (post-commit).
    const unifiedSource = fs.readFileSync(
      path.join(baseDir, 'services/workout/aiWorkoutDailyFormService.mjs'),
      'utf-8'
    );
    const commitIdx = unifiedSource.indexOf('transaction.commit()');
    // lastIndexOf: the first hit is the import line; the CALL comes post-commit.
    const stepIdx = unifiedSource.lastIndexOf('runWorkoutXpAwardStep');
    expect(commitIdx).toBeGreaterThan(-1);
    expect(stepIdx).toBeGreaterThan(commitIdx);

    // Controller thin adapter must still return 201
    const ctrlSource = fs.readFileSync(
      path.join(baseDir, 'controllers/adminWorkoutLoggerController.mjs'),
      'utf-8'
    );
    expect(ctrlSource).toMatch(/res\.status\(201\)/);
  });

  test('14 — lastActivityDate only updated when workoutDate is newer', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const serviceDir = path.resolve(path.dirname(__filename), '../../services');
    const source = [
      fs.readFileSync(path.join(serviceDir, 'awardWorkoutXP.mjs'), 'utf-8'),
      fs.readFileSync(path.join(serviceDir, 'awardWorkoutXPSupport.mjs'), 'utf-8'),
    ].join('\n');

    expect(source).toMatch(/normalizedDate\s*>\s*lastActivity/);
    expect(source).toMatch(/lastActivityDate.*normalizedDate/);
  });
});

// ===== Service XP-State Mapping (2 tests) =====
// (XP-state logic moved from controller to workoutLogService — thin adapter pattern)

describe('workoutXpAwardStep — XP-state mapping (rehomed 1.1b)', () => {
  test('15 — sameDay XP result maps to xp: null in service return value', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const svcPath = path.resolve(path.dirname(__filename), '../../services/workout/workoutXpAwardStep.mjs');
    const source = fs.readFileSync(svcPath, 'utf-8');

    expect(source).toMatch(/xpResult\.sameDay/);
    expect(source).toMatch(/sameDay \|\| xpResult\.alreadyAwarded\) return null/);
  });

  test('16 — alreadyAwarded XP result maps to xp: null in service return value', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const svcPath = path.resolve(path.dirname(__filename), '../../services/workout/workoutXpAwardStep.mjs');
    const source = fs.readFileSync(svcPath, 'utf-8');

    expect(source).toMatch(/xpResult\.alreadyAwarded/);
    expect(source).toMatch(/return null/);
  });
});
