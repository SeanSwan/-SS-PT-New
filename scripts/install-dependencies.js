/**
 * Dependency Installation Script
 * This script installs missing dependencies for both frontend and backend
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Frontend dependencies to install
const FRONTEND_DEPS = [
  'quagga@0.12.1'
];

// Backend dependencies to install
const BACKEND_DEPS = [
  'mongodb@6.16.0'
];

// Execute a command in a specific directory
function executeCommand(command, directory) {
  return new Promise((resolve, reject) => {
    console.log(`Executing in ${directory}: ${command}`);
    
    // Use spawn to show real-time output
    const childProcess = exec(command, {
      cwd: directory,
      shell: true
    });
    
    // Stream output in real-time
    childProcess.stdout.on('data', (data) => {
      process.stdout.write(data);
    });
    
    childProcess.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
    
    childProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
  });
}

// Install frontend dependencies
async function installFrontendDependencies() {
  const frontendDir = path.join(__dirname, '..', 'frontend');
  
  console.log('\n=== Installing Frontend Dependencies ===');
  
  if (FRONTEND_DEPS.length === 0) {
    console.log('No frontend dependencies to install');
    return;
  }
  
  try {
    // Install each dependency one by one to better handle errors
    for (const dep of FRONTEND_DEPS) {
      console.log(`\nInstalling ${dep}...`);
      await executeCommand(`npm install ${dep}`, frontendDir);
    }
    console.log('\n✅ Frontend dependencies installed successfully!');
  } catch (error) {
    console.error(`\n❌ Error installing frontend dependencies: ${error.message}`);
    process.exit(1);
  }
}

// Install backend dependencies
async function installBackendDependencies() {
  const backendDir = path.join(__dirname, '..', 'backend');
  
  console.log('\n=== Installing Backend Dependencies ===');
  
  if (BACKEND_DEPS.length === 0) {
    console.log('No backend dependencies to install');
    return;
  }
  
  try {
    // Install each dependency one by one to better handle errors
    for (const dep of BACKEND_DEPS) {
      console.log(`\nInstalling ${dep}...`);
      await executeCommand(`npm install ${dep}`, backendDir);
    }
    console.log('\n✅ Backend dependencies installed successfully!');
  } catch (error) {
    console.error(`\n❌ Error installing backend dependencies: ${error.message}`);
    process.exit(1);
  }
}

// Update package.json scripts
function updatePackageJsonScripts() {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Add or update the script
    packageJson.scripts['install-missing-deps'] = 'node scripts/install-dependencies.js';
    
    // Write back the updated package.json
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('\n✅ Updated package.json with new dependency installation script');
    
  } catch (err) {
    console.error(`\n❌ Failed to update package.json: ${err.message}`);
  }
}

// Main function
async function main() {
  console.log('=== Missing Dependencies Installation ===');
  
  try {
    // Install frontend dependencies
    await installFrontendDependencies();
    
    // Install backend dependencies
    await installBackendDependencies();
    
    // Update package.json scripts
    updatePackageJsonScripts();
    
    console.log('\n✅ All dependencies installed successfully!');
    console.log('\nYou can now start the application with:');
    console.log('npm run start');
    
  } catch (error) {
    console.error(`\n❌ Installation failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main();
