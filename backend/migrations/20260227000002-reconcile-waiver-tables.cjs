'use strict';

/**
 * 5W-B Reconciliation Migration
 * ==============================
 * Forward migration to align existing waiver tables with
 * WAIVER-CONSENT-QR-FLOW-CONTRACT.md §9.
 *
 * Changes:
 *   - ENUM value corrections (activityType, source, status)
 *   - Missing field additions (htmlText, markdownText, retiredAt, requiresReconsent,
 *     submittedByGuardian, guardianName, guardianTypedSignature, metadata, accepted, acceptedAt)
 *   - Column renames (mediaReleaseAccepted→mediaConsentAccepted, guardianAccepted→guardianAcknowledged)
 *   - Column removals (body, isActive on waiver_versions; guardianName, guardianRelationship on waiver_consent_flags)
 *   - CHECK constraints (activityType cross-field, contact required, confidenceScore range)
 *
 * Designed for safe execution on already-migrated databases (20260227000001 applied).
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const sq = queryInterface.sequelize;

    // ── Step 0: Pre-flight validation (read-only, no schema mutations) ──

    // Fail-fast: waiver_records with no contact info
    await sq.query(`
      DO $$
      DECLARE bad_count INTEGER;
      BEGIN
        SELECT COUNT(*) INTO bad_count FROM waiver_records
          WHERE NULLIF(BTRIM(email), '') IS NULL AND NULLIF(BTRIM(phone), '') IS NULL;
        IF bad_count > 0 THEN
          RAISE EXCEPTION '5W-B reconciliation BLOCKED: % waiver_records have no email or phone. Manual remediation required.', bad_count;
        END IF;
      END $$;
    `);

    // Fail-fast: activity_addendum rows with NULL activityType
    await sq.query(`
      DO $$
      DECLARE bad_count INTEGER;
      BEGIN
        SELECT COUNT(*) INTO bad_count FROM waiver_versions
          WHERE "waiverType" = 'activity_addendum' AND "activityType" IS NULL;
        IF bad_count > 0 THEN
          RAISE EXCEPTION '5W-B reconciliation BLOCKED: % waiver_versions with waiverType=activity_addendum have NULL activityType.', bad_count;
        END IF;
      END $$;
    `);

    // Fail-fast: non-addendum rows with non-NULL activityType
    await sq.query(`
      DO $$
      DECLARE bad_count INTEGER;
      BEGIN
        SELECT COUNT(*) INTO bad_count FROM waiver_versions
          WHERE "waiverType" != 'activity_addendum' AND "activityType" IS NOT NULL;
        IF bad_count > 0 THEN
          RAISE EXCEPTION '5W-B reconciliation BLOCKED: % waiver_versions with non-addendum waiverType have non-NULL activityType.', bad_count;
        END IF;
      END $$;
    `);

    // Guard against partial-failure reruns
    await sq.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_waiver_versions_activityType_old') THEN
          RAISE EXCEPTION '5W-B reconciliation: stale type enum_waiver_versions_activityType_old exists. A previous run may have partially completed. Drop stale types manually before re-running.';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_waiver_records_source_old') THEN
          RAISE EXCEPTION '5W-B reconciliation: stale type enum_waiver_records_source_old exists.';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_pending_waiver_matches_status_old') THEN
          RAISE EXCEPTION '5W-B reconciliation: stale type enum_pending_waiver_matches_status_old exists.';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'waiver_records' AND column_name = 'metadata') THEN
          RAISE EXCEPTION '5W-B reconciliation: column waiver_records.metadata already exists. '
            'A previous run may have partially completed. '
            'If recorded in SequelizeMeta, run down() first then re-run up(). '
            'If NOT recorded (partial failure), manually drop these added columns: '
            'waiver_versions(htmlText, markdownText, retiredAt, requiresReconsent), '
            'waiver_records(submittedByGuardian, guardianName, guardianTypedSignature, metadata), '
            'waiver_record_versions(accepted, acceptedAt); then drop stale enum _old types.';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'waiver_versions' AND column_name = 'htmlText') THEN
          RAISE EXCEPTION '5W-B reconciliation: column waiver_versions.htmlText already exists. See metadata guard above for recovery instructions.';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'waiver_record_versions' AND column_name = 'accepted') THEN
          RAISE EXCEPTION '5W-B reconciliation: column waiver_record_versions.accepted already exists. See metadata guard above for recovery instructions.';
        END IF;
      END $$;
    `);

    // NOTE: confidenceScore clamping moved to Step 7 (immediately before CHECK constraint)
    // to keep Step 0 strictly read-only validation.

    // ── Step 1: Add metadata column early + drop defaults ──

    await queryInterface.addColumn('waiver_records', 'metadata', {
      type: Sequelize.JSONB,
      allowNull: true,
    });

    await sq.query(`ALTER TABLE waiver_records ALTER COLUMN source DROP DEFAULT;`);
    await sq.query(`ALTER TABLE pending_waiver_matches ALTER COLUMN status DROP DEFAULT;`);

    // ── Step 2: Replace ENUM types ──

    // 2a. waiver_versions.activityType
    await sq.query(`
      UPDATE waiver_records
        SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('_pre_reconcile_source', source::text)
        WHERE source IS NOT NULL;
    `);

    await sq.query(`ALTER TYPE "enum_waiver_versions_activityType" RENAME TO "enum_waiver_versions_activityType_old";`);
    await sq.query(`CREATE TYPE "enum_waiver_versions_activityType" AS ENUM('HOME_GYM_PT','PARK_TRAINING','SWIMMING_LESSONS');`);
    await sq.query(`
      ALTER TABLE waiver_versions
        ALTER COLUMN "activityType" TYPE "enum_waiver_versions_activityType"
        USING (CASE "activityType"
          WHEN 'home_gym' THEN 'HOME_GYM_PT'
          WHEN 'park' THEN 'PARK_TRAINING'
          WHEN 'swimming' THEN 'SWIMMING_LESSONS'
        END)::"enum_waiver_versions_activityType";
    `);
    await sq.query(`DROP TYPE "enum_waiver_versions_activityType_old";`);

    // 2b. waiver_records.source
    await sq.query(`ALTER TYPE "enum_waiver_records_source" RENAME TO "enum_waiver_records_source_old";`);
    await sq.query(`CREATE TYPE "enum_waiver_records_source" AS ENUM('qr','header_waiver','admin_tablet','in_app');`);
    await sq.query(`
      ALTER TABLE waiver_records
        ALTER COLUMN source TYPE "enum_waiver_records_source"
        USING (CASE source
          WHEN 'public_qr' THEN 'qr'
          WHEN 'authenticated' THEN 'in_app'
        END)::"enum_waiver_records_source";
    `);
    await sq.query(`DROP TYPE "enum_waiver_records_source_old";`);

    // 2c. waiver_records.status — ADD VALUE (safe, no swap needed)
    await sq.query(`ALTER TYPE "enum_waiver_records_status" ADD VALUE IF NOT EXISTS 'revoked';`);

    // 2d. pending_waiver_matches.status
    await sq.query(`ALTER TYPE "enum_pending_waiver_matches_status" RENAME TO "enum_pending_waiver_matches_status_old";`);
    await sq.query(`CREATE TYPE "enum_pending_waiver_matches_status" AS ENUM('pending_review','auto_linked','approved','rejected');`);
    await sq.query(`
      ALTER TABLE pending_waiver_matches
        ALTER COLUMN status TYPE "enum_pending_waiver_matches_status"
        USING (CASE status
          WHEN 'pending' THEN 'pending_review'
          WHEN 'manual_linked' THEN 'approved'
          ELSE status::text
        END)::"enum_pending_waiver_matches_status";
    `);
    await sq.query(`DROP TYPE "enum_pending_waiver_matches_status_old";`);

    // ── Step 3: Re-set defaults ──

    await sq.query(`ALTER TABLE waiver_records ALTER COLUMN source SET DEFAULT 'qr';`);
    await sq.query(`ALTER TABLE pending_waiver_matches ALTER COLUMN status SET DEFAULT 'pending_review';`);

    // ── Step 4: Add missing columns + backfill ──

    // waiver_versions
    await queryInterface.addColumn('waiver_versions', 'htmlText', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn('waiver_versions', 'markdownText', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn('waiver_versions', 'retiredAt', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('waiver_versions', 'requiresReconsent', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    // Backfill from old columns
    await sq.query(`UPDATE waiver_versions SET "htmlText" = body WHERE body IS NOT NULL;`);
    await sq.query(`UPDATE waiver_versions SET "retiredAt" = NOW() WHERE "isActive" = false;`);

    // waiver_records (metadata already added in Step 1)
    await queryInterface.addColumn('waiver_records', 'submittedByGuardian', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn('waiver_records', 'guardianName', { type: Sequelize.STRING(200), allowNull: true });
    await queryInterface.addColumn('waiver_records', 'guardianTypedSignature', { type: Sequelize.TEXT, allowNull: true });

    // Backfill guardianName from consent flags
    await sq.query(`
      UPDATE waiver_records wr
      SET "guardianName" = wcf."guardianName"
      FROM waiver_consent_flags wcf
      WHERE wr.id = wcf."waiverRecordId"
        AND wcf."guardianName" IS NOT NULL;
    `);

    // waiver_record_versions
    await queryInterface.addColumn('waiver_record_versions', 'accepted', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn('waiver_record_versions', 'acceptedAt', { type: Sequelize.DATE, allowNull: true });

    // ── Step 5: Rename consent flag columns ──

    await queryInterface.renameColumn('waiver_consent_flags', 'mediaReleaseAccepted', 'mediaConsentAccepted');
    await queryInterface.renameColumn('waiver_consent_flags', 'guardianAccepted', 'guardianAcknowledged');

    // ── Step 6: Remove replaced/migrated columns ──

    // INTENTIONAL DATA MIGRATION:
    // - waiver_versions.body → data migrated to htmlText in Step 4
    // - waiver_versions.isActive → semantics migrated to retiredAt in Step 4
    // - waiver_consent_flags.guardianName → data migrated to waiver_records.guardianName in Step 4
    // - waiver_consent_flags.guardianRelationship → DROPPED (not in contract §9.4)
    await queryInterface.removeColumn('waiver_consent_flags', 'guardianName');
    await queryInterface.removeColumn('waiver_consent_flags', 'guardianRelationship');
    await queryInterface.removeColumn('waiver_versions', 'body');
    await queryInterface.removeColumn('waiver_versions', 'isActive');

    // ── Step 7: Pre-constraint data remediation + CHECK constraints ──

    // Remediate: confidenceScore out of range (immediately before CHECK)
    await sq.query(`UPDATE pending_waiver_matches SET "confidenceScore" = 0 WHERE "confidenceScore" < 0;`);
    await sq.query(`UPDATE pending_waiver_matches SET "confidenceScore" = 1 WHERE "confidenceScore" > 1;`);

    await sq.query(`
      ALTER TABLE waiver_versions ADD CONSTRAINT chk_wv_activity_type CHECK (
        ("waiverType" = 'activity_addendum' AND "activityType" IS NOT NULL) OR
        ("waiverType" != 'activity_addendum' AND "activityType" IS NULL)
      );
    `);

    await sq.query(`
      ALTER TABLE waiver_records ADD CONSTRAINT chk_wr_contact_required CHECK (
        NULLIF(BTRIM(email), '') IS NOT NULL OR
        NULLIF(BTRIM(phone), '') IS NOT NULL
      );
    `);

    await sq.query(`
      ALTER TABLE pending_waiver_matches ADD CONSTRAINT chk_pwm_confidence CHECK (
        "confidenceScore" >= 0 AND "confidenceScore" <= 1
      );
    `);
  },

  down: async (queryInterface, Sequelize) => {
    const sq = queryInterface.sequelize;

    // ── Step 1: Drop CHECK constraints ──

    await sq.query(`ALTER TABLE pending_waiver_matches DROP CONSTRAINT IF EXISTS chk_pwm_confidence;`);
    await sq.query(`ALTER TABLE waiver_records DROP CONSTRAINT IF EXISTS chk_wr_contact_required;`);
    await sq.query(`ALTER TABLE waiver_versions DROP CONSTRAINT IF EXISTS chk_wv_activity_type;`);

    // ── Step 2: Re-add dropped columns ──

    await queryInterface.addColumn('waiver_versions', 'body', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn('waiver_versions', 'isActive', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
    await queryInterface.addColumn('waiver_consent_flags', 'guardianName', { type: Sequelize.STRING(200), allowNull: true });
    await queryInterface.addColumn('waiver_consent_flags', 'guardianRelationship', { type: Sequelize.STRING(100), allowNull: true });

    // ── Step 3: Backfill old columns from new ──

    await sq.query(`UPDATE waiver_versions SET body = COALESCE("htmlText", "markdownText") WHERE COALESCE("htmlText", "markdownText") IS NOT NULL;`);
    await sq.query(`UPDATE waiver_versions SET "isActive" = ("retiredAt" IS NULL);`);
    await sq.query(`
      UPDATE waiver_consent_flags wcf
      SET "guardianName" = wr."guardianName"
      FROM waiver_records wr
      WHERE wcf."waiverRecordId" = wr.id
        AND wr."guardianName" IS NOT NULL;
    `);

    // ── Step 4: Reverse column renames ──

    await queryInterface.renameColumn('waiver_consent_flags', 'mediaConsentAccepted', 'mediaReleaseAccepted');
    await queryInterface.renameColumn('waiver_consent_flags', 'guardianAcknowledged', 'guardianAccepted');

    // ── Step 5: Remove added columns (metadata kept until Step 8) ──

    await queryInterface.removeColumn('waiver_versions', 'htmlText');
    await queryInterface.removeColumn('waiver_versions', 'markdownText');
    await queryInterface.removeColumn('waiver_versions', 'retiredAt');
    await queryInterface.removeColumn('waiver_versions', 'requiresReconsent');
    await queryInterface.removeColumn('waiver_records', 'submittedByGuardian');
    await queryInterface.removeColumn('waiver_records', 'guardianName');
    await queryInterface.removeColumn('waiver_records', 'guardianTypedSignature');
    await queryInterface.removeColumn('waiver_record_versions', 'accepted');
    await queryInterface.removeColumn('waiver_record_versions', 'acceptedAt');

    // ── Step 6: Drop defaults before reversing ENUMs ──

    await sq.query(`ALTER TABLE waiver_records ALTER COLUMN source DROP DEFAULT;`);
    await sq.query(`ALTER TABLE pending_waiver_matches ALTER COLUMN status DROP DEFAULT;`);

    // ── Step 7: Reverse ENUM swaps ──

    // 2d reverse: pending_waiver_matches.status
    await sq.query(`ALTER TYPE "enum_pending_waiver_matches_status" RENAME TO "enum_pending_waiver_matches_status_new";`);
    await sq.query(`CREATE TYPE "enum_pending_waiver_matches_status" AS ENUM('pending','auto_linked','manual_linked','rejected');`);
    await sq.query(`
      ALTER TABLE pending_waiver_matches
        ALTER COLUMN status TYPE "enum_pending_waiver_matches_status"
        USING (CASE status
          WHEN 'pending_review' THEN 'pending'
          WHEN 'approved' THEN 'manual_linked'
          ELSE status::text
        END)::"enum_pending_waiver_matches_status";
    `);
    await sq.query(`ALTER TABLE pending_waiver_matches ALTER COLUMN status SET DEFAULT 'pending';`);
    await sq.query(`DROP TYPE "enum_pending_waiver_matches_status_new";`);

    // 2b reverse: waiver_records.source
    await sq.query(`ALTER TYPE "enum_waiver_records_source" RENAME TO "enum_waiver_records_source_new";`);
    await sq.query(`CREATE TYPE "enum_waiver_records_source" AS ENUM('public_qr','authenticated');`);
    await sq.query(`
      ALTER TABLE waiver_records
        ALTER COLUMN source TYPE "enum_waiver_records_source"
        USING (CASE source
          WHEN 'qr' THEN 'public_qr'
          WHEN 'header_waiver' THEN 'public_qr'
          WHEN 'admin_tablet' THEN 'authenticated'
          WHEN 'in_app' THEN 'authenticated'
        END)::"enum_waiver_records_source";
    `);
    await sq.query(`ALTER TABLE waiver_records ALTER COLUMN source SET DEFAULT 'public_qr';`);
    await sq.query(`DROP TYPE "enum_waiver_records_source_new";`);

    // 2a reverse: waiver_versions.activityType
    await sq.query(`ALTER TYPE "enum_waiver_versions_activityType" RENAME TO "enum_waiver_versions_activityType_new";`);
    await sq.query(`CREATE TYPE "enum_waiver_versions_activityType" AS ENUM('home_gym','park','swimming');`);
    await sq.query(`
      ALTER TABLE waiver_versions
        ALTER COLUMN "activityType" TYPE "enum_waiver_versions_activityType"
        USING (CASE "activityType"
          WHEN 'HOME_GYM_PT' THEN 'home_gym'
          WHEN 'PARK_TRAINING' THEN 'park'
          WHEN 'SWIMMING_LESSONS' THEN 'swimming'
        END)::"enum_waiver_versions_activityType";
    `);
    await sq.query(`DROP TYPE "enum_waiver_versions_activityType_new";`);

    // 2c reverse: waiver_records.status — cannot remove 'revoked' from PG ENUM
    await sq.query(`UPDATE waiver_records SET status = 'superseded' WHERE status = 'revoked';`);

    // ── Step 8: Final cleanup (after all enum reversals succeed) ──

    await queryInterface.removeColumn('waiver_records', 'metadata');
  },
};
