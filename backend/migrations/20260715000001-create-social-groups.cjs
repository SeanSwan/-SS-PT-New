'use strict';

/**
 * Migration: First-Class Social Groups
 * ====================================
 * Creates SocialGroups + SocialGroupMembers and adds SocialPosts."groupId"
 * so every group owns its own feed on the existing posts stack.
 *
 * - conversationId is a PLAIN integer (no FK): the messaging `conversations`
 *   table is created lazily at request time and may not exist here.
 * - Steps are individually guarded (DO blocks / IF NOT EXISTS) so
 *   safe-migrate's whole-migration stamping can never half-apply.
 */

module.exports = {
  async up(queryInterface) {
    const sql = (q) => queryInterface.sequelize.query(q);

    await sql(`
      CREATE TABLE IF NOT EXISTS "SocialGroups" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(80) NOT NULL,
        description TEXT NULL,
        emoji VARCHAR(16) NULL,
        photo VARCHAR(255) NULL,
        category VARCHAR(40) NOT NULL DEFAULT 'general',
        privacy VARCHAR(20) NOT NULL DEFAULT 'public',
        "ownerId" INTEGER NOT NULL REFERENCES "Users"(id),
        "conversationId" INTEGER NULL,
        "memberCount" INTEGER NOT NULL DEFAULT 1,
        "lastActivityAt" TIMESTAMP WITH TIME ZONE NULL,
        "isArchived" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await sql(`
      CREATE TABLE IF NOT EXISTS "SocialGroupMembers" (
        id SERIAL PRIMARY KEY,
        "groupId" INTEGER NOT NULL REFERENCES "SocialGroups"(id) ON DELETE CASCADE,
        "userId" INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL DEFAULT 'member',
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT social_group_members_unique UNIQUE ("groupId", "userId")
      );
    `);

    await sql(`CREATE INDEX IF NOT EXISTS social_group_members_user_idx ON "SocialGroupMembers" ("userId");`);
    await sql(`CREATE INDEX IF NOT EXISTS social_groups_privacy_activity_idx ON "SocialGroups" (privacy, "isArchived", "lastActivityAt");`);

    await sql(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'SocialPosts' AND column_name = 'groupId') THEN
          ALTER TABLE "SocialPosts" ADD COLUMN "groupId" INTEGER NULL
            REFERENCES "SocialGroups"(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await sql(`CREATE INDEX IF NOT EXISTS social_posts_group_created_idx ON "SocialPosts" ("groupId", "createdAt") WHERE "groupId" IS NOT NULL;`);

    console.log('✅ SocialGroups + SocialGroupMembers created; SocialPosts.groupId added');
  },

  async down(queryInterface) {
    const sql = (q) => queryInterface.sequelize.query(q);
    await sql(`DROP INDEX IF EXISTS social_posts_group_created_idx`);
    await sql(`ALTER TABLE "SocialPosts" DROP COLUMN IF EXISTS "groupId"`);
    await sql(`DROP TABLE IF EXISTS "SocialGroupMembers"`);
    await sql(`DROP TABLE IF EXISTS "SocialGroups"`);
    console.log('✅ Social groups tables removed');
  }
};
