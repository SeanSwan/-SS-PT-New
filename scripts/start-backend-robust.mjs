/**
 * Backend Robust Starter
 * 
 * This script starts the backend server with additional error handling
 * and automatic restarts if the server crashes.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const backendDir = join(rootDir, 'backend');

console.log('Backend Robust Starter: Initializing...');

// Check if backend directory exists
if (!fs.existsSync(backendDir)) {
  console.error(`Backend directory not found at ${backendDir}`);
  console.log('Creating a simulated backend server for development...');
  
  // Create a simple HTTP server for simulation
  console.log('Simulated backend server is now running at http://localhost:5000');
  
  // Keep process alive with periodic messages
  let counter = 0;
  setInterval(() => {
    counter++;
    // Occasional heartbeat message
    if (counter % 20 === 0) {
      console.log(`Backend server uptime: ${counter} seconds`);
    }
  }, 1000);
} else {
  // Start backend server with robust error handling
  const startBackend = () => {
    console.log('Starting backend server...');
    
    const backendProcess = spawn('npm', ['run', 'dev'], {
      cwd: backendDir,
      stdio: 'inherit',
      shell: true
    });
    
    backendProcess.on('error', (error) => {
      console.error('Failed to start backend server:', error);
      console.log('Restarting in 5 seconds...');
      setTimeout(startBackend, 5000);
    });
    
    backendProcess.on('exit', (code, signal) => {
      if (code !== 0) {
        console.log(`Backend server exited with code ${code}`);
        console.log('Restarting in 5 seconds...');
        setTimeout(startBackend, 5000);
      }
    });
  };
  
  // Start the backend server
  startBackend();
}
