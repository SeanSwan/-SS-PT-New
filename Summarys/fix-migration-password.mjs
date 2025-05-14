// fix-migration-password.mjs
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Sequelize } from 'sequelize';

// Get directory name equivalent in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// IMPORTANT: Load the .env file from the project root directory
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn(`Warning: .env file not found at ${envPath}.`);
  dotenv.config(); // Try default location as last resort
}

/**
 * Log with timestamp for better debugging
 */
function logWithTime(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

/**
 * Creates a properly configured Sequelize instance
 * with special handling for empty passwords
 */
function createSequelizeInstance() {
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
        logging: dbLogger
      });
      
      console.log('Production database configuration applied');
    } 
    // DEVELOPMENT: Use local PostgreSQL configuration with special password handling
    else {
      // Log connection parameters (without showing the actual password)
      console.log('Development database connection parameters:');
      console.log(`Host: ${process.env.PG_HOST || 'localhost'}`);
      console.log(`Port: ${process.env.PG_PORT || '5432'}`);
      console.log(`Database: ${process.env.PG_DB || 'swanstudios'}`);
      console.log(`User: ${process.env.PG_USER || 'swanadmin'}`);
      
      // CRITICAL FIX: Proper password handling for PostgreSQL SASL authentication
      // PostgreSQL requires an empty string for no password, not null or undefined
      const pgUser = process.env.PG_USER || 'swanadmin';
      const pgHost = process.env.PG_HOST || 'localhost';
      const pgPort = process.env.PG_PORT || 5432;
      const pgDB = process.env.PG_DB || 'swanstudios';
      
      // We'll try multiple approaches to connect
      
      // First approach: Using an explicit empty string for password
      try {
        console.log('Attempting connection with empty string password...');
        sequelize = new Sequelize(pgDB, pgUser, '', {
          host: pgHost,
          port: pgPort,
          dialect: 'postgres',
          logging: dbLogger
        });
        
        // Test the connection
        return sequelize;
      } catch (err) {
        console.log('Empty string password failed, trying next approach...');
      }
      
      // Second approach: Using the .env password if it exists
      if (process.env.PG_PASSWORD) {
        try {
          console.log('Attempting connection with .env password...');
          console.log('Password status: SET (using from .env)');
          sequelize = new Sequelize(pgDB, pgUser, String(process.env.PG_PASSWORD), {
            host: pgHost,
            port: pgPort,
            dialect: 'postgres',
            logging: dbLogger
          });
          
          // Test the connection
          return sequelize;
        } catch (err) {
          console.log('.env password failed, trying next approach...');
        }
      }
      
      // Third approach: Using postgres URI with no password
      try {
        console.log('Attempting connection with postgres URI and no password...');
        sequelize = new Sequelize(`postgres://${pgUser}@${pgHost}:${pgPort}/${pgDB}`, {
          dialect: 'postgres',
          logging: dbLogger
        });
        
        // Test the connection
        return sequelize;
      } catch (err) {
        console.log('URI connection without password failed, trying final approach...');
      }
      
      // Final approach: Try to connect with null password explicitly
      console.log('Attempting connection with null password...');
      sequelize = new Sequelize(pgDB, pgUser, null, {
        host: pgHost,
        port: pgPort,
        dialect: 'postgres',
        logging: dbLogger
      });
      
      return sequelize;
    }
    
    return sequelize;
  } catch (error) {
    console.error('❌ ERROR during database configuration:', error.message);
    throw error;
  }
}

/**
 * Run SQL query with error handling
 */
async function runSqlWithTransaction(sequelize, sql) {
  const transaction = await sequelize.transaction();
  try {
    logWithTime(`Executing SQL: ${sql}`);
    await sequelize.query(sql, { transaction });
    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    logWithTime(`SQL Error: ${error.message}`);
    throw error;
  }
}

/**
 * Check if columns exist in the table
 */
async function checkColumnsExist(sequelize, tableName, columnNames) {
  try {
    const query = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = '${tableName}' 
      AND column_name IN (${columnNames.map(col => `'${col}'`).join(', ')});
    `;
    
    const results = await sequelize.query(query, { 
      type: sequelize.QueryTypes.SELECT 
    });
    
    return results.map(row => row.column_name);
  } catch (error) {
    logWithTime(`Error checking columns: ${error.message}`);
    throw error;
  }
}

/**
 * Fix the client_progress table by adding the required columns
 */
async function fixClientProgressTable() {
  let sequelize;
  
  try {
    logWithTime('Starting database migration fix with proper password handling...');
    
    // Create Sequelize instance with proper password handling
    sequelize = createSequelizeInstance();
    
    // Verify database connection
    try {
      await sequelize.authenticate();
      logWithTime('✅ Database connection established successfully with fixed password handling.');
    } catch (error) {
      logWithTime(`❌ Unable to connect to the database: ${error.message}`);
      if (error.parent) {
        logWithTime(`❌ Parent error: ${error.parent.message}`);
      }
      process.exit(1);
    }
    
    // Check if table exists
    const tableCheckQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'client_progress'
      );
    `;
    const tableExists = await sequelize.query(tableCheckQuery, { 
      type: sequelize.QueryTypes.SELECT 
    });
    
    if (!tableExists[0].exists) {
      logWithTime("Error: 'client_progress' table does not exist!");
      process.exit(1);
    }
    
    // Check which columns already exist
    const requiredColumns = ['workoutData', 'gamificationData', 'lastSynced'];
    const existingColumns = await checkColumnsExist(sequelize, 'client_progress', requiredColumns);
    
    logWithTime(`Found existing columns: ${existingColumns.join(', ') || 'none'}`);
    
    // Add missing columns
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length === 0) {
      logWithTime('All required columns already exist. No migration needed.');
      return;
    }
    
    logWithTime(`Adding missing columns: ${missingColumns.join(', ')}`);
    
    // Add each missing column
    for (const column of missingColumns) {
      let sql;
      if (column === 'workoutData' || column === 'gamificationData') {
        sql = `ALTER TABLE client_progress ADD COLUMN IF NOT EXISTS "${column}" TEXT NULL;`;
      } else if (column === 'lastSynced') {
        sql = `ALTER TABLE client_progress ADD COLUMN IF NOT EXISTS "lastSynced" TIMESTAMP WITH TIME ZONE NULL;`;
      }
      
      if (sql) {
        await runSqlWithTransaction(sequelize, sql);
        logWithTime(`Added column: ${column}`);
      }
    }
    
    // Verify the columns were added
    const finalColumns = await checkColumnsExist(sequelize, 'client_progress', requiredColumns);
    const addedColumns = finalColumns.filter(col => !existingColumns.includes(col));
    
    logWithTime(`Successfully added columns: ${addedColumns.join(', ')}`);
    logWithTime('Migration completed successfully!');
    logWithTime('The client_progress table has been updated with MCP data fields');
    
    logWithTime('\nNext steps:');
    logWithTime('1. Restart your server to apply the model changes');
    logWithTime('2. Verify the client progress tab shows synchronized data');
    logWithTime('3. Test the synchronization between client and admin dashboards');
    
  } catch (error) {
    logWithTime(`Error during migration process: ${error.message}`);
    if (error.original) {
      logWithTime(`Original error: ${error.original.message}`);
    }
    process.exit(1);
  } finally {
    if (sequelize) {
      await sequelize.close();
    }
  }
}

// Run the migration fix
fixClientProgressTable();
