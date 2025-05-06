/**
 * MongoDB Connection Check
 * =======================
 * This script checks if MongoDB is running on port 5001
 * and provides helpful information if it's not.
 */

import net from 'net';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

// Check if MongoDB is running on the given port
async function checkMongoDbConnection(port = 5001) {
  return new Promise((resolve) => {
    const client = new net.Socket();
    const timeout = 1000; // 1 second timeout
    
    // Set up timeout
    client.setTimeout(timeout);
    
    // Handle connection success
    client.on('connect', () => {
      client.end();
      resolve(true);
    });
    
    // Handle errors (connection refused, etc.)
    client.on('error', () => {
      resolve(false);
    });
    
    // Handle timeout
    client.on('timeout', () => {
      client.end();
      resolve(false);
    });
    
    // Try to connect
    client.connect(port, 'localhost');
  });
}

// Start MongoDB if not running
async function startMongoDB() {
  console.log(`${colors.yellow}Attempting to start MongoDB...${colors.reset}`);
  
  try {
    // Create data directory if it doesn't exist
    if (!fs.existsSync('C:/data/db')) {
      console.log(`${colors.yellow}Creating MongoDB data directory...${colors.reset}`);
      fs.mkdirSync('C:/data/db', { recursive: true });
    }
    
    // Start MongoDB using npm script
    const mongoProcess = exec('npm run start-mongodb', { cwd: rootDir });
    
    // Give MongoDB some time to start
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check if MongoDB is now running
    const isRunning = await checkMongoDbConnection();
    
    if (isRunning) {
      console.log(`${colors.green}${colors.bold}✓ MongoDB started successfully on port 5001${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.red}${colors.bold}× Failed to start MongoDB${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.error(`${colors.red}Error starting MongoDB:${colors.reset}`, error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log(`${colors.cyan}${colors.bold}MongoDB Connection Check${colors.reset}`);
  console.log(`${colors.cyan}=======================${colors.reset}`);
  
  // Check if MongoDB is running
  const isRunning = await checkMongoDbConnection();
  
  if (isRunning) {
    console.log(`${colors.green}${colors.bold}✓ MongoDB is running on port 5001${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.red}× MongoDB is not running on port 5001${colors.reset}`);
    
    // Try to start MongoDB
    const started = await startMongoDB();
    
    if (started) {
      process.exit(0);
    } else {
      console.log(`
${colors.yellow}${colors.bold}MongoDB Instructions:${colors.reset}
${colors.white}1. Make sure MongoDB is installed on your system
2. To start MongoDB manually, run:${colors.reset}
   ${colors.cyan}npm run start-mongodb${colors.reset}
${colors.white}3. Or start everything together with:${colors.reset}
   ${colors.cyan}npm run start-all${colors.reset}

${colors.yellow}Note:${colors.reset} You can continue without MongoDB, but workout tracking features may not work.
`);
      
      // Exit with success (0) to allow the application to continue
      process.exit(0);
    }
  }
}

// Run the main function
main().catch(error => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
  process.exit(1);
});
