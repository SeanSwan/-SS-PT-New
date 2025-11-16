/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║           NASM EXERCISE LIBRARY FOUNDATION MIGRATION                      ║
 * ║    (NASM OPT™ Model Exercise Database with Video Integration)           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Purpose: Create comprehensive exercise library aligned with NASM OPT™ Model
 *          for science-based workout programming and video library integration
 *
 * Blueprint Reference: docs/ai-workflow/LEVEL-5-DOCUMENTATION-UPGRADE-STATUS.md
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      ARCHITECTURE OVERVIEW                               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * NASM OPT™ Model Integration:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ Exercise Library → NASM Phases → Workout Programs → Client Assignments  │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Relationship Diagram:
 * ┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
 * │ exercise_library │        │ exercise_videos  │        │  workout_plans   │
 * │  (Core Database) │◄───────│  (Video Assets)  │        │  (Programs)      │
 * │                  │        │                  │        │                  │
 * │ - id (UUID PK)   │        │ - exercise_id FK │        │ - exercises[]    │
 * │ - name           │        │ - video_type     │        │ - nasm_phase     │
 * │ - primary_muscle │        │ - s3_url         │        └──────────────────┘
 * │ - nasm_phases[]  │        │ - duration       │
 * │ - movement_patterns│      └──────────────────┘
 * │ - acute_variables│                 │
 * │ - deletedAt      │                 │
 * └──────────────────┘                 ▼
 *         │                    ┌──────────────────┐
 *         │                    │ workout_sessions │
 *         └───────────────────►│  (Logs/History)  │
 *                              │ - exercise_id FK │
 *                              │ - sets, reps     │
 *                              └──────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                  DATABASE ERD - EXERCISE LIBRARY                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * exercise_library Table:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ Table: exercise_library                                                  │
 * ├──────────────────────┬──────────────────────────────────────────────────┤
 * │ id                   │ UUID (PK, gen_random_uuid())                      │
 * │ name                 │ VARCHAR(200) - Exercise name                      │
 * │ description          │ TEXT - Form cues, technique details              │
 * │ primary_muscle       │ ENUM(15 muscles) - Main muscle targeted          │
 * │ secondary_muscles    │ JSONB - Array of secondary muscles               │
 * │ equipment            │ ENUM(14 types) - Required equipment              │
 * │ difficulty           │ ENUM('beginner', 'intermediate', 'advanced')     │
 * │ movement_patterns    │ JSONB - Array of NASM movement patterns          │
 * │ nasm_phases          │ JSONB - Array of applicable NASM phases (1-5)    │
 * │ contraindications    │ JSONB - Safety restrictions array                │
 * │ acute_variables      │ JSONB - Phase-specific programming parameters    │
 * │ created_at           │ TIMESTAMP (Auto-managed)                         │
 * │ updated_at           │ TIMESTAMP (Auto-managed)                         │
 * │ deletedAt            │ TIMESTAMP (Soft delete) - NULL = active          │
 * ├──────────────────────┼──────────────────────────────────────────────────┤
 * │ INDEXES (8)          │ name, primary_muscle, equipment, difficulty,     │
 * │                      │ deletedAt (B-tree), nasm_phases, movement_patterns│
 * │                      │ contraindications (GIN)                          │
 * └──────────────────────┴──────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                  NASM OPT™ MODEL INTEGRATION                             │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * NASM OPT™ 5 Phases of Training:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ Phase 1: Stabilization Endurance                                         │
 * │   - Focus: Muscular endurance, core stability, balance                   │
 * │   - Acute Variables: 12-20 reps, 4/2/1 tempo, 0-90s rest                │
 * │   - Example: Plank, Push-Up (beginner), Single-Leg Balance              │
 * │                                                                           │
 * │ Phase 2: Strength Endurance                                              │
 * │   - Focus: Stabilization + strength (superset format)                    │
 * │   - Acute Variables: 8-12 reps, 2/0/2 tempo, 0-60s rest                 │
 * │   - Example: Dumbbell RDL, Push-Up, Ball Squat                          │
 * │                                                                           │
 * │ Phase 3: Hypertrophy (Muscular Development)                              │
 * │   - Focus: Maximal muscle growth, aesthetic goals                        │
 * │   - Acute Variables: 6-12 reps, 2/0/2 tempo, 0-60s rest                 │
 * │   - Example: Barbell Squat, Dumbbell Bench Press, Cable Rows            │
 * │                                                                           │
 * │ Phase 4: Maximal Strength                                                │
 * │   - Focus: Peak force production, heavy loads                            │
 * │   - Acute Variables: 1-5 reps, explosive tempo, 3-5min rest             │
 * │   - Example: Barbell Squat (heavy), Deadlift, Bench Press (1RM)         │
 * │                                                                           │
 * │ Phase 5: Power                                                           │
 * │   - Focus: Rate of force development, explosive strength                 │
 * │   - Acute Variables: 1-10 reps, explosive tempo, varies rest            │
 * │   - Example: Box Jumps, Medicine Ball Throws, Olympic Lifts             │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Movement Patterns (NASM Classification):
 * - Pushing: Chest press, shoulder press, push-up
 * - Pulling: Rows, pull-ups, lat pulldown
 * - Squatting: Squat variations, leg press
 * - Lunging: Forward/reverse/lateral lunges, step-ups
 * - Hinging: Deadlift, RDL, good mornings
 * - Rotating: Wood chops, cable rotations
 * - Anti-rotation: Plank, Pallof press
 * - Gait: Walking, running, sled pushes
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                         DATA FLOW DIAGRAM                                │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Exercise Library Usage Flow:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 1. ADMIN CREATES EXERCISE                                                 │
 * │    POST /admin/exercise-library { name: "Barbell Squat", ... }           │
 * │    ↓                                                                      │
 * │    INSERT INTO exercise_library (                                        │
 * │      name, primary_muscle='quads', equipment='barbell',                  │
 * │      nasm_phases=[3,4,5], movement_patterns=['squatting'],               │
 * │      acute_variables={ phase_3: { sets: '3-5', reps: '6-12', ... } }     │
 * │    )                                                                     │
 * │    ↓                                                                      │
 * │    Upload video: POST /admin/exercise-library/:id/video                  │
 * │    INSERT INTO exercise_videos (exercise_id, s3_url, video_type='demo')  │
 * │                                                                           │
 * │ 2. TRAINER BUILDS WORKOUT PROGRAM                                        │
 * │    GET /exercise-library?phase=3&muscle=quads&equipment=barbell          │
 * │    ↓                                                                      │
 * │    SELECT * FROM exercise_library WHERE                                  │
 * │      nasm_phases @> '[3]'::jsonb AND                                     │
 * │      primary_muscle = 'quads' AND                                        │
 * │      equipment = 'barbell' AND                                           │
 * │      deletedAt IS NULL                                                   │
 * │    ↓                                                                      │
 * │    Results: Barbell Squat, Barbell Front Squat, Barbell Box Squat       │
 * │    ↓                                                                      │
 * │    Trainer adds to workout plan: POST /workout-plans/create              │
 * │      { exercises: [{ id: 'exercise-uuid', sets: 4, reps: 8 }] }          │
 * │                                                                           │
 * │ 3. CLIENT PERFORMS WORKOUT                                               │
 * │    GET /workout-plans/:id/view                                           │
 * │    ↓                                                                      │
 * │    Display: Exercise list with video previews                            │
 * │    ↓                                                                      │
 * │    Client watches demo video: GET /exercise/:id/video?type=demo          │
 * │    ↓                                                                      │
 * │    Client completes set: POST /workout-sessions/log                      │
 * │      { exerciseId, sets: 4, reps: 8, weight: 185 }                       │
 * │    ↓                                                                      │
 * │    Analytics: Track exercise frequency, progress over time               │
 * │                                                                           │
 * │ 4. EXERCISE SEARCH & FILTERING                                           │
 * │    GET /exercise-library/search?q=squat&difficulty=intermediate          │
 * │    ↓                                                                      │
 * │    SELECT * FROM exercise_library WHERE                                  │
 * │      name ILIKE '%squat%' AND                                            │
 * │      difficulty = 'intermediate' AND                                     │
 * │      deletedAt IS NULL                                                   │
 * │    ORDER BY name ASC                                                     │
 * │    ↓                                                                      │
 * │    Results: Bulgarian Split Squat, Goblet Squat, Pistol Squat           │
 * │                                                                           │
 * │ 5. SOFT DELETE (PRESERVE WORKOUT HISTORY)                                │
 * │    DELETE /admin/exercise-library/:id                                    │
 * │    ↓                                                                      │
 * │    UPDATE exercise_library SET deletedAt = NOW WHERE id = :id            │
 * │    ↓                                                                      │
 * │    Exercise hidden from new workouts, but existing workout logs preserved│
 * │    Past workout sessions still reference exercise (no broken FKs)        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                     BUSINESS LOGIC (WHY SECTIONS)                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY NASM-Specific Fields (Not Generic Exercise DB)?
 * - Professional credibility: NASM is gold-standard PT certification
 * - Science-based programming: OPT™ Model ensures periodization, progression
 * - Phase-specific exercises: Exercise suitability varies by training phase
 * - Client safety: Contraindications prevent injury (e.g., squats with knee injury)
 * - Acute variables: Phase-specific sets/reps/tempo for optimal results
 * - Trainer workflow: Filter exercises by phase, muscle, pattern for program design
 * - Evidence-based: NASM movement patterns map to functional human movement
 *
 * WHY nasm_phases JSONB Array (Not Separate Table)?
 * - Multi-phase exercises: Push-ups work in ALL phases (1-5)
 * - Fast querying: nasm_phases @> '[3]'::jsonb (GIN index)
 * - Flexible schema: Easy to add new phases without schema changes
 * - Denormalized performance: No JOIN overhead for phase filtering
 * - Simple updates: UPDATE nasm_phases = [2,3,4] vs managing junction table rows
 * - Example: Barbell Squat → phases [3,4,5] (hypertrophy, strength, power)
 *
 * WHY movement_patterns JSONB (Not ENUM)?
 * - Multiple patterns: Squat involves squatting + hinging patterns
 * - NASM taxonomy: 8 fundamental movement patterns
 * - Program balance: Ensure workouts include all movement patterns
 * - Flexible data: Can add custom patterns without migration
 * - GIN index: Efficient searching (movement_patterns @> '["pushing"]')
 * - Example: Dumbbell Thruster → ['squatting', 'pushing']
 *
 * WHY acute_variables JSON (Not Separate Columns)?
 * - Phase-specific: Different sets/reps/tempo for each NASM phase
 * - Example: { phase_1: { sets: '1-3', reps: '12-20', tempo: '4/2/1', rest: '0-90s' } }
 * - Flexible schema: Can add new parameters (rest intervals, intensity, etc.)
 * - Trainer reference: Display recommended programming during workout creation
 * - No schema bloat: Avoid 20+ columns for phase-specific data
 * - NASM alignment: Maps directly to OPT™ Model acute variable guidelines
 *
 * WHY contraindications JSONB Array?
 * - Client safety: Prevent exercise prescription for injured/at-risk clients
 * - Examples: ['knee_injury', 'shoulder_impingement', 'pregnancy', 'lower_back_pain']
 * - Trainer workflow: Filter out contraindicated exercises during program design
 * - Flexible schema: Can add new contraindications without migration
 * - GIN index: Efficient exclusion queries (NOT contraindications @> '["pregnancy"]')
 * - Legal protection: Documented safety considerations for liability
 *
 * WHY deletedAt Soft Delete (Not Hard DELETE)?
 * - Workout history integrity: Past workout logs reference exercises
 * - No broken FKs: workout_sessions.exercise_id remains valid
 * - Analytics: "Client performed Barbell Squat 50 times" even if exercise archived
 * - Recovery: Can un-delete exercises if removed by mistake
 * - Audit trail: Preserve exercise history for compliance, reporting
 * - Query pattern: WHERE deletedAt IS NULL (active exercises only)
 *
 * WHY primary_muscle ENUM + secondary_muscles JSONB?
 * - Primary muscle: Single main target (ENUM for consistency)
 * - Secondary muscles: Multiple assisting muscles (JSONB for flexibility)
 * - Example: Bench Press → primary='chest', secondary=['triceps', 'shoulders']
 * - NASM classification: 15 muscle groups (standardized taxonomy)
 * - Filtering: WHERE primary_muscle = 'quads' (exact match, indexed)
 * - Program balance: Ensure all muscle groups trained weekly
 *
 * WHY equipment ENUM (14 Types)?
 * - Gym inventory filtering: "Show exercises we have equipment for"
 * - Client equipment: Home workouts (bodyweight, resistance bands only)
 * - Trainer workflow: Filter by available equipment during program design
 * - Standard types: Barbell, dumbbell, kettlebell, cable, machine, bodyweight
 * - ENUM safety: Prevents typos ('dumbell' vs 'dumbbell')
 * - INDEX benefit: Fast equipment-based filtering
 *
 * WHY difficulty ENUM (beginner, intermediate, advanced)?
 * - Client progression: Start beginners with simpler exercises
 * - Exercise selection: Match difficulty to client fitness level
 * - Program design: Balance easy/hard exercises within workout
 * - Safety: Prevent advanced exercises for untrained clients
 * - Motivation: Progress from beginner → intermediate → advanced
 * - Standard levels: 3-tier system (industry standard)
 *
 * WHY UUID Primary Key (Not Integer)?
 * - Distributed systems: No ID collision across microservices
 * - Security: Non-sequential IDs (no predictable exercise enumeration)
 * - Future-proofing: Multi-tenant architecture (franchise gyms)
 * - Sync-friendly: Can generate UUIDs client-side (offline workout creation)
 * - Standard practice: UUIDs for entity tables, integers for junction tables
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                          INDEXES & CONSTRAINTS                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * B-tree Indexes (Fast Equality/Range Queries):
 * 1. idx_exercise_library_name - INDEX (name) WHERE deletedAt IS NULL
 * 2. idx_exercise_library_primary_muscle - INDEX (primary_muscle) WHERE deletedAt IS NULL
 * 3. idx_exercise_library_equipment - INDEX (equipment) WHERE deletedAt IS NULL
 * 4. idx_exercise_library_difficulty - INDEX (difficulty) WHERE deletedAt IS NULL
 * 5. idx_exercise_library_deleted_at - INDEX (deletedAt) WHERE deletedAt IS NULL
 *
 * GIN Indexes (Fast JSONB Array Searches):
 * 6. idx_exercise_library_nasm_phases - GIN (nasm_phases)
 *    - Query: nasm_phases @> '[3]'::jsonb (exercises for Phase 3)
 * 7. idx_exercise_library_movement_patterns - GIN (movement_patterns)
 *    - Query: movement_patterns @> '["pushing"]'::jsonb
 * 8. idx_exercise_library_contraindications - GIN (contraindications)
 *    - Query: NOT contraindications @> '["pregnancy"]'::jsonb
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        SECURITY CONSIDERATIONS                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - Admin-only writes: Only role='admin' can CREATE/UPDATE/DELETE exercises
 * - Trainer read access: Trainers can view all exercises for program design
 * - Client read access: Clients can view exercises assigned in their workouts
 * - Soft delete: deletedAt ensures historical data integrity
 * - Input validation: ENUM types prevent invalid muscle/equipment/difficulty values
 * - JSONB validation: Validate array structure before insert (e.g., nasm_phases=[1,2,3])
 * - SQL injection: Parameterized queries for all searches
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      MIGRATION SAFETY NOTES                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - Idempotent design: hasTable() check prevents duplicate creation
 * - Safe for production: CREATE TABLE is non-destructive
 * - UUID generation: gen_random_uuid() (PostgreSQL 13+ built-in)
 * - ENUM creation: Creates 3 ENUM types (muscle_group, equipment, difficulty)
 * - Seed data: Inserts 5 foundational NASM exercises for immediate use
 * - GIN indexes: Created AFTER table for optimal performance
 * - Rollback support: down() drops table + ENUMs cleanly
 * - No data loss: New table, no existing data to migrate
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                    RELATED FILES & DEPENDENCIES                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Depends On: None (foundational table)
 *
 * Related Code:
 * - backend/models/ExerciseLibrary.mjs (Sequelize/Knex model)
 * - backend/controllers/exerciseLibraryController.mjs (CRUD operations)
 * - backend/routes/exerciseLibraryRoutes.mjs (API endpoints)
 * - backend/services/nasmProgrammingService.mjs (NASM OPT™ logic)
 * - frontend/src/pages/Admin/ExerciseLibrary.tsx (Admin management)
 * - frontend/src/components/Trainer/ExerciseSelector.tsx (Workout builder)
 *
 * Related Migrations:
 * - exercise_videos table migration (child table, 1:M relationship)
 * - workout_plans table migration (references exercises)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

exports.up = async function(knex) {
  // Check if table already exists
  const exists = await knex.schema.hasTable('exercise_library');
  if (exists) {
    console.log('⏭️  Table exercise_library already exists, skipping...');
    return;
  }

  console.log('💪 Creating exercise_library table (NASM Foundation)...');

  await knex.schema.createTable('exercise_library', table => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Exercise identification
    table.string('name', 200).notNullable().comment('Exercise name (e.g., "Barbell Back Squat")');
    table.text('description').nullable().comment('Full exercise description with form cues');

    // NASM taxonomy
    table.enu('primary_muscle', [
      'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
      'abs', 'obliques', 'quads', 'hamstrings', 'glutes', 'calves',
      'hip_flexors', 'adductors', 'abductors'
    ], { useNative: true, enumName: 'muscle_group_enum' })
      .notNullable()
      .comment('Primary muscle targeted (NASM muscle classification)');

    table.jsonb('secondary_muscles')
      .nullable()
      .defaultTo('[]')
      .comment('Array of secondary muscles worked (e.g., ["abs", "glutes"])');

    table.enu('equipment', [
      'barbell', 'dumbbell', 'kettlebell', 'resistance_band', 'cable',
      'bodyweight', 'medicine_ball', 'stability_ball', 'trx', 'bosu',
      'foam_roller', 'bench', 'machine', 'other'
    ], { useNative: true, enumName: 'equipment_enum' })
      .notNullable()
      .comment('Required equipment');

    table.enu('difficulty', ['beginner', 'intermediate', 'advanced'],
      { useNative: true, enumName: 'difficulty_enum' })
      .notNullable()
      .comment('Exercise difficulty level');

    // Movement patterns (NASM OPT™ Model)
    table.jsonb('movement_patterns')
      .notNullable()
      .defaultTo('[]')
      .comment('Array of movement patterns: ["pushing", "pulling", "squatting", "lunging", "hinging", "rotating", "anti-rotation", "gait"]');

    // NASM OPT™ Phases (1-5)
    table.jsonb('nasm_phases')
      .notNullable()
      .defaultTo('[1]')
      .comment('Array of NASM phases this exercise is appropriate for: [1,2,3,4,5]');

    // Contraindications (safety)
    table.jsonb('contraindications')
      .nullable()
      .defaultTo('[]')
      .comment('Array of conditions where exercise should be avoided (e.g., ["shoulder_impingement", "pregnancy", "lower_back_pain"])');

    // Acute variables (NASM programming)
    table.jsonb('acute_variables')
      .nullable()
      .comment('Phase-specific programming: {"sets": "2-4", "reps": "12-20", "tempo": "4/2/1", "rest": "0-90s"}');

    // Metadata
    table.timestamps(true, true); // created_at, updated_at

    // Soft deletes (preserve workout history)
    table.timestamp('deletedAt')
      .nullable()
      .comment('Soft delete timestamp (NULL = active). Exercises never hard-deleted to preserve workout history.');
  });

  // Create indexes
  await knex.schema.raw(`
    CREATE INDEX idx_exercise_library_name ON exercise_library(name) WHERE "deletedAt" IS NULL;
    CREATE INDEX idx_exercise_library_primary_muscle ON exercise_library(primary_muscle) WHERE "deletedAt" IS NULL;
    CREATE INDEX idx_exercise_library_equipment ON exercise_library(equipment) WHERE "deletedAt" IS NULL;
    CREATE INDEX idx_exercise_library_difficulty ON exercise_library(difficulty) WHERE "deletedAt" IS NULL;
    CREATE INDEX idx_exercise_library_deleted_at ON exercise_library("deletedAt") WHERE "deletedAt" IS NULL;

    -- GIN index for JSONB searches (phases, patterns, contraindications)
    CREATE INDEX idx_exercise_library_nasm_phases ON exercise_library USING GIN (nasm_phases);
    CREATE INDEX idx_exercise_library_movement_patterns ON exercise_library USING GIN (movement_patterns);
    CREATE INDEX idx_exercise_library_contraindications ON exercise_library USING GIN (contraindications);
  `);

  // Seed initial exercises (basic NASM movements)
  console.log('🌱 Seeding foundational NASM exercises...');

  await knex('exercise_library').insert([
    {
      name: 'Barbell Back Squat',
      description: 'Foundational lower body exercise targeting quads, glutes, hamstrings. Stand with barbell on upper back, feet shoulder-width apart. Lower hips back and down to parallel, keeping chest up. Drive through heels to return to start.',
      primary_muscle: 'quads',
      secondary_muscles: JSON.stringify(['glutes', 'hamstrings', 'abs']),
      equipment: 'barbell',
      difficulty: 'intermediate',
      movement_patterns: JSON.stringify(['squatting']),
      nasm_phases: JSON.stringify([3, 4, 5]),
      contraindications: JSON.stringify(['knee_injury', 'lower_back_pain']),
      acute_variables: JSON.stringify({
        phase_3: { sets: '3-5', reps: '6-12', tempo: '2/0/2', rest: '0-60s' },
        phase_4: { sets: '4-6', reps: '1-5', tempo: 'explosive', rest: '3-5min' },
        phase_5: { sets: '3-6', reps: '1-12', tempo: 'varies', rest: '0-5min' }
      })
    },
    {
      name: 'Push-Up',
      description: 'Bodyweight chest exercise. Start in plank position with hands shoulder-width apart. Lower body until chest nearly touches floor. Push back up to start.',
      primary_muscle: 'chest',
      secondary_muscles: JSON.stringify(['triceps', 'shoulders', 'abs']),
      equipment: 'bodyweight',
      difficulty: 'beginner',
      movement_patterns: JSON.stringify(['pushing']),
      nasm_phases: JSON.stringify([1, 2, 3, 4, 5]),
      contraindications: JSON.stringify(['shoulder_impingement', 'wrist_pain']),
      acute_variables: JSON.stringify({
        phase_1: { sets: '1-3', reps: '12-20', tempo: '4/2/1', rest: '0-90s' },
        phase_2: { sets: '2-4', reps: '8-12', tempo: '2/0/2', rest: '0-60s' }
      })
    },
    {
      name: 'Dumbbell Romanian Deadlift',
      description: 'Hip hinge pattern targeting hamstrings and glutes. Hold dumbbells at thighs. Hinge at hips while keeping back straight, lowering dumbbells to mid-shin. Return to start by driving hips forward.',
      primary_muscle: 'hamstrings',
      secondary_muscles: JSON.stringify(['glutes', 'back']),
      equipment: 'dumbbell',
      difficulty: 'intermediate',
      movement_patterns: JSON.stringify(['hinging']),
      nasm_phases: JSON.stringify([2, 3, 4, 5]),
      contraindications: JSON.stringify(['lower_back_pain', 'hamstring_strain']),
      acute_variables: JSON.stringify({
        phase_2: { sets: '2-4', reps: '8-12', tempo: '2/0/2', rest: '0-60s' },
        phase_3: { sets: '3-5', reps: '6-12', tempo: '2/0/2', rest: '0-60s' }
      })
    },
    {
      name: 'Plank',
      description: 'Core stabilization exercise. Hold push-up position with forearms on ground. Maintain straight line from head to heels, engaging abs.',
      primary_muscle: 'abs',
      secondary_muscles: JSON.stringify(['obliques', 'back', 'shoulders']),
      equipment: 'bodyweight',
      difficulty: 'beginner',
      movement_patterns: JSON.stringify(['anti-rotation']),
      nasm_phases: JSON.stringify([1, 2, 3, 4, 5]),
      contraindications: JSON.stringify(['lower_back_pain', 'pregnancy']),
      acute_variables: JSON.stringify({
        phase_1: { sets: '1-3', duration: '15-60s', tempo: 'hold', rest: '0-90s' },
        phase_2: { sets: '2-4', duration: '30-90s', tempo: 'hold', rest: '0-60s' }
      })
    },
    {
      name: 'Dumbbell Bench Press',
      description: 'Upper body pressing movement for chest, shoulders, triceps. Lie on bench with dumbbells at chest height. Press dumbbells up until arms are extended. Lower with control.',
      primary_muscle: 'chest',
      secondary_muscles: JSON.stringify(['shoulders', 'triceps']),
      equipment: 'dumbbell',
      difficulty: 'intermediate',
      movement_patterns: JSON.stringify(['pushing']),
      nasm_phases: JSON.stringify([3, 4, 5]),
      contraindications: JSON.stringify(['shoulder_impingement', 'shoulder_instability']),
      acute_variables: JSON.stringify({
        phase_3: { sets: '3-5', reps: '6-12', tempo: '2/0/2', rest: '0-60s' },
        phase_4: { sets: '4-6', reps: '1-5', tempo: 'explosive', rest: '3-5min' }
      })
    }
  ]);

  console.log('✅ exercise_library table created with 5 foundational exercises');
  console.log('   Ready for Video Library integration!');
};

exports.down = async function(knex) {
  console.log('🗑️  Dropping exercise_library table...');

  await knex.schema.dropTableIfExists('exercise_library');

  // Drop enums
  await knex.raw('DROP TYPE IF EXISTS muscle_group_enum;');
  await knex.raw('DROP TYPE IF EXISTS equipment_enum;');
  await knex.raw('DROP TYPE IF EXISTS difficulty_enum;');

  console.log('✅ exercise_library table dropped');
};
