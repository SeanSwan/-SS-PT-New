/**
 * MongoDB Setup and Verification Script
 * This script helps ensure MongoDB is properly configured and running
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const DB_PATH = 'C:/data/db';

// Try to read MONGODB_PORT from .env file or use default ports
let MONGODB_PORT = 5001;
let FALLBACK_PORT = 27017;

try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const portMatch = envContent.match(/MONGODB_PORT=(\d+)/);
    if (portMatch && portMatch[1]) {
      MONGODB_PORT = parseInt(portMatch[1], 10);
      console.log(`Found MongoDB port in .env file: ${MONGODB_PORT}`);
    }
  }
} catch (err) {
  console.log(`Error reading .env file: ${err.message}`);
  console.log('Using default MongoDB port: 5001');
}

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

// Check if a port is in use
function isPortInUse(port) {
  return new Promise((resolve) => {
    const command = os.platform() === 'win32' 
      ? `netstat -an | findstr :${port}` 
      : `lsof -i:${port}`;
      
    exec(command, (error, stdout) => {
      resolve(!error && stdout.toString().trim().length > 0);
    });
  });
}

// Create or update .env file with MongoDB port
function updateEnvFile(port) {
  const envPath = path.join(__dirname, '..', '.env');
  let envContent = '';
  
  // Read existing .env file if it exists
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    
    // Update MONGODB_PORT if it exists
    if (envContent.match(/MONGODB_PORT=\d+/)) {
      envContent = envContent.replace(/MONGODB_PORT=\d+/, `MONGODB_PORT=${port}`);
    } else {
      // Add MONGODB_PORT if it doesn't exist
      envContent += `\nMONGODB_PORT=${port}`;
    }
  } else {
    // Create new .env file
    envContent = `MONGODB_PORT=${port}\n`;
  }
  
  // Write updated .env file
  fs.writeFileSync(envPath, envContent);
  console.log(`Updated .env file with MONGODB_PORT=${port}`);
}

// Start MongoDB
function startMongoDB(mongoPath) {
  return new Promise(async (resolve, reject) => {
    let command = '';
    let port = MONGODB_PORT;
    
    if (!mongoPath) {
      console.error('Cannot start MongoDB - not found on system');
      
      console.log('\nInstallation instructions:');
      console.log('1. Download MongoDB Community Server from https://www.mongodb.com/try/download/community');
      console.log('2. Follow the installation instructions for your operating system');
      console.log('3. Add MongoDB bin directory to your system PATH');
      console.log('4. Run this script again');
      
      return reject(new Error('MongoDB not found'));
    }
    
    // Check if custom port is already in use
    const customPortInUse = await isPortInUse(MONGODB_PORT);
    if (customPortInUse) {
      console.log(`MongoDB port ${MONGODB_PORT} is already in use. Checking if it's MongoDB...`);
      
      // Try connecting to check if it's MongoDB
      const { MongoClient } = require('mongodb');
      try {
        const client = new MongoClient(`mongodb://localhost:${MONGODB_PORT}`);
        await client.connect();
        await client.close();
        console.log(`MongoDB is already running on port ${MONGODB_PORT}`);
        return resolve(true);
      } catch (err) {
        console.log(`Port ${MONGODB_PORT} is in use but not by MongoDB. Trying fallback port ${FALLBACK_PORT}...`);
        port = FALLBACK_PORT;
      }
    }
    
    // Check if fallback port is needed and also in use
    if (port === FALLBACK_PORT) {
      const fallbackPortInUse = await isPortInUse(FALLBACK_PORT);
      if (fallbackPortInUse) {
        console.log(`Fallback port ${FALLBACK_PORT} is also in use. Checking if it's MongoDB...`);
        
        // Try connecting to check if it's MongoDB
        const { MongoClient } = require('mongodb');
        try {
          const client = new MongoClient(`mongodb://localhost:${FALLBACK_PORT}`);
          await client.connect();
          await client.close();
          console.log(`MongoDB is already running on fallback port ${FALLBACK_PORT}`);
          updateEnvFile(FALLBACK_PORT);
          return resolve(true);
        } catch (err) {
          console.error(`Both ports ${MONGODB_PORT} and ${FALLBACK_PORT} are in use but not by MongoDB`);
          return reject(new Error('All MongoDB ports are in use by other applications'));
        }
      }
    }
    
    // Build command depending on the provided mongod path
    if (mongoPath === 'mongod') {
      command = `mongod --port ${port} --dbpath "${DB_PATH}"`;
    } else {
      command = `"${mongoPath}" --port ${port} --dbpath "${DB_PATH}"`;
    }
    
    console.log(`Starting MongoDB with command: ${command}`);
    
    const mongoProcess = exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error starting MongoDB: ${error.message}`);
        reject(error);
      }
    });
    
    // Update .env file with the port we're using
    updateEnvFile(port);
    
    mongoProcess.stdout.on('data', (data) => {
      console.log(`MongoDB: ${data}`);
      if (data.includes('waiting for connections')) {
        console.log(`MongoDB started successfully on port ${port}!`);
        resolve(true);
      }
    });
    
    mongoProcess.stderr.on('data', (data) => {
      // Check for specific error indicating port is in use
      if (data.includes('address already in use') && port === MONGODB_PORT) {
        console.log(`Port ${MONGODB_PORT} is already in use. Trying fallback port ${FALLBACK_PORT}...`);
        mongoProcess.kill();
        
        // Try starting with fallback port
        const fallbackCommand = mongoPath === 'mongod'
          ? `mongod --port ${FALLBACK_PORT} --dbpath "${DB_PATH}"`
          : `"${mongoPath}" --port ${FALLBACK_PORT} --dbpath "${DB_PATH}"`;
        
        console.log(`Starting MongoDB with fallback command: ${fallbackCommand}`);
        
        const fallbackProcess = exec(fallbackCommand, (error, stdout, stderr) => {
          if (error) {
            console.error(`Error starting MongoDB on fallback port: ${error.message}`);
            reject(error);
          }
        });
        
        // Update .env file with fallback port
        updateEnvFile(FALLBACK_PORT);
        
        fallbackProcess.stdout.on('data', (data) => {
          console.log(`MongoDB: ${data}`);
          if (data.includes('waiting for connections')) {
            console.log(`MongoDB started successfully on fallback port ${FALLBACK_PORT}!`);
            resolve(true);
          }
        });
        
        fallbackProcess.stderr.on('data', (data) => {
          console.error(`MongoDB Error on fallback port: ${data}`);
        });
      } else {
        console.error(`MongoDB Error: ${data}`);
      }
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
