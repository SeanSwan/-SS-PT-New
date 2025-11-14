/**
 * Migration: Create exercise_library table (NASM Foundation)
 *
 * Purpose: Core exercise database for NASM OPT™ Model
 * Features:
 * - NASM-aligned exercise taxonomy
 * - Movement pattern classification
 * - Phase-specific contraindications
 * - Acute variable tracking
 * - Soft deletes for audit trail
 *
 * This table is the PARENT for exercise_videos (one exercise → many videos)
 *
 * Created: 2025-11-14 (prerequisite for Video Library)
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
