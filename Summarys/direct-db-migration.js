// direct-db-migration.js - Using CommonJS syntax and pg directly
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn(`Warning: .env file not found at ${envPath}.`);
  dotenv.config();
}

// Log with timestamp
function logWithTime(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

// Define the database connection info with proper password handling
// This avoids Sequelize's handling which might be causing the issue
const dbConfig = {
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  database: process.env.PG_DB || 'swanstudios',
  user: process.env.PG_USER || 'swanadmin',
  // Use empty string for password if not provided
  password: process.env.PG_PASSWORD || ''
};

// Log connection parameters (without showing the actual password)
console.log('Development database connection parameters:');
console.log(`Host: ${dbConfig.host}`);
console.log(`Port: ${dbConfig.port}`);
console.log(`Database: ${dbConfig.database}`);
console.log(`User: ${dbConfig.user}`);
console.log(`Password: ${dbConfig.password ? '******** (set)' : '(empty string)'}`);

// Create a connection pool
async function executeMigration() {
  const client = new Client(dbConfig);
  
  try {
    logWithTime('Connecting to database using pg directly (bypassing Sequelize)...');
    await client.connect();
    logWithTime('✅ Connected to database successfully!');
    
    // Check if table exists
    logWithTime('Checking if client_progress table exists...');
    const tableCheckResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'client_progress'
      );
    `);
    
    const tableExists = tableCheckResult.rows[0].exists;
    if (!tableExists) {
      logWithTime("❌ Error: 'client_progress' table does not exist!");
      process.exit(1);
    }
    
    logWithTime('✅ client_progress table exists');
    
    // Check which columns already exist
    const requiredColumns = ['workoutData', 'gamificationData', 'lastSynced'];
    logWithTime('Checking existing columns...');
    
    const columnCheckResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'client_progress' 
      AND column_name IN ('workoutData', 'gamificationData', 'lastSynced');
    `);
    
    const existingColumns = columnCheckResult.rows.map(row => row.column_name);
    logWithTime(`Found existing columns: ${existingColumns.join(', ') || 'none'}`);
    
    // Add missing columns
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length === 0) {
      logWithTime('All required columns already exist. No migration needed.');
      return;
    }
    
    logWithTime(`Adding missing columns: ${missingColumns.join(', ')}`);
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Add each missing column
    for (const column of missingColumns) {
      let sql;
      if (column === 'workoutData' || column === 'gamificationData') {
        sql = `ALTER TABLE client_progress ADD COLUMN IF NOT EXISTS "${column}" TEXT NULL;`;
      } else if (column === 'lastSynced') {
        sql = `ALTER TABLE client_progress ADD COLUMN IF NOT EXISTS "lastSynced" TIMESTAMP WITH TIME ZONE NULL;`;
      }
      
      if (sql) {
        logWithTime(`Executing SQL: ${sql}`);
        await client.query(sql);
        logWithTime(`Added column: ${column}`);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    // Verify the columns were added
    const finalColumnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'client_progress' 
      AND column_name IN ('workoutData', 'gamificationData', 'lastSynced');
    `);
    
    const finalColumns = finalColumnCheck.rows.map(row => row.column_name);
    const addedColumns = finalColumns.filter(col => !existingColumns.includes(col));
    
    logWithTime(`Successfully added columns: ${addedColumns.join(', ')}`);
    logWithTime('✅ Migration completed successfully!');
    logWithTime('The client_progress table has been updated with MCP data fields');
    
    logWithTime('\nNext steps:');
    logWithTime('1. Restart your server to apply the model changes');
    logWithTime('2. Verify the client progress tab shows synchronized data');
    logWithTime('3. Test the synchronization between client and admin dashboards');
    
  } catch (error) {
    if (client.query) {
      // Try to rollback if transaction was started
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logWithTime(`Error during rollback: ${rollbackError.message}`);
      }
    }
    
    logWithTime(`❌ Error during migration: ${error.message}`);
    process.exit(1);
  } finally {
    // Close client connection
    if (client.end) {
      await client.end();
    }
  }
}

// Run the migration
executeMigration();
