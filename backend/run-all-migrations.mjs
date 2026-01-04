/**
 * Complete Migration Runner for SwanStudios
 *
 * Purpose: Run ALL pending migrations in correct dependency order
 * This ensures Render deployment has all required database tables
 *
 * Created: 2026-01-04
 * For: Complete database setup on Render
 */

import sequelize from './database.mjs';
import { QueryTypes } from 'sequelize';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runAllMigrations() {
  try {
    console.log('🚀 Starting COMPLETE SwanStudios migration sequence...\n');

    // ==================== PHASE 1: Core Foundation Tables ====================
    console.log('📋 PHASE 1: Core Foundation Tables\n');

    // 1. Users table (foundation)
    console.log('👤 Migration: Create Users table...');
    const [usersExists] = await sequelize.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Users')`,
      { type: QueryTypes.SELECT }
    );

    if (!usersExists.exists) {
      await sequelize.query(`
        CREATE TABLE "Users" (
          id SERIAL PRIMARY KEY,
          "firstName" VARCHAR(100) NOT NULL,
          "lastName" VARCHAR(100) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'user',
          "phoneNumber" VARCHAR(20),
          "dateOfBirth" DATE,
          "profileImageUrl" VARCHAR(500),
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "emailVerified" BOOLEAN NOT NULL DEFAULT false,
          "emailVerificationToken" VARCHAR(255),
          "passwordResetToken" VARCHAR(255),
          "passwordResetExpires" TIMESTAMP,
          "lastLoginAt" TIMESTAMP,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE INDEX idx_users_email ON "Users"(email);
        CREATE INDEX idx_users_role ON "Users"(role);
        CREATE INDEX idx_users_is_active ON "Users"("isActive");
      `);
      console.log('✅ Users table created\n');
    } else {
      console.log('⏭️  Users table already exists\n');
    }

    // 2. Storefront items
    console.log('🛍️  Migration: Create Storefront Items...');
    const [storefrontExists] = await sequelize.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'storefront_items')`,
      { type: QueryTypes.SELECT }
    );

    if (!storefrontExists.exists) {
      await sequelize.query(`
        CREATE TABLE storefront_items (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL,
          "packageType" VARCHAR(50) NOT NULL DEFAULT 'fixed',
          "sessionCount" INTEGER,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "displayOrder" INTEGER DEFAULT 0,
          "stripeProductId" VARCHAR(255),
          "stripePriceId" VARCHAR(255),
          "includedFeatures" JSONB DEFAULT '[]'::jsonb,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE INDEX idx_storefront_items_active ON storefront_items("isActive");
        CREATE INDEX idx_storefront_items_packagetype ON storefront_items("packageType");
        CREATE INDEX idx_storefront_items_stripe_product ON storefront_items("stripeProductId");
        CREATE INDEX idx_storefront_items_stripe_price ON storefront_items("stripePriceId");
      `);
      console.log('✅ Storefront items table created\n');
    } else {
      console.log('⏭️  Storefront items table already exists\n');
    }

    // ==================== PHASE 2: Shopping Cart System ====================
    console.log('🛒 PHASE 2: Shopping Cart System\n');

    const [cartsExists] = await sequelize.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shopping_carts')`,
      { type: QueryTypes.SELECT }
    );

    if (!cartsExists.exists) {
      await sequelize.query(`
        CREATE TABLE shopping_carts (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER REFERENCES "Users"(id) ON DELETE CASCADE,
          "sessionId" VARCHAR(255),
          status VARCHAR(50) NOT NULL DEFAULT 'active',
          "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
          "stripeCustomerId" VARCHAR(255),
          "stripePaymentIntentId" VARCHAR(255),
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE INDEX idx_shopping_carts_user_id ON shopping_carts("userId");
        CREATE INDEX idx_shopping_carts_session_id ON shopping_carts("sessionId");
        CREATE INDEX idx_shopping_carts_status ON shopping_carts(status);
      `);
      console.log('✅ Shopping carts table created\n');
    }

    const [cartItemsExists] = await sequelize.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cart_items')`,
      { type: QueryTypes.SELECT }
    );

    if (!cartItemsExists.exists) {
      await sequelize.query(`
        CREATE TABLE cart_items (
          id SERIAL PRIMARY KEY,
          "cartId" INTEGER NOT NULL REFERENCES shopping_carts(id) ON DELETE CASCADE,
          "storefrontItemId" INTEGER NOT NULL REFERENCES storefront_items(id) ON DELETE CASCADE,
          quantity INTEGER NOT NULL DEFAULT 1,
          price DECIMAL(10,2) NOT NULL,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE INDEX idx_cart_items_cart_id ON cart_items("cartId");
        CREATE INDEX idx_cart_items_storefront_item_id ON cart_items("storefrontItemId");
      `);
      console.log('✅ Cart items table created\n');
    }

    // ==================== PHASE 3: Sessions & Assignments ====================
    console.log('📅 PHASE 3: Sessions & Assignments\n');

    const [sessionsExists] = await sequelize.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sessions')`,
      { type: QueryTypes.SELECT }
    );

    if (!sessionsExists.exists) {
      await sequelize.query(`
        CREATE TABLE sessions (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER REFERENCES "Users"(id) ON DELETE CASCADE,
          "trainerId" INTEGER REFERENCES "Users"(id) ON DELETE SET NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          "plannedStartTime" TIMESTAMP NOT NULL,
          "actualStartTime" TIMESTAMP,
          "actualEndTime" TIMESTAMP,
          duration INTEGER,
          status VARCHAR(50) NOT NULL DEFAULT 'planned',
          "sessionType" VARCHAR(50) DEFAULT 'personal_training',
          notes TEXT,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "deletedAt" TIMESTAMP
        );

        CREATE INDEX idx_sessions_user_id ON sessions("userId");
        CREATE INDEX idx_sessions_trainer_id ON sessions("trainerId");
        CREATE INDEX idx_sessions_status ON sessions(status);
        CREATE INDEX idx_sessions_planned_start ON sessions("plannedStartTime");
        CREATE INDEX idx_sessions_deleted_at ON sessions("deletedAt");
      `);
      console.log('✅ Sessions table created\n');
    }

    const [assignmentsExists] = await sequelize.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_trainer_assignments')`,
      { type: QueryTypes.SELECT }
    );

    if (!assignmentsExists.exists) {
      await sequelize.query(`
        CREATE TABLE client_trainer_assignments (
          id SERIAL PRIMARY KEY,
          "clientId" INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
          "trainerId" INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
          status VARCHAR(50) NOT NULL DEFAULT 'active',
          "assignedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "assignedBy" INTEGER REFERENCES "Users"(id) ON DELETE SET NULL,
          notes TEXT,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE UNIQUE INDEX idx_client_trainer_assignments_active ON client_trainer_assignments("clientId") WHERE status = 'active';
        CREATE INDEX idx_client_trainer_assignments_trainer_id ON client_trainer_assignments("trainerId");
        CREATE INDEX idx_client_trainer_assignments_status ON client_trainer_assignments(status);
      `);
      console.log('✅ Client trainer assignments table created\n');
    }

    // ==================== PHASE 4: Exercise & Workout System ====================
    console.log('💪 PHASE 4: Exercise & Workout System\n');

    // Create enums first (safe creation)
    await sequelize.query(`DO $$ BEGIN CREATE TYPE muscle_group_enum AS ENUM ('chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'abs', 'obliques', 'quads', 'hamstrings', 'glutes', 'calves', 'hip_flexors', 'adductors', 'abductors'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    await sequelize.query(`DO $$ BEGIN CREATE TYPE equipment_enum AS ENUM ('barbell', 'dumbbell', 'kettlebell', 'resistance_band', 'cable', 'bodyweight', 'medicine_ball', 'stability_ball', 'trx', 'bosu', 'foam_roller', 'bench', 'machine', 'other'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    await sequelize.query(`DO $$ BEGIN CREATE TYPE difficulty_enum AS ENUM ('beginner', 'intermediate', 'advanced'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);

    const [exercisesExists] = await sequelize.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'exercises')`,
      { type: QueryTypes.SELECT }
    );

    if (!exercisesExists.exists) {
      await sequelize.query(`
        CREATE TABLE exercises (
          id SERIAL PRIMARY KEY,
          name VARCHAR(200) NOT NULL,
          description TEXT,
          primary_muscle muscle_group_enum NOT NULL,
          secondary_muscles JSONB DEFAULT '[]'::jsonb,
          equipment equipment_enum NOT NULL,
          difficulty difficulty_enum NOT NULL,
          movement_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
          nasm_phases JSONB NOT NULL DEFAULT '[1]'::jsonb,
          contraindications JSONB DEFAULT '[]'::jsonb,
          acute_variables JSONB,
          "deletedAt" TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE INDEX idx_exercises_name ON exercises(name) WHERE "deletedAt" IS NULL;
        CREATE INDEX idx_exercises_primary_muscle ON exercises(primary_muscle) WHERE "deletedAt" IS NULL;
        CREATE INDEX idx_exercises_equipment ON exercises(equipment) WHERE "deletedAt" IS NULL;
        CREATE INDEX idx_exercises_difficulty ON exercises(difficulty) WHERE "deletedAt" IS NULL;
        CREATE INDEX idx_exercises_deleted_at ON exercises("deletedAt") WHERE "deletedAt" IS NULL;
        CREATE INDEX idx_exercises_nasm_phases ON exercises USING GIN (nasm_phases);
        CREATE INDEX idx_exercises_movement_patterns ON exercises USING GIN (movement_patterns);
        CREATE INDEX idx_exercises_contraindications ON exercises USING GIN (contraindications);
      `);
      console.log('✅ Exercises table created\n');
    }

    // ==================== PHASE 5: Gamification Foundation ====================
    console.log('🎮 PHASE 5: Gamification Foundation\n');

    // Badge Collections
    const [badgeCollectionsExists] = await sequelize.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'BadgeCollections')`,
      { type: QueryTypes.SELECT }
    );

    if (!badgeCollectionsExists.exists) {
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
      `);
      console.log('✅ BadgeCollections table created\n');
    }

    // Badges
    const [badgesExists] = await sequelize.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Badges')`,
      { type: QueryTypes.SELECT }
    );

    if (!badgesExists.exists) {
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
      `);
      console.log('✅ Badges table created\n');
    }

    // User Badges
    const [userBadgesExists] = await sequelize.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'UserBadges')`,
      { type: QueryTypes.SELECT }
    );

    if (!userBadgesExists.exists) {
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
      `);
      console.log('✅ UserBadges table created\n');
    }

    // ==================== PHASE 6: Video Library System ====================
    console.log('📹 PHASE 6: Video Library System\n');

    const [exerciseLibraryExists] = await sequelize.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'exercise_library')`,
      { type: QueryTypes.SELECT }
    );

    if (!exerciseLibraryExists.exists) {
      await sequelize.query(`
        CREATE TABLE exercise_library (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(200) NOT NULL,
          description TEXT,
          primary_muscle muscle_group_enum NOT NULL,
          secondary_muscles JSONB DEFAULT '[]'::jsonb,
          equipment equipment_enum NOT NULL,
          difficulty difficulty_enum NOT NULL,
          movement_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
          nasm_phases JSONB NOT NULL DEFAULT '[1]'::jsonb,
          contraindications JSONB DEFAULT '[]'::jsonb,
          acute_variables JSONB,
          video_count INTEGER NOT NULL DEFAULT 0,
          primary_video_id UUID,
          "deletedAt" TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE INDEX idx_exercise_library_name ON exercise_library(name) WHERE "deletedAt" IS NULL;
        CREATE INDEX idx_exercise_library_primary_muscle ON exercise_library(primary_muscle) WHERE "deletedAt" IS NULL;
        CREATE INDEX idx_exercise_library_equipment ON exercise_library(equipment) WHERE "deletedAt" IS NULL;
        CREATE INDEX idx_exercise_library_difficulty ON exercise_library(difficulty) WHERE "deletedAt" IS NULL;
        CREATE INDEX idx_exercise_library_deleted_at ON exercise_library("deletedAt") WHERE "deletedAt" IS NULL;
        CREATE INDEX idx_exercise_library_nasm_phases ON exercise_library USING GIN (nasm_phases);
        CREATE INDEX idx_exercise_library_movement_patterns ON exercise_library USING GIN (movement_patterns);
        CREATE INDEX idx_exercise_library_contraindications ON exercise_library USING GIN (contraindications);
      `);
      console.log('✅ Exercise library table created\n');
    }

    // ==================== VERIFICATION ====================
    console.log('🔍 Verifying all migrations...\n');

    const [allTables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN (
        'Users', 'storefront_items', 'shopping_carts', 'cart_items', 'sessions',
        'client_trainer_assignments', 'exercises', 'BadgeCollections', 'Badges',
        'UserBadges', 'exercise_library'
      )
      ORDER BY table_name
    `, { type: QueryTypes.SELECT });

    console.log('📋 Core tables created:');
    allTables.rows.forEach(t => console.log(`   ✅ ${t.table_name}`));

    console.log('\n🎉 ALL MIGRATIONS COMPLETED SUCCESSFULLY!');
    console.log('\n📚 Database is now ready for SwanStudios production deployment!');
    console.log('\n🚀 Next steps:');
    console.log('   1. Test API endpoints');
    console.log('   2. Run seed data scripts');
    console.log('   3. Deploy to production\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n📚 Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run all migrations
runAllMigrations();