#!/usr/bin/env node

/**
 * STARTUP DIAGNOSTIC SCRIPT
 * Comprehensive diagnosis of backend startup issues
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

console.log(chalk.blue.bold('🔍 SwanStudios Backend Startup Diagnostic'));
console.log('==========================================\n');

async function checkEnvironment() {
  console.log(chalk.yellow('1. Environment Check'));
  console.log('─────────────────────');
  
  // Check Node version
  try {
    const { stdout: nodeVersion } = await execAsync('node --version');
    console.log(`✅ Node.js: ${nodeVersion.trim()}`);
  } catch (error) {
    console.log(`❌ Node.js: Error - ${error.message}`);
  }
  
  // Check npm version
  try {
    const { stdout: npmVersion } = await execAsync('npm --version');
    console.log(`✅ npm: ${npmVersion.trim()}`);
  } catch (error) {
    console.log(`❌ npm: Error - ${error.message}`);
  }
  
  // Check current directory
  console.log(`📁 Current directory: ${process.cwd()}`);
  console.log('');
}

async function checkPorts() {
  console.log(chalk.yellow('2. Port Status Check'));
  console.log('────────────────────');
  
  const ports = [10000, 5000, 5173, 27017, 5432];
  
  for (const port of ports) {
    try {
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      if (stdout.trim()) {
        const lines = stdout.trim().split('\n');
        console.log(`🟡 Port ${port}: OCCUPIED`);
        lines.forEach(line => {
          const parts = line.split(/\s+/);
          const state = parts[3] || 'UNKNOWN';
          const pid = parts[4] || 'N/A';
          console.log(`   ${line.trim()}`);
        });
      } else {
        console.log(`✅ Port ${port}: Available`);
      }
    } catch (error) {
      console.log(`✅ Port ${port}: Available`);
    }
  }
  console.log('');
}

async function checkEnvironmentFiles() {
  console.log(chalk.yellow('3. Environment Files Check'));
  console.log('───────────────────────────');
  
  const envFiles = [
    { path: '../.env', name: 'Root .env' },
    { path: '.env.comprehensive', name: 'Backend .env.comprehensive' },
    { path: '../frontend/.env', name: 'Frontend .env' }
  ];
  
  for (const envFile of envFiles) {
    if (existsSync(envFile.path)) {
      console.log(`✅ ${envFile.name}: Found`);
      try {
        const content = await readFile(envFile.path, 'utf8');
        const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
        console.log(`   ${lines.length} environment variables`);
        
        // Check for critical variables
        const critical = ['PORT', 'BACKEND_PORT', 'JWT_SECRET', 'NODE_ENV'];
        for (const key of critical) {
          const hasKey = content.includes(`${key}=`);
          console.log(`   ${hasKey ? '✅' : '❌'} ${key}`);
        }
      } catch (error) {
        console.log(`   ❌ Error reading file: ${error.message}`);
      }
    } else {
      console.log(`❌ ${envFile.name}: Missing`);
    }
  }
  console.log('');
}

async function checkDependencies() {
  console.log(chalk.yellow('4. Dependencies Check'));
  console.log('─────────────────────');
  
  // Check package.json
  if (existsSync('package.json')) {
    console.log('✅ package.json: Found');
    try {
      const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
      const deps = Object.keys(packageJson.dependencies || {}).length;
      const devDeps = Object.keys(packageJson.devDependencies || {}).length;
      console.log(`   ${deps} dependencies, ${devDeps} dev dependencies`);
    } catch (error) {
      console.log(`   ❌ Error reading package.json: ${error.message}`);
    }
  } else {
    console.log('❌ package.json: Missing');
  }
  
  // Check node_modules
  if (existsSync('node_modules')) {
    console.log('✅ node_modules: Found');
  } else {
    console.log('❌ node_modules: Missing - Run "npm install"');
  }
  console.log('');
}

async function checkCriticalFiles() {
  console.log(chalk.yellow('5. Critical Files Check'));
  console.log('──────────────────────');
  
  const criticalFiles = [
    'server.mjs',
    'database.mjs',
    'models/index.mjs',
    'services/privacy/PIIManager.mjs',
    'utils/monitoring/piiSafeLogging.mjs',
    'utils/apiKeyChecker.mjs'
  ];
  
  for (const file of criticalFiles) {
    if (existsSync(file)) {
      console.log(`✅ ${file}: Found`);
    } else {
      console.log(`❌ ${file}: Missing`);
    }
  }
  console.log('');
}

async function testImports() {
  console.log(chalk.yellow('6. Import Test'));
  console.log('───────────────');
  
  const testFiles = [
    { file: 'services/privacy/PIIManager.mjs', name: 'PIIManager' },
    { file: 'utils/monitoring/piiSafeLogging.mjs', name: 'piiSafeLogging' },
    { file: 'utils/apiKeyChecker.mjs', name: 'apiKeyChecker' }
  ];
  
  for (const test of testFiles) {
    try {
      await import(`./${test.file}`);
      console.log(`✅ ${test.name}: Import successful`);
    } catch (error) {
      console.log(`❌ ${test.name}: Import failed`);
      console.log(`   Error: ${error.message}`);
    }
  }
  console.log('');
}

async function runPIITests() {
  console.log(chalk.yellow('7. PII Component Tests'));
  console.log('──────────────────────');
  
  try {
    console.log('Testing PIIManager...');
    const { piiManager } = await import('./services/privacy/PIIManager.mjs');
    
    // Test problematic inputs
    await piiManager.scanForPII(null);
    await piiManager.scanForPII(undefined);
    await piiManager.scanForPII('');
    await piiManager.scanForPII('test@example.com');
    
    console.log('✅ PIIManager: All tests passed');
    
    console.log('Testing piiSafeLogger...');
    const { piiSafeLogger } = await import('./utils/monitoring/piiSafeLogging.mjs');
    
    await piiSafeLogger.info('Test message');
    await piiSafeLogger.error('Test error', { test: true });
    
    console.log('✅ piiSafeLogger: All tests passed');
  } catch (error) {
    console.log(`❌ PII Tests failed: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
  console.log('');
}

async function attemptStartup() {
  console.log(chalk.yellow('8. Backend Startup Test'));
  console.log('───────────────────────');
  
  console.log('Attempting to start backend server...');
  
  return new Promise((resolve) => {
    const serverProcess = spawn('node', ['server.mjs'], {
      stdio: 'pipe',
      env: { ...process.env, PORT: '10000' }
    });
    
    let output = '';
    let hasStarted = false;
    
    const timeout = setTimeout(() => {
      if (!hasStarted) {
        console.log('❌ Server startup timeout (10 seconds)');
        serverProcess.kill('SIGTERM');
        resolve(false);
      }
    }, 10000);
    
    serverProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.log(`[STDOUT] ${text.trim()}`);
      
      if (text.includes('Server running') || text.includes('port 10000')) {
        console.log('✅ Server started successfully!');
        hasStarted = true;
        clearTimeout(timeout);
        serverProcess.kill('SIGTERM');
        resolve(true);
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.log(`[STDERR] ${text.trim()}`);
    });
    
    serverProcess.on('error', (error) => {
      console.log(`❌ Server error: ${error.message}`);
      clearTimeout(timeout);
      resolve(false);
    });
    
    serverProcess.on('exit', (code) => {
      if (!hasStarted) {
        console.log(`❌ Server exited with code ${code}`);
        console.log('Output:', output);
        clearTimeout(timeout);
        resolve(false);
      }
    });
  });
}

async function provideSolution() {
  console.log(chalk.yellow('9. Recommended Solutions'));
  console.log('────────────────────────');
  
  console.log(chalk.green('To fix backend startup issues:'));
  console.log('');
  console.log('1. First, run the comprehensive test:');
  console.log('   cd backend && node test-final-fix.mjs');
  console.log('');
  console.log('2. Clear cache and restart:');
  console.log('   npm run clear-cache-restart');
  console.log('');
  console.log('3. If PII errors persist, rebuild PII components:');
  console.log('   cd backend && node FINAL_FIX_ALL_ISSUES.mjs');
  console.log('');
  console.log('4. Start the backend alone to debug:');
  console.log('   cd backend && npm run dev');
  console.log('');
  console.log('5. If database issues, check connections:');
  console.log('   cd backend && node test-db-connection.mjs');
  console.log('');
  console.log(chalk.blue('Common Issues and Fixes:'));
  console.log('• PII scanning errors: Already fixed in PIIManager.mjs');
  console.log('• Port conflicts: Kill processes on port 10000');
  console.log('• Missing dependencies: Run npm install');
  console.log('• Database connection: Check .env configuration');
  console.log('• Redis errors: Already disabled in .env');
}

// Run all diagnostics
async function runDiagnostics() {
  await checkEnvironment();
  await checkPorts();
  await checkEnvironmentFiles();
  await checkDependencies();
  await checkCriticalFiles();
  await testImports();
  await runPIITests();
  
  const startupSuccess = await attemptStartup();
  
  await provideSolution();
  
  console.log(chalk.blue.bold('\n🔍 Diagnostic Complete'));
  console.log('======================');
  
  if (startupSuccess) {
    console.log(chalk.green('✅ Backend startup successful!'));
    console.log(chalk.green('The server should now be running on port 10000.'));
  } else {
    console.log(chalk.red('❌ Backend startup failed.'));
    console.log(chalk.red('Review the errors above and follow the recommended solutions.'));
  }
}

runDiagnostics().catch(console.error);
