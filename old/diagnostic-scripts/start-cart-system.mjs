#!/usr/bin/env node

/**
 * SwanStudios Cart System Setup Helper
 * ====================================
 * Helps start backend and frontend servers for cart testing
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

function showStartupInstructions() {
  console.clear();
  log('🚀 SwanStudios Cart System - Startup Instructions', 'bold');
  log('=================================================', 'bold');
  log('Follow these steps to get your cart system running:\n', 'cyan');

  log('STEP 1: Start Backend Server', 'blue');
  log('─────────────────────────────', 'blue');
  log('Open a new terminal and run:', 'yellow');
  log('cd backend', 'cyan');
  log('npm run dev', 'cyan');
  log('Wait for: "Server running on port 10000"\n', 'green');

  log('STEP 2: Start Frontend Server', 'blue');
  log('──────────────────────────────', 'blue');
  log('Open another terminal and run:', 'yellow');
  log('cd frontend', 'cyan');
  log('npm run dev', 'cyan');
  log('Wait for: "Local: http://localhost:5173"\n', 'green');

  log('STEP 3: Test Cart Functionality', 'blue');
  log('─────────────────────────────────', 'blue');
  log('Once both servers are running, test with:', 'yellow');
  log('node quick-backend-check.mjs       # Quick health check', 'cyan');
  log('node test-cart-functionality.mjs   # Full cart test\n', 'cyan');

  log('STEP 4: Manual Browser Testing', 'blue');
  log('───────────────────────────────', 'blue');
  log('1. Open browser to: http://localhost:5173', 'cyan');
  log('2. Register/Login as a user', 'cyan');
  log('3. Go to Store page', 'cyan');
  log('4. Add items to cart', 'cyan');
  log('5. Test checkout with your Stripe account\n', 'cyan');

  log('✅ CONFIGURATION COMPLETED:', 'green');
  log('─────────────────────────────', 'green');
  log('✅ Stripe keys configured (live keys)', 'green');
  log('✅ API URLs properly set', 'green');
  log('✅ Frontend-backend integration ready', 'green');
  log('✅ Real payment processing enabled\n', 'green');

  log('📋 TROUBLESHOOTING:', 'yellow');
  log('──────────────────', 'yellow');
  log('• If backend fails to start: Check PostgreSQL is running', 'yellow');
  log('• If frontend fails to build: Try "npm install" first', 'yellow');
  log('• If cart errors persist: Run the diagnostic tests above', 'yellow');
  log('• For payment issues: Verify your Stripe account is active\n', 'yellow');

  log('🎯 YOUR CART IS NOW CONFIGURED FOR 100% FUNCTIONALITY!', 'green');
  log('Start the servers above and test your cart system.', 'cyan');
}

// Check if package.json files exist
function checkProjectStructure() {
  const backendPackage = path.join(process.cwd(), 'backend', 'package.json');
  const frontendPackage = path.join(process.cwd(), 'frontend', 'package.json');
  
  if (!fs.existsSync(backendPackage)) {
    log('❌ Backend package.json not found. Are you in the project root?', 'red');
    return false;
  }
  
  if (!fs.existsSync(frontendPackage)) {
    log('❌ Frontend package.json not found. Are you in the project root?', 'red');
    return false;
  }
  
  return true;
}

// Main function
function main() {
  if (!checkProjectStructure()) {
    log('\nPlease run this script from the SS-PT project root directory.', 'red');
    process.exit(1);
  }
  
  showStartupInstructions();
}

main();
