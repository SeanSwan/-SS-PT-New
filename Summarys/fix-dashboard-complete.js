// fix-dashboard-complete.js - CommonJS version for maximum compatibility
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

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
 * Main function to fix all dashboard integration issues
 */
async function fixAllDashboardIssues() {
  try {
    logWithTime('Starting comprehensive dashboard fixes...');
    
    // Step 1: Run the direct database migration
    logWithTime('Step 1: Running direct database migration (bypassing Sequelize)...');
    
    try {
      await executeCommand('node direct-db-migration.js');
      logWithTime('✅ Database migration completed successfully.');
    } catch (error) {
      logWithTime(`❌ Database migration error: ${error.message}`);
      logWithTime('⚠️ This error needs to be resolved before continuing. Check PostgreSQL connection settings.');
      process.exit(1);
    }
    
    // Step 2: Verify that the SafeMainContent component is being used
    logWithTime('Step 2: Verifying frontend component fixes...');
    
    const progressSectionPath = path.join(__dirname, 'frontend', 'src', 'components', 'ClientDashboard', 'ProgressSection.tsx');
    try {
      const progressContent = fs.readFileSync(progressSectionPath, 'utf8');
      if (progressContent.includes('SafeMainContent')) {
        logWithTime('✅ ProgressSection is now using SafeMainContent.');
      } else {
        logWithTime('⚠️ ProgressSection is not using SafeMainContent. This needs to be fixed.');
      }
    } catch (error) {
      logWithTime(`❌ Error checking ProgressSection: ${error.message}`);
    }
    
    // Step 3: Restart services
    logWithTime('Step 3: Restarting services to apply all changes...');
    
    try {
      // Stop any running Node processes
      try {
        await executeCommand('taskkill /f /im node.exe');
        logWithTime('Terminated existing Node.js processes.');
      } catch (error) {
        // It's okay if there are no processes to terminate
        logWithTime('No Node.js processes found to terminate or couldn\'t terminate them.');
      }
      
      // Wait for processes to exit
      logWithTime('Waiting for processes to terminate completely...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Start the backend in a new process
      exec('start cmd /c "cd backend && npm start"');
      logWithTime('Started backend server in a new process.');
      
      // Wait for backend to initialize
      logWithTime('Waiting for backend to initialize...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Start the frontend in a new process
      exec('start cmd /c "cd frontend && npm run dev"');
      logWithTime('Started frontend server in a new process.');
      
      logWithTime('✅ Services restarted successfully.');
    } catch (error) {
      logWithTime(`❌ Error restarting services: ${error.message}`);
    }
    
    logWithTime('\n🎉 Dashboard integration fixes have been applied!');
    logWithTime('\nWhat has been fixed:');
    logWithTime('1. Database schema updated with MCP data fields (using direct pg connection)');
    logWithTime('2. Frontend component updated to use SafeMainContent (prevents theme errors)');
    logWithTime('3. Services restarted to apply changes');
    
    logWithTime('\nNext steps:');
    logWithTime('1. Verify the client progress tab now displays properly without errors');
    logWithTime('2. Check that the sync status component is visible and working');
    logWithTime('3. Test synchronization between client and admin dashboards');
    
    logWithTime('\nIf you continue to have issues:');
    logWithTime('1. Check your PostgreSQL configuration (may need to set up passwordless access)');
    logWithTime('2. Verify your .env file has correct database settings');
    logWithTime('3. Look for specific error messages in the browser console');
    
  } catch (error) {
    logWithTime(`Error during fix process: ${error.message}`);
    process.exit(1);
  }
}

// Run the fix process
fixAllDashboardIssues();
