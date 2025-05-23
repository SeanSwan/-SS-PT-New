/**
 * Frontend-only starter script
 * 
 * This script starts only the frontend for testing purposes.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Starting frontend-only mode for testing...');

// Path to frontend directory
const frontendDir = path.join(__dirname, '..', 'frontend');

// Check if frontend directory exists
if (!fs.existsSync(frontendDir)) {
  console.error(`Frontend directory not found at ${frontendDir}`);
  process.exit(1);
}

// Start the frontend server
console.log('Starting frontend development server...');
const frontendProcess = spawn('npm', ['run', 'dev'], {
  cwd: frontendDir,
  stdio: 'inherit',
  shell: true
});

frontendProcess.on('error', (error) => {
  console.error('Failed to start frontend server:', error);
  process.exit(1);
});

frontendProcess.on('exit', (code) => {
  console.log(`Frontend server exited with code ${code}`);
  process.exit(code || 0);
});

// Display information about our React hooks fix
console.log('\n======= REACT HOOKS FIX INFORMATION =======');
console.log('- Emergency admin route is configured in main-routes.tsx');
console.log('- Emergency hooks recovery is enabled in utils/hooksRecovery.js');
console.log('- If hooks errors occur, use window.emergencyAdminFix.fixHooksError() in browser console');
console.log('- Detailed debugging with window.hooksRecovery.forceRecover()');
console.log('==========================================\n');
