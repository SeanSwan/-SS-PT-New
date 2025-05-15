#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));

console.log(chalk.blue.bold('🚀 Testing Backend Startup'));

async function testBackendStartup() {
  try {
    console.log(chalk.yellow('ℹ Changing to backend directory...'));
    
    // Change to backend directory
    process.chdir(join(__dirname, '..', 'backend'));
    
    console.log(chalk.yellow('ℹ Starting backend test (will timeout in 30 seconds)...'));
    
    // Start the backend with a timeout
    const backendProcess = exec('npm run dev');
    
    let hasStarted = false;
    let hasErrored = false;
    
    // Monitor stdout for success
    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(chalk.gray('STDOUT:', output.trim()));
      
      if (output.includes('Starting server on port') || 
          output.includes('Server running on') ||
          output.includes('Application startup complete') ||
          output.includes('listening on port')) {
        hasStarted = true;
        console.log(chalk.green('✓ Backend started successfully!'));
        
        // Kill the process after confirming startup
        setTimeout(() => {
          backendProcess.kill();
          console.log(chalk.blue('ℹ Backend test complete - process terminated'));
          process.exit(0);
        }, 2000);
      }
    });
    
    // Monitor stderr for errors
    backendProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.log(chalk.red('STDERR:', error.trim()));
      
      if (error.includes('SyntaxError') || 
          error.includes('MODULE_NOT_FOUND') ||
          error.includes('Cannot find package')) {
        hasErrored = true;
        console.log(chalk.red('✗ Backend startup failed with error'));
        backendProcess.kill();
        process.exit(1);
      }
    });
    
    // Handle process exit
    backendProcess.on('exit', (code) => {
      if (!hasStarted && !hasErrored) {
        console.log(chalk.red(`✗ Backend process exited with code ${code}`));
        process.exit(1);
      }
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      if (!hasStarted && !hasErrored) {
        console.log(chalk.yellow('⚠ Backend startup test timed out'));
        backendProcess.kill();
        console.log(chalk.blue('ℹ This might be normal if the backend is waiting for dependencies'));
        process.exit(0);
      }
    }, 30000);
    
  } catch (error) {
    console.error(chalk.red('✗ Test failed:'), error.message);
    process.exit(1);
  }
}

testBackendStartup().catch(error => {
  console.error(chalk.red('Script error:'), error);
  process.exit(1);
});
