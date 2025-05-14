// alter-client-progress-table.mjs
import sequelize from './backend/database.mjs';
import { DataTypes } from 'sequelize';
import { promises as fs } from 'fs';

/**
 * Direct SQL script to alter the client_progress table
 * This avoids the complexity of Sequelize migrations
 */
async function alterTable() {
  try {
    console.log('Starting client progress table update...');
    
    let dbConnection;
    try {
      // Get a direct connection to the database
      dbConnection = await sequelize.getQueryInterface().sequelize;
      console.log('Database connection established.');
    } catch (error) {
      console.error('Error connecting to database:', error);
      process.exit(1);
    }
    
    console.log('Checking if columns already exist in client_progress table...');
    
    // Check if the table exists
    try {
      const tableExists = await dbConnection.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'client_progress'
        );
      `, { plain: true });
      
      if (!tableExists.exists) {
        console.error('client_progress table does not exist in the database!');
        console.error('Please make sure the table exists before running this script.');
        process.exit(1);
      }
    } catch (error) {
      console.error('Error checking if table exists:', error);
      process.exit(1);
    }
    
    // Check if columns already exist
    try {
      const columnsResult = await dbConnection.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'client_progress' 
        AND column_name IN ('workout_data', 'gamification_data', 'last_synced');
      `);
      
      const existingColumns = columnsResult[0].map(col => col.column_name);
      console.log('Existing columns:', existingColumns);
      
      // Add workoutData column if it doesn't exist
      if (!existingColumns.includes('workout_data')) {
        console.log('Adding workout_data column...');
        await dbConnection.query(`
          ALTER TABLE client_progress 
          ADD COLUMN IF NOT EXISTS workout_data TEXT;
        `);
        console.log('✅ workout_data column added successfully');
      } else {
        console.log('workout_data column already exists, skipping...');
      }
      
      // Add gamificationData column if it doesn't exist
      if (!existingColumns.includes('gamification_data')) {
        console.log('Adding gamification_data column...');
        await dbConnection.query(`
          ALTER TABLE client_progress 
          ADD COLUMN IF NOT EXISTS gamification_data TEXT;
        `);
        console.log('✅ gamification_data column added successfully');
      } else {
        console.log('gamification_data column already exists, skipping...');
      }
      
      // Add lastSynced column if it doesn't exist
      if (!existingColumns.includes('last_synced')) {
        console.log('Adding last_synced column...');
        await dbConnection.query(`
          ALTER TABLE client_progress 
          ADD COLUMN IF NOT EXISTS last_synced TIMESTAMP WITH TIME ZONE;
        `);
        console.log('✅ last_synced column added successfully');
      } else {
        console.log('last_synced column already exists, skipping...');
      }
      
      console.log('\nDatabase migration completed successfully!');
      console.log('The client_progress table has been updated with these new fields:');
      console.log('- workout_data: Raw JSON data from workout MCP server');
      console.log('- gamification_data: Raw JSON data from gamification MCP server');
      console.log('- last_synced: Timestamp of last synchronization with MCP servers');
      
      console.log('\nNext steps:');
      console.log('1. Restart your server to apply the model changes');
      console.log('2. Verify that the client progress tab now displays synchronized data');
      console.log('3. Test the synchronization between client and admin dashboards');
      
    } catch (error) {
      console.error('Error executing SQL statements:', error);
      process.exit(1);
    } finally {
      // Close the database connection
      await sequelize.close();
    }
    
  } catch (error) {
    console.error('Error during migration process:', error);
    process.exit(1);
  }
}

// Run the migration
alterTable();