// update-client-progress.mjs
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

// Utility to execute shell commands
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command}`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return reject(error);
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
      console.log(`stdout: ${stdout}`);
      resolve(stdout);
    });
  });
}

// Main function
async function main() {
  try {
    console.log('Starting client progress table update...');

    // Verify the migration file exists
    const migrationPath = path.join('backend', 'migrations', '20250509-add-mcp-fields-to-progress.mjs');
    try {
      await fs.access(migrationPath);
      console.log(`Migration file exists: ${migrationPath}`);
    } catch (error) {
      console.error(`Migration file does not exist: ${migrationPath}`);
      console.error('Please ensure the migration file is in the correct location');
      process.exit(1);
    }

    // Run the migration with Sequelize
    console.log('Running migration...');
    await executeCommand('npx sequelize-cli db:migrate');

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
    console.error('Error during update process:', error);
    process.exit(1);
  }
}

// Run the main function
main();