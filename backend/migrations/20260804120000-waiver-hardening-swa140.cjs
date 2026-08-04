/**
 * SWA-140 — Waiver hardening (S2)
 * ================================
 * 1. waiver_versions: single-active-version invariant per (waiverType, activityType)
 *    via a partial unique expression index (COALESCE handles NULL activityType,
 *    which Postgres would otherwise treat as always-distinct). Older duplicate
 *    actives are retired first (deterministically keeping the newest — the same
 *    row the controller's dedupe already served, so served text does not change).
 * 2. waiver_versions.changeSummary — plain-language "what changed" shown in the
 *    re-consent flow.
 * 3. waiver_records.idempotencyKey — client-generated, unique when present;
 *    double-taps replay instead of duplicating a legal record.
 * 4. waiver_records participant/emergency fields — guardian-as-contracting-party
 *    model (participantName) + emergency contact for minors.
 * 5. Hot-path index for active-version lookups + waiver_record_versions
 *    (waiverVersionId) for re-consent impact counts.
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // ── 1a. Retire older duplicate actives (keep newest per key) ──
      await queryInterface.sequelize.query(
        `UPDATE waiver_versions wv
         SET "retiredAt" = NOW()
         WHERE wv."retiredAt" IS NULL
           AND EXISTS (
             SELECT 1 FROM waiver_versions newer
             WHERE newer."retiredAt" IS NULL
               AND newer."waiverType" = wv."waiverType"
               AND COALESCE(newer."activityType"::text, '') = COALESCE(wv."activityType"::text, '')
               AND (newer."effectiveAt" > wv."effectiveAt"
                    OR (newer."effectiveAt" = wv."effectiveAt" AND newer.id > wv.id))
           );`,
        { transaction },
      );

      // ── 1b. Enforce at most one active row per document key ──
      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS uq_waiver_versions_one_active
         ON waiver_versions ("waiverType", (COALESCE("activityType"::text, '')))
         WHERE "retiredAt" IS NULL;`,
        { transaction },
      );

      // ── 2. changeSummary ──
      await queryInterface.addColumn(
        'waiver_versions',
        'changeSummary',
        { type: Sequelize.TEXT, allowNull: true },
        { transaction },
      );

      // ── 3. idempotencyKey ──
      await queryInterface.addColumn(
        'waiver_records',
        'idempotencyKey',
        { type: Sequelize.STRING(80), allowNull: true },
        { transaction },
      );
      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS uq_waiver_records_idempotency_key
         ON waiver_records ("idempotencyKey")
         WHERE "idempotencyKey" IS NOT NULL;`,
        { transaction },
      );

      // ── 4. participant + emergency contact ──
      await queryInterface.addColumn(
        'waiver_records',
        'participantName',
        { type: Sequelize.STRING(200), allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        'waiver_records',
        'emergencyContactName',
        { type: Sequelize.STRING(200), allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        'waiver_records',
        'emergencyContactPhone',
        { type: Sequelize.STRING(50), allowNull: true },
        { transaction },
      );

      // ── 5. Hot-path + count indexes ──
      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_waiver_versions_active_lookup
         ON waiver_versions ("waiverType", "effectiveAt" DESC)
         WHERE "retiredAt" IS NULL;`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_waiver_record_versions_version
         ON waiver_record_versions ("waiverVersionId");`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS idx_waiver_record_versions_version;',
        { transaction },
      );
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS idx_waiver_versions_active_lookup;',
        { transaction },
      );
      await queryInterface.removeColumn('waiver_records', 'emergencyContactPhone', { transaction });
      await queryInterface.removeColumn('waiver_records', 'emergencyContactName', { transaction });
      await queryInterface.removeColumn('waiver_records', 'participantName', { transaction });
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS uq_waiver_records_idempotency_key;',
        { transaction },
      );
      await queryInterface.removeColumn('waiver_records', 'idempotencyKey', { transaction });
      await queryInterface.removeColumn('waiver_versions', 'changeSummary', { transaction });
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS uq_waiver_versions_one_active;',
        { transaction },
      );
      // Down does NOT un-retire rows retired in 1a — retirement is the safe
      // state and un-retiring would recreate the ambiguous-active condition.
    });
  },
};
