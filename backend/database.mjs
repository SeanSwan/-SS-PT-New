/**
 * Swan Studios - Database Configuration
 * ====================================
 * This module establishes connection to PostgreSQL using Sequelize.
 * It handles both local development and production (Render) environments.
 */

import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name equivalent in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRootDir = path.resolve(__dirname, '..');

// IMPORTANT: Load the .env file from the project root directory
// This is crucial to ensure process.env.PG_PASSWORD is available before Sequelize initialization
const envPath = path.resolve(projectRootDir, '.env');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn(`Warning: .env file not found at ${envPath}. This is normal in production environments.`);
  // In production, environment variables are set through the platform (e.g., Render)
  // and don't require a .env file
  dotenv.config(); // Try default location as a last resort for development
}

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';
console.log(`Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);

let sequelize;

// Create a logging function that can be disabled in production
const dbLogger = isProduction 
  ? false // Disable logging in production for performance and security
  : (msg) => console.log(`[DB]: ${msg}`);

try {
  // PRODUCTION: Use Render's DATABASE_URL with SSL configuration
  if (isProduction) {
    // Check if DATABASE_URL is set (provided by Render or other hosting platforms)
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set in production');
    }
    
    // Log production connection (without sensitive info)
    console.log('Connecting to production database via DATABASE_URL');
    
    // Use SSL for production database connections
    sequelize = new Sequelize(databaseUrl, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false // Required for Render PostgreSQL connections
        }
      },
      pool: {
        max: 15, // Increased max connections for production
        min: 2,  // Minimum 2 connections to ensure availability
        acquire: 30000, // Maximum time, in milliseconds, that pool will try to get connection before throwing error
        idle: 10000, // Maximum time, in milliseconds, that a connection can be idle before being released
      },
      logging: dbLogger,
      retry: {
        match: [
          /ETIMEDOUT/,
          /EHOSTUNREACH/,
          /ECONNRESET/,
          /ECONNREFUSED/,
          /ETIMEDOUT/,
          /ESOCKETTIMEDOUT/,
          /EHOSTUNREACH/,
          /EPIPE/,
          /EAI_AGAIN/,
          /SequelizeConnectionError/,
          /SequelizeConnectionRefusedError/,
          /SequelizeHostNotFoundError/,
          /SequelizeHostNotReachableError/,
          /SequelizeInvalidConnectionError/,
          /SequelizeConnectionTimedOutError/
        ],
        max: 5 // Maximum retry attempts
      }
    });
    
    console.log('Production database configuration applied');
  } 
  // DEVELOPMENT: Use local PostgreSQL configuration
  else {
    // Log connection parameters (without showing the actual password)
    console.log('Development database connection parameters:');
    console.log(`Host: ${process.env.PG_HOST || 'localhost'}`);
    console.log(`Port: ${process.env.PG_PORT || '5432'}`);
    console.log(`Database: ${process.env.PG_DB || 'swanstudios'}`);
    console.log(`User: ${process.env.PG_USER || 'swanadmin'}`);
    console.log(`Password: ${process.env.PG_PASSWORD ? '******** (set)' : '(not set)'}`);

    // CRITICAL: Ensure password is explicitly a string to avoid SCRAM authentication issues
    // This is especially important for the pg driver's SASL authentication
    const pgPassword = process.env.PG_PASSWORD;
    const stringPassword = pgPassword !== undefined && pgPassword !== null 
      ? String(pgPassword) 
      : '';
    
    sequelize = new Sequelize(
      process.env.PG_DB || 'swanstudios',
      process.env.PG_USER || 'swanadmin',
      stringPassword, // Use the explicitly converted string password to avoid SCRAM issues
      {
        host: process.env.PG_HOST || 'localhost',
        port: process.env.PG_PORT || 5432,
        dialect: 'postgres',
        logging: dbLogger,
        pool: {
          max: 5,   // Max 5 connections for development
          min: 0,   // Minimum 0 connections
          acquire: 30000,
          idle: 10000,
        },
      }
    );
    
    console.log('Development database configuration applied');
  }
} catch (error) {
  console.error('❌ ERROR during database configuration:', error.message);
  
  // In production, don't provide a fallback - let the app crash so platform can restart
  if (isProduction) {
    console.error('Critical database error in production - exiting process');
    process.exit(1); // Exit with error code
  } 
  // In development, provide a fallback for testing other parts of the app
  else {
    console.warn('⚠️ Using fallback database configuration for development only');
    // Create a fallback in-memory SQLite database for development as a last resort
    sequelize = new Sequelize('sqlite::memory:', {
      logging: dbLogger,
    });
  }
}

// Export Sequelize Op (operators)
export const Op = Sequelize.Op;

/**
 * Tests the database connection and logs the result
 * This is automatically called when this module is imported
 */
export const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);
    if (error.parent) {
      console.error('❌ Parent error:', error.parent.message);
    }
    if (error.original) {
      console.error('❌ Original error:', error.original.message);
    }
    
    if (isProduction) {
      // In production, connection failures are critical errors
      console.error('Critical database connection failure in production');
      process.exit(1); // Exit with error code to trigger platform restart
    }
    
    return false;
  }
};

// Test connection when this module is imported
testConnection();

export default sequelize;