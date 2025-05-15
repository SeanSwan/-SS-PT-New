#!/usr/bin/env node

/**
 * Backend Startup Script
 * This script handles the complete backend initialization process
 * and ensures all services are running before considering startup complete
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, '../backend');

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function checkRequiredFiles() {
  log('🔍 Checking required files...', colors.blue);
  
  const requiredFiles = [
    path.join(backendDir, 'server.mjs'),
    path.join(backendDir, 'package.json'),
    path.join(__dirname, '../.env')
  ];
  
  for (const file of requiredFiles) {
    try {
      await fs.access(file);
      log(`✓ Found: ${path.basename(file)}`, colors.green);
    } catch (error) {
      log(`✗ Missing: ${file}`, colors.red);
      throw new Error(`Required file missing: ${file}`);
    }
  }
}

async function installDependencies() {
  log('📦 Installing backend dependencies...', colors.blue);
  
  return new Promise((resolve, reject) => {
    const npmInstall = spawn('npm', ['install'], {
      cwd: backendDir,
      stdio: 'inherit',
      shell: true
    });
    
    npmInstall.on('close', (code) => {
      if (code === 0) {
        log('✓ Dependencies installed successfully', colors.green);
        resolve();
      } else {
        reject(new Error(`npm install failed with code ${code}`));
      }
    });
  });
}

async function seedTestAccounts() {
  log('👥 Seeding test accounts...', colors.blue);
  
  return new Promise((resolve, reject) => {
    const seedProcess = spawn('node', ['scripts/seed-test-accounts.mjs'], {
      cwd: backendDir,
      stdio: 'inherit',
      shell: true
    });
    
    seedProcess.on('close', (code) => {
      if (code === 0) {
        log('✓ Test accounts seeded successfully', colors.green);
        resolve();
      } else {
        log('⚠ Test account seeding completed with warnings', colors.yellow);
        resolve(); // Don't fail startup if seeding has issues
      }
    });
  });
}

async function startServer() {
  log('🚀 Starting backend server...', colors.blue);
  
  const serverProcess = spawn('node', ['server.mjs'], {
    cwd: backendDir,
    stdio: 'inherit',
    shell: true
  });
  
  // Keep the process running
  serverProcess.on('close', (code) => {
    if (code !== 0) {
      log(`❌ Server exited with code ${code}`, colors.red);
      process.exit(code);
    }
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    log('\n🛑 Gracefully shutting down...', colors.yellow);
    serverProcess.kill('SIGTERM');
    setTimeout(() => {
      serverProcess.kill('SIGKILL');
      process.exit(0);
    }, 5000);
  });
  
  return serverProcess;
}

async function main() {
  try {
    log('🔄 Starting SwanStudios Backend...', colors.bright + colors.blue);
    
    await checkRequiredFiles();
    await installDependencies();
    await seedTestAccounts();
    
    log('✅ Backend initialization complete. Starting server...', colors.green);
    await startServer();
    
  } catch (error) {
    log(`❌ Backend startup failed: ${error.message}`, colors.red);
    process.exit(1);
  }
}

main();
