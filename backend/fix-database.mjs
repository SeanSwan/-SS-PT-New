/**
 * Database Fix Script
 * Fixes database issues and creates admin user
 */
import sequelize from './database.mjs';
import User from './models/User.mjs';
import Achievement from './models/Achievement.mjs';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Admin user credentials
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'ogpswan';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Password123!';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@swanstudios.com';

async function fixDatabase() {
  try {
    console.log('Starting database fix...');
    
    // Create a temporary admin user directly in database
    console.log('Creating admin user manually...');
    
    try {
      // First check if user already exists
      const [results] = await sequelize.query(`SELECT * FROM users WHERE username = '${ADMIN_USERNAME}'`);
      
      if (results.length > 0) {
        console.log(`Admin user '${ADMIN_USERNAME}' already exists, updating password...`);
        
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
        
        // Update the password
        await sequelize.query(
          `UPDATE users SET password = '${hashedPassword}' WHERE username = '${ADMIN_USERNAME}'`
        );
        
        console.log('Admin password updated successfully');
      } else {
        console.log(`Admin user '${ADMIN_USERNAME}' doesn't exist, creating...`);
        
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
        
        // Create the admin user directly with SQL
        await sequelize.query(`
          INSERT INTO users (
            id, 
            "firstName", 
            "lastName", 
            username, 
            email, 
            password, 
            role, 
            "isActive", 
            "createdAt", 
            "updatedAt"
          ) 
          VALUES (
            uuid_generate_v4(), 
            'Admin', 
            'User', 
            '${ADMIN_USERNAME}', 
            '${ADMIN_EMAIL}', 
            '${hashedPassword}', 
            'admin', 
            true, 
            NOW(), 
            NOW()
          )
        `);
        
        console.log('Admin user created successfully');
      }
    } catch (error) {
      console.error('Error creating/updating admin user directly:', error);
      console.log('Attempting alternative method...');
      
      // If direct SQL fails, try with UUID extension
      try {
        await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
        console.log('UUID extension created');
        
        // Try again with the create user query
        const [results] = await sequelize.query(`SELECT * FROM users WHERE username = '${ADMIN_USERNAME}'`);
        
        if (results.length === 0) {
          // Hash the password
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
          
          // Create the admin user directly with SQL
          await sequelize.query(`
            INSERT INTO users (
              id, 
              "firstName", 
              "lastName", 
              username, 
              email, 
              password, 
              role, 
              "isActive", 
              "createdAt", 
              "updatedAt"
            ) 
            VALUES (
              uuid_generate_v4(), 
              'Admin', 
              'User', 
              '${ADMIN_USERNAME}', 
              '${ADMIN_EMAIL}', 
              '${hashedPassword}', 
              'admin', 
              true, 
              NOW(), 
              NOW()
            )
          `);
          
          console.log('Admin user created successfully with UUID extension');
        }
      } catch (uuidError) {
        console.error('Error with UUID extension:', uuidError);
      }
    }
    
    console.log('Database fix completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error during database fix:', error);
    process.exit(1);
  }
}

// Run the fix
fixDatabase();