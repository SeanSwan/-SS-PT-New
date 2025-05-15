#!/usr/bin/env node
/**
 * Backend Restart Script
 * Restarts the backend server after critical fixes
 */

import { spawn, exec } from 'child_process';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const log = {
  success: (msg) => console.log(chalk.green('✓'), msg),
  error: (msg) => console.log(chalk.red('✗'), msg),
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  warn: (msg) => console.log(chalk.yellow('⚠'), msg),
  header: (msg) => console.log(chalk.bgBlue.white.bold(`\n ${msg} `))
};

function killBackendProcess() {
  return new Promise((resolve) => {
    log.info('Killing existing backend processes...');
    
    // Kill all node processes running on port 5000
    exec('netstat -ano | findstr :5000', (error, stdout) => {
      if (stdout) {
        const lines = stdout.split('\n');
        const pids = [];
        
        lines.forEach(line => {
          const match = line.match(/\s+(\d+)$/);
          if (match) {
            pids.push(match[1]);
          }
        });
        
        if (pids.length > 0) {
          pids.forEach(pid => {
            exec(`taskkill /F /PID ${pid}`, (killError) => {
              if (!killError) {
                log.success(`Killed process ${pid}`);
              }
            });
          });
          
          setTimeout(resolve, 2000); // Wait for processes to die
        } else {
          resolve();
        }
      } else {
        resolve();
      }
    });
  });
}

function startBackend() {
  return new Promise((resolve, reject) => {
    log.info('Starting backend server...');
    
    const backendPath = path.join(projectRoot, 'backend');
    const backendProcess = spawn('npm', ['run', 'dev'], {
      cwd: backendPath,
      stdio: 'pipe',
      shell: true
    });
    
    let startupOutput = '';
    let serverStarted = false;
    
    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      startupOutput += output;
      console.log(chalk.gray(output.trim()));
      
      // Check for successful startup
      if (output.includes('Starting server on port') || 
          output.includes('Server running on') ||
          output.includes('Application startup complete')) {
        serverStarted = true;
        log.success('Backend server started successfully!');
        resolve(backendProcess);
      }
    });
    
    backendProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.error(chalk.red(error.trim()));
      
      // Check for syntax errors or other fatal errors
      if (error.includes('SyntaxError') || 
          error.includes('Error:') ||
          error.includes('MODULE_NOT_FOUND')) {
        log.error('Backend startup failed with errors');
        reject(new Error(error));
      }
    });
    
    backendProcess.on('close', (code) => {
      if (!serverStarted) {
        log.error(`Backend process exited with code ${code}`);
        reject(new Error(`Process exited with code ${code}`));
      }
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      if (!serverStarted) {
        log.error('Backend startup timed out');
        backendProcess.kill();
        reject(new Error('Startup timeout'));
      }
    }, 30000);
  });
}

async function restartBackend() {
  log.header('Restarting Backend Server');
  
  try {
    // Kill existing processes
    await killBackendProcess();
    
    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Start backend
    const backendProcess = await startBackend();
    
    log.success('Backend restart completed successfully!');
    log.info('Press Ctrl+C to stop the backend server');
    
    // Keep the process running
    process.on('SIGINT', () => {
      log.info('Shutting down backend...');
      backendProcess.kill();
      process.exit(0);
    });
    
    // Keep the script running
    backendProcess.on('exit', () => {
      log.warn('Backend process exited');
      process.exit(1);
    });
    
  } catch (error) {
    log.error(`Backend restart failed: ${error.message}`);
    process.exit(1);
  }
}

// Check if we're in the right directory
if (!process.cwd().includes('SS-PT')) {
  log.error('Please run this script from the SS-PT directory');
  process.exit(1);
}

// Run the restart
restartBackend().catch(error => {
  log.error(`Restart script error: ${error.message}`);
  process.exit(1);
});
