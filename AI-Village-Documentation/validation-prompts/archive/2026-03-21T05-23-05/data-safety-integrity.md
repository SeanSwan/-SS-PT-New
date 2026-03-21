# Data Safety & Integrity — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 68.0s
> **Files:** docs/ai-workflow/blueprints/EMBEDDED-AI-TERMINAL-AND-WORKOUT-LOGGER-MASTER-PROMPT.md
> **Generated:** 3/20/2026, 10:23:05 PM

---

# DATA SAFETY AUDIT REPORT — EMBEDDED AI TERMINAL & WORKOUT LOGGER MASTER BLUEPRINT

**Auditor:** DATA SAFETY AUDITOR  
**Date:** 2026-03-20  
**Document:** `docs/ai-workflow/blueprints/EMBEDDED-AI-TERMINAL-AND-WORKOUT-LOGGER-MASTER-PROMPT.md`  
**Status:** ⚠️ **MEDIUM RISK** — Blueprint document with implementation guidance that could lead to destructive operations

---

## EXECUTIVE SUMMARY

This is a **blueprint/specification document**, not executable code. However, it contains **architectural guidance that will be implemented by AI agents**, and several sections describe patterns that could result in **CRITICAL data safety issues** if implemented as written.

**Key Concerns:**
1. Migration seed pattern could wipe existing custom exercises
2. No transaction safety guidance for multi-table workout saves
3. Soft-delete pattern mentioned but not enforced
4. No rollback procedures for failed AI-to-database operations
5. Missing data validation before destructive operations

---

## FINDINGS

### 🔴 FINDING 1: NASM Exercise Seed Migration — Potential Data Loss

**Severity:** CRITICAL  
**Data at Risk:** All custom exercises created by trainers  
**Blast Radius:** All users — could wipe entire exercise library  
**Location:** Section 5 (NASM Exercise Database) → "Seed Migration"

**What's Wrong:**

The blueprint states:
```javascript
// backend/migrations/YYYYMMDD-seed-nasm-exercise-library.cjs
// Upserts by name to prevent duplicates
// Sets nasmSource: true to distinguish from custom exercises
// Preserves any existing custom exercises
```

**This is dangerously vague.** The comment says "upserts by name" and "preserves custom exercises," but provides **no actual implementation guidance**. If an AI agent implements this as:

```javascript
// DANGEROUS PATTERN — DO NOT USE
await ExerciseLibrary.destroy({ where: {} }); // Wipes everything
await ExerciseLibrary.bulkCreate(nasmExercises); // Re-inserts only NASM
```

Or even:
```javascript
// ALSO DANGEROUS
await ExerciseLibrary.destroy({ where: { nasmSource: true } }); // Deletes all NASM
await ExerciseLibrary.bulkCreate(nasmExercises); // Re-inserts
// Problem: What if nasmSource column doesn't exist yet? Deletes EVERYTHING.
```

**This would permanently delete:**
- All custom exercises trainers have created
- Any workout logs referencing those exercises (if CASCADE delete)
- Historical data showing which exercises clients performed

**Fix:**

Add explicit safe migration pattern to the blueprint:

```javascript
// backend/migrations/YYYYMMDD-seed-nasm-exercise-library.cjs

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Step 1: Add nasmSource column if it doesn't exist (safe — doesn't touch data)
      const tableDescription = await queryInterface.describeTable('exercise_library');
      if (!tableDescription.nasmSource) {
        await queryInterface.addColumn('exercise_library', 'nasmSource', {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: false
        }, { transaction });
      }

      // Step 2: UPSERT ONLY — never DELETE
      // Use ON CONFLICT (name) DO UPDATE to safely handle duplicates
      const nasmExercises = [ /* 75 exercises */ ];
      
      for (const exercise of nasmExercises) {
        await queryInterface.sequelize.query(`
          INSERT INTO exercise_library (
            name, "primaryBodyParts", "secondaryBodyParts", 
            equipment, difficulty, category, "nasmSource", 
            "createdAt", "updatedAt"
          ) VALUES (
            :name, :primaryBodyParts, :secondaryBodyParts,
            :equipment, :difficulty, :category, true,
            NOW(), NOW()
          )
          ON CONFLICT (name) DO UPDATE SET
            "primaryBodyParts" = EXCLUDED."primaryBodyParts",
            "secondaryBodyParts" = EXCLUDED."secondaryBodyParts",
            equipment = EXCLUDED.equipment,
            difficulty = EXCLUDED.difficulty,
            category = EXCLUDED.category,
            "nasmSource" = true,
            "updatedAt" = NOW()
          WHERE exercise_library."nasmSource" = true;
          -- Only update if it's already a NASM exercise
          -- Never overwrite custom exercises
        `, {
          replacements: exercise,
          transaction
        });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // SAFE ROLLBACK: Only remove NASM exercises added by this migration
    await queryInterface.sequelize.query(`
      DELETE FROM exercise_library 
      WHERE "nasmSource" = true 
      AND name IN (:nasmNames)
    `, {
      replacements: { nasmNames: [/* list of 75 NASM exercise names */] }
    });
  }
};
```

**Additional Safeguards Needed:**

1. **Pre-migration backup check:**
```javascript
// At start of migration
const customExerciseCount = await queryInterface.sequelize.query(
  'SELECT COUNT(*) FROM exercise_library WHERE "nasmSource" = false OR "nasmSource" IS NULL',
  { type: Sequelize.QueryTypes.SELECT }
);

console.log(`[SAFETY CHECK] Found ${customExerciseCount[0].count} custom exercises. These will be preserved.`);
```

2. **Post-migration verification:**
```javascript
// At end of migration
const totalAfter = await queryInterface.sequelize.query(
  'SELECT COUNT(*) FROM exercise_library',
  { type: Sequelize.QueryTypes.SELECT }
);

if (totalAfter[0].count < customExerciseCount[0].count) {
  throw new Error('MIGRATION FAILED: Custom exercises were deleted. Rolling back.');
}
```

---

### 🟠 FINDING 2: Workout Save — No Transaction Wrapper Guidance

**Severity:** HIGH  
**Data at Risk:** Workout sessions, exercise logs, user XP, achievement progress  
**Blast Radius:** 1 user per failed save, but could corrupt their entire workout history  
**Location:** Section 8 (Data Flow Architecture) + Section 6 (Voice-First Dictation Workflow)

**What's Wrong:**

The sequence diagram in Section 6 shows:
```
WL->>DB: POST /api/admin/clients/:id/workouts
DB-->>T: ✅ Workout saved + XP awarded
```

But there's **no guidance on transaction safety**. A workout save involves:
1. Insert into `workout_sessions` table
2. Insert multiple rows into `workout_exercises` table (one per exercise)
3. Insert multiple rows into `exercise_sets` table (one per set)
4. Update `user_profiles.totalXP`
5. Possibly insert into `user_achievements` if a milestone is hit

**If any step fails halfway through:**
- Client sees "Workout saved!" toast
- But only 2 of 5 exercises were actually saved
- XP was awarded but workout is incomplete
- Client's workout history is now corrupted
- Re-saving creates duplicate partial data

**Fix:**

Add explicit transaction guidance to Section 9 (API Contract):

```typescript
// POST /api/admin/clients/:clientId/workouts
// MUST use transaction wrapper for multi-table operations

router.post('/clients/:clientId/workouts', requireAuth, requireRole(['admin', 'trainer']), async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Step 1: Create workout session
    const session = await WorkoutSession.create({
      userId: req.params.clientId,
      trainerId: req.user.id,
      date: req.body.date,
      duration: req.body.duration,
      intensity: req.body.intensity,
      notes: req.body.notes
    }, { transaction });

    // Step 2: Create exercises (bulk insert for performance)
    const exercises = req.body.exercises.map(ex => ({
      workoutSessionId: session.id,
      exerciseLibraryId: ex.exerciseId,
      exerciseName: ex.name,
      orderIndex: ex.orderIndex
    }));
    const createdExercises = await WorkoutExercise.bulkCreate(exercises, { 
      transaction,
      returning: true // PostgreSQL returns inserted IDs
    });

    // Step 3: Create sets (bulk insert)
    const sets = [];
    req.body.exercises.forEach((ex, exIndex) => {
      ex.sets.forEach((set, setIndex) => {
        sets.push({
          workoutExerciseId: createdExercises[exIndex].id,
          setNumber: setIndex + 1,
          reps: set.reps,
          weight: set.weight,
          rpe: set.rpe
        });
      });
    });
    await ExerciseSet.bulkCreate(sets, { transaction });

    // Step 4: Award XP (atomic update)
    const xpEarned = calculateWorkoutXP(req.body);
    await UserProfile.increment('totalXP', { 
      by: xpEarned, 
      where: { userId: req.params.clientId },
      transaction 
    });

    // Step 5: Check achievements (within same transaction)
    await checkAndAwardAchievements(req.params.clientId, transaction);

    // ALL STEPS SUCCEEDED — commit
    await transaction.commit();
    
    res.json({ 
      success: true, 
      session,
      xpEarned,
      message: 'Workout saved successfully'
    });

  } catch (error) {
    // ANY STEP FAILED — rollback everything
    await transaction.rollback();
    console.error('[WORKOUT SAVE FAILED]', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save workout. No data was modified.' 
    });
  }
});
```

**Add to blueprint Section 10 (Implementation Phases):**

> **Phase 7.5: Transaction Safety Audit (MANDATORY BEFORE DEPLOY)**
> - Verify all multi-table operations use transaction wrappers
> - Add integration test: Force failure at step 3 of workout save → verify rollback
> - Add integration test: Database connection drops mid-save → verify no partial data

---

### 🟠 FINDING 3: Soft-Delete Pattern Not Enforced

**Severity:** HIGH  
**Data at Risk:** Historical workout logs referencing deleted exercises  
**Blast Radius:** All users who have ever logged the deleted exercise  
**Location:** Section 5 → "Admin Custom Exercise Management" → "Key Rules" #7

**What's Wrong:**

The blueprint states:
> "**Soft-delete only** — Deleting sets `isActive: false` so historical workout logs referencing that exercise still display correctly"

But there's **no enforcement mechanism** described. If an AI agent implements the delete endpoint as:

```javascript
// DANGEROUS — Hard delete
router.delete('/exercises/custom/:id', requireRole(['admin']), async (req, res) => {
  await ExerciseLibrary.destroy({ where: { id: req.params.id } });
  res.json({ success: true });
});
```

**This would:**
1. Delete the exercise from `exercise_library`
2. If foreign key has `ON DELETE CASCADE`, delete all `workout_exercises` rows referencing it
3. If foreign key has `ON DELETE SET NULL`, leave orphaned workout logs with `exerciseLibraryId: null`
4. Either way, historical workout data is corrupted

**A client's workout history from 6 months ago would show:**
```
March 2025 Workout:
- [DELETED EXERCISE] — 4x10 @ 135 lbs
- Incline DB Press — 3x12 @ 50 lbs
```

**Fix:**

Add explicit soft-delete implementation to Section 9 (API Contract):

```typescript
// DELETE /api/exercises/custom/:id
// SOFT DELETE ONLY — sets isActive: false

router.delete('/exercises/custom/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Step 1: Verify it's a custom exercise (not NASM)
    const exercise = await ExerciseLibrary.findByPk(req.params.id, { transaction });
    
    if (!exercise) {
      return res.status(404).json({ success: false, error: 'Exercise not found' });
    }
    
    if (exercise.nasmSource) {
      return res.status(403).json({ 
        success: false, 
        error: 'Cannot delete NASM exercises' 
      });
    }

    // Step 2: Check if exercise is used in any workouts
    const usageCount = await WorkoutExercise.count({
      where: { exerciseLibraryId: req.params.id },
      transaction
    });

    // Step 3: Soft delete (NEVER hard delete)
    await exercise.update({ 
      isActive: false,
      deletedAt: new Date(),
      deletedBy: req.user.id
    }, { transaction });

    await transaction.commit();

    res.json({ 
      success: true, 
      message: `Exercise soft-deleted. ${usageCount} historical workouts still reference it.`,
      usageCount 
    });

  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
});
```

**Add to database schema (Section 5):**

```typescript
interface ExerciseLibrary {
  // ... existing fields
  isActive: boolean;        // Default: true
  deletedAt: Date | null;   // Timestamp of soft-delete
  deletedBy: number | null; // Admin user ID who deleted it
}
```

**Add migration to create these columns:**

```javascript
// backend/migrations/YYYYMMDD-add-soft-delete-to-exercises.cjs
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('exercise_library', 'isActive', {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    });
    await queryInterface.addColumn('exercise_library', 'deletedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.addColumn('exercise_library', 'deletedBy', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'user_profiles', key: 'id' }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('exercise_library', 'isActive');
    await queryInterface.removeColumn('exercise_library', 'deletedAt');
    await queryInterface.removeColumn('exercise_library', 'deletedBy');
  }
};
```

---

### 🟡 FINDING 4: No Guidance on AI Parsing Failures

**Severity:** MEDIUM  
**Data at Risk:** Workout logs could be saved with incorrect exercise names/data  
**Blast Radius:** 1 user per failed parse, but could corrupt their workout history  
**Location:** Section 6 (Voice-First Dictation Workflow) → "AI Matching Logic"

**What's Wrong:**

The blueprint describes AI parsing logic:
> "When the AI parses exercise names from natural speech:
> 1. Exact match against NASM library name
> 2. Fuzzy match (Levenshtein distance < 3)
> 3. Alias match
> 4. Body part inference
> 5. **Fallback — If no match, use free-text name and flag for trainer review**"

**The problem:** There's no guidance on what "flag for trainer review" means in the database. If implemented naively:

```javascript
// DANGEROUS — Saves unvalidated AI output directly
const exercises = aiResponse.exercises.map(ex => ({
  name: ex.name, // Could be gibberish if AI

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
