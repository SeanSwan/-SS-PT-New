# Data Safety & Integrity — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 71.3s
> **Files:** docs/ai-workflow/blueprints/EMBEDDED-AI-TERMINAL-AND-WORKOUT-LOGGER-MASTER-PROMPT-V2.md
> **Generated:** 3/20/2026, 11:11:13 PM

---

# DATA SAFETY AUDIT REPORT — SwanStudios Blueprint V2.0

## EXECUTIVE SUMMARY

**OVERALL RISK LEVEL: LOW** ✅

This is a **blueprint/specification document**, not executable code. It contains **NO direct data safety risks** because it defines architecture, not implementation. However, it **prescribes patterns that WILL create risks** when implemented.

**Critical Finding:** This document mandates database schema changes and seeding strategies that, if implemented carelessly, **COULD wipe production data**.

---

## FINDINGS

### 🔴 CRITICAL FINDINGS: 2

---

#### FINDING #1: DESTRUCTIVE SEEDER PATTERN RISK

**Severity:** CRITICAL  
**Data at Risk:** Entire `exercises` table (530+ exercises), potentially orphaning workout logs  
**Blast Radius:** ALL users — every workout log references exercises  
**Location:** Section 8 (Exercise Database), Lines ~580-595

**What's Wrong:**

The document prescribes a seeder pattern with `findOrCreate` but doesn't specify **what happens to existing exercises** when re-running the seeder:

```javascript
// backend/seeders/YYYYMMDD-seed-comprehensive-exercises.cjs
// 1. Ingest free-exercise-db/exercises.json
// 2. Transform to our schema (add nasmSlug, source, difficulty scoring)
// 3. findOrCreate by name (re-runnable, idempotent)  ← DANGER
```

**The Risk:**
- If a developer implements this as `bulkDelete()` then `bulkCreate()`, **all exercises are wiped** on every deploy
- Workout logs have `exercise_id` foreign keys — if exercises are deleted, logs become orphaned
- "Re-runnable, idempotent" is ambiguous — does NOT guarantee safety
- No mention of `ON DELETE` cascade behavior — could silently delete workout history

**Scenario:**
1. Production has 75 NASM exercises with IDs 1-75
2. 10,000 workout logs reference these IDs
3. Developer runs new seeder that does `await Exercise.destroy({ truncate: true })`
4. All 75 exercises deleted
5. New 530 exercises inserted with NEW IDs (1-530)
6. Old workout logs now reference non-existent exercise IDs
7. **Years of workout history corrupted**

**Fix Required:**

```javascript
/**
 * SAFETY-FIRST SEEDER PATTERN
 * 
 * NEVER use truncate, bulkDelete, or destroy without WHERE clause.
 * ALWAYS use upsert pattern with unique constraint.
 */

// 1. Add unique constraint to exercises table
await queryInterface.addConstraint('exercises', {
  fields: ['name', 'source'],
  type: 'unique',
  name: 'exercises_name_source_unique'
});

// 2. Use updateOnDuplicate (upsert) instead of findOrCreate
for (const exercise of exercisesToSeed) {
  await Exercise.upsert({
    name: exercise.name,
    source: exercise.source,
    // ... all fields
  }, {
    conflictFields: ['name', 'source'], // PostgreSQL ON CONFLICT
    updateOnDuplicate: ['instructions', 'imageUrl', 'updatedAt'] // Only update these
  });
}

// 3. NEVER delete exercises that have workout logs
// Add check before any delete operation:
const hasWorkoutLogs = await WorkoutLog.count({ 
  where: { exerciseId: exerciseToDelete.id } 
});
if (hasWorkoutLogs > 0) {
  throw new Error(`Cannot delete exercise ${exerciseToDelete.name} - ${hasWorkoutLogs} workout logs reference it`);
}
```

**Additional Safeguards:**

```sql
-- Migration: Add foreign key with RESTRICT (not CASCADE)
ALTER TABLE workout_logs 
  DROP CONSTRAINT IF EXISTS workout_logs_exercise_id_fkey,
  ADD CONSTRAINT workout_logs_exercise_id_fkey 
    FOREIGN KEY (exercise_id) 
    REFERENCES exercises(id) 
    ON DELETE RESTRICT;  -- Prevents deletion if logs exist

-- Add soft delete column instead of hard delete
ALTER TABLE exercises ADD COLUMN deleted_at TIMESTAMP;
CREATE INDEX idx_exercises_active ON exercises(id) WHERE deleted_at IS NULL;
```

---

#### FINDING #2: MIGRATION ADDS COLUMNS WITHOUT SAFE DEFAULTS

**Severity:** CRITICAL  
**Data at Risk:** Existing workout logs (could fail migration, lock table, corrupt data)  
**Blast Radius:** ALL existing workout logs (potentially thousands of records)  
**Location:** Section 9 (NASM-Standard Workout Forms), Lines ~850-858

**What's Wrong:**

```sql
-- Enhance existing workout_logs table
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS tempo VARCHAR(10);
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS rest_seconds INT;
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS opt_phase INT CHECK (opt_phase BETWEEN 1 AND 5);
```

**The Risks:**

1. **No default values** — existing rows will have NULL for these columns
2. **CHECK constraint on opt_phase** — if any code tries to INSERT without opt_phase, it will fail
3. **No transaction wrapper** — if one ALTER fails, others may succeed (partial migration)
4. **No backfill strategy** — existing workout logs have no tempo/rest data
5. **Breaking change** — any code that does `INSERT INTO workout_logs` without these fields will break

**Scenario:**
1. Production has 50,000 workout logs
2. Migration runs: `ALTER TABLE workout_logs ADD COLUMN opt_phase INT CHECK (opt_phase BETWEEN 1 AND 5);`
3. Existing rows now have `opt_phase = NULL`
4. Frontend tries to display workout history
5. Code assumes `opt_phase` is always 1-5, crashes on NULL
6. OR: Code tries to save new workout without opt_phase → CHECK constraint violation → save fails
7. **Trainers cannot log workouts, existing data is inconsistent**

**Fix Required:**

```sql
-- SAFE MIGRATION PATTERN
BEGIN;

-- 1. Add columns with safe defaults
ALTER TABLE workout_logs 
  ADD COLUMN IF NOT EXISTS tempo VARCHAR(10) DEFAULT '2/0/2',
  ADD COLUMN IF NOT EXISTS rest_seconds INT DEFAULT 60,
  ADD COLUMN IF NOT EXISTS opt_phase INT DEFAULT 1;

-- 2. Backfill existing data with reasonable defaults
UPDATE workout_logs 
SET 
  tempo = '2/0/2',
  rest_seconds = 60,
  opt_phase = 1
WHERE tempo IS NULL;

-- 3. NOW add constraints (after data is clean)
ALTER TABLE workout_logs 
  ADD CONSTRAINT workout_logs_opt_phase_check 
    CHECK (opt_phase BETWEEN 1 AND 5);

-- 4. Make columns NOT NULL (after backfill)
ALTER TABLE workout_logs 
  ALTER COLUMN tempo SET NOT NULL,
  ALTER COLUMN rest_seconds SET NOT NULL,
  ALTER COLUMN opt_phase SET NOT NULL;

COMMIT;

-- 5. Add down() migration
-- DOWN:
-- ALTER TABLE workout_logs DROP COLUMN tempo;
-- ALTER TABLE workout_logs DROP COLUMN rest_seconds;
-- ALTER TABLE workout_logs DROP COLUMN opt_phase;
```

**Additional Safeguards:**

```javascript
// In migration file
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // All ALTER statements here
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error; // Fail loudly, don't leave partial migration
    }
  },
  
  down: async (queryInterface, Sequelize) => {
    // ALWAYS implement down() for rollback
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('workout_logs', 'tempo', { transaction });
      await queryInterface.removeColumn('workout_logs', 'rest_seconds', { transaction });
      await queryInterface.removeColumn('workout_logs', 'opt_phase', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
```

---

### 🟠 HIGH FINDINGS: 3

---

#### FINDING #3: NO TRANSACTION SAFETY FOR MULTI-TABLE OPERATIONS

**Severity:** HIGH  
**Data at Risk:** Client profiles, 1RM records, OPT plans (could be partially saved)  
**Blast Radius:** Individual clients (1 client per failed operation)  
**Location:** Section 6 (1RM Engine), Section 5 (OPT Model), Lines ~450-520

**What's Wrong:**

The document describes saving data across multiple tables but **never mentions transactions**:

- Saving 1RM test → updates `client_one_rep_maxes` AND potentially `client_profiles`
- Creating OPT plan → inserts into `client_opt_plans` AND `weekly_plan_days` AND `planned_exercises`
- Saving workout → inserts into `workout_logs` AND updates `client_one_rep_maxes` (if new PR)

**Scenario:**
1. Trainer saves a workout with a new 1RM
2. `workout_logs` insert succeeds
3. `client_one_rep_maxes` insert fails (network timeout)
4. **Workout is saved but 1RM is not recorded**
5. Next workout uses old 1RM → incorrect weight calculations
6. Client lifts too heavy → injury risk

**Fix Required:**

```javascript
// ALWAYS wrap multi-table operations in transactions
async function saveWorkoutWithOneRepMax(workoutData, oneRepMaxData) {
  const transaction = await sequelize.transaction();
  
  try {
    // 1. Save workout
    const workout = await WorkoutLog.create(workoutData, { transaction });
    
    // 2. Save 1RM
    const oneRepMax = await ClientOneRepMax.create({
      ...oneRepMaxData,
      workoutLogId: workout.id
    }, { transaction });
    
    // 3. Update client profile
    await Client.update(
      { lastWorkoutDate: new Date() },
      { where: { id: workoutData.clientId }, transaction }
    );
    
    // All or nothing
    await transaction.commit();
    return { workout, oneRepMax };
    
  } catch (error) {
    await transaction.rollback();
    throw new Error(`Failed to save workout: ${error.message}`);
  }
}
```

---

#### FINDING #4: FOREIGN KEY CASCADE BEHAVIOR NOT SPECIFIED

**Severity:** HIGH  
**Data at Risk:** Workout logs, 1RM records, OPT plans (could be orphaned or cascade-deleted)  
**Blast Radius:** All data related to a deleted client or exercise  
**Location:** Throughout — all new table schemas

**What's Wrong:**

New tables reference `users(id)` and `exercises(id)` but **don't specify ON DELETE behavior**:

```sql
CREATE TABLE client_one_rep_maxes (
  client_id INT NOT NULL REFERENCES users(id),  -- What happens if user deleted?
  exercise_id INT NOT NULL REFERENCES exercises(id),  -- What happens if exercise deleted?
```

**Default behavior varies by database** — could be CASCADE (deletes all related records) or RESTRICT (prevents deletion).

**Scenario:**
1. Admin accidentally deletes a client account
2. If CASCADE: All workout logs, 1RM records, OPT plans are **silently deleted**
3. If RESTRICT: Deletion fails but error message is unclear
4. **Either way, data integrity is at risk**

**Fix Required:**

```sql
-- EXPLICIT CASCADE RULES
CREATE TABLE client_one_rep_maxes (
  id SERIAL PRIMARY KEY,
  client_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- Delete 1RMs if client deleted
  exercise_id INT NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,  -- Prevent exercise deletion if 1RMs exist
  assessed_by_id INT REFERENCES users(id) ON DELETE SET NULL,  -- Keep record but clear assessor
  -- ...
);

CREATE TABLE workout_logs (
  -- ...
  client_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- Delete logs if client deleted
  exercise_id INT NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,  -- Prevent exercise deletion
  trainer_id INT REFERENCES users(id) ON DELETE SET NULL,  -- Keep log but clear trainer
);

CREATE TABLE client_opt_plans (
  -- ...
  client_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trainer_id INT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
);
```

**Safeguard: Soft Deletes**

```sql
-- Add soft delete to users table
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP;
CREATE INDEX idx_users_active ON users(id) WHERE deleted_at IS NULL;

-- Application code uses soft delete instead of hard delete
UPDATE users SET deleted_at = NOW() WHERE id = ?;
-- NOT: DELETE FROM users WHERE id = ?;
```

---

#### FINDING #5: NO INPUT VALIDATION ON CALCULATOR FORMULAS

**Severity:** HIGH  
**Data at Risk:** Client measurements, body fat %, BMI records (could store garbage data)  
**Blast Radius:** Individual clients (1 client per bad calculation)  
**Location:** Section 7 (Calculator Suite), Lines ~680-750

**What's Wrong:**

Calculator formulas have **no bounds checking**:

```typescript
export function calculate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps < 1 || reps > 10) throw new Error('Reps must be 1-10 for accurate 1RM');
  if (weight <= 0) throw new Error('Weight must be positive');
  // ✅ Good validation
```

But other calculators have **no validation**:

```
Male BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) + 5
```

**Scenario:**
1. Trainer enters age = -5 (typo)
2. BMR = (10 × 80) + (6.25 × 180) - (5 × -5) + 5 = **1930 cal/day** (should be ~1800)
3. Client follows this calorie target
4. **Gains unwanted weight, blames trainer**

**Fix Required:**

```typescript
export function calculateBMR(params: {
  gender: 'male' | 'female';
  weight_kg: number;
  height_cm: number;
  age: number;
}): number {
  // VALIDATE ALL INPUTS
  if (params.age < 10 || params.age > 120) {
    throw new Error('Age must be between 10 and 120');
  }
  if (params.weight_kg < 20 || params.weight_kg > 500) {
    throw new Error('Weight must be between 20 and 500 kg');
  }
  if (params.height_cm < 100 || params.height_cm > 250) {
    throw new Error('Height must be between 100 and 250 cm');
  }
  
  // Calculate
  const bmr = params.gender === 'male'
    ? (10 * params.weight_kg) + (6.25 * params.height_cm) - (5 * params.age) + 5
    : (10 * params.weight_kg) + (6.25 * params.height_cm) - (5 * params.age) - 161;
  
  // SANITY CHECK OUTPUT
  if (bmr < 800 || bmr > 5000) {
    throw new Error(`Calculated BMR (${bmr}) is outside reasonable range`);
  }
  
  return Math.round(bmr);
}
```

---

### 🟡 MEDIUM FINDINGS: 2

---

#### FINDING #6: NO RBAC ENFORCEMENT SPECIFIED FOR DESTRUCTIVE ENDPOINTS

**Severity:** MEDIUM  
**Data at Risk:** Client data (could be modified by wrong role)  
**Blast Radius:** Individual clients  
**Location:** Section 15 (API Contract), Lines ~1050-1080

**What's Wrong:**

New endpoints specify auth requirements but **not enforcement mechanism**:

```
| POST | /api/clients/:id/opt-plan

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
