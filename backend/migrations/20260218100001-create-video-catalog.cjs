'use strict';

/**
 * Migration: 20260218100001-create-video-catalog.cjs
 * ==================================================
 * Creates the `video_catalog` table — the CORE content table for the SwanStudios
 * video library system.
 *
 * This migration:
 *   1. Ensures gen_random_uuid() is available (PG 13+ built-in, else pgcrypto)
 *   2. Creates 6 ENUM types for video_catalog columns
 *   3. Creates the video_catalog table with all columns
 *   4. Adds ~25 CHECK constraints (source-visibility, source-field nulling,
 *      pending_object_key lifecycle, visibility+access_tier invariants,
 *      publish gate invariants, data format guards, upload trust field invariants)
 *   5. Creates 11 indexes (slug partial unique, composite, GIN, partial uniques)
 *   6. Creates a PostgreSQL trigger (fn_guard_trust_fields / trg_guard_trust_fields)
 *      that prevents UPDATE mutations to immutable trust fields
 *
 * FK references:
 *   - creator_id → Users(id) (INTEGER, resolved at runtime via resolveUsersTable helper)
 *   - exercise_id → exercise_library(id) (UUID, optional — FK only added if table exists)
 *
 * Soft-delete support: deletedAt column (Sequelize paranoid mode)
 *
 * down() drops trigger + function BEFORE dropping table, then drops all ENUM types.
 */

const resolveUsersTable = require('./helpers/resolveUsersTable.cjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // ── Idempotent guard: skip if table already exists ──
      const tables = await queryInterface.showAllTables();
      if (tables.includes('video_catalog')) {
        console.log('video_catalog table already exists, skipping migration.');
        await transaction.commit();
        return;
      }

      // ── Resolve Users table name (production = "Users" with capital U) ──
      const usersTable = await resolveUsersTable(queryInterface);
      console.log(`Resolved Users table: ${usersTable}`);

      // ── Preflight: ensure gen_random_uuid() is available ──
      try {
        await queryInterface.sequelize.query('SELECT gen_random_uuid();', { transaction });
        console.log('gen_random_uuid() available natively.');
      } catch (_err) {
        console.log('gen_random_uuid() not available natively, installing pgcrypto...');
        await queryInterface.sequelize.query(
          'CREATE EXTENSION IF NOT EXISTS "pgcrypto";',
          { transaction }
        );
        console.log('pgcrypto extension installed.');
      }

      // ── Check if exercise_library table exists (for optional FK) ──
      const exerciseLibraryExists = tables.includes('exercise_library');
      if (exerciseLibraryExists) {
        console.log('exercise_library table found — will create FK for exercise_id.');
      } else {
        console.log('exercise_library table not found — exercise_id FK will be skipped.');
      }

      // ── Create ENUM types ──
      console.log('Creating ENUM types for video_catalog...');

      await queryInterface.sequelize.query(
        `DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_video_catalog_content_type') THEN
            CREATE TYPE "enum_video_catalog_content_type" AS ENUM(
              'exercise', 'tutorial', 'behind_scenes', 'vlog', 'testimonial', 'course_lesson'
            );
          END IF;
        END $$;`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_video_catalog_source') THEN
            CREATE TYPE "enum_video_catalog_source" AS ENUM('upload', 'youtube');
          END IF;
        END $$;`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_video_catalog_visibility') THEN
            CREATE TYPE "enum_video_catalog_visibility" AS ENUM('public', 'members_only', 'unlisted');
          END IF;
        END $$;`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_video_catalog_access_tier') THEN
            CREATE TYPE "enum_video_catalog_access_tier" AS ENUM('free', 'member', 'premium');
          END IF;
        END $$;`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_video_catalog_status') THEN
            CREATE TYPE "enum_video_catalog_status" AS ENUM('draft', 'published', 'archived');
          END IF;
        END $$;`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_video_catalog_youtube_cta_strategy') THEN
            CREATE TYPE "enum_video_catalog_youtube_cta_strategy" AS ENUM(
              'watch_on_youtube', 'subscribe', 'playlist_cta', 'none'
            );
          END IF;
        END $$;`,
        { transaction }
      );

      // ── Create video_catalog table ──
      console.log('Creating video_catalog table...');

      const tableDefinition = {
        // ── Primary Key ──
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
          allowNull: false,
        },

        // ── Core fields ──
        title: {
          type: Sequelize.STRING(300),
          allowNull: false,
        },
        slug: {
          type: Sequelize.STRING(300),
          allowNull: false,
          // Uniqueness enforced via partial index only (not column-level UNIQUE)
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        longDescription: {
          type: Sequelize.TEXT,
          allowNull: true,
          field: 'long_description',
        },
        contentType: {
          type: '"enum_video_catalog_content_type"',
          allowNull: true,
          field: 'content_type',
        },
        source: {
          type: '"enum_video_catalog_source"',
          allowNull: false,
        },
        visibility: {
          type: '"enum_video_catalog_visibility"',
          allowNull: true,
          defaultValue: 'public',
        },
        accessTier: {
          type: '"enum_video_catalog_access_tier"',
          allowNull: true,
          defaultValue: 'free',
          field: 'access_tier',
        },
        status: {
          type: '"enum_video_catalog_status"',
          allowNull: true,
          defaultValue: 'draft',
        },

        // ── YouTube fields ──
        youtubeVideoId: {
          type: Sequelize.STRING(20),
          allowNull: true,
          field: 'youtube_video_id',
        },
        youtubeChannelId: {
          type: Sequelize.STRING(30),
          allowNull: true,
          field: 'youtube_channel_id',
        },
        youtubeCTAStrategy: {
          type: '"enum_video_catalog_youtube_cta_strategy"',
          allowNull: true,
          defaultValue: 'none',
          field: 'youtube_cta_strategy',
        },
        youtubePlaylistUrl: {
          type: Sequelize.STRING(500),
          allowNull: true,
          field: 'youtube_playlist_url',
        },

        // ── Hosted upload fields ──
        hostedKey: {
          type: Sequelize.STRING(500),
          allowNull: true,
          field: 'hosted_key',
        },
        fileSizeBytes: {
          type: Sequelize.BIGINT,
          allowNull: true,
          field: 'file_size_bytes',
        },
        fileChecksumSha256: {
          type: Sequelize.STRING(64),
          allowNull: true,
          field: 'file_checksum_sha256',
        },
        originalFilename: {
          type: Sequelize.STRING(300),
          allowNull: true,
          field: 'original_filename',
        },
        mimeType: {
          type: Sequelize.STRING(100),
          allowNull: true,
          field: 'mime_type',
        },

        // ── Shared media fields ──
        thumbnailKey: {
          type: Sequelize.STRING(500),
          allowNull: true,
          field: 'thumbnail_key',
        },
        thumbnailUrl: {
          type: Sequelize.STRING(1000),
          allowNull: true,
          field: 'thumbnail_url',
        },
        posterKey: {
          type: Sequelize.STRING(500),
          allowNull: true,
          field: 'poster_key',
        },
        durationSeconds: {
          type: Sequelize.INTEGER,
          allowNull: true,
          field: 'duration_seconds',
        },
        captionsKey: {
          type: Sequelize.STRING(500),
          allowNull: true,
          field: 'captions_key',
        },
        hlsManifestUrl: {
          type: Sequelize.STRING(1000),
          allowNull: true,
          field: 'hls_manifest_url',
        },

        // ── Metadata ──
        tags: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: [],
        },
        chapters: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: [],
        },
        seoTitle: {
          type: Sequelize.STRING(200),
          allowNull: true,
          field: 'seo_title',
        },
        seoDescription: {
          type: Sequelize.STRING(500),
          allowNull: true,
          field: 'seo_description',
        },

        // ── Counters (denormalized for read performance) ──
        viewCount: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'view_count',
        },
        likeCount: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'like_count',
        },

        // ── Relationships ──
        exerciseId: {
          type: Sequelize.UUID,
          allowNull: true,
          field: 'exercise_id',
          ...(exerciseLibraryExists
            ? {
                references: { model: 'exercise_library', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
              }
            : {}),
        },
        creatorId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          field: 'creator_id',
          references: { model: usersTable, key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },

        // ── Publishing ──
        publishedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          field: 'published_at',
        },
        featured: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        sortOrder: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'sort_order',
        },

        // ── Upload binding fields ──
        metadataCompleted: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'metadata_completed',
        },
        declaredFileSize: {
          type: Sequelize.BIGINT,
          allowNull: true,
          field: 'declared_file_size',
        },
        declaredMimeType: {
          type: Sequelize.STRING(100),
          allowNull: true,
          field: 'declared_mime_type',
        },
        uploadMode: {
          type: Sequelize.CHAR(1),
          allowNull: true,
          field: 'upload_mode',
        },
        declaredChecksum: {
          type: Sequelize.STRING(64),
          allowNull: true,
          field: 'declared_checksum',
        },
        pendingObjectKey: {
          type: Sequelize.STRING(500),
          allowNull: true,
          field: 'pending_object_key',
        },

        // ── Legacy/system flags ──
        legacyImport: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'legacy_import',
        },

        // ── Timestamps ──
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()'),
          field: 'created_at',
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()'),
          field: 'updated_at',
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
      };

      await queryInterface.createTable('video_catalog', tableDefinition, { transaction });
      console.log('video_catalog table created.');

      // ══════════════════════════════════════════════════════════════════
      // CHECK CONSTRAINTS
      // ══════════════════════════════════════════════════════════════════

      console.log('Adding CHECK constraints...');

      // ── Source-visibility: YouTube cannot be members-only ──
      await queryInterface.sequelize.query(
        `ALTER TABLE video_catalog ADD CONSTRAINT chk_vc_source_visibility
         CHECK (source != 'youtube' OR visibility != 'members_only');`,
        { transaction }
      );

      // ── Source-hosted_key: uploads must have R2 key (with draft+pending and legacy exceptions) ──
      await queryInterface.sequelize.query(
        `ALTER TABLE video_catalog ADD CONSTRAINT chk_vc_source_hosted_key
         CHECK (
           source != 'upload'
           OR hosted_key IS NOT NULL
           OR (status = 'draft' AND pending_object_key IS NOT NULL)
           OR (status = 'archived' AND legacy_import = true)
         );`,
        { transaction }
      );

      // ── Source-youtube_video_id: YouTube must have video ID ──
      await queryInterface.sequelize.query(
        `ALTER TABLE video_catalog ADD CONSTRAINT chk_vc_source_youtube_id
         CHECK (source != 'youtube' OR youtube_video_id IS NOT NULL);`,
        { transaction }
      );

      // ── SOURCE-FIELD CROSS-NULLING INVARIANTS (6 reverse constraints) ──

      // Uploads must NOT have YouTube fields
      await queryInterface.sequelize.query(
        `ALTER TABLE video_catalog ADD CONSTRAINT chk_vc_upload_no_youtube_id
         CHECK (source != 'upload' OR youtube_video_id IS NULL);`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE video_catalog ADD CONSTRAINT chk_vc_upload_no_youtube_channel
         CHECK (source != 'upload' OR youtube_channel_id IS NULL);`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE video_catalog ADD CONSTRAINT chk_vc_upload_no_youtube_playlist
         CHECK (source != 'upload' OR youtube_playlist_url IS NULL);`,
        { transaction }
      );

      // YouTube must NOT have upload fields
      await queryInterface.sequelize.query(
        `ALTER TABLE video_catalog ADD CONSTRAINT chk_vc_youtube_no_hosted_key
         CHECK (source != 'youtube' OR hosted_key IS NULL);`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE video_catalog ADD CONSTRAINT chk_vc_youtube_no_file_size
         CHECK (source != 'youtube' OR file_size_bytes IS NULL);`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE video_catalog ADD CONSTRAINT chk_vc_youtube_no_checksum
         CHECK (source != 'youtube' OR file_checksum_sha256 IS NULL);`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE video_catalog ADD CONSTRAINT chk_vc_youtube_no_filename
         CHECK (source != 'youtube' OR original_filename IS NULL);`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE video_catalog ADD CONSTRAINT chk_vc_youtube_no_mime_type
         CHECK (source != 'youtube' OR mime_type IS NULL);`,
        { transaction }
      );

      // ── pending_object_key lifecycle (single strict CHECK) ──
      await queryInterface.sequelize.query(
        `ALTER TABLE video_catalog ADD CONSTRAINT chk_vc_pending_object_key_lifecycle
         CHECK (
           pending_object_key IS NULL
           OR (source = 'upload' AND status = 'draft' AND hosted_key IS NULL)
         );`,
        { transaction }
      );

      // ── UPLOAD TRUST FIELD INVARIANTS ──

      // Upload rows MUST have a mode (unless legacy backfill)
      await queryInterface.sequelize.query(
        `ALTER TABLE video_catalog ADD CONSTRAINT chk_vc_upload_mode_required
         CHECK (source != 'upload' OR legacy_import = true OR upload_mode IN ('A', 'B'));`,
        { transaction }
      );

      // YouTube rows must NOT have a mode
      await queryInterface.sequelize.query(
        `ALTER TABLE video_catalog ADD CONSTRAINT chk_vc_youtube_no_upload_mode
         CHECK (source != 'youtube' OR upload_mode IS NULL);`,
        { transaction }
      );

      // Mode A MUST have declared checksum
      await queryInterface.sequelize.query(
        `ALTER TABLE video_catalog ADD CONSTRAINT chk_vc_mode_a_checksum_required
         CHECK (upload_mode != 'A' OR declared_checksum IS NOT NULL);`,
        { transaction }
      );

      // Mode B must NOT have declared checksum
      await queryInterface.sequelize.query(
        `ALTER TABLE video_catalog ADD CONSTRAINT chk_vc_mode_b_no_checksum
         CHECK (upload_mode != 'B' OR declared_checksum IS NULL);`,
        { transaction }
      );

      // Declared checksum hex format guard (64 lowercase hex chars)
      await queryInterface.sequelize.query(
        `ALTER TABLE video_catalog ADD CONSTRAINT chk_vc_declared_checksum_format
         CHECK (declared_checksum IS NULL OR declared_checksum ~ '^[0-9a-f]{64}$');`,
        { transaction }
      );

      // Upload rows MUST have declared file size (unless legacy backfill)
      await queryInterface.sequelize.query(
        `ALTER TABLE video_catalog ADD CONSTRAINT chk_vc_upload_declared_file_size_required
         CHECK (source != 'upload' OR legacy_import = true OR declared_file_size IS NOT NULL);`,
        { transaction }
      );

      // YouTube rows must NOT have declared file size
      await queryInterface.sequelize.query(
        `ALTER TABLE video_catalog ADD CONSTRAINT chk_vc_youtube_no_declared_file_size
         CHECK (source != 'youtube' OR declared_file_size IS NULL);`,
        { transaction }
      );

      // Upload rows MUST have declared MIME type (unless legacy backfill)
      await queryInterface.sequelize.query(
        `ALTER TABLE video_catalog ADD CONSTRAINT chk_vc_upload_declared_mime_required
         CHECK (source != 'upload' OR legacy_import = true OR declared_mime_type IS NOT NULL);`,
        { transaction }
      );

      // YouTube rows must NOT have declared MIME type
      await queryInterface.sequelize.query(
        `ALTER TABLE video_catalog ADD CONSTRAINT chk_vc_youtube_no_declared_mime
         CHECK (source != 'youtube' OR declared_mime_type IS NULL);`,
        { transaction }
      );

      // YouTube rows must NOT have declared checksum
      await queryInterface.sequelize.query(
        `ALTER TABLE video_catalog ADD CONSTRAINT chk_vc_youtube_no_declared_checksum
         CHECK (source != 'youtube' OR declared_checksum IS NULL);`,
        { transaction }
      );

      // ── DATA FORMAT GUARDS ──

      // Verified checksum must be valid hex (64 lowercase hex chars)
      await queryInterface.sequelize.query(
        `ALTER TABLE video_catalog ADD CONSTRAINT chk_vc_file_checksum_format
         CHECK (file_checksum_sha256 IS NULL OR file_checksum_sha256 ~ '^[0-9a-f]{64}$');`,
        { transaction }
      );

      // Declared file size must be positive and <= 2GB
      await queryInterface.sequelize.query(
        `ALTER TABLE video_catalog ADD CONSTRAINT chk_vc_declared_file_size_range
         CHECK (declared_file_size IS NULL OR (declared_file_size > 0 AND declared_file_size <= 2147483648));`,
        { transaction }
      );

      // ── VISIBILITY + ACCESS_TIER INVARIANTS ──

      // Public content must be free (no paywall on public)
      await queryInterface.sequelize.query(
        `ALTER TABLE video_catalog ADD CONSTRAINT chk_vc_public_must_be_free
         CHECK (visibility != 'public' OR access_tier = 'free');`,
        { transaction }
      );

      // Unlisted cannot be premium (no purchase for link-shared)
      await queryInterface.sequelize.query(
        `ALTER TABLE video_catalog ADD CONSTRAINT chk_vc_unlisted_no_premium
         CHECK (visibility != 'unlisted' OR access_tier IN ('free', 'member'));`,
        { transaction }
      );

      // ── PUBLISH GATE INVARIANTS ──

      // Cannot publish without metadata finalized
      await queryInterface.sequelize.query(
        `ALTER TABLE video_catalog ADD CONSTRAINT chk_vc_publish_metadata_required
         CHECK (status != 'published' OR metadata_completed = true);`,
        { transaction }
      );

      // Upload videos cannot be published without verified checksum
      await queryInterface.sequelize.query(
        `ALTER TABLE video_catalog ADD CONSTRAINT chk_vc_publish_checksum_required
         CHECK (status != 'published' OR source != 'upload' OR file_checksum_sha256 IS NOT NULL);`,
        { transaction }
      );

      console.log('All CHECK constraints added.');

      // ══════════════════════════════════════════════════════════════════
      // INDEXES
      // ══════════════════════════════════════════════════════════════════

      console.log('Creating indexes...');

      // Partial unique index: slugs unique among non-deleted rows only
      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX idx_vc_slug_alive
         ON video_catalog(slug)
         WHERE "deletedAt" IS NULL;`,
        { transaction }
      );

      // Composite index for browse queries
      await queryInterface.sequelize.query(
        `CREATE INDEX idx_vc_status_vis_pub
         ON video_catalog(status, visibility, published_at DESC);`,
        { transaction }
      );

      // Source + status for admin filtering
      await queryInterface.sequelize.query(
        `CREATE INDEX idx_vc_source_status
         ON video_catalog(source, status);`,
        { transaction }
      );

      // Content type filter
      await queryInterface.sequelize.query(
        `CREATE INDEX idx_vc_content_type
         ON video_catalog(content_type);`,
        { transaction }
      );

      // Creator lookup
      await queryInterface.sequelize.query(
        `CREATE INDEX idx_vc_creator
         ON video_catalog(creator_id);`,
        { transaction }
      );

      // Exercise association (partial — only where exercise_id is set)
      await queryInterface.sequelize.query(
        `CREATE INDEX idx_vc_exercise
         ON video_catalog(exercise_id)
         WHERE exercise_id IS NOT NULL;`,
        { transaction }
      );

      // Featured videos sort
      await queryInterface.sequelize.query(
        `CREATE INDEX idx_vc_featured
         ON video_catalog(featured, sort_order)
         WHERE featured = true;`,
        { transaction }
      );

      // View count for popularity sort
      await queryInterface.sequelize.query(
        `CREATE INDEX idx_vc_view_count
         ON video_catalog(view_count DESC);`,
        { transaction }
      );

      // GIN index on tags for JSONB containment queries
      await queryInterface.sequelize.query(
        `CREATE INDEX idx_vc_tags
         ON video_catalog USING GIN(tags);`,
        { transaction }
      );

      // YouTube deduplication: prevent duplicate active entries for same YouTube video
      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX idx_vc_youtube_id_alive
         ON video_catalog(youtube_video_id)
         WHERE youtube_video_id IS NOT NULL AND "deletedAt" IS NULL;`,
        { transaction }
      );

      // Prevent duplicate pending upload bindings
      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX idx_vc_pending_key_active
         ON video_catalog(pending_object_key)
         WHERE pending_object_key IS NOT NULL AND hosted_key IS NULL AND "deletedAt" IS NULL;`,
        { transaction }
      );

      console.log('All indexes created.');

      // ══════════════════════════════════════════════════════════════════
      // TRIGGER: fn_guard_trust_fields / trg_guard_trust_fields
      // ══════════════════════════════════════════════════════════════════

      console.log('Creating trust-field guard trigger...');

      await queryInterface.sequelize.query(
        `CREATE OR REPLACE FUNCTION fn_guard_trust_fields() RETURNS TRIGGER AS $$
        BEGIN
          -- upload_mode: immutable once set (non-NULL cannot change)
          IF OLD.upload_mode IS NOT NULL AND NEW.upload_mode IS DISTINCT FROM OLD.upload_mode THEN
            RAISE EXCEPTION 'upload_mode is immutable after creation';
          END IF;
          -- declared_checksum: immutable once set
          IF OLD.declared_checksum IS NOT NULL AND NEW.declared_checksum IS DISTINCT FROM OLD.declared_checksum THEN
            RAISE EXCEPTION 'declared_checksum is immutable after creation';
          END IF;
          -- declared_file_size: immutable once set
          IF OLD.declared_file_size IS NOT NULL AND NEW.declared_file_size IS DISTINCT FROM OLD.declared_file_size THEN
            RAISE EXCEPTION 'declared_file_size is immutable after creation';
          END IF;
          -- declared_mime_type: immutable once set
          IF OLD.declared_mime_type IS NOT NULL AND NEW.declared_mime_type IS DISTINCT FROM OLD.declared_mime_type THEN
            RAISE EXCEPTION 'declared_mime_type is immutable after creation';
          END IF;
          -- legacy_import: fully immutable after INSERT (cannot change in either direction)
          -- Blocks false->true (prevents activating legacy exemptions post-creation)
          -- Blocks true->false (prevents removing legacy status from backfill rows)
          IF OLD.legacy_import IS DISTINCT FROM NEW.legacy_import THEN
            RAISE EXCEPTION 'legacy_import is immutable after row creation';
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `CREATE TRIGGER trg_guard_trust_fields
          BEFORE UPDATE ON video_catalog
          FOR EACH ROW EXECUTE FUNCTION fn_guard_trust_fields();`,
        { transaction }
      );

      console.log('Trust-field guard trigger created.');

      // ── Commit ──
      await transaction.commit();
      console.log('Migration 20260218100001-create-video-catalog complete.');
    } catch (error) {
      await transaction.rollback();
      console.error('Migration failed, rolled back:', error.message);
      throw error;
    }
  },

  async down(queryInterface, _Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('Reverting video_catalog migration...');

      // ── Drop trigger + function BEFORE dropping table ──
      await queryInterface.sequelize.query(
        'DROP TRIGGER IF EXISTS trg_guard_trust_fields ON video_catalog;',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'DROP FUNCTION IF EXISTS fn_guard_trust_fields();',
        { transaction }
      );
      console.log('Dropped trust-field guard trigger and function.');

      // ── Drop table ──
      await queryInterface.dropTable('video_catalog', { transaction });
      console.log('Dropped video_catalog table.');

      // ── Drop ENUM types ──
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_video_catalog_youtube_cta_strategy" CASCADE;',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_video_catalog_status" CASCADE;',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_video_catalog_access_tier" CASCADE;',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_video_catalog_visibility" CASCADE;',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_video_catalog_source" CASCADE;',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_video_catalog_content_type" CASCADE;',
        { transaction }
      );
      console.log('Dropped all ENUM types.');

      await transaction.commit();
      console.log('Revert of video_catalog migration complete.');
    } catch (error) {
      await transaction.rollback();
      console.error('Revert failed, rolled back:', error.message);
      throw error;
    }
  },
};
