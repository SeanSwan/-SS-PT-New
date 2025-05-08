/**
 * MongoDB Setup and Verification Script
 * This script helps ensure MongoDB is properly configured and running
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const DB_PATH = 'C:/data/db';
const MONGODB_PORT = 5001;

// Check if MongoDB is installed
function checkMongoDBInstallation() {
  return new Promise((resolve) => {
    // Check MongoDB location based on common installation paths
    const possiblePaths = [
      // Windows paths
      'C:\\Program Files\\MongoDB\\Server\\6.0\\bin\\mongod.exe',
      'C:\\Program Files\\MongoDB\\Server\\5.0\\bin\\mongod.exe', 
      'C:\\Program Files\\MongoDB\\Server\\4.4\\bin\\mongod.exe',
      // Add more paths as needed
    ];

    // Check if any of the possible MongoDB paths exist
    for (const mongoPath of possiblePaths) {
      if (fs.existsSync(mongoPath)) {
        console.log(`MongoDB found at: ${mongoPath}`);
        return resolve(mongoPath);
      }
    }

    // Try to check via command line
    exec('mongod --version', (error, stdout) => {
      if (!error) {
        console.log('MongoDB is installed and in PATH');
        resolve('mongod');
      } else {
        console.log('MongoDB is not installed or not in PATH');
        resolve(null);
      }
    });
  });
}

// Ensure data directory exists
function ensureDataDirectoryExists() {
  if (!fs.existsSync(DB_PATH)) {
    console.log(`Creating MongoDB data directory at: ${DB_PATH}`);
    try {
      fs.mkdirSync(DB_PATH, { recursive: true });
      console.log('Data directory created successfully');
    } catch (err) {
      console.error(`Failed to create data directory: ${err.message}`);
      console.log('Try running this script as administrator or create the directory manually');
      return false;
    }
  } else {
    console.log(`MongoDB data directory already exists at: ${DB_PATH}`);
  }
  return true;
}

// Start MongoDB
function startMongoDB(mongoPath) {
  return new Promise((resolve, reject) => {
    let command = '';
    
    if (!mongoPath) {
      console.error('Cannot start MongoDB - not found on system');
      
      console.log('\nInstallation instructions:');
      console.log('1. Download MongoDB Community Server from https://www.mongodb.com/try/download/community');
      console.log('2. Follow the installation instructions for your operating system');
      console.log('3. Add MongoDB bin directory to your system PATH');
      console.log('4. Run this script again');
      
      return reject(new Error('MongoDB not found'));
    }
    
    // Build command depending on the provided mongod path
    if (mongoPath === 'mongod') {
      command = `mongod --port ${MONGODB_PORT} --dbpath "${DB_PATH}"`;
    } else {
      command = `"${mongoPath}" --port ${MONGODB_PORT} --dbpath "${DB_PATH}"`;
    }
    
    console.log(`Starting MongoDB with command: ${command}`);
    
    const mongoProcess = exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error starting MongoDB: ${error.message}`);
        reject(error);
      }
    });
    
    mongoProcess.stdout.on('data', (data) => {
      console.log(`MongoDB: ${data}`);
      if (data.includes('waiting for connections')) {
        console.log('MongoDB started successfully!');
        resolve(true);
      }
    });
    
    mongoProcess.stderr.on('data', (data) => {
      console.error(`MongoDB Error: ${data}`);
    });
  });
}

// Update package.json script for MongoDB
function updatePackageJsonScript() {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Add or update the script
    packageJson.scripts['start-mongodb'] = 'node scripts/mongodb-setup.js';
    
    // Write back the updated package.json
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('Updated package.json with new MongoDB script');
    
  } catch (err) {
    console.error(`Failed to update package.json: ${err.message}`);
  }
}

// Main function
async function main() {
  console.log('=== MongoDB Setup and Verification ===');
  
  // Check for MongoDB installation
  const mongoPath = await checkMongoDBInstallation();
  
  // Ensure data directory exists
  if (!ensureDataDirectoryExists()) {
    process.exit(1);
  }
  
  // Update package.json script
  updatePackageJsonScript();
  
  // Start MongoDB if not being run via npm script
  if (process.argv[2] !== '--no-start') {
    try {
      await startMongoDB(mongoPath);
    } catch (error) {
      console.error('Failed to start MongoDB');
      process.exit(1);
    }
  }
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { checkMongoDBInstallation, ensureDataDirectoryExists, startMongoDB };
