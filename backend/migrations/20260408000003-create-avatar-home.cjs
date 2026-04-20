'use strict';

/**
 * Migration: create avatar_homes
 * Purpose: Persist the Avatar Home feature state used by /api/avatar-home.
 * Safe to re-run on Render deployments.
 */
module.exports = {
  async up(queryInterface) {
    const [tableRows] = await queryInterface.sequelize.query(
      `SELECT to_regclass('public."avatar_homes"') AS exists;`
    );

    if (tableRows[0]?.exists) {
      return;
    }

    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_avatar_homes_avatarBodyType') THEN
          CREATE TYPE "enum_avatar_homes_avatarBodyType" AS ENUM ('athletic', 'average', 'muscular', 'slim', 'curvy');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_avatar_homes_homeTier') THEN
          CREATE TYPE "enum_avatar_homes_homeTier" AS ENUM ('starter', 'mid', 'premium', 'luxury');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_avatar_homes_activeRoom') THEN
          CREATE TYPE "enum_avatar_homes_activeRoom" AS ENUM ('bedroom', 'kitchen', 'training_room');
        END IF;
      END
      $$;
    `);

    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "avatar_homes" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL UNIQUE REFERENCES "Users"("id") ON UPDATE CASCADE ON DELETE CASCADE,
        "unlocked" BOOLEAN NOT NULL DEFAULT false,
        "unlockedAt" TIMESTAMPTZ DEFAULT NULL,
        "avatarBodyType" "enum_avatar_homes_avatarBodyType" NOT NULL DEFAULT 'athletic',
        "avatarSkinTone" VARCHAR(7) NOT NULL DEFAULT '#C68642',
        "avatarHairStyle" VARCHAR(30) NOT NULL DEFAULT 'short',
        "avatarHairColor" VARCHAR(7) NOT NULL DEFAULT '#2C1B0E',
        "avatarOutfit" VARCHAR(30) NOT NULL DEFAULT 'starter_workout',
        "homeTier" "enum_avatar_homes_homeTier" NOT NULL DEFAULT 'starter',
        "activeRoom" "enum_avatar_homes_activeRoom" NOT NULL DEFAULT 'training_room',
        "furniture" JSONB NOT NULL DEFAULT '{"bedroom":{"bed":"starter_bed","decor":"basic_poster"},"kitchen":{"fridge":"starter_fridge","table":"basic_table"},"training_room":{"equipment":"starter_rack","mat":"basic_mat"}}'::jsonb,
        "minimalistMode" BOOLEAN NOT NULL DEFAULT false,
        "cameraAngle" VARCHAR(20) NOT NULL DEFAULT 'default',
        "ownedItems" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "crystalBalance" INTEGER NOT NULL DEFAULT 0,
        "factionId" VARCHAR(50) DEFAULT NULL,
        "readyPlayerMeUrl" VARCHAR(500) DEFAULT NULL,
        "wearableRecoveryData" JSONB DEFAULT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_avatar_homes_userId"
      ON "avatar_homes" ("userId");
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "avatar_homes";`);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_avatar_homes_activeRoom";`);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_avatar_homes_homeTier";`);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_avatar_homes_avatarBodyType";`);
  },
};
