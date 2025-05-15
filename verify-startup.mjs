#!/usr/bin/env node

/**
 * Startup Verification Script
 * Checks that all systems are ready to run
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

console.log('🔧 SwanStudios Startup Verification');
console.log('====================================\n');

// Check 1: Environment file
console.log('1. Checking environment file...');
const envPath = path.join(projectRoot, '.env');
if (fs.existsSync(envPath)) {
  console.log('✅ .env file found');
} else {
  console.log('❌ .env file missing');
  process.exit(1);
}

// Check 2: Backend configuration
console.log('\n2. Checking backend configuration...');
const backendPackagePath = path.join(projectRoot, 'backend', 'package.json');
if (fs.existsSync(backendPackagePath)) {
  console.log('✅ Backend package.json found');
} else {
  console.log('❌ Backend package.json missing');
  process.exit(1);
}

// Check 3: Frontend configuration
console.log('\n3. Checking frontend configuration...');
const frontendPackagePath = path.join(projectRoot, 'frontend', 'package.json');
if (fs.existsSync(frontendPackagePath)) {
  console.log('✅ Frontend package.json found');
} else {
  console.log('❌ Frontend package.json missing');
  process.exit(1);
}

// Check 4: Vite configuration
console.log('\n4. Checking Vite configuration...');
const viteConfigPath = path.join(projectRoot, 'frontend', 'vite.config.js');
if (fs.existsSync(viteConfigPath)) {
  console.log('✅ Vite config found');
  // Check if it has the correct proxy configuration
  const viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
  if (viteConfig.includes('localhost:10000')) {
    console.log('✅ Vite proxy configured for port 10000');
  } else {
    console.log('⚠️  Vite proxy might need port 10000 configuration');
  }
} else {
  console.log('❌ Vite config missing');
  process.exit(1);
}

// Check 5: User creation scripts
console.log('\n5. Checking user creation scripts...');
const createTestUsersPath = path.join(projectRoot, 'backend', 'scripts', 'create-test-users.mjs');
const directPasswordResetPath = path.join(projectRoot, 'backend', 'scripts', 'direct-password-reset.mjs');

if (fs.existsSync(createTestUsersPath)) {
  console.log('✅ Test user creation script found');
} else {
  console.log('❌ Test user creation script missing');
}

if (fs.existsSync(directPasswordResetPath)) {
  console.log('✅ Password reset script found');
} else {
  console.log('❌ Password reset script missing');
}

console.log('\n🎉 Startup verification complete!');
console.log('\nNext steps:');
console.log('1. Run the complete-system-fix.bat script');
console.log('2. Wait for both backend (port 10000) and frontend (port 5173) to start');
console.log('3. Access the application at http://localhost:5173');
console.log('4. Login with admin credentials: admin / admin123');
