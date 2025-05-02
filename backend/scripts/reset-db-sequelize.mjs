// backend/scripts/reset-db-sequelize.mjs
// SIMPLIFIED VERSION: Focus only on Model-based table creation using sync()
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';
import winston from 'winston';

// Create a custom logger for this script
const customLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => {
      return `${level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'info' ? '✅' : ''} ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console()
  ],
});

// Get directory name equivalent in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const projectRootDir = path.resolve(rootDir, '..');

// IMPORTANT: Load the .env file from the project root directory
const envPath = path.resolve(projectRootDir, '.env');
if (fs.existsSync(envPath)) {
  customLogger.info(`Loading environment variables from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  customLogger.warn(`Warning: .env file not found at ${envPath}`);
  // Fallback to the backend directory .env if it exists
  const backendEnvPath = path.resolve(rootDir, '.env');
  if (fs.existsSync(backendEnvPath)) {
    customLogger.info(`Loading environment variables from: ${backendEnvPath}`);
    dotenv.config({ path: backendEnvPath });
  } else {
    customLogger.warn('Warning: No .env file found. Using default environment variables.');
    dotenv.config(); // Try default location as a last resort
  }
}

// Explicitly import the database config
import dbConfig from '../config/config.js';

// Promisify exec
const execAsync = promisify(exec);

/**
 * Reset and setup the database using Sequelize sync() method only
 * This approach avoids relying on migrations which seem to be not working correctly
 * Instead, it uses the Models as the single source of truth for schema definition
 */
async function resetDatabase() {
  let sequelize = null;
  
  try {
    customLogger.info('===== DATABASE RESET (MODEL-SYNC ONLY) =====');
    customLogger.info('This script uses Sequelize sync() to create tables based solely on Model definitions.');
    customLogger.info('It does NOT use migrations for schema creation.');
    
    // Get the development config
    const config = dbConfig.development;
    
    customLogger.info('Loaded database configuration:');
    customLogger.info(`Database: ${config.database}`);
    customLogger.info(`Username: ${config.username}`);
    customLogger.info(`Password: ${config.password ? '******** (set)' : '(not set)'}`);
    customLogger.info(`Host: ${config.host}`);
    customLogger.info(`Port: ${config.port}`);
    customLogger.info(`Dialect: ${config.dialect}`);
    
    // CRITICAL FIX: Ensure password is explicitly a string
    if (config.password !== undefined && config.password !== null) {
      config.password = String(config.password);
      customLogger.info('Password converted to explicit string to avoid authentication issues');
    } else {
      customLogger.error('Password is undefined or null in config!');
      throw new Error('Database password is missing in config.');
    }
    
    // Create a new Sequelize instance with explicit config
    customLogger.info('Creating Sequelize instance with explicit config...');
    sequelize = new Sequelize(
      config.database,
      config.username,
      config.password,
      {
        host: config.host,
        port: config.port,
        dialect: config.dialect,
        logging: msg => customLogger.info(`[SQL]: ${msg}`),
      }
    );
    
    // Test database connection
    customLogger.info('Testing database connection...');
    try {
      await sequelize.authenticate();
      customLogger.info('Database connection established successfully.');
    } catch (error) {
      customLogger.error(`Unable to connect to the database: ${error.message}`);
      if (error.parent) {
        customLogger.error(`Parent error: ${error.parent.message}`);
      }
      if (error.original) {
        customLogger.error(`Original error: ${error.original.message}`);
      }
      throw new Error(`Database connection failed: ${error.message}.`);
    }
    
    // Import models manually to ensure they're loaded
    customLogger.info('Importing models...');
    const { default: User } = await import('../models/User.mjs');
    const { default: StorefrontItem } = await import('../models/StorefrontItem.mjs');
    // Import any other models here
    
    // Setup associations
    customLogger.info('Setting up model associations...');
    try {
      await import('../setupAssociations.mjs');
      customLogger.info('Model associations set up successfully.');
    } catch (error) {
      customLogger.warn(`Warning: Error setting up associations: ${error.message}`);
      customLogger.warn('Continuing anyway as tables will still be created.');
    }
    
    // Drop and recreate all tables based on model definitions
    customLogger.info('Dropping and recreating ALL tables based on model definitions...');
    try {
      await sequelize.sync({ force: true });
      customLogger.info('All tables dropped and recreated successfully based on model definitions.');
      customLogger.info('Tables created include:');
      customLogger.info('- users table with UUID primary key and isActive column');
      customLogger.info('- storefront_items table with FLOAT data type for price fields');
      // List other important tables here
    } catch (error) {
      customLogger.error(`Error dropping and recreating tables: ${error.message}`);
      throw error;
    }
    
    // IMPORTANT: We do NOT run migrations here as they seem to be problematic
    customLogger.info('Migrations skipped intentionally. The schema is defined solely by the Models.');
    
    // Create SequelizeMeta table manually to avoid migration errors
    customLogger.info('Creating SequelizeMeta table manually...');
    try {
      const createMetaTableSQL = `
      CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
        "name" character varying(255) NOT NULL,
        PRIMARY KEY ("name")
      );
      `;
      await sequelize.query(createMetaTableSQL);
      customLogger.info('SequelizeMeta table created successfully.');
    } catch (error) {
      customLogger.warn(`Warning: Error creating SequelizeMeta table: ${error.message}`);
      customLogger.warn('Continuing anyway as this is not critical.');
    }
    
    customLogger.info('===== DATABASE RESET COMPLETE =====');
    customLogger.info('');
    customLogger.info('Database has been reset with:');
    customLogger.info('- All tables created based on models');
    customLogger.info('');
    customLogger.info('NEXT STEPS (IMPORTANT):');
    customLogger.info('1. Run seeders to populate data:');
    customLogger.info('   npm run seed');
    customLogger.info('');
    customLogger.info('2. Start the application:');
    customLogger.info('   npm start');
    customLogger.info('');
    customLogger.info('3. Log in with username: admin, password: 55555');
    customLogger.info('');
    customLogger.info('4. Verify that the storefront items are displayed');
    
  } catch (error) {
    customLogger.error(`Database reset failed: ${error.message}`);
    if (error.stack) {
      customLogger.error(`Stack trace: ${error.stack}`);
    }
    throw error;
  } finally {
    // Close the database connection
    if (sequelize) {
      await sequelize.close();
      customLogger.info('Database connection closed.');
    }
  }
}

// Execute the reset
resetDatabase().catch(error => {
  customLogger.error(`Fatal error during database reset: ${error.message}`);
  process.exit(1);
});
