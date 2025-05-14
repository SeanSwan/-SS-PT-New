// fix-db-migration.mjs
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sequelize from './backend/database.mjs';

// Setup directory paths properly for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Log with timestamp for better debugging
 */
function logWithTime(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

/**
 * Run SQL query with error handling
 */
async function runSqlWithTransaction(sql) {
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
async function checkColumnsExist(tableName, columnNames) {
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
  try {
    logWithTime('Starting database migration fix...');
    
    // Verify database connection
    try {
      await sequelize.authenticate();
      logWithTime('Database connection established successfully.');
    } catch (error) {
      logWithTime(`Unable to connect to the database: ${error.message}`);
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
    const existingColumns = await checkColumnsExist('client_progress', requiredColumns);
    
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
        await runSqlWithTransaction(sql);
        logWithTime(`Added column: ${column}`);
      }
    }
    
    // Verify the columns were added
    const finalColumns = await checkColumnsExist('client_progress', requiredColumns);
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
    await sequelize.close();
  }
}

// Run the migration fix
fixClientProgressTable();
