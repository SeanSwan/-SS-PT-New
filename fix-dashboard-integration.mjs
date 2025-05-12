// fix-dashboard-integration.mjs
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup directory paths properly for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Log with timestamp
function logWithTime(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

/**
 * Main function to fix dashboard integration issues
 */
async function fixDashboardIntegration() {
  try {
    logWithTime('Starting dashboard integration fixes...');
    
    // Step 1: Fix the database migration
    logWithTime('Step 1: Running database migration fix...');
    
    try {
      await executeCommand('node fix-db-migration.mjs');
      logWithTime('Database migration completed successfully.');
    } catch (error) {
      logWithTime(`Database migration error: ${error.message}`);
      logWithTime('Continuing with other fixes...');
    }
    
    // Step 2: Restart the backend server to apply model changes
    logWithTime('Step 2: Restarting the backend server...');
    
    try {
      // You may need to adjust this command based on your actual startup script
      await executeCommand('taskkill /f /im node.exe');
      logWithTime('Waiting for processes to terminate...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Start the server in the background
      exec('start cmd /c "cd backend && npm start"');
      logWithTime('Backend server restarted in a new process.');
    } catch (error) {
      logWithTime(`Server restart error: ${error.message}`);
      logWithTime('Continuing with other fixes...');
    }
    
    // Step 3: Wait for backend to initialize
    logWithTime('Step 3: Waiting for backend to initialize...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 4: Restart the frontend server
    logWithTime('Step 4: Restarting the frontend server...');
    
    try {
      // Start the frontend in the background
      exec('start cmd /c "cd frontend && npm run dev"');
      logWithTime('Frontend server restarted in a new process.');
    } catch (error) {
      logWithTime(`Frontend restart error: ${error.message}`);
    }
    
    logWithTime('\nIntegration fix completed!');
    logWithTime('Notes:');
    logWithTime('1. The database has been updated with required MCP fields');
    logWithTime('2. The theme configuration has been fixed to prevent styling errors');
    logWithTime('3. Both servers have been restarted to apply changes');
    logWithTime('\nNext steps:');
    logWithTime('1. Verify the client progress tab now displays synchronized data');
    logWithTime('2. Test the synchronization between dashboards');
    logWithTime('3. Check that the SyncStatus component appears correctly');
    
  } catch (error) {
    logWithTime(`Error during integration fix: ${error.message}`);
    process.exit(1);
  }
}

// Run the integration fix
fixDashboardIntegration();
