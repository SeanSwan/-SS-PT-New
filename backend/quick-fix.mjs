/**
 * Quick fix script to add admin user directly to the database
 * without requiring the Achievements table to exist
 */
import sequelize from './database.mjs';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Admin user credentials
const ADMIN_USERNAME = 'ogpswan';
const ADMIN_PASSWORD = 'Password123!';
const ADMIN_EMAIL = 'ogpswan@yahoo.com';

async function runQuickFix() {
  try {
    console.log('Starting quick fix...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection successful');
    
    // Create admin user directly with SQL
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
    
    // Check if admin user already exists
    const [checkResults] = await sequelize.query(
      `SELECT id FROM "users" WHERE username = '${ADMIN_USERNAME}' LIMIT 1`
    );
    
    if (checkResults.length > 0) {
      console.log(`Admin user '${ADMIN_USERNAME}' already exists. Updating password...`);
      
      // Update the password for the existing user
      await sequelize.query(
        `UPDATE "users" SET 
         "password" = '${hashedPassword}',
         "updatedAt" = NOW()
         WHERE username = '${ADMIN_USERNAME}'`
      );
      
      console.log('Admin password updated successfully');
    } else {
      console.log(`Creating admin user '${ADMIN_USERNAME}'...`);
      
      // Insert a new admin user
      await sequelize.query(
        `INSERT INTO "users" (
          "id", "firstName", "lastName", "email", "username", "password", 
          "role", "isActive", "createdAt", "updatedAt", "tier"
        ) VALUES (
          uuid_generate_v4(), 'Admin', 'User', '${ADMIN_EMAIL}', '${ADMIN_USERNAME}', 
          '${hashedPassword}', 'admin', true, NOW(), NOW(), 'bronze'
        )`
      );
      
      console.log('Admin user created successfully');
    }
    
    console.log('Quick fix completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error during quick fix:', error);
    
    // Try to provide more detailed information about the issue
    if (error.name === 'SequelizeDatabaseError') {
      console.error('Database error details:', error.original);
      
      // If the error is about uuid_generate_v4 function not existing
      if (error.original && error.original.message && error.original.message.includes('uuid_generate_v4')) {
        console.log('\nTrying to create uuid extension...');
        try {
          await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
          console.log('UUID extension created. Please run this script again.');
        } catch (extError) {
          console.error('Failed to create UUID extension:', extError);
        }
      }
    }
    
    // If users table doesn't exist, create it
    if (error.original && error.original.message && error.original.message.includes('relation "users" does not exist')) {
      console.log('\nUsers table does not exist. Creating a simple users table...');
      try {
        await sequelize.query(`
          CREATE TABLE IF NOT EXISTS "users" (
            "id" UUID PRIMARY KEY,
            "firstName" VARCHAR(255) NOT NULL,
            "lastName" VARCHAR(255) NOT NULL,
            "email" VARCHAR(255) NOT NULL UNIQUE,
            "username" VARCHAR(255) NOT NULL UNIQUE,
            "password" VARCHAR(255) NOT NULL,
            "role" VARCHAR(50) NOT NULL DEFAULT 'client',
            "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
            "tier" VARCHAR(50) NOT NULL DEFAULT 'bronze',
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
          );
          
          CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        `);
        console.log('Users table created. Please run this script again.');
      } catch (tableError) {
        console.error('Failed to create users table:', tableError);
      }
    }
    
    process.exit(1);
  }
}

// Run the quick fix
runQuickFix();