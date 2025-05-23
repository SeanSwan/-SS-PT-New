/**
 * Database Test Script
 * ====================
 * This script attempts to connect to the database and performs basic operations
 * to ensure the database is properly configured and accessible.
 * 
 * Run with: node scripts/test-db.mjs
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { Sequelize } from 'sequelize';
import { existsSync } from 'fs';

// Get directory name equivalent in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRootDir = path.resolve(__dirname, '..');
const envPath = path.resolve(projectRootDir, '.env');

// Load .env file if exists
if (existsSync(envPath)) {
  console.log(`Loading environment variables from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn(`Warning: .env file not found at ${envPath}`);
  dotenv.config(); // Try default location as a last resort
}

// Configuration
const isProduction = process.env.NODE_ENV === 'production';
console.log(`Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);

// Try to connect to the database
async function testDatabaseConnection() {
  console.log('Testing database connection...');

  let sequelize;
  try {
    // PRODUCTION: Use DATABASE_URL
    if (isProduction) {
      const databaseUrl = process.env.DATABASE_URL;
      
      if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable is not set in production');
      }
      
      console.log('Connecting to production database via DATABASE_URL');
      
      sequelize = new Sequelize(databaseUrl, {
        dialect: 'postgres',
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        },
        logging: console.log
      });
    } 
    // DEVELOPMENT: Use local PostgreSQL configuration
    else {
      console.log('Development database connection parameters:');
      console.log(`Host: ${process.env.PG_HOST || 'localhost'}`);
      console.log(`Port: ${process.env.PG_PORT || '5432'}`);
      console.log(`Database: ${process.env.PG_DB || 'swanstudios'}`);
      console.log(`User: ${process.env.PG_USER || 'swanadmin'}`);
      console.log(`Password: ${process.env.PG_PASSWORD ? '******** (set)' : '(not set)'}`);

      // CRITICAL: Ensure password is explicitly a string
      const pgPassword = process.env.PG_PASSWORD;
      const stringPassword = pgPassword !== undefined && pgPassword !== null 
        ? String(pgPassword) 
        : '';
      
      sequelize = new Sequelize(
        process.env.PG_DB || 'swanstudios',
        process.env.PG_USER || 'swanadmin',
        stringPassword,
        {
          host: process.env.PG_HOST || 'localhost',
          port: process.env.PG_PORT || 5432,
          dialect: 'postgres',
          logging: console.log
        }
      );
    }

    // Test the connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Try a basic query
    const [results] = await sequelize.query('SELECT version();');
    console.log('✅ Database query successful:');
    console.log(`Database Version: ${results[0]?.version || 'Unknown'}`);

    // List all tables
    const [tables] = await sequelize.query(
      isProduction
        ? "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
        : "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    
    console.log('✅ Tables in database:');
    if (tables.length === 0) {
      console.log('No tables found. Database may be empty.');
    } else {
      tables.forEach(table => {
        console.log(`- ${table.table_name}`);
      });
    }

    return true;
  } catch (error) {
    console.error('❌ Database connection error:');
    console.error(error.message);
    
    if (error.parent) {
      console.error('Parent error:', error.parent.message);
    }
    
    if (error.original) {
      console.error('Original error:', error.original.message);
    }
    
    console.log('\nPossible solutions:');
    console.log('1. Check if PostgreSQL server is running');
    console.log('2. Verify database credentials in .env file');
    console.log('3. Ensure the database exists and is accessible');
    console.log('4. Check network connectivity to the database server');
    
    return false;
  } finally {
    if (sequelize) {
      try {
        await sequelize.close();
        console.log('Database connection closed.');
      } catch (closeError) {
        console.error('Error closing database connection:', closeError.message);
      }
    }
  }
}

// Run the test
testDatabaseConnection().then(success => {
  console.log(`\nDatabase test ${success ? 'PASSED' : 'FAILED'}`);
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Unexpected error during database test:', error);
  process.exit(1);
});
