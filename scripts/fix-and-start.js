/**
 * Fix and Start Script
 * This script fixes all common issues and starts the application
 */

const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Log file for tracking issues and fixes
const LOG_FILE = path.join(__dirname, '..', 'fix-and-start.log');

// Utility to log to console and file
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  
  console.log(message);
  
  // Append to log file
  fs.appendFileSync(LOG_FILE, logMessage + '\n', { flag: 'a' });
}

// Execute a command and return a promise
function executeCommand(command, cwd = __dirname) {
  return new Promise((resolve, reject) => {
    log(`Executing: ${command} in ${cwd}`);
    
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        log(`Command failed: ${error.message}`, 'ERROR');
        log(stderr, 'ERROR');
        reject(error);
        return;
      }
      
      log(stdout);
      resolve(stdout);
    });
  });
}

// Execute a command with live output
function executeCommandLive(command, cwd = __dirname) {
  return new Promise((resolve, reject) => {
    log(`Executing live: ${command} in ${cwd}`);
    
    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);
    
    const process = spawn(cmd, args, { 
      cwd,
      shell: true,
      stdio: 'inherit'
    });
    
    process.on('close', (code) => {
      if (code !== 0) {
        log(`Command exited with code ${code}`, 'ERROR');
        reject(new Error(`Command failed with exit code ${code}`));
        return;
      }
      
      resolve();
    });
  });
}

// Check if MongoDB is installed
async function checkMongoDB() {
  log('Checking MongoDB installation...');
  
  try {
    await executeCommand('mongod --version');
    log('MongoDB is installed ✅');
    return true;
  } catch (error) {
    log('MongoDB is not installed or not in PATH ❌', 'ERROR');
    log('Will attempt to use scripts/mongodb-setup.js as a workaround');
    return false;
  }
}

// Install missing dependencies
async function installMissingDependencies() {
  log('Installing missing dependencies...');
  
  const rootDir = path.join(__dirname, '..');
  const frontendDir = path.join(rootDir, 'frontend');
  
  try {
    // Check if quagga is already installed
    const frontendPackageJson = JSON.parse(fs.readFileSync(path.join(frontendDir, 'package.json'), 'utf8'));
    const hasQuagga = frontendPackageJson.dependencies && frontendPackageJson.dependencies.quagga;
    
    if (!hasQuagga) {
      log('Installing quagga in frontend...');
      await executeCommand('npm install quagga@0.12.1', frontendDir);
    } else {
      log('quagga is already installed in frontend ✅');
    }
    
    return true;
  } catch (error) {
    log(`Failed to install missing dependencies: ${error.message}`, 'ERROR');
    return false;
  }
}

// Fix MongoDB data directory
async function fixMongoDBDataDirectory() {
  log('Ensuring MongoDB data directory exists...');
  
  const dataDir = 'C:/data/db';
  
  try {
    if (!fs.existsSync(dataDir)) {
      log(`Creating MongoDB data directory at ${dataDir}...`);
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    log('MongoDB data directory exists ✅');
    return true;
  } catch (error) {
    log(`Failed to create MongoDB data directory: ${error.message}`, 'ERROR');
    log('You may need to run this script as administrator');
    return false;
  }
}

// Prompt user for confirmation
function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(`${question} (y/n) `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// Start MongoDB
async function startMongoDB() {
  log('Starting MongoDB...');
  
  const rootDir = path.join(__dirname, '..');
  
  try {
    // Run the MongoDB setup script instead of direct mongod command
    const scriptPath = path.join(rootDir, 'scripts', 'mongodb-setup.js');
    
    if (fs.existsSync(scriptPath)) {
      log('Using mongodb-setup.js to start MongoDB');
      
      // Start MongoDB in background
      const mongod = spawn('node', [scriptPath], {
        detached: true,
        stdio: 'ignore'
      });
      
      // Don't wait for this process to complete
      mongod.unref();
      
      // Give MongoDB a moment to start
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      log('MongoDB started in background ✅');
      return true;
    } else {
      log('MongoDB setup script not found, trying direct command');
      
      // Try direct command if script not found
      const mongod = spawn('mongod', ['--port', '5001', '--dbpath', 'C:/data/db'], {
        detached: true,
        stdio: 'ignore'
      });
      
      mongod.unref();
      
      // Give MongoDB a moment to start
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      log('MongoDB started with direct command ✅');
      return true;
    }
  } catch (error) {
    log(`Failed to start MongoDB: ${error.message}`, 'ERROR');
    return false;
  }
}

// Clear Vite cache
async function clearViteCache() {
  log('Clearing Vite cache...');
  
  const frontendDir = path.join(__dirname, '..', 'frontend');
  const viteCache = path.join(frontendDir, 'node_modules', '.vite');
  
  try {
    if (fs.existsSync(viteCache)) {
      log('Removing .vite cache directory...');
      fs.rmSync(viteCache, { recursive: true, force: true });
    }
    
    const viteCacheDirInFrontend = path.join(frontendDir, '.vite-cache');
    if (fs.existsSync(viteCacheDirInFrontend)) {
      log('Removing .vite-cache directory in frontend...');
      fs.rmSync(viteCacheDirInFrontend, { recursive: true, force: true });
    }
    
    log('Vite cache cleared ✅');
    return true;
  } catch (error) {
    log(`Failed to clear Vite cache: ${error.message}`, 'ERROR');
    return false;
  }
}

// Run fix-all script before starting everything
async function runFixAll() {
  log('Running fix-all script to fix backend issues...');
  
  const rootDir = path.join(__dirname, '..');
  
  try {
    await executeCommand('npm run fix-all', rootDir);
    log('Fixed backend issues successfully ✅');
    return true;
  } catch (error) {
    log(`Error running fix-all script: ${error.message}`, 'ERROR');
    return false;
  }
}

// Start the application
async function startApplication() {
  log('Starting the application...');
  
  const rootDir = path.join(__dirname, '..');
  
  try {
    // Start both frontend and backend
    log('Starting full application (frontend and backend)...');
    
    // First check if port 5000 is available
    try {
      const netstat = await executeCommand('netstat -ano | findstr :5000');
      if (netstat && netstat.trim()) {
        log('Warning: Port 5000 appears to be in use already. This might cause backend startup issues.', 'WARN');
        const proceed = await promptUser('Port 5000 is in use. Continue anyway?');
        if (!proceed) {
          log('Startup aborted by user');
          return false;
        }
      }
    } catch (error) {
      // Error is expected if the port is not in use
      log('Port 5000 appears to be available.');
    }
    
    // Use concurrently to start both frontend and backend
    await executeCommandLive('npm run start-full', rootDir);
    
    return true;
  } catch (error) {
    log(`Failed to start application: ${error.message}`, 'ERROR');
    return false;
  }
}

// Main function
async function main() {
  log('=== Fix and Start Script ===');
  log(`Log file: ${LOG_FILE}`);
  
  try {
    // MongoDB checks and fixes
    const mongoDBInstalled = await checkMongoDB();
    await fixMongoDBDataDirectory();
    
    // Clear Vite cache 
    await clearViteCache();
    
    // Install missing dependencies
    await installMissingDependencies();
    
    // Run fix-all script to fix backend model issues
    await runFixAll();
    
    // Start MongoDB if needed
    if (mongoDBInstalled) {
      const startMongoDBConfirm = await promptUser('Do you want to start MongoDB?');
      if (startMongoDBConfirm) {
        await startMongoDB();
      }
    } else {
      // If MongoDB not installed, try our setup script
      await startMongoDB();
    }
    
    // Ask user if they want to start the application
    const startAppConfirm = await promptUser('Do you want to start the application now?');
    if (startAppConfirm) {
      await startApplication();
    } else {
      log('Application start skipped by user');
      log('You can start the application with:');
      log('npm run start-frontend');
    }
    
  } catch (error) {
    log(`Script failed: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

// Run the main function
main();
