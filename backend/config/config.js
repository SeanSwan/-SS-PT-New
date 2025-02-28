// backend/config/config.js

// Import dotenv and path to load environment variables.
import { config } from 'dotenv';
import path from 'path';

// Use process.cwd() to get the current working directory (which should be your project root).
const envPath = path.resolve(process.cwd(), '.env');

// Load environment variables from the .env file located at the project root.
config({ path: envPath });

// Debug logging: Check that the environment variables are loaded correctly.
// console.log("PG_USER:", process.env.PG_USER);
// console.log("PG_PASSWORD:", process.env.PG_PASSWORD);
// console.log("PG_DB:", process.env.PG_DB);

/**
 * Sequelize Configuration Object
 * This object is used by Sequelize CLI to connect to your PostgreSQL database.
 * 
 * Make sure your .env file (located in the project root) includes:
 * 
 *   PG_USER=swanadmin
 *   PG_PASSWORD=your_actual_postgres_password
 *   PG_DB=swanstudios
 *   PG_HOST=localhost
 *   PG_PORT=5432
 */
export default {
  development: {
    username: process.env.PG_USER || 'swanadmin',          // Use PG_USER from .env or default to 'swanadmin'
    password: process.env.PG_PASSWORD || 'your_db_password',  // Use PG_PASSWORD from .env (must be set!)
    database: process.env.PG_DB || 'your_db_name',            // Use PG_DB from .env
    host: process.env.PG_HOST || 'localhost',                // Use PG_HOST from .env
    dialect: 'postgres',                                     // Using PostgreSQL as the dialect
  },
  test: {
    username: process.env.PG_USER || 'swanadmin',
    password: process.env.PG_PASSWORD || 'your_db_password',
    database: process.env.PG_DB || 'your_db_name',
    host: process.env.PG_HOST || 'localhost',
    dialect: 'postgres',
  },
  production: {
    username: process.env.PG_USER || 'swanadmin',
    password: process.env.PG_PASSWORD || 'your_db_password',
    database: process.env.PG_DB || 'your_db_name',
    host: process.env.PG_HOST || 'localhost',
    dialect: 'postgres',
  },
};
