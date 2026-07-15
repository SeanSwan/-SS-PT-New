/**
 * ============================================================================
 * FILE: 20260715010000-add-workout-plan-revision-columns.cjs
 * PURPOSE: Expand workout_plans with backward-compatible content identity fields.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Adds nullable content_revision and content_hash columns
 * idempotently, then removes them in reverse order on an explicit rollback.
 * HOW IT FITS IN THE APP: Deploy migrator -> workout_plans -> revision-aware writers.
 * KEY DECISIONS: Columns remain nullable during writer consolidation; a later
 * contract migration will backfill hashes before enforcing non-null invariants.
 * NASM PROTOCOL CONTEXT: Stores the exact identity of the prescribed program.
 */

'use strict';

// SECTION: Expand-phase column contract
// PURPOSE: Add only missing identity columns and tolerate a partially applied run.
// WHY: Multiple application versions can coexist safely during the rollout.

const TABLE_NAME = 'workout_plans';
const REVISION_COLUMN = 'content_revision';
const HASH_COLUMN = 'content_hash';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable(TABLE_NAME);

    if (!table[REVISION_COLUMN]) {
      await queryInterface.addColumn(TABLE_NAME, REVISION_COLUMN, {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 1,
        comment: 'Monotonic prescribed-content revision; mutable progress does not increment it'
      });
    }

    if (!table[HASH_COLUMN]) {
      await queryInterface.addColumn(TABLE_NAME, HASH_COLUMN, {
        type: Sequelize.STRING(64),
        allowNull: true,
        comment: 'SHA-256 digest of canonical prescribed workout-plan content'
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable(TABLE_NAME);

    if (table[HASH_COLUMN]) {
      await queryInterface.removeColumn(TABLE_NAME, HASH_COLUMN);
    }

    if (table[REVISION_COLUMN]) {
      await queryInterface.removeColumn(TABLE_NAME, REVISION_COLUMN);
    }
  }
};
