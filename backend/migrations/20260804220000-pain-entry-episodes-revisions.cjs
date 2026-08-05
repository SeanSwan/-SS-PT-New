'use strict';

const crypto = require('node:crypto');

/**
 * Pain-Chart Slice 4 (PAIN-CHART-UPGRADE-BLUEPRINT-2026-08-04 §6):
 *
 * 1. client_pain_entries.episodeId (UUID) — pain is episodic; a flat log made
 *    every trend a lie (a resolved 2/10 ankle followed by a new 8/10 shoulder
 *    read as "Worsening 2→8"). Backfill clusters each user's same-(region,
 *    side) entries into shared episodes when the gap between consecutive
 *    entries is < 30 days.
 *
 * 2. pain_entry_revisions — append-only audit of safety-relevant changes
 *    (F7): a 9/10 edited down to a 3 must never erase the 9.
 *
 * Idempotent via describeTable/showAllTables guards. Backfill runs in JS
 * (window clustering is awkward in portable SQL) inside one transaction.
 */

const EPISODE_GAP_MS = 30 * 24 * 60 * 60 * 1000;

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('client_pain_entries');

    if (!table.episodeId) {
      await queryInterface.addColumn('client_pain_entries', 'episodeId', {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'Episode grouping — same region/side entries within 30d share one',
      });
      await queryInterface.addIndex('client_pain_entries', ['episodeId'], { name: 'idx_pain_episode' });

      // Backfill: cluster per (userId, bodyRegion, side) by createdAt gap.
      await queryInterface.sequelize.transaction(async (transaction) => {
        const [rows] = await queryInterface.sequelize.query(
          `SELECT id, "userId", "bodyRegion", side, "createdAt"
           FROM client_pain_entries
           WHERE "episodeId" IS NULL
           ORDER BY "userId", "bodyRegion", side, "createdAt" ASC`,
          { transaction }
        );
        let currentKey = null;
        let currentEpisode = null;
        let lastCreatedMs = null;
        for (const row of rows) {
          const key = `${row.userId}|${row.bodyRegion}|${row.side}`;
          const createdMs = new Date(row.createdAt).getTime();
          if (key !== currentKey || lastCreatedMs === null || createdMs - lastCreatedMs >= EPISODE_GAP_MS) {
            currentEpisode = crypto.randomUUID();
          }
          currentKey = key;
          lastCreatedMs = createdMs;
          await queryInterface.sequelize.query(
            'UPDATE client_pain_entries SET "episodeId" = :episodeId WHERE id = :id',
            { replacements: { episodeId: currentEpisode, id: row.id }, transaction }
          );
        }
      });
    }

    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map((t) => (typeof t === 'string' ? t : t.tableName));
    if (!tableNames.includes('pain_entry_revisions')) {
      await queryInterface.createTable('pain_entry_revisions', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        painEntryId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'client_pain_entries', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        changedById: { type: Sequelize.INTEGER, allowNull: true },
        changes: { type: Sequelize.JSONB, allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      });
      await queryInterface.addIndex('pain_entry_revisions', ['painEntryId', 'createdAt'], {
        name: 'idx_pain_revision_entry_time',
      });
    }
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map((t) => (typeof t === 'string' ? t : t.tableName));
    if (tableNames.includes('pain_entry_revisions')) {
      await queryInterface.dropTable('pain_entry_revisions');
    }
    const table = await queryInterface.describeTable('client_pain_entries');
    if (table.episodeId) {
      await queryInterface.removeIndex('client_pain_entries', 'idx_pain_episode').catch(() => {});
      await queryInterface.removeColumn('client_pain_entries', 'episodeId');
    }
  },
};
