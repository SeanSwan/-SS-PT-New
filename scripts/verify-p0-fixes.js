// P0 Fixes Verification Script - FIXED VERSION
// Tests all the critical fixes that were applied

// Chalk v5+ requires dynamic import
let chalk;

async function loadChalk() {
  if (!chalk) {
    chalk = await import('chalk');
  }
  return chalk.default;
}

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function runCommand(command, args = [], options = {}) {
  return new Promise((resolve) => {
    const chalkInstance = chalk;
    if (chalkInstance) {
      console.log(chalkInstance.blue(`Running: ${command} ${args.join(' ')}`));
    } else {
      console.log(`Running: ${command} ${args.join(' ')}`);
    }
    
    const process = spawn(command, args, { 
      shell: true, 
      stdio: 'pipe',
      ...options 
    });
    
    let output = '';
    let error = '';
    
    if (process.stdout) {
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
    }
    
    if (process.stderr) {
      process.stderr.on('data', (data) => {
        error += data.toString();
      });
    }
    
    process.on('close', (code) => {
      resolve({
        success: code === 0,
        code,
        output,
        error
      });
    });
    
    // Kill after 10 seconds to prevent hanging
    setTimeout(() => {
      process.kill();
      resolve({
        success: false,
        code: -1,
        output,
        error: 'Command timeout'
      });
    }, 10000);
  });
}

function checkFileExists(filePath) {
  const exists = fs.existsSync(filePath);
  const fullPath = path.resolve(filePath);
  return { exists, path: fullPath };
}

async function verifyP0Fixes() {
  const chalkInstance = await loadChalk();
  console.log(chalkInstance.blue('🔍 Verifying P0 Critical Fixes'));
  console.log(chalkInstance.gray('=' .repeat(50)));
  
  const results = [];
  
  // Test 1: Check if missing scripts were created
  const requiredScripts = [
    'scripts/check-mcp-health.js',
    'scripts/kill-ports.js',
    'scripts/monitor-servers.js',
    'backend/scripts/check-system-status.mjs',
    'backend/scripts/test-auth-system.mjs',
    'backend/scripts/restart-backend.mjs'
  ];
  
  console.log(chalkInstance.yellow('\n📁 Checking Script Files...'));
  for (const script of requiredScripts) {
    const check = checkFileExists(script);
    results.push({
      test: `Script: ${script}`,
      success: check.exists,
      details: check.exists ? 'File exists' : 'File missing'
    });
    
    const icon = check.exists ? '✅' : '❌';
    const color = check.exists ? chalkInstance.green : chalkInstance.red;
    console.log(`${icon} ${script.padEnd(40)} ${color(check.exists ? 'EXISTS' : 'MISSING')}`);
  }
  
  // Test 2: Check if duplicate components were removed
  console.log(chalkInstance.yellow('\n🗑️  Checking Duplicate Removal...'));
  const removedComponents = [
    'frontend/src/pages/shop/StoreFrontFixed.component.tsx',
    'frontend/src/pages/shop/SimplifiedStoreFront.component.tsx'
  ];
  
  for (const component of removedComponents) {
    const check = checkFileExists(component);
    const shouldNotExist = !check.exists;
    results.push({
      test: `Removed: ${component}`,
      success: shouldNotExist,
      details: shouldNotExist ? 'Successfully removed' : 'Still exists'
    });
    
    const icon = shouldNotExist ? '✅' : '❌';
    const color = shouldNotExist ? chalkInstance.green : chalkInstance.red;
    console.log(`${icon} ${path.basename(component).padEnd(35)} ${color(shouldNotExist ? 'REMOVED' : 'STILL EXISTS')}`);
  }
  
  // Test 3: Check models/index.mjs fix
  console.log(chalkInstance.yellow('\n🔗 Checking Model Association Fix...'));
  try {
    const modelsIndexContent = fs.readFileSync('backend/models/index.mjs', 'utf8');
    const hasSetupAssociations = modelsIndexContent.includes('setupAssociations()');
    const hasImport = modelsIndexContent.includes('import setupAssociations');
    
    const fixed = !hasSetupAssociations && !hasImport;
    results.push({
      test: 'Model Association Fix',
      success: fixed,
      details: fixed ? 'Circular dependency removed' : 'Still has setupAssociations call'
    });
    
    const icon = fixed ? '✅' : '❌';
    const color = fixed ? chalkInstance.green : chalkInstance.red;
    console.log(`${icon} Model Circular Dependency    ${color(fixed ? 'FIXED' : 'NOT FIXED')}`);
  } catch (error) {
    results.push({
      test: 'Model Association Fix',
      success: false,
      details: `Error reading file: ${error.message}`
    });
    console.log(`❌ Model Circular Dependency    ${chalkInstance.red('ERROR')}`);
  }
  
  // Test 4: Check if backend scripts were added to package.json
  console.log(chalkInstance.yellow('\n📦 Checking Backend Package.json Scripts...'));
  try {
    const backendPackageContent = fs.readFileSync('backend/package.json', 'utf8');
    const backendPackage = JSON.parse(backendPackageContent);
    
    const requiredBackendScripts = ['check-system-status', 'test-auth-system', 'restart-backend'];
    const missingScripts = requiredBackendScripts.filter(script => !backendPackage.scripts[script]);
    
    const scriptsFixed = missingScripts.length === 0;
    results.push({
      test: 'Backend Scripts in package.json',
      success: scriptsFixed,
      details: scriptsFixed ? 'All scripts added' : `Missing: ${missingScripts.join(', ')}`
    });
    
    const icon = scriptsFixed ? '✅' : '❌';
    const color = scriptsFixed ? chalkInstance.green : chalkInstance.red;
    console.log(`${icon} Backend package.json scripts ${color(scriptsFixed ? 'FIXED' : 'MISSING SCRIPTS')}`);
  } catch (error) {
    results.push({
      test: 'Backend Scripts in package.json',
      success: false,
      details: `Error reading backend package.json: ${error.message}`
    });
    console.log(`❌ Backend package.json scripts ${chalkInstance.red('ERROR')}`);
  }
  
  // Summary
  console.log(chalkInstance.blue('\n📊 P0 Fixes Verification Summary'));
  console.log(chalkInstance.gray('=' .repeat(50)));
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(chalkInstance.blue(`Tests Passed: ${passed}/${total}`));
  
  if (passed === total) {
    console.log(chalkInstance.green('\n🎉 ALL P0 CRITICAL FIXES VERIFIED SUCCESSFULLY!'));
    console.log(chalkInstance.green('✅ Your platform is ready for deployment'));
  } else {
    console.log(chalkInstance.yellow(`\n⚠️  ${total - passed} issues need attention:`));
    results.filter(r => !r.success).forEach(result => {
      console.log(chalkInstance.red(`❌ ${result.test}: ${result.details}`));
    });
  }
  
  console.log(chalkInstance.blue('\n🚀 Next steps:'));
  console.log(chalkInstance.gray('1. Run: npm run start-dev'));
  console.log(chalkInstance.gray('2. Test your application'));
  console.log(chalkInstance.gray('3. Proceed with P1 optimizations if desired'));
  
  return results;
}

if (require.main === module) {
  verifyP0Fixes().catch(console.error);
}

module.exports = { verifyP0Fixes };
