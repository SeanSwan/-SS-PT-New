/**
 * SwanStudios MongoDB Connection Helper
 * =====================================
 * This script checks for MongoDB installation and sets up SQLite as a fallback.
 */

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Define paths
const dbPath = 'C:/data/db';
const envPath = path.join(__dirname, '.env');

// ANSI color codes for better terminal output
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

console.log(`${colors.cyan}${colors.bold}SwanStudios MongoDB Setup${colors.reset}`);
console.log(`${colors.cyan}==========================${colors.reset}`);

// Check if MongoDB is installed
function checkMongoDBInstallation() {
  try {
    console.log(`${colors.yellow}Checking MongoDB installation...${colors.reset}`);
    execSync('mongod --version', { stdio: 'ignore' });
    console.log(`${colors.green}✓ MongoDB is installed.${colors.reset}`);
    return true;
  } catch (error) {
    console.log(`${colors.red}× MongoDB is not installed or not in PATH.${colors.reset}`);
    return false;
  }
}

// Create MongoDB data directory
function createMongoDBDataDirectory() {
  if (!fs.existsSync(dbPath)) {
    try {
      console.log(`${colors.yellow}Creating MongoDB data directory at ${dbPath}...${colors.reset}`);
      fs.mkdirSync(dbPath, { recursive: true });
      console.log(`${colors.green}✓ Data directory created successfully.${colors.reset}`);
      return true;
    } catch (error) {
      console.log(`${colors.red}× Failed to create data directory: ${error.message}${colors.reset}`);
      return false;
    }
  }
  console.log(`${colors.green}✓ MongoDB data directory already exists.${colors.reset}`);
  return true;
}

// Create or update .env file with appropriate database configuration
function setupEnvironmentFile(useMongoDB) {
  try {
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Parse existing environment variables
    const envVars = {};
    envContent.split('\n').forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const [key, value] = line.split('=');
        if (key && value) {
          envVars[key.trim()] = value.trim();
        }
      }
    });
    
    // Set appropriate database configuration
    envVars['MONGODB_URI'] = 'mongodb://localhost:5001/swanstudios';
    
    if (!useMongoDB) {
      envVars['USE_SQLITE_FALLBACK'] = 'true';
      envVars['SQLITE_PATH'] = './data/swanstudios.sqlite';
    } else {
      envVars['USE_SQLITE_FALLBACK'] = 'false';
    }
    
    // Ensure PORT is set
    if (!envVars['PORT']) {
      envVars['PORT'] = '5000';
    }
    
    // Compile .env file content
    const newEnvContent = Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    fs.writeFileSync(envPath, newEnvContent);
    console.log(`${colors.green}✓ Environment file updated with database configuration.${colors.reset}`);
    return true;
  } catch (error) {
    console.log(`${colors.red}× Failed to update environment file: ${error.message}${colors.reset}`);
    return false;
  }
}

// Update package.json to use SQLite fallback when MongoDB is not available
function updateStartScript(useMongoDB) {
  try {
    const packageJsonPath = path.join(__dirname, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    if (!useMongoDB) {
      // Update scripts to use SQLite fallback
      packageJson.scripts['start'] = 'concurrently "npm run start-frontend" "npm run start-backend-sqlite"';
      packageJson.scripts['start-backend-sqlite'] = 'cd backend && cross-env USE_SQLITE_FALLBACK=true npm run dev';
      
      console.log(`${colors.yellow}Updated start scripts to use SQLite fallback.${colors.reset}`);
    } else {
      // Keep MongoDB configuration
      console.log(`${colors.green}Keeping MongoDB configuration in start scripts.${colors.reset}`);
    }
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    return true;
  } catch (error) {
    console.log(`${colors.red}× Failed to update package.json: ${error.message}${colors.reset}`);
    return false;
  }
}

// Create a startup batch file for Windows
function createStartupBatchFile(useMongoDB) {
  try {
    const batchPath = path.join(__dirname, 'start-app.bat');
    let batchContent;
    
    if (useMongoDB) {
      batchContent = `@echo off
echo Starting SwanStudios application with MongoDB...
echo.
start cmd /k "mongod --port 5001 --dbpath C:/data/db"
timeout /t 5
start cmd /k "cd frontend && npm run dev"
start cmd /k "cd backend && npm run dev"
echo.
echo Application started! Access the frontend at http://localhost:5175
`;
    } else {
      batchContent = `@echo off
echo Starting SwanStudios application with SQLite fallback...
echo.
start cmd /k "cd frontend && npm run dev"
start cmd /k "cd backend && cross-env USE_SQLITE_FALLBACK=true npm run dev"
echo.
echo Application started! Access the frontend at http://localhost:5175
`;
    }
    
    fs.writeFileSync(batchPath, batchContent);
    console.log(`${colors.green}✓ Created startup batch file: ${batchPath}${colors.reset}`);
    return true;
  } catch (error) {
    console.log(`${colors.red}× Failed to create startup batch file: ${error.message}${colors.reset}`);
    return false;
  }
}

// Install required dependencies
function installDependencies() {
  try {
    console.log(`${colors.yellow}Installing required dependencies...${colors.reset}`);
    
    // Install cross-env for environment variable support
    execSync('npm install --save-dev cross-env', { stdio: 'inherit' });
    
    // Install better-sqlite3 for SQLite fallback
    execSync('cd backend && npm install --save better-sqlite3', { stdio: 'inherit' });
    
    console.log(`${colors.green}✓ Dependencies installed successfully.${colors.reset}`);
    return true;
  } catch (error) {
    console.log(`${colors.red}× Failed to install dependencies: ${error.message}${colors.reset}`);
    console.log(`${colors.yellow}You may need to manually install the following packages:${colors.reset}`);
    console.log('  npm install --save-dev cross-env');
    console.log('  cd backend && npm install --save better-sqlite3');
    return false;
  }
}

// Main execution
(async function main() {
  const isMongoDBInstalled = checkMongoDBInstallation();
  let useMongoDB = isMongoDBInstalled;
  
  if (isMongoDBInstalled) {
    const isDataDirCreated = createMongoDBDataDirectory();
    useMongoDB = isDataDirCreated;
  } else {
    console.log(`${colors.yellow}MongoDB not found. Setting up SQLite fallback...${colors.reset}`);
    useMongoDB = false;
  }
  
  // Set up environment file
  setupEnvironmentFile(useMongoDB);
  
  // Update package.json
  updateStartScript(useMongoDB);
  
  // Create startup batch file
  createStartupBatchFile(useMongoDB);
  
  // Install dependencies if using SQLite fallback
  if (!useMongoDB) {
    installDependencies();
  }
  
  // Final instructions
  console.log(`\n${colors.green}${colors.bold}Setup Complete!${colors.reset}`);
  console.log(`${colors.cyan}==================${colors.reset}`);
  
  if (useMongoDB) {
    console.log(`${colors.white}Your application is configured to use MongoDB.${colors.reset}`);
    console.log(`${colors.white}To start the application, run:${colors.reset}`);
    console.log(`${colors.cyan}  start-app.bat${colors.reset}`);
  } else {
    console.log(`${colors.white}Your application is configured to use SQLite as a fallback.${colors.reset}`);
    console.log(`${colors.white}To start the application, run:${colors.reset}`);
    console.log(`${colors.cyan}  start-app.bat${colors.reset}`);
    console.log(`\n${colors.yellow}Note:${colors.reset} To use MongoDB in the future, install MongoDB and run this script again.`);
  }
})();
