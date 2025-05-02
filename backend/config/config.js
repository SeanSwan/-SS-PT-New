// backend/config/config.js

import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Construct path to the root .env file (assuming config.js is in backend/config/)
const envPath = path.resolve(__dirname, '..', '..', '.env');

// Load environment variables from the .env file located at the project root.
config({ path: envPath });

/**
 * Sequelize Configuration Object
 * Used by Sequelize CLI and the application to connect to PostgreSQL.
 * Relies on environment variables defined in the root .env file.
 */
const dbConfig = {
  development: {
    username: process.env.PG_USER,       // Read directly from .env
    password: process.env.PG_PASSWORD,   // Read directly from .env
    database: process.env.PG_DB,         // Read directly from .env
    host: process.env.PG_HOST,           // Read directly from .env
    port: process.env.PG_PORT || 5432,   // Read directly from .env or default
    dialect: 'postgres',
    logging: console.log, // Enable logging in development for debugging SQL
    // Optional: Add dialectOptions if needed for specific local setups
    // dialectOptions: {
    //   // e.g., ssl: { require: true, rejectUnauthorized: false }
    // }
  },
  test: {
    username: process.env.PG_USER_TEST || process.env.PG_USER,
    password: process.env.PG_PASSWORD_TEST || process.env.PG_PASSWORD,
    database: process.env.PG_DB_TEST || `${process.env.PG_DB}_test`, // Convention: main_db_test
    host: process.env.PG_HOST_TEST || process.env.PG_HOST,
    port: process.env.PG_PORT_TEST || process.env.PG_PORT || 5432,
    dialect: 'postgres',
    logging: false, // Usually disable logging for tests
  },
  production: {
    // IMPORTANT: For Render, use the DATABASE_URL environment variable
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        // Render requires rejectUnauthorized: false for their managed databases
        rejectUnauthorized: false
      }
    },
    logging: false, // Disable verbose SQL logging in production
  },
};

export default dbConfig;