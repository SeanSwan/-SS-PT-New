/**
 * Swan Studios - Database Configuration
 * ====================================
 * This module establishes connection to PostgreSQL using Sequelize.
 * It handles both local development and production (Render) environments.
 */

import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

let sequelize;

// Determine which database configuration to use based on environment
if (process.env.NODE_ENV === 'production') {
  // Check if DATABASE_URL is set
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ CRITICAL ERROR: DATABASE_URL environment variable is not set in production!');
    console.error('Please add DATABASE_URL to your environment variables in Render dashboard.');
    // Provide a fallback to prevent immediate crash, though service won't work properly
    sequelize = new Sequelize('postgres://fallback:fallback@localhost:5432/fallback', {
      dialect: 'postgres',
      logging: false
    });
  } else {
    // PRODUCTION: Use Render's DATABASE_URL with SSL configuration
    sequelize = new Sequelize(databaseUrl, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false // Required for Render PostgreSQL connections
        }
      },
      logging: false
    });
    console.log('Using production database configuration');
  }
} else {
  // DEVELOPMENT: Use local PostgreSQL configuration
  sequelize = new Sequelize(
    process.env.PG_DB || 'swanstudios',
    process.env.PG_USER || 'swanadmin',
    process.env.PG_PASSWORD || '',
    {
      host: process.env.PG_HOST || 'localhost',
      port: process.env.PG_PORT || 5432,
      dialect: 'postgres',
      logging: console.log, // Enable logging for development
    }
  );
  
  console.log('Using development database configuration');
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
    console.error('❌ Unable to connect to the database:', error);
    return false;
  }
};

// Test connection when this module is imported
testConnection();

export default sequelize;