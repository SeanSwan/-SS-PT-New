// backend/scripts/reset-db-sequelize.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get directory name equivalent in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const projectRootDir = path.resolve(rootDir, '..');

// Load the .env file from the project root directory
const envPath = path.resolve(projectRootDir, '.env');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn(`Warning: .env file not found at ${envPath}`);
  dotenv.config(); // Try default location as a last resort
}

// Import the database and models
import sequelize from '../database.mjs';
// Import setupAssociations to ensure all associations are properly configured
import setupAssociations from '../setupAssociations.mjs';

// Execute the database reset
async function resetDatabase() {
  try {
    console.log('----- Database Reset Script -----');
    
    // Test database connection
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established successfully.');
    } catch (error) {
      console.error(`❌ Unable to connect to the database: ${error.message}`);
      throw new Error(`Database connection failed: ${error.message}`);
    }
    
    // Setup associations before synchronizing models
    console.log('Setting up model associations...');
    setupAssociations();
    console.log('✅ Model associations configured successfully.');
    
    // Drop all tables and recreate them
    console.log('Dropping and recreating all tables...');
    await sequelize.sync({ force: true });
    console.log('✅ Database reset successfully. All tables have been recreated.');
    
    console.log('----- Database Reset Complete -----');
    
  } catch (error) {
    console.error(`❌ Database reset failed: ${error.message}`);
    if (error.stack) {
      console.error(`Stack trace: ${error.stack}`);
    }
    throw error;
  } finally {
    // Close the database connection
    await sequelize.close();
    console.log('Database connection closed.');
  }
}

// Run the database reset
resetDatabase().catch(error => {
  console.error(`Fatal error during database reset: ${error.message}`);
  process.exit(1);
});
