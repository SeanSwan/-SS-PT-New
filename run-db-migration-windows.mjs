// run-db-migration-windows.mjs
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Sequelize, DataTypes } from 'sequelize';
import dotenv from 'dotenv';

// Setup paths for ESM modules on Windows
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Create a Sequelize instance directly, similar to database.mjs but simplified
const connectToDatabase = async () => {
  try {
    console.log('Development database connection parameters:');
    console.log(`Host: ${process.env.PG_HOST || 'localhost'}`);
    console.log(`Port: ${process.env.PG_PORT || '5432'}`);
    console.log(`Database: ${process.env.PG_DB || 'swanstudios'}`);
    console.log(`User: ${process.env.PG_USER || 'swanadmin'}`);
    
    // Use the database connection parameters directly
    const sequelize = new Sequelize(
      process.env.PG_DB || 'swanstudios',
      process.env.PG_USER || 'swanadmin',
      process.env.PG_PASSWORD || '',
      {
        host: process.env.PG_HOST || 'localhost',
        port: process.env.PG_PORT || 5432,
        dialect: 'postgres',
        logging: console.log,
      }
    );
    
    // Test the connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    return sequelize;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);
    throw error;
  }
};

// Main migration function
async function runMigration() {
  try {
    console.log('Starting database migration...');
    
    // Connect to database
    const sequelize = await connectToDatabase();
    
    console.log('Checking if fields already exist...');
    
    // Check if the columns already exist
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
    await sequelize.query(`
      ALTER TABLE client_progress 
      ADD COLUMN IF NOT EXISTS "workoutData" TEXT NULL;
      COMMENT ON COLUMN client_progress."workoutData" IS 'Raw JSON data from workout MCP server';
    `);
    console.log('Added workoutData column');
    
    // Add gamificationData column
    await sequelize.query(`
      ALTER TABLE client_progress 
      ADD COLUMN IF NOT EXISTS "gamificationData" TEXT NULL;
      COMMENT ON COLUMN client_progress."gamificationData" IS 'Raw JSON data from gamification MCP server';
    `);
    console.log('Added gamificationData column');
    
    // Add lastSynced column
    await sequelize.query(`
      ALTER TABLE client_progress 
      ADD COLUMN IF NOT EXISTS "lastSynced" TIMESTAMP WITH TIME ZONE NULL;
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
    
    // Close the database connection
    await sequelize.close();
    
  } catch (error) {
    console.error('Error during migration process:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();