// run-db-migration.mjs
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sequelize from './backend/database.mjs';
import { Sequelize, DataTypes } from 'sequelize';

// Setup directory paths properly for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Migration: Add MCP fields to client_progress table
 */
async function runMigration() {
  try {
    console.log('Starting database migration...');
    
    // Verify that the database connection is working
    try {
      await sequelize.authenticate();
      console.log('Database connection established successfully.');
    } catch (error) {
      console.error('Unable to connect to the database:', error);
      process.exit(1);
    }
    
    // Check if the columns already exist
    console.log('Checking if fields already exist...');
    const checkColumns = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'client_progress' 
      AND column_name IN ('workoutData', 'gamificationData', 'lastSynced');
    `, { type: sequelize.QueryTypes.SELECT });
    
    if (checkColumns.length > 0) {
      const existingColumns = checkColumns.map(col => col.column_name).join(', ');
      console.log(`Columns already exist: ${existingColumns}`);
      console.log('Skipping migration as some columns are already present.');
      await sequelize.close();
      return;
    }
    
    console.log('Running migration to add fields to client_progress table...');
    
    // Add workoutData column
    console.log('Adding workoutData column...');
    await sequelize.query(`
      ALTER TABLE client_progress 
      ADD COLUMN IF NOT EXISTS "workoutData" TEXT NULL;
    `);
    
    // Add gamificationData column
    console.log('Adding gamificationData column...');
    await sequelize.query(`
      ALTER TABLE client_progress 
      ADD COLUMN IF NOT EXISTS "gamificationData" TEXT NULL;
    `);
    
    // Add lastSynced column
    console.log('Adding lastSynced column...');
    await sequelize.query(`
      ALTER TABLE client_progress 
      ADD COLUMN IF NOT EXISTS "lastSynced" TIMESTAMP WITH TIME ZONE NULL;
    `);
    
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
    console.error('Error during migration process:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Run the migration
runMigration();