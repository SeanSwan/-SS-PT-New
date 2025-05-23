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

// Check if MongoDB is running on any common port
async function checkMongoDbOnAnyPort() {
  // Common MongoDB ports to try
  const ports = [5001, 27017, 27018, 27019];
  
  for (const port of ports) {
    const isRunning = await checkMongoDbConnection(port);
    if (isRunning) {
      return { running: true, port };
    }
  }
  
  return { running: false, port: null };
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
  
  // Check if MongoDB is running on any port
  const mongoStatus = await checkMongoDbOnAnyPort();
  
  if (mongoStatus.running) {
    console.log(`${colors.green}${colors.bold}✓ MongoDB is running on port ${mongoStatus.port}${colors.reset}`);
    
    // If MongoDB is running on a port other than 5001, update the .env file
    if (mongoStatus.port !== 5001) {
      console.log(`${colors.yellow}MongoDB is running on port ${mongoStatus.port} instead of 5001${colors.reset}`);
      console.log(`${colors.yellow}Updating MONGODB_PORT in .env file...${colors.reset}`);
      
      // Update .env file or create it if it doesn't exist
      const envPath = path.resolve(rootDir, '.env');
      let envContent = '';
      
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
        
        // Replace MONGODB_PORT if it exists
        if (envContent.includes('MONGODB_PORT=')) {
          envContent = envContent.replace(/MONGODB_PORT=\d+/, `MONGODB_PORT=${mongoStatus.port}`);
        } else {
          // Add MONGODB_PORT if it doesn't exist
          envContent += `\nMONGODB_PORT=${mongoStatus.port}`;
        }
      } else {
        // Create new .env file with MONGODB_PORT
        envContent = `MONGODB_PORT=${mongoStatus.port}\n`;
      }
      
      // Write updated .env file
      fs.writeFileSync(envPath, envContent);
      console.log(`${colors.green}Updated .env file with MONGODB_PORT=${mongoStatus.port}${colors.reset}`);
    }
    
    process.exit(0);
  } else {
    console.log(`${colors.red}× MongoDB is not running on any common port${colors.reset}`);
    
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
