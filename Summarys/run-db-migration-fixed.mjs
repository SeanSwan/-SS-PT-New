// run-db-migration-fixed.mjs
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sequelize from './backend/database.mjs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Sequelize, DataTypes } from 'sequelize';

const execPromise = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigration() {
  try {
    console.log('Starting database migration...');
    
    // Verify that the migration file exists
    const migrationPath = path.join(__dirname, 'backend', 'migrations', '20250509-add-mcp-fields-to-progress.mjs');
    try {
      await fs.access(migrationPath);
      console.log(`Migration file exists: ${migrationPath}`);
    } catch (error) {
      console.error(`Migration file does not exist: ${migrationPath}`);
      console.error('Please ensure the migration file is in the correct location');
      process.exit(1);
    }
    
    console.log('Checking if fields already exist...');
    
    // Check if the columns already exist
    try {
      const checkColumns = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'client_progress' 
        AND column_name IN ('workoutData', 'gamificationData', 'lastSynced');
      `, { type: sequelize.QueryTypes.SELECT });
      
      if (checkColumns.length > 0) {
        const existingColumns = checkColumns.map(col => col.column_name).join(', ');
        console.log(`Columns already exist: ${existingColumns}`);
        console.log('Skipping migration as columns are already present.');
        return;
      }
    } catch (error) {
      console.error('Error checking existing columns:', error.message);
      // Continue with migration attempt
    }
    
    console.log('Running migration to add fields to client_progress table...');
    
    try {
      // Add workoutData column
      await sequelize.query(`
        ALTER TABLE client_progress ADD COLUMN IF NOT EXISTS "workoutData" TEXT NULL;
        COMMENT ON COLUMN client_progress."workoutData" IS 'Raw JSON data from workout MCP server';
      `);
      console.log('Added workoutData column');
      
      // Add gamificationData column
      await sequelize.query(`
        ALTER TABLE client_progress ADD COLUMN IF NOT EXISTS "gamificationData" TEXT NULL;
        COMMENT ON COLUMN client_progress."gamificationData" IS 'Raw JSON data from gamification MCP server';
      `);
      console.log('Added gamificationData column');
      
      // Add lastSynced column
      await sequelize.query(`
        ALTER TABLE client_progress ADD COLUMN IF NOT EXISTS "lastSynced" TIMESTAMP WITH TIME ZONE NULL;
        COMMENT ON COLUMN client_progress."lastSynced" IS 'Timestamp of last synchronization with MCP servers';
      `);
      console.log('Added lastSynced column');
      
      console.log('Migration completed successfully!');
      console.log('The client_progress table has been updated with new fields:');
      console.log('- workoutData: Raw JSON data from workout MCP server');
      console.log('- gamificationData: Raw JSON data from gamification MCP server');
      console.log('- lastSynced: Timestamp of last synchronization with MCP servers');
      
      console.log('\nNext steps:');
      console.log('1. Restart your server to apply the model changes');
      console.log('2. Verify that the client progress tab now displays synchronized data');
      console.log('3. Test the synchronization between client and admin dashboards');
      
    } catch (error) {
      console.error('Error executing SQL migration:', error);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Error during migration process:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Run the migration
runMigration();