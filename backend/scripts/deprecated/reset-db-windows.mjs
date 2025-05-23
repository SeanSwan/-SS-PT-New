// backend/scripts/reset-db-windows.mjs
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

// Get directory name equivalent in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Promisify exec
const execAsync = promisify(exec);

/**
 * Get PostgreSQL connection details from environment variables
 */
function getPgConnectionDetails() {
  let dbName = process.env.PG_DB || 'swanstudios';
  const host = process.env.PG_HOST || 'localhost';
  const port = process.env.PG_PORT || '5432';
  const username = process.env.PG_USER || 'postgres';
  const password = process.env.PG_PASS || 'postgres';

  return {
    dbName,
    host,
    port,
    username,
    password,
  };
}

/**
 * Execute a PostgreSQL command on Windows
 */
async function executePgCommand(command, database = 'postgres') {
  const { host, port, username, password } = getPgConnectionDetails();
  
  // For Windows, we need to use separate commands for setting the password and executing psql
  // Create a temporary batch file to run the commands
  const tempBatchFile = path.join(__dirname, 'temp_psql_command.bat');
  const psqlCommand = `@echo off
set PGPASSWORD=${password}
psql -h ${host} -p ${port} -U ${username} -d ${database} -c "${command}"
`;
  
  console.log(`Executing psql command on: ${database}`);
  
  try {
    // Write the batch file
    fs.writeFileSync(tempBatchFile, psqlCommand);
    
    // Execute the batch file
    const { stdout, stderr } = await execAsync(tempBatchFile);
    
    // Delete the batch file
    fs.unlinkSync(tempBatchFile);
    
    if (stderr && !stderr.includes('CREATE DATABASE')) {
      console.error('Error:', stderr);
    }
    return stdout;
  } catch (error) {
    // Make sure to clean up the temp file even if there's an error
    if (fs.existsSync(tempBatchFile)) {
      fs.unlinkSync(tempBatchFile);
    }
    console.error('Error executing PostgreSQL command:', error.message);
    throw error;
  }
}

/**
 * Main reset database function
 */
async function resetDatabase() {
  try {
    console.log('===== MANUAL DATABASE RESET (WINDOWS) =====');
    
    const { dbName } = getPgConnectionDetails();
    
    console.log(`1. Attempting to drop database "${dbName}"...`);
    try {
      // Terminate all connections to the database (if exists)
      await executePgCommand(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${dbName}'`);
      // Drop the database if it exists
      await executePgCommand(`DROP DATABASE IF EXISTS "${dbName}"`);
      console.log(`   Database "${dbName}" dropped successfully.`);
    } catch (error) {
      console.warn(`   Could not drop database "${dbName}". It might not exist or could be in use.`);
      console.warn(`   Error: ${error.message}`);
    }
    
    console.log(`2. Creating database "${dbName}"...`);
    try {
      await executePgCommand(`CREATE DATABASE "${dbName}"`);
      console.log(`   Database "${dbName}" created successfully.`);
    } catch (error) {
      console.error(`   Failed to create database "${dbName}". Error: ${error.message}`);
      throw error;
    }
    
    console.log('3. Dropping SequelizeMeta table if it exists...');
    try {
      await executePgCommand(`DROP TABLE IF EXISTS "SequelizeMeta"`, dbName);
      console.log('   SequelizeMeta table dropped successfully.');
    } catch (error) {
      console.warn('   Could not drop SequelizeMeta table. It might not exist.');
      console.warn(`   Error: ${error.message}`);
    }
    
    console.log('4. Dropping enum types if they exist...');
    try {
      await executePgCommand(`DROP TYPE IF EXISTS "enum_users_role"`, dbName);
      console.log('   Enum types dropped successfully.');
    } catch (error) {
      console.warn('   Could not drop enum types. They might not exist.');
      console.warn(`   Error: ${error.message}`);
    }
    
    console.log('===== DATABASE RESET COMPLETE =====');
    console.log('');
    console.log('Now you can run migrations and seeders:');
    console.log('npm run migrate && npm run seed');
    
  } catch (error) {
    console.error('Database reset failed:', error);
    process.exit(1);
  }
}

// Execute the reset
resetDatabase();
