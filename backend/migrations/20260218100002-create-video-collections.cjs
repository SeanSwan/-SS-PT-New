'use strict';

/**
 * Migration: Create video_collections table
 * ==========================================
 *
 * Playlists, series, and courses for the video library system.
 * Shares visibility/access_tier ENUM types with video_catalog.
 *
 * Columns:
 *   id            UUID PK (gen_random_uuid)
 *   title         VARCHAR(300) NOT NULL
 *   slug          VARCHAR(300) NOT NULL (partial unique index)
 *   description   TEXT
 *   type          ENUM('playlist','series','course') DEFAULT 'playlist'
 *   visibility    ENUM('public','members_only','unlisted') DEFAULT 'public'
 *   access_tier   ENUM('free','member','premium') DEFAULT 'free'
 *   thumbnailKey  VARCHAR(500)
 *   creatorId     INTEGER FK → Users(id)
 *   sortOrder     INTEGER DEFAULT 0
 *   createdAt, updatedAt, deletedAt (paranoid soft-delete)
 *
 * Indexes:
 *   idx_vcol_slug_alive — UNIQUE partial index on slug WHERE "deletedAt" IS NULL
 *
 * CHECK constraints:
 *   - Public collections must be free
 *   - Unlisted collections cannot be premium
 */

const resolveUsersTable = require('./helpers/resolveUsersTable.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Idempotent guard — skip if table already exists
      const [tables] = await queryInterface.sequelize.query(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'video_collections'`,
        { transaction }
      );
      if (tables.length > 0) {
        await transaction.commit();
        console.log('video_collections table already exists — skipping.');
        return;
      }

      // Resolve Users table name (handles case sensitivity)
      const usersTable = await resolveUsersTable(queryInterface);

      // ── Create shared ENUM types (IF NOT EXISTS) ──────────────────
      // visibility and access_tier may already exist from video_catalog
      await queryInterface.sequelize.query(
        `DO $$ BEGIN
           IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_video_catalog_visibility') THEN
             CREATE TYPE "enum_video_catalog_visibility" AS ENUM ('public', 'members_only', 'unlisted');
           END IF;
         END $$;`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `DO $$ BEGIN
           IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_video_catalog_access_tier') THEN
             CREATE TYPE "enum_video_catalog_access_tier" AS ENUM ('free', 'member', 'premium');
           END IF;
         END $$;`,
        { transaction }
      );

      // ── Create type ENUM specific to this table ───────────────────
      await queryInterface.sequelize.query(
        `DO $$ BEGIN
           IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_video_collections_type') THEN
             CREATE TYPE "enum_video_collections_type" AS ENUM ('playlist', 'series', 'course');
           END IF;
         END $$;`,
        { transaction }
      );

      // ── Create table ──────────────────────────────────────────────
      await queryInterface.createTable('video_collections', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
          allowNull: false,
        },
        title: {
          type: Sequelize.STRING(300),
          allowNull: false,
        },
        slug: {
          type: Sequelize.STRING(300),
          allowNull: false,
          // Uniqueness enforced via partial index below (not column-level)
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        type: {
          type: '"enum_video_collections_type"',
          allowNull: false,
          defaultValue: 'playlist',
        },
        visibility: {
          type: '"enum_video_catalog_visibility"',
          allowNull: false,
          defaultValue: 'public',
        },
        accessTier: {
          type: '"enum_video_catalog_access_tier"',
          allowNull: false,
          defaultValue: 'free',
        },
        thumbnailKey: {
          type: Sequelize.STRING(500),
          allowNull: true,
        },
        creatorId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: usersTable, key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        sortOrder: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()'),
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
      }, { transaction });

      // ── Partial unique index on slug (soft-delete safe) ───────────
      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX "idx_vcol_slug_alive"
         ON "video_collections" ("slug")
         WHERE "deletedAt" IS NULL;`,
        { transaction }
      );

      // ── CHECK constraints ─────────────────────────────────────────
      // Public collections must be free
      await queryInterface.sequelize.query(
        `ALTER TABLE "video_collections"
         ADD CONSTRAINT "chk_vcol_public_must_be_free"
         CHECK ("visibility" != 'public' OR "accessTier" = 'free');`,
        { transaction }
      );

      // Unlisted collections cannot be premium
      await queryInterface.sequelize.query(
        `ALTER TABLE "video_collections"
         ADD CONSTRAINT "chk_vcol_unlisted_not_premium"
         CHECK ("visibility" != 'unlisted' OR "accessTier" IN ('free', 'member'));`,
        { transaction }
      );

      await transaction.commit();
      console.log('video_collections table created successfully.');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.dropTable('video_collections', { transaction });

      // Drop the type ENUM specific to this table
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_video_collections_type";',
        { transaction }
      );

      // NOTE: Do NOT drop enum_video_catalog_visibility or enum_video_catalog_access_tier
      // here — they are shared with video_catalog and may still be in use.

      await transaction.commit();
      console.log('video_collections table dropped successfully.');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
