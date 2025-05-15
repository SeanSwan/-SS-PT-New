#!/usr/bin/env node

/**
 * START BACKEND ONLY
 * Simple script to start just the backend server with proper error handling
 */

import { spawn } from 'child_process';
import chalk from 'chalk';

console.log(chalk.blue.bold('🚀 Starting Backend Server'));
console.log('============================\\n');

// Set environment variables
process.env.PORT = '10000';
process.env.BACKEND_PORT = '10000';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Port: ${process.env.PORT}`);
console.log(`Backend Port: ${process.env.BACKEND_PORT}`);
console.log('');

// Start the server
console.log('Starting server.mjs...\\n');

const serverProcess = spawn('node', ['server.mjs'], {
  stdio: 'inherit',
  env: process.env,
  shell: true
});

// Handle process events
serverProcess.on('error', (error) => {
  console.error(chalk.red.bold('\\n❌ Failed to start backend:'));
  console.error(chalk.red(error.message));
  console.log(chalk.blue('\\nTroubleshooting steps:'));
  console.log('1. Check if port 10000 is available');
  console.log('2. Run: node validate-startup.mjs');
  console.log('3. Run: node quick-startup-fix.mjs');
  process.exit(1);
});

serverProcess.on('exit', (code, signal) => {
  if (code === 0) {
    console.log(chalk.green('\\n✅ Backend server stopped gracefully'));
  } else {
    console.error(chalk.red(`\\n❌ Backend server exited with code ${code}`));
    if (signal) {
      console.error(chalk.red(`Signal: ${signal}`));
    }
    console.log(chalk.blue('\\nTo debug the issue, run:'));
    console.log('node diagnose-startup.mjs');
  }
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log(chalk.yellow('\\n\\nReceived SIGINT. Stopping backend server...'));
  serverProcess.kill('SIGTERM');
  
  // Force exit after 5 seconds if server doesn't stop
  setTimeout(() => {
    console.log(chalk.red('Force stopping server...'));
    serverProcess.kill('SIGKILL');
    process.exit(1);
  }, 5000);
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  console.log(chalk.yellow('\\nReceived SIGTERM. Stopping backend server...'));
  serverProcess.kill('SIGTERM');
});

console.log(chalk.green('Backend server starting...'));
console.log(chalk.yellow('Press Ctrl+C to stop the server'));
console.log(chalk.gray('───────────────────────────────────\\n'));
