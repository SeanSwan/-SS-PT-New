// run-db-migration-fix.mjs
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sequelize from './backend/database.mjs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { pathToFileURL } from 'url';

const execPromise = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Function to ensure directories exist
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    console.log(`Directory created or already exists: ${dirPath}`);
  } catch (error) {
    console.error(`Error creating directory ${dirPath}:`, error);
    throw error;
  }
}

// Function to run a SQL command on the database
async function runSql(sql) {
  try {
    await sequelize.query(sql);
    return true;
  } catch (error) {
    console.error(`Error running SQL:`, error);
    throw error;
  }
}

// Main migration function
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
    
    // Convert the path to a file URL for ESM import
    const migrationFileUrl = pathToFileURL(migrationPath).href;
    console.log(`Importing migration from: ${migrationFileUrl}`);
    
    // Import the migration file using the file URL
    const migrationModule = await import(migrationFileUrl);
    const migration = migrationModule.default;
    
    console.log('Checking if fields already exist...');
    
    try {
      // Check if the client_progress table exists
      const tableExists = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'client_progress'
        );
      `, { type: sequelize.QueryTypes.SELECT });
      
      if (!tableExists[0].exists) {
        console.log('The client_progress table does not exist. Create it first before running this migration.');
        return;
      }
      
      // Check if the columns already exist
      const checkColumns = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'client_progress' 
        AND column_name IN ('workoutData', 'gamificationData', 'lastSynced');
      `, { type: sequelize.QueryTypes.SELECT });
      
      if (checkColumns.length > 0) {
        const existingColumns = checkColumns.map(col => col.column_name).join(', ');
        console.log(`Some columns already exist: ${existingColumns}`);
        
        // If all three columns exist, skip migration
        if (checkColumns.length === 3) {
          console.log('All required columns already exist. Skipping migration.');
          return;
        }
        
        console.log('Adding only missing columns...');
      }
      
      console.log('Running migration to add fields to client_progress table...');
      
      // Create a temporary SequelizeQueryInterface to use with the migration
      const queryInterface = {
        addColumn: async (tableName, columnName, options) => {
          // Check if column already exists
          const columnExists = checkColumns.some(col => col.column_name === columnName);
          if (columnExists) {
            console.log(`Column ${columnName} already exists. Skipping.`);
            return;
          }
          
          const typeMap = {
            'TEXT': 'TEXT',
            'DATE': 'TIMESTAMP WITH TIME ZONE'
          };
          
          const dataType = options.type.constructor.name === 'DataTypes' 
            ? typeMap[options.type.key] || 'TEXT'
            : 'TEXT';
          
          const nullable = options.allowNull === false ? 'NOT NULL' : 'NULL';
          const comment = options.comment ? `-- ${options.comment}` : '';
          
          const sql = `ALTER TABLE client_progress ADD COLUMN IF NOT EXISTS "${columnName}" ${dataType} ${nullable}; ${comment}`;
          console.log(`Adding column: ${columnName}`);
          return runSql(sql);
        },
        removeColumn: async (tableName, columnName) => {
          const sql = `ALTER TABLE client_progress DROP COLUMN IF EXISTS "${columnName}";`;
          console.log(`Removing column: ${columnName}`);
          return runSql(sql);
        }
      };
      
      // Run the migration's up method
      await migration.up(queryInterface, sequelize.Sequelize);
      
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
      console.error('Database operation error:', error);
      throw error;
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