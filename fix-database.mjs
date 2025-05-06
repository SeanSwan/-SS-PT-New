/**
 * Comprehensive database fix script
 * This script will:
 * 1. Create required extensions (uuid-ossp)
 * 2. Create tables if they don't exist
 * 3. Add an admin user with the correct credentials
 */
import sequelize from './backend/database.mjs';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Admin credentials
const ADMIN_USERNAME = 'ogpswan';
const ADMIN_PASSWORD = 'Password123!';
const ADMIN_EMAIL = 'ogpswan@yahoo.com';

async function fixDatabase() {
  try {
    console.log('Starting database fix...');
    
    // Create extensions
    console.log('Creating UUID extension if needed...');
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    
    // Check if users table exists
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
    `);
    
    // Create users table if it doesn't exist
    if (tables.length === 0) {
      console.log('Creating users table...');
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS "users" (
          "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          "firstName" VARCHAR(255) NOT NULL,
          "lastName" VARCHAR(255) NOT NULL,
          "email" VARCHAR(255) NOT NULL UNIQUE,
          "username" VARCHAR(255) NOT NULL UNIQUE,
          "password" VARCHAR(255) NOT NULL,
          "phone" VARCHAR(255),
          "photo" VARCHAR(255),
          "role" VARCHAR(50) NOT NULL DEFAULT 'client',
          "dateOfBirth" DATE,
          "gender" VARCHAR(50),
          "weight" FLOAT,
          "height" FLOAT,
          "fitnessGoal" VARCHAR(255),
          "trainingExperience" TEXT,
          "healthConcerns" TEXT,
          "emergencyContact" VARCHAR(255),
          "availableSessions" INTEGER DEFAULT 0,
          "specialties" TEXT,
          "certifications" TEXT,
          "bio" TEXT,
          "availableDays" TEXT,
          "availableHours" TEXT,
          "hourlyRate" FLOAT,
          "permissions" TEXT,
          "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
          "lastLogin" TIMESTAMP WITH TIME ZONE,
          "emailNotifications" BOOLEAN NOT NULL DEFAULT TRUE,
          "smsNotifications" BOOLEAN NOT NULL DEFAULT TRUE,
          "preferences" TEXT,
          "points" INTEGER NOT NULL DEFAULT 0,
          "level" INTEGER NOT NULL DEFAULT 1,
          "tier" VARCHAR(50) NOT NULL DEFAULT 'bronze',
          "streakDays" INTEGER NOT NULL DEFAULT 0,
          "lastActivityDate" TIMESTAMP WITH TIME ZONE,
          "totalWorkouts" INTEGER NOT NULL DEFAULT 0,
          "totalExercises" INTEGER NOT NULL DEFAULT 0,
          "exercisesCompleted" JSON DEFAULT '{}',
          "badgesPrimary" UUID,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `);
      console.log('Users table created successfully');
    } else {
      console.log('Users table already exists');
    }
    
    // Check if achievements table exists
    const [achievementTables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'achievements'
    `);
    
    // Create achievements table if it doesn't exist
    if (achievementTables.length === 0) {
      console.log('Creating achievements table...');
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS "achievements" (
          "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          "name" VARCHAR(255) NOT NULL,
          "description" TEXT NOT NULL,
          "icon" VARCHAR(255) NOT NULL DEFAULT 'Trophy',
          "pointValue" INTEGER NOT NULL DEFAULT 100,
          "requirementType" VARCHAR(255) NOT NULL,
          "requirementValue" INTEGER NOT NULL,
          "tier" VARCHAR(50) NOT NULL DEFAULT 'bronze',
          "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
          "badgeImageUrl" VARCHAR(255),
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "deletedAt" TIMESTAMP WITH TIME ZONE
        );
      `);
      console.log('Achievements table created successfully');
      
      // Add foreign key reference
      await sequelize.query(`
        ALTER TABLE "users"
        ADD CONSTRAINT "fk_users_achievements"
        FOREIGN KEY ("badgesPrimary")
        REFERENCES "achievements" ("id")
        ON DELETE SET NULL;
      `);
      console.log('Foreign key added to users table');
    } else {
      console.log('Achievements table already exists');
    }
    
    // Check if admin user exists
    const [adminUsers] = await sequelize.query(`
      SELECT * FROM "users" WHERE username = '${ADMIN_USERNAME}' LIMIT 1
    `);
    
    if (adminUsers.length === 0) {
      console.log(`Creating admin user '${ADMIN_USERNAME}'...`);
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
      
      // Create admin user
      await sequelize.query(`
        INSERT INTO "users" (
          "firstName", "lastName", "email", "username", "password", 
          "role", "isActive", "createdAt", "updatedAt", "tier"
        ) VALUES (
          'Admin', 'User', '${ADMIN_EMAIL}', '${ADMIN_USERNAME}', 
          '${hashedPassword}', 'admin', true, NOW(), NOW(), 'bronze'
        )
      `);
      
      console.log('Admin user created successfully');
    } else {
      console.log(`Admin user '${ADMIN_USERNAME}' already exists`);
      
      // Update admin user password to ensure it matches
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
      
      await sequelize.query(`
        UPDATE "users" 
        SET "password" = '${hashedPassword}', 
            "updatedAt" = NOW() 
        WHERE username = '${ADMIN_USERNAME}'
      `);
      
      console.log('Admin user password updated');
    }
    
    console.log('Database fix completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during database fix:', error);
    process.exit(1);
  }
}

// Run the fix script
fixDatabase();