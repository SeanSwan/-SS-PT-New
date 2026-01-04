/**
 * Manual Migration Runner for Badge System
 *
 * Purpose: Run Badge System migrations manually for Render deployment
 * Includes all 6 badge-related tables with proper dependencies
 *
 * Created: 2026-01-04
 * Part of: Phase 1 Gamification Foundation
 */

import sequelize from './database.mjs';
import { QueryTypes } from 'sequelize';

async function runBadgeMigrations() {
  try {
    console.log('🏆 Starting Badge System migrations...\n');

    // ==================== MIGRATION 1: Create BadgeCollections table ====================
    console.log('📂 Migration 1: Creating BadgeCollections table...');

    const [collectionsExists] = await sequelize.query(
      `SELECT EXISTS (
         SELECT FROM information_schema.tables
         WHERE table_schema = 'public'
         AND table_name = 'BadgeCollections'
       )`,
      { type: QueryTypes.SELECT }
    );

    if (collectionsExists.exists) {
      console.log('⏭️  Table BadgeCollections already exists, skipping...\n');
    } else {
      await sequelize.query(`
        CREATE TABLE "BadgeCollections" (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          description TEXT,
          theme VARCHAR(50) DEFAULT 'default',
          icon VARCHAR(100),
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE INDEX idx_badge_collections_active ON "BadgeCollections"("isActive") WHERE "isActive" = true;
        CREATE INDEX idx_badge_collections_theme ON "BadgeCollections"(theme);

        COMMENT ON TABLE "BadgeCollections" IS 'Groups related badges into collections (e.g., "Strength Mastery", "Cardio Champions")';
        COMMENT ON COLUMN "BadgeCollections".name IS 'Collection display name';
        COMMENT ON COLUMN "BadgeCollections".description IS 'Collection description and purpose';
        COMMENT ON COLUMN "BadgeCollections".theme IS 'UI theme for collection display';
        COMMENT ON COLUMN "BadgeCollections".icon IS 'Icon identifier for collection';
        COMMENT ON COLUMN "BadgeCollections"."isActive" IS 'Whether collection is active and visible';
      `);

      console.log('✅ BadgeCollections table created\n');
    }

    // ==================== MIGRATION 2: Create Badges table ====================
    console.log('🏆 Migration 2: Creating Badges table...');

    const [badgesExists] = await sequelize.query(
      `SELECT EXISTS (
         SELECT FROM information_schema.tables
         WHERE table_schema = 'public'
         AND table_name = 'Badges'
       )`,
      { type: QueryTypes.SELECT }
    );

    if (badgesExists.exists) {
      console.log('⏭️  Table Badges already exists, skipping...\n');
    } else {
      await sequelize.query(`
        CREATE TYPE badge_category_enum AS ENUM ('strength', 'cardio', 'skill', 'flexibility', 'endurance', 'general');
        CREATE TYPE badge_difficulty_enum AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
        CREATE TYPE badge_criteria_type_enum AS ENUM (
          'exercise_completion', 'streak_achievement', 'challenge_completion',
          'social_engagement', 'milestone_reached', 'custom_criteria'
        );

        CREATE TABLE "Badges" (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          description TEXT NOT NULL,
          category badge_category_enum NOT NULL DEFAULT 'general',
          difficulty badge_difficulty_enum NOT NULL DEFAULT 'beginner',
          "imageUrl" VARCHAR(500),
          "criteriaType" badge_criteria_type_enum NOT NULL,
          criteria JSON NOT NULL DEFAULT '{}',
          rewards JSON NOT NULL DEFAULT '{"points": 100}',
          "collectionId" UUID REFERENCES "BadgeCollections"(id) ON DELETE SET NULL,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdBy" UUID NOT NULL,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE INDEX idx_badges_collection_id ON "Badges"("collectionId");
        CREATE INDEX idx_badges_is_active ON "Badges"("isActive");
        CREATE INDEX idx_badges_created_at ON "Badges"("createdAt" DESC);
        CREATE INDEX idx_badges_criteria_type ON "Badges"("criteriaType");

        COMMENT ON TABLE "Badges" IS 'Admin-created achievement badges with flexible earning criteria';
        COMMENT ON COLUMN "Badges".name IS 'Badge display name (3-100 characters)';
        COMMENT ON COLUMN "Badges".description IS 'Badge description (10-1000 characters)';
        COMMENT ON COLUMN "Badges".category IS 'Badge category for organization';
        COMMENT ON COLUMN "Badges".difficulty IS 'Badge difficulty level';
        COMMENT ON COLUMN "Badges"."imageUrl" IS 'CDN URL for badge image';
        COMMENT ON COLUMN "Badges"."criteriaType" IS 'Type of criteria for earning badge';
        COMMENT ON COLUMN "Badges".criteria IS 'Flexible criteria definition (JSON)';
        COMMENT ON COLUMN "Badges".rewards IS 'Reward structure (points, titles, customizations)';
        COMMENT ON COLUMN "Badges"."collectionId" IS 'Optional collection grouping';
        COMMENT ON COLUMN "Badges"."isActive" IS 'Whether badge is active and earnable';
        COMMENT ON COLUMN "Badges"."createdBy" IS 'Admin who created this badge';
      `);

      console.log('✅ Badges table created with enums and indexes\n');
    }

    // ==================== MIGRATION 3: Create UserBadges table ====================
    console.log('👤 Migration 3: Creating UserBadges table...');

    const [userBadgesExists] = await sequelize.query(
      `SELECT EXISTS (
         SELECT FROM information_schema.tables
         WHERE table_schema = 'public'
         AND table_name = 'UserBadges'
       )`,
      { type: QueryTypes.SELECT }
    );

    if (userBadgesExists.exists) {
      console.log('⏭️  Table UserBadges already exists, skipping...\n');
    } else {
      await sequelize.query(`
        CREATE TYPE earning_type_enum AS ENUM ('automatic', 'manual', 'admin_granted');

        CREATE TABLE "UserBadges" (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "userId" INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
          "badgeId" UUID NOT NULL REFERENCES "Badges"(id) ON DELETE CASCADE,
          "earnedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "earningType" earning_type_enum NOT NULL DEFAULT 'automatic',
          "earningContext" JSON DEFAULT '{}',
          "awardedBy" UUID,
          "isDisplayed" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE UNIQUE INDEX idx_user_badges_unique ON "UserBadges"("userId", "badgeId");
        CREATE INDEX idx_user_badges_user_id ON "UserBadges"("userId");
        CREATE INDEX idx_user_badges_badge_id ON "UserBadges"("badgeId");
        CREATE INDEX idx_user_badges_earned_at ON "UserBadges"("earnedAt" DESC);
        CREATE INDEX idx_user_badges_is_displayed ON "UserBadges"("isDisplayed") WHERE "isDisplayed" = true;

        COMMENT ON TABLE "UserBadges" IS 'Tracks which users have earned which badges';
        COMMENT ON COLUMN "UserBadges"."userId" IS 'User who earned the badge';
        COMMENT ON COLUMN "UserBadges"."badgeId" IS 'Badge that was earned';
        COMMENT ON COLUMN "UserBadges"."earnedAt" IS 'When the badge was earned';
        COMMENT ON COLUMN "UserBadges"."earningType" IS 'How the badge was earned';
        COMMENT ON COLUMN "UserBadges"."earningContext" IS 'Additional context about earning (activity data, etc.)';
        COMMENT ON COLUMN "UserBadges"."awardedBy" IS 'Admin who manually awarded badge (if applicable)';
        COMMENT ON COLUMN "UserBadges"."isDisplayed" IS 'Whether badge shows in user profile';
      `);

      console.log('✅ UserBadges table created with constraints\n');
    }

    // ==================== MIGRATION 4: Create Challenges table ====================
    console.log('🎯 Migration 4: Creating Challenges table...');

    const [challengesExists] = await sequelize.query(
      `SELECT EXISTS (
         SELECT FROM information_schema.tables
         WHERE table_schema = 'public'
         AND table_name = 'Challenges'
       )`,
      { type: QueryTypes.SELECT }
    );

    if (challengesExists.exists) {
      console.log('⏭️  Table Challenges already exists, skipping...\n');
    } else {
      await sequelize.query(`
        CREATE TYPE challenge_type_enum AS ENUM ('individual', 'group', 'team');
        CREATE TYPE challenge_status_enum AS ENUM ('draft', 'active', 'completed', 'cancelled');

        CREATE TABLE "Challenges" (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(200) NOT NULL,
          description TEXT NOT NULL,
          type challenge_type_enum NOT NULL DEFAULT 'individual',
          status challenge_status_enum NOT NULL DEFAULT 'draft',
          "startDate" TIMESTAMP NOT NULL,
          "endDate" TIMESTAMP NOT NULL,
          "maxParticipants" INTEGER,
          "currentParticipants" INTEGER NOT NULL DEFAULT 0,
          criteria JSON NOT NULL DEFAULT '{}',
          rewards JSON NOT NULL DEFAULT '{"points": 500}',
          "rewardBadgeId" UUID REFERENCES "Badges"(id) ON DELETE SET NULL,
          "createdBy" UUID NOT NULL,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE INDEX idx_challenges_status ON "Challenges"(status);
        CREATE INDEX idx_challenges_start_date ON "Challenges"("startDate");
        CREATE INDEX idx_challenges_end_date ON "Challenges"("endDate");
        CREATE INDEX idx_challenges_type ON "Challenges"(type);
        CREATE INDEX idx_challenges_created_by ON "Challenges"("createdBy");

        COMMENT ON TABLE "Challenges" IS 'Admin-created challenges that users can participate in';
        COMMENT ON COLUMN "Challenges".name IS 'Challenge display name';
        COMMENT ON COLUMN "Challenges".description IS 'Challenge description and rules';
        COMMENT ON COLUMN "Challenges".type IS 'Individual, group, or team challenge';
        COMMENT ON COLUMN "Challenges".status IS 'Challenge lifecycle status';
        COMMENT ON COLUMN "Challenges"."startDate" IS 'When challenge begins';
        COMMENT ON COLUMN "Challenges"."endDate" IS 'When challenge ends';
        COMMENT ON COLUMN "Challenges"."maxParticipants" IS 'Maximum number of participants (NULL = unlimited)';
        COMMENT ON COLUMN "Challenges"."currentParticipants" IS 'Current number of participants';
        COMMENT ON COLUMN "Challenges".criteria IS 'Challenge completion criteria (JSON)';
        COMMENT ON COLUMN "Challenges".rewards IS 'Rewards for completing challenge';
        COMMENT ON COLUMN "Challenges"."rewardBadgeId" IS 'Badge awarded for completion';
        COMMENT ON COLUMN "Challenges"."createdBy" IS 'Admin who created challenge';
      `);

      console.log('✅ Challenges table created\n');
    }

    // ==================== MIGRATION 5: Create ChallengeParticipants table ====================
    console.log('👥 Migration 5: Creating ChallengeParticipants table...');

    const [participantsExists] = await sequelize.query(
      `SELECT EXISTS (
         SELECT FROM information_schema.tables
         WHERE table_schema = 'public'
         AND table_name = 'ChallengeParticipants'
       )`,
      { type: QueryTypes.SELECT }
    );

    if (participantsExists.exists) {
      console.log('⏭️  Table ChallengeParticipants already exists, skipping...\n');
    } else {
      await sequelize.query(`
        CREATE TYPE participation_status_enum AS ENUM ('joined', 'active', 'completed', 'dropped');

        CREATE TABLE "ChallengeParticipants" (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "challengeId" UUID NOT NULL REFERENCES "Challenges"(id) ON DELETE CASCADE,
          "userId" INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
          status participation_status_enum NOT NULL DEFAULT 'joined',
          "joinedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "progress" JSON DEFAULT '{}',
          "completedAt" TIMESTAMP,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE UNIQUE INDEX idx_challenge_participants_unique ON "ChallengeParticipants"("challengeId", "userId");
        CREATE INDEX idx_challenge_participants_challenge_id ON "ChallengeParticipants"("challengeId");
        CREATE INDEX idx_challenge_participants_user_id ON "ChallengeParticipants"("userId");
        CREATE INDEX idx_challenge_participants_status ON "ChallengeParticipants"(status);

        COMMENT ON TABLE "ChallengeParticipants" IS 'Tracks user participation in challenges';
        COMMENT ON COLUMN "ChallengeParticipants"."challengeId" IS 'Challenge being participated in';
        COMMENT ON COLUMN "ChallengeParticipants"."userId" IS 'User participating';
        COMMENT ON COLUMN "ChallengeParticipants".status IS 'Participation status';
        COMMENT ON COLUMN "ChallengeParticipants"."joinedAt" IS 'When user joined challenge';
        COMMENT ON COLUMN "ChallengeParticipants".progress IS 'User progress towards challenge completion';
        COMMENT ON COLUMN "ChallengeParticipants"."completedAt" IS 'When user completed challenge';
      `);

      console.log('✅ ChallengeParticipants table created\n');
    }

    // ==================== MIGRATION 6: Create UserConsents table ====================
    console.log('📜 Migration 6: Creating UserConsents table...');

    const [consentsExists] = await sequelize.query(
      `SELECT EXISTS (
         SELECT FROM information_schema.tables
         WHERE table_schema = 'public'
         AND table_name = 'UserConsents'
       )`,
      { type: QueryTypes.SELECT }
    );

    if (consentsExists.exists) {
      console.log('⏭️  Table UserConsents already exists, skipping...\n');
    } else {
      await sequelize.query(`
        CREATE TYPE consent_type_enum AS ENUM ('gamification', 'data_collection', 'marketing', 'analytics');

        CREATE TABLE "UserConsents" (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "userId" INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
          "consentType" consent_type_enum NOT NULL,
          consented BOOLEAN NOT NULL,
          "consentedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "expiresAt" TIMESTAMP,
          "consentVersion" VARCHAR(50) NOT NULL,
          "ipAddress" INET,
          "userAgent" TEXT,
          "withdrawnAt" TIMESTAMP,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE UNIQUE INDEX idx_user_consents_unique ON "UserConsents"("userId", "consentType", "consentVersion");
        CREATE INDEX idx_user_consents_user_id ON "UserConsents"("userId");
        CREATE INDEX idx_user_consents_type ON "UserConsents"("consentType");
        CREATE INDEX idx_user_consents_consented ON "UserConsents"(consented) WHERE consented = true;
        CREATE INDEX idx_user_consents_expires_at ON "UserConsents"("expiresAt") WHERE "expiresAt" IS NOT NULL;

        COMMENT ON TABLE "UserConsents" IS 'Tracks user consents for gamification and data collection';
        COMMENT ON COLUMN "UserConsents"."userId" IS 'User who gave consent';
        COMMENT ON COLUMN "UserConsents"."consentType" IS 'Type of consent given';
        COMMENT ON COLUMN "UserConsents".consented IS 'Whether user consented (true) or declined (false)';
        COMMENT ON COLUMN "UserConsents"."consentedAt" IS 'When consent was given';
        COMMENT ON COLUMN "UserConsents"."expiresAt" IS 'When consent expires (NULL = never)';
        COMMENT ON COLUMN "UserConsents"."consentVersion" IS 'Version of consent text';
        COMMENT ON COLUMN "UserConsents"."ipAddress" IS 'IP address when consent was given';
        COMMENT ON COLUMN "UserConsents"."userAgent" IS 'Browser user agent when consent was given';
        COMMENT ON COLUMN "UserConsents"."withdrawnAt" IS 'When consent was withdrawn (NULL = active)';
      `);

      console.log('✅ UserConsents table created\n');
    }

    // ==================== VERIFICATION ====================
    console.log('🔍 Verifying badge system migrations...\n');

    const [tables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('BadgeCollections', 'Badges', 'UserBadges', 'Challenges', 'ChallengeParticipants', 'UserConsents')
      ORDER BY table_name
    `, { type: QueryTypes.SELECT });

    console.log('📋 Created tables:');
    tables.forEach(t => console.log(`   ✅ ${t.table_name}`));

    const [enums] = await sequelize.query(`
      SELECT typname
      FROM pg_type
      WHERE typname IN (
        'badge_category_enum', 'badge_difficulty_enum', 'badge_criteria_type_enum',
        'earning_type_enum', 'challenge_type_enum', 'challenge_status_enum',
        'participation_status_enum', 'consent_type_enum'
      )
      ORDER BY typname
    `, { type: QueryTypes.SELECT });

    console.log('\n📋 Created enums:');
    enums.forEach(e => console.log(`   ✅ ${e.typname}`));

    console.log('\n🎉 Badge System migrations completed successfully!');
    console.log('\n📚 Next steps:');
    console.log('   1. Test badge API endpoints');
    console.log('   2. Verify badge earning logic');
    console.log('   3. Test challenge system');
    console.log('   4. Run frontend integration\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n📚 Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run migrations
runBadgeMigrations();