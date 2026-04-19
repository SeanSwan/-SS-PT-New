'use strict';

/**
 * Phase 16 (2026-04-16): open `workout_sessions.intensity` to null.
 *
 * Background: Phase 13–15.4 (commit 621a9f5a) made the client-progress
 * 12-chart READ side canonical. The WRITE side still seeded phantom
 * intensity values (5/10 default) into the same column the canonical
 * IntensityRpeTrendLine reads. Postgres AVG() correctly excludes null,
 * so a null-honest writer would fix the chart contamination — but the
 * model's `allowNull: false` constraint blocked null ingest. This
 * migration removes that blocker so Phase 16 writer fixes can ship
 * null on untouched state.
 *
 * Forward (up): idempotent. Checks `information_schema.columns.is_nullable`
 * first; if already 'YES', logs and exits. Otherwise ALTER ... DROP NOT NULL.
 *
 * Backward (down): pinned per Opus-Codex Round 4 consensus. A blind
 * SET NOT NULL after Phase 16 ships would fail on any row the writer
 * correctly persisted as null. The `down()` therefore refuses rollback
 * with an actionable error if null rows exist — pointing the operator
 * at the semantic decision they must make (default-5 backfill,
 * hard-delete, or archive) before re-running. The precheck is
 * read-only, and the refusal is non-destructive.
 *
 * Historical phantom 5/10 rows are intentionally NOT scrubbed (go-forward
 * only, per Sean's Round 2 ruling). The ambiguity of "user genuinely
 * rated 5" vs "writer seeded 5" is unresolvable from stored data alone.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const existingTables = await queryInterface.showAllTables();
    const tableNames = existingTables.map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry.tableName === 'string') return entry.tableName;
      return '';
    });

    if (!tableNames.includes('workout_sessions')) {
      console.log('[Migration] workout_sessions missing — nothing to alter');
      return;
    }

    // Idempotency: skip if the column is already nullable.
    const [rows] = await queryInterface.sequelize.query(
      `SELECT is_nullable FROM information_schema.columns
        WHERE table_name = 'workout_sessions' AND column_name = 'intensity';`
    );
    const isNullable = rows?.[0]?.is_nullable;
    if (isNullable === 'YES') {
      console.log('[Migration] workout_sessions.intensity already nullable, skipping');
      return;
    }

    await queryInterface.changeColumn('workout_sessions', 'intensity', {
      type: Sequelize.INTEGER,
      allowNull: true,
      validate: { min: 1, max: 10 },
    });

    console.log('[Migration] workout_sessions.intensity is now nullable (Phase 16)');
  },

  async down(queryInterface, Sequelize) {
    // Pinned 2026-04-16 / Phase 16: safe-rollback precheck.
    //
    // If ANY rows with null intensity exist, refuse rollback with an
    // actionable error instead of silently failing at the SET NOT NULL
    // step or silently backfilling. Null rows are a valid post-Phase-16
    // state (untouched intensity), not a data corruption signal.
    const [nullRows] = await queryInterface.sequelize.query(
      'SELECT COUNT(*)::int AS n FROM workout_sessions WHERE intensity IS NULL;'
    );
    const nullCount = Number(nullRows?.[0]?.n ?? 0);
    if (nullCount > 0) {
      throw new Error(
        `[Phase 16 rollback refused] workout_sessions.intensity has ${nullCount} null row(s). ` +
        `A blind SET NOT NULL would fail mid-rollback. To roll back Phase 16, ` +
        `first decide the semantic mapping for null-intensity rows (default-5 backfill, ` +
        `hard-delete, or archive) and apply it explicitly before re-running this down().`
      );
    }

    // No null rows — safe to restore the NOT NULL constraint.
    await queryInterface.changeColumn('workout_sessions', 'intensity', {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 10 },
    });

    console.log('[Migration] workout_sessions.intensity restored to NOT NULL (Phase 16 rollback)');
  },
};
