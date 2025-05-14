#!/usr/bin/env node

/**
 * Production Deployment Check Script
 * Validates environment and configuration before Render deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the backend directory path (parent of scripts directory)
const backendDir = path.dirname(__dirname);
const projectRoot = path.dirname(backendDir);

console.log('🚀 SwanStudios Production Deployment Check\n');
console.log(`Backend directory: ${backendDir}`);
console.log(`Project root: ${projectRoot}\n`);

// Check critical files exist
const criticalFiles = [
  { name: 'render.yaml', path: path.resolve(backendDir, 'render.yaml') },
  { name: 'package.json', path: path.resolve(backendDir, 'package.json') },
  { name: 'server.mjs', path: path.resolve(backendDir, 'server.mjs') },
  { name: '.env', path: path.resolve(projectRoot, '.env') }
];

let filesOk = true;
console.log('📁 Checking critical files...');
for (const file of criticalFiles) {
  if (fs.existsSync(file.path)) {
    console.log(`  ✅ ${file.name}`);
  } else {
    console.log(`  ❌ ${file.name} - NOT FOUND`);
    console.log(`    Expected at: ${file.path}`);
    filesOk = false;
  }
}

// Check package.json scripts
console.log('\n📝 Checking package.json scripts...');
const packagePath = path.resolve(backendDir, 'package.json');
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  const requiredScripts = ['render-start', 'start'];
  for (const script of requiredScripts) {
    if (packageJson.scripts && packageJson.scripts[script]) {
      console.log(`  ✅ ${script}: ${packageJson.scripts[script]}`);
    } else {
      console.log(`  ❌ ${script} - NOT FOUND`);
      filesOk = false;
    }
  }
} else {
  console.log('  ❌ package.json not found, skipping script checks');
  filesOk = false;
}

// Check render.yaml configuration
console.log('\n⚙️  Checking render.yaml configuration...');
const renderPath = path.resolve(backendDir, 'render.yaml');
if (fs.existsSync(renderPath)) {
  const renderConfig = fs.readFileSync(renderPath, 'utf8');
  
  if (renderConfig.includes('render-start')) {
    console.log('  ✅ Uses render-start command');
  } else {
    console.log('  ❌ Does not use render-start command');
    filesOk = false;
  }
  
  if (renderConfig.includes('NODE_ENV')) {
    console.log('  ✅ NODE_ENV configured');
  } else {
    console.log('  ❌ NODE_ENV not found');
    filesOk = false;
  }
} else {
  console.log('  ❌ render.yaml not found, skipping configuration checks');
  filesOk = false;
}

// Check environment variables
console.log('\n🔐 Checking environment variables...');
const envPath = path.resolve(projectRoot, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  const requiredEnvVars = [
    'JWT_SECRET',
    'DATABASE_URL',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'SENDGRID_API_KEY'
  ];
  
  for (const envVar of requiredEnvVars) {
    if (envContent.includes(`${envVar}=`)) {
      console.log(`  ✅ ${envVar}`);
    } else {
      console.log(`  ❌ ${envVar} - NOT FOUND`);
      filesOk = false;
    }
  }
  
  // Check for test vs live Stripe keys
  if (envContent.includes('sk_test_')) {
    console.log('  ⚠️  Using Stripe TEST keys (switch to live for production)');
  } else if (envContent.includes('sk_live_')) {
    console.log('  ✅ Using Stripe LIVE keys');
  }
} else {
  console.log('  ❌ .env file not found');
  console.log(`    Expected at: ${envPath}`);
  filesOk = false;
}

// Check migrations directory
console.log('\n🗃️  Checking database migrations...');
const migrationsPath = path.resolve(backendDir, 'migrations');
if (fs.existsSync(migrationsPath)) {
  const migrations = fs.readdirSync(migrationsPath).filter(f => f.endsWith('.cjs'));
  console.log(`  ✅ Found ${migrations.length} migrations`);
  
  // Check for DECIMAL migration
  const decimalMigrations = migrations.filter(m => m.includes('decimal'));
  if (decimalMigrations.length > 0) {
    console.log(`  ✅ DECIMAL precision migrations found: ${decimalMigrations.join(', ')}`);
  } else {
    console.log('  ⚠️  No DECIMAL precision migrations found');
  }
} else {
  console.log('  ❌ Migrations directory not found');
  filesOk = false;
}

// Final status
console.log('\n' + '='.repeat(50));
if (filesOk) {
  console.log('🎉 ALL CHECKS PASSED! Ready for production deployment.');
  console.log('\n📋 DEPLOYMENT CHECKLIST:');
  console.log('1. Set NODE_ENV=production in Render dashboard');
  console.log('2. Switch STRIPE_SECRET_KEY to live key in Render');
  console.log('3. Copy all other environment variables to Render');
  console.log('4. Push to GitHub main branch');
  console.log('5. Deploy will trigger automatically');
  console.log('\n✨ Your application is ready to generate revenue!');
} else {
  console.log('❌ SOME CHECKS FAILED. Please fix the issues above before deploying.');
  process.exit(1);
}
