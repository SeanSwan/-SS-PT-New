// backend/scripts/reset-db-manual.mjs
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
    connectionString: `postgresql://${username}:${password}@${host}:${port}/${dbName}`
  };
}

/**
 * Execute a PostgreSQL command
 */
async function executePgCommand(command, database = 'postgres') {
  const { host, port, username, password } = getPgConnectionDetails();
  
  const pgCommand = `PGPASSWORD=${password} psql -h ${host} -p ${port} -U ${username} -d ${database} -c "${command}"`;
  
  console.log(`Executing: ${pgCommand.replace(/PGPASSWORD=.*? psql/, 'psql')}`);
  
  try {
    const { stdout, stderr } = await execAsync(pgCommand);
    if (stderr && !stderr.includes('CREATE DATABASE')) {
      console.error('Error:', stderr);
    }
    return stdout;
  } catch (error) {
    console.error('Error executing PostgreSQL command:', error.message);
    throw error;
  }
}

/**
 * Main reset database function
 */
async function resetDatabase() {
  try {
    console.log('===== MANUAL DATABASE RESET =====');
    
    const { dbName } = getPgConnectionDetails();
    
    console.log(`1. Attempting to drop database "${dbName}"...`);
    try {
      // Terminate all connections to the database
      await executePgCommand(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${dbName}'`);
      // Drop the database
      await executePgCommand(`DROP DATABASE IF EXISTS "${dbName}"`);
      console.log(`   Database "${dbName}" dropped successfully.`);
    } catch (error) {
      console.warn(`   Could not drop database "${dbName}". It might not exist or could be in use.`);
    }
    
    console.log(`2. Creating database "${dbName}"...`);
    await executePgCommand(`CREATE DATABASE "${dbName}"`);
    console.log(`   Database "${dbName}" created successfully.`);
    
    console.log('3. Dropping SequelizeMeta table if it exists...');
    try {
      await executePgCommand(`DROP TABLE IF EXISTS "SequelizeMeta"`, dbName);
      console.log('   SequelizeMeta table dropped successfully.');
    } catch (error) {
      console.warn('   Could not drop SequelizeMeta table. It might not exist.');
    }
    
    console.log('4. Dropping enum types if they exist...');
    try {
      await executePgCommand(`DROP TYPE IF EXISTS "enum_users_role"`, dbName);
      console.log('   Enum types dropped successfully.');
    } catch (error) {
      console.warn('   Could not drop enum types. They might not exist.');
    }
    
    console.log('===== DATABASE RESET COMPLETE =====');
    console.log('');
    console.log('Now you can run migrations and seeders:');
    console.log('cd backend && npm run migrate && npm run seed');
    
  } catch (error) {
    console.error('Database reset failed:', error);
    process.exit(1);
  }
}

// Execute the reset
resetDatabase();
