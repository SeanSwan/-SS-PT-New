'use strict';

/**
 * Phase 16.2 round 6 (2026-04-18): add missing columns to
 * `daily_workout_forms` so DailyWorkoutForm.findOne stops 500'ing on
 * `column "processing_started_at" does not exist`.
 *
 * Schema cross-check artifact (per CLAUDE.md rule 29):
 *
 * Model-declared field (DailyWorkoutForm.mjs)     DB column             Status
 * ───────────────────────────────────────────────  ────────────────────  ────────
 *   processingStartedAt   (line 251, DATE,  null)  processing_started_at   MISSING
 *   processingCompletedAt (line 257, DATE,  null)  processing_completed_at MISSING
 *   formVersion           (line 270, STRING, NN)   form_version            MISSING
 *   estimatedDuration     (line 277, INT,   null)  estimated_duration      MISSING
 *
 * All four are declared in the model but were never created by the
 * table-creation migrations at 20250714000002 or 20250806000002. Every
 * SELECT the model generates lists them, so Postgres rejects the query
 * at parse time. The canonical save path POST /api/workout-forms runs
 * DailyWorkoutForm.findOne (dailyWorkoutFormRoutes.mjs:492) and 500s
 * before it can persist.
 *
 * Note: the DB still has a legacy `mcp_processed_at` column from the
 * 2025-07-14 migration that the model has since replaced with
 * `processing_completed_at`. This migration does NOT touch that
 * orphan column — dropping it is orthogonal cleanup that risks losing
 * audit history and deserves its own slice.
 *
 * Forward (up): idempotent per-column existence check.
 *
 * Backward (down): refuses rollback if any row has non-null/non-default
 * data in the new columns, mirroring Phase 16's safe-rollback pattern.
 * form_version's default of '1.0' is treated as "no user data" for
 * rollback purposes.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const existingTables = await queryInterface.showAllTables();
    const tableNames = existingTables.map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry.tableName === 'string') return entry.tableName;
      return '';
    });

    if (!tableNames.includes('daily_workout_forms')) {
      console.log('[Migration] daily_workout_forms missing — nothing to alter');
      return;
    }

    const columnsToAdd = [
      {
        name: 'processing_started_at',
        spec: { type: Sequelize.DATE, allowNull: true },
      },
      {
        name: 'processing_completed_at',
        spec: { type: Sequelize.DATE, allowNull: true },
      },
      {
        name: 'form_version',
        // Matches model: STRING (varchar(255)), NOT NULL, default '1.0'.
        // Adding NOT NULL with a default backfills existing rows safely.
        spec: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: '1.0',
        },
      },
      {
        name: 'estimated_duration',
        spec: { type: Sequelize.INTEGER, allowNull: true },
      },
    ];

    for (const { name, spec } of columnsToAdd) {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT column_name FROM information_schema.columns
          WHERE table_name = 'daily_workout_forms' AND column_name = '${name}';`
      );
      if (rows && rows.length > 0) {
        console.log(`[Migration] daily_workout_forms.${name} already exists, skipping`);
        continue;
      }

      await queryInterface.addColumn('daily_workout_forms', name, spec);
      console.log(`[Migration] daily_workout_forms.${name} added`);
    }
  },

  async down(queryInterface /* , Sequelize */) {
    // Safe-rollback precheck: if any row has non-default data, refuse.
    // form_version rows equal to '1.0' are the default backfill and not
    // user data, so they don't block rollback.
    const [dataRows] = await queryInterface.sequelize.query(
      `SELECT
         COUNT(*) FILTER (WHERE processing_started_at   IS NOT NULL)::int  AS started_n,
         COUNT(*) FILTER (WHERE processing_completed_at IS NOT NULL)::int  AS completed_n,
         COUNT(*) FILTER (WHERE estimated_duration      IS NOT NULL)::int  AS duration_n,
         COUNT(*) FILTER (WHERE form_version IS NOT NULL AND form_version <> '1.0')::int AS version_n
       FROM daily_workout_forms;`
    );
    const startedN = Number(dataRows?.[0]?.started_n ?? 0);
    const completedN = Number(dataRows?.[0]?.completed_n ?? 0);
    const durationN = Number(dataRows?.[0]?.duration_n ?? 0);
    const versionN = Number(dataRows?.[0]?.version_n ?? 0);

    if (startedN + completedN + durationN + versionN > 0) {
      throw new Error(
        `[Phase 16.2 rollback refused] daily_workout_forms has populated ` +
        `data in columns this migration added: started=${startedN}, ` +
        `completed=${completedN}, estimated_duration=${durationN}, ` +
        `non-default form_version=${versionN}. Dropping would lose this ` +
        `data. Archive or null-out explicitly before re-running down().`
      );
    }

    // Reverse-order drops, each with its own existence check.
    const toDrop = [
      'estimated_duration',
      'form_version',
      'processing_completed_at',
      'processing_started_at',
    ];
    for (const name of toDrop) {
      const [existingRows] = await queryInterface.sequelize.query(
        `SELECT column_name FROM information_schema.columns
          WHERE table_name = 'daily_workout_forms' AND column_name = '${name}';`
      );
      if (!existingRows || existingRows.length === 0) {
        console.log(`[Migration] daily_workout_forms.${name} already absent, skipping`);
        continue;
      }
      await queryInterface.removeColumn('daily_workout_forms', name);
      console.log(`[Migration] daily_workout_forms.${name} dropped`);
    }
  },
};
