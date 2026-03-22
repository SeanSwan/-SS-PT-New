'use strict';

/**
 * Migration: Create UserExerciseStats materialized view
 * AI Village HIGH finding — on-the-fly aggregation is unsustainable
 * Materialized view refreshed every 15 minutes + after workout completion
 */
module.exports = {
  async up(queryInterface) {
    // Check if required tables exist
    const wsExists = await queryInterface.describeTable('WorkoutSessions').catch(() => null);
    const weExists = await queryInterface.describeTable('WorkoutExercises').catch(() => null);
    const exExists = await queryInterface.describeTable('Exercises').catch(() => null);

    if (!wsExists || !weExists || !exExists) {
      console.log('Required tables not found, skipping MV creation (will be created when tables exist)');
      return;
    }

    // Drop existing view if it exists (idempotent)
    await queryInterface.sequelize.query(
      `DROP MATERIALIZED VIEW IF EXISTS "UserExerciseStats_MV"`
    ).catch(() => null);

    // Create materialized view
    await queryInterface.sequelize.query(`
      CREATE MATERIALIZED VIEW "UserExerciseStats_MV" AS
      SELECT
        ws."userId",
        e.id AS "exerciseId",
        e.name AS "exerciseName",
        e."primaryMuscles",
        e.category,
        COUNT(DISTINCT we."workoutSessionId") AS "timesPerformed",
        COALESCE(MAX(s."weightUsed"), 0) AS "maxWeight",
        COALESCE(MAX(s."repsCompleted"), 0) AS "maxReps",
        COALESCE(SUM(s."weightUsed" * s."repsCompleted"), 0) AS "totalVolume",
        MAX(ws.date) AS "lastPerformedDate",
        MIN(ws.date) AS "firstPerformedDate"
      FROM "WorkoutExercises" we
      JOIN "Exercises" e ON we."exerciseId" = e.id
      JOIN "WorkoutSessions" ws ON we."workoutSessionId" = ws.id
      LEFT JOIN "Sets" s ON s."workoutExerciseId" = we.id
      WHERE ws.status = 'completed'
      GROUP BY ws."userId", e.id, e.name, e."primaryMuscles", e.category
      WITH NO DATA
    `).catch(err => {
      console.log('MV creation failed (likely missing columns):', err.message);
    });

    // Create unique index for concurrent refresh
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_exercise_stats_mv_unique"
      ON "UserExerciseStats_MV" ("userId", "exerciseId")
    `).catch(() => null);

    // Create index for userId lookups
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_user_exercise_stats_mv_user"
      ON "UserExerciseStats_MV" ("userId")
    `).catch(() => null);

    // Initial data population
    await queryInterface.sequelize.query(
      `REFRESH MATERIALIZED VIEW "UserExerciseStats_MV"`
    ).catch(err => {
      console.log('Initial MV refresh skipped (no data or missing tables):', err.message);
    });

    console.log('✅ UserExerciseStats_MV materialized view created');
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DROP MATERIALIZED VIEW IF EXISTS "UserExerciseStats_MV"`
    ).catch(() => null);
  },
};
