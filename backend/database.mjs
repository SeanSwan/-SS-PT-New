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
  // PRODUCTION: Use Render's DATABASE_URL with SSL configuration
  sequelize = new Sequelize(process.env.DATABASE_URL, {
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
} else {
  // DEVELOPMENT: Use local PostgreSQL configuration
  sequelize = new Sequelize(
    process.env.PG_DB,
    process.env.PG_USER,
    process.env.PG_PASSWORD,
    {
      host: process.env.PG_HOST,
      port: process.env.PG_PORT,
      dialect: 'postgres',
      logging: false, // Set to console.log for SQL query debugging if needed
    }
  );
  
  console.log('Using development database configuration');
}

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