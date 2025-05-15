#!/usr/bin/env node
/**
 * Clear Node.js cache and restart backend with dependency check
 * Enhanced to handle missing dependencies like ioredis
 */

import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const backendPath = path.join(projectRoot, 'backend');

const log = {
  success: (msg) => console.log(chalk.green('✓'), msg),
  error: (msg) => console.log(chalk.red('✗'), msg),
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  warn: (msg) => console.log(chalk.yellow('⚠'), msg),
  header: (msg) => console.log(chalk.bgBlue.white.bold(`\n ${msg} `))
};

/**
 * Check for missing dependencies
 */
async function checkMissingDependencies() {
  try {
    log.info('Checking for missing dependencies...');
    
    // Read package.json to get required dependencies
    const packageJsonPath = path.join(backendPath, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = packageJson.dependencies || {};
    
    // Check if node_modules exists and dependencies are installed
    const nodeModulesPath = path.join(backendPath, 'node_modules');
    
    if (!fs.existsSync(nodeModulesPath)) {
      log.warn('node_modules directory not found');
      return ['all']; // Need to install all dependencies
    }
    
    const missingDeps = [];
    
    // Check specifically for ioredis since that's our current issue
    if (dependencies.ioredis && !fs.existsSync(path.join(nodeModulesPath, 'ioredis'))) {
      missingDeps.push('ioredis');
    }
    
    // Check other critical dependencies
    const criticalDeps = ['express', 'sequelize', 'mongoose', 'redis'];
    for (const dep of criticalDeps) {
      if (dependencies[dep] && !fs.existsSync(path.join(nodeModulesPath, dep))) {
        missingDeps.push(dep);
      }
    }
    
    return missingDeps;
  } catch (error) {
    log.error(`Error checking dependencies: ${error.message}`);
    return [];
  }
}

/**
 * Install missing dependencies
 */
async function installMissingDependencies(missingDeps) {
  if (missingDeps.length === 0) {
    return true;
  }
  
  try {
    log.info(`Installing missing dependencies: ${missingDeps.join(', ')}...`);
    
    // Change to backend directory
    process.chdir(backendPath);
    
    // Install dependencies
    let installCommand = 'npm install';
    if (!missingDeps.includes('all')) {
      installCommand = `npm install ${missingDeps.join(' ')}`;
    }
    
    const { stdout, stderr } = await execAsync(installCommand);
    
    if (stderr && !stderr.includes('warn')) {
      log.error('Error installing dependencies:');
      console.log(stderr);
      return false;
    }
    
    log.success('Dependencies installed successfully');
    return true;
  } catch (error) {
    log.error(`Installation failed: ${error.message}`);
    return false;
  }
}

/**
 * Clear Node.js module cache
 */
function clearNodeCache() {
  return new Promise((resolve) => {
    log.info('Clearing Node.js module cache...');
    
    // Remove node_modules/.cache if it exists
    const cacheDir = path.join(backendPath, 'node_modules', '.cache');
    if (fs.existsSync(cacheDir)) {
      log.info('Removing node_modules/.cache...');
      try {
        fs.rmSync(cacheDir, { recursive: true, force: true });
        log.success('Removed node_modules/.cache');
      } catch (error) {
        log.warn(`Could not remove cache: ${error.message}`);
      }
    }
    
    log.success('Node.js cache cleared');
    resolve();
  });
}

/**
 * Kill all node processes
 */
function killAllNodeProcesses() {
  return new Promise((resolve) => {
    log.info('Killing all Node.js processes...');
    
    // Kill all node processes running on port 5000
    exec('netstat -ano | findstr :5000', (error, stdout) => {
      if (stdout) {
        const lines = stdout.split('\n');
        const pids = [];
        
        lines.forEach(line => {
          const match = line.match(/\\s+(\\d+)$/);
          if (match) {
            pids.push(match[1]);
          }
        });
        
        if (pids.length > 0) {
          Promise.all(pids.map(pid => {
            return new Promise((resolvePid) => {
              exec(`taskkill /F /PID ${pid}`, (killError) => {
                if (!killError) {
                  log.success(`Killed process ${pid}`);
                }
                resolvePid();
              });
            });
          })).then(() => {
            setTimeout(resolve, 2000); // Wait for processes to fully die
          });
        } else {
          resolve();
        }
      } else {
        resolve();
      }
    });
  });
}

/**
 * Start the backend server
 */
function startBackend() {
  return new Promise((resolve, reject) => {
    log.info('Starting backend server...');
    
    // Change to backend directory
    process.chdir(backendPath);
    
    const backendProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      shell: true,
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' }
    });
    
    let startupOutput = '';
    let serverStarted = false;
    let hasErrored = false;
    
    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      startupOutput += output;
      console.log(chalk.gray(output.trim()));
      
      // Check for successful startup
      if ((output.includes('Starting server on port') || 
          output.includes('Server running on') ||
          output.includes('Application startup complete') ||
          output.includes('listening on port')) && !hasErrored) {
        serverStarted = true;
        log.success('Backend server started successfully!');
        resolve(backendProcess);
      }
    });
    
    backendProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.error(chalk.red(error.trim()));
      
      // Check for specific errors
      if (error.includes('SyntaxError') || 
          error.includes('Unexpected identifier') ||
          error.includes('MODULE_NOT_FOUND') ||
          error.includes('Cannot find package')) {
        hasErrored = true;
        log.error('Backend startup failed with error');
        log.error('Error details:', error);
        reject(new Error(error));
      }
    });
    
    backendProcess.on('close', (code) => {
      if (!serverStarted && !hasErrored) {
        log.error(`Backend process exited with code ${code}`);
        reject(new Error(`Process exited with code ${code}`));
      }
    });
    
    // Timeout after 45 seconds
    setTimeout(() => {
      if (!serverStarted && !hasErrored) {
        log.error('Backend startup timed out');
        backendProcess.kill();
        reject(new Error('Startup timeout'));
      }
    }, 45000);
  });
}

/**
 * Main function to clear cache and restart
 */
async function clearCacheAndRestart() {
  log.header('Clear Cache and Restart Backend');
  
  try {
    // Step 1: Check for missing dependencies
    const missingDeps = await checkMissingDependencies();
    
    // Step 2: Install missing dependencies if any
    if (missingDeps.length > 0) {
      const installSuccess = await installMissingDependencies(missingDeps);
      if (!installSuccess) {
        throw new Error('Failed to install missing dependencies');
      }
    }
    
    // Step 3: Clear Node cache
    await clearNodeCache();
    
    // Step 4: Kill existing processes
    await killAllNodeProcesses();
    
    // Step 5: Wait a moment
    log.info('Waiting for cleanup...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 6: Start backend
    const backendProcess = await startBackend();
    
    log.success('Backend restarted successfully with cleared cache!');
    log.info('Press Ctrl+C to stop the backend server');
    
    // Handle process termination
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
    log.error(`Operation failed: ${error.message}`);
    
    // Provide specific guidance for common errors
    if (error.message.includes('MODULE_NOT_FOUND') || error.message.includes('ioredis')) {
      log.info('');
      log.info(chalk.yellow('🔧 Dependency Issue Detected'));
      log.info('Try running: npm install ioredis');
      log.info('Or run: npm run install-missing-deps');
    }
    
    log.info('Attempting to provide more details...');
    process.exit(1);
  }
}

// Run the script
clearCacheAndRestart().catch(error => {
  log.error(`Script error: ${error.message}`);
  process.exit(1);
});
