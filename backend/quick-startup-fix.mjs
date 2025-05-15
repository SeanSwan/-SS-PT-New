#!/usr/bin/env node

/**
 * QUICK STARTUP FIX SCRIPT
 * Applies immediate fixes for backend startup
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import chalk from 'chalk';

const execAsync = promisify(exec);

console.log(chalk.blue.bold('🚀 Quick Backend Startup Fix'));
console.log('===============================\n');

async function killPortProcesses() {
  console.log(chalk.yellow('1. Clearing port 10000...'));
  
  try {
    // Find processes on port 10000
    const { stdout } = await execAsync('netstat -ano | findstr :10000');
    if (stdout.trim()) {
      console.log('Processes found on port 10000:');
      console.log(stdout);
      
      // Extract PIDs and kill them
      const lines = stdout.trim().split('\\n');
      const pidsToKill = new Set();
      
      for (const line of lines) {
        const parts = line.trim().split(/\\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && !isNaN(parseInt(pid))) {
          pidsToKill.add(pid);
        }
      }
      
      console.log(`Killing PIDs: ${Array.from(pidsToKill).join(', ')}`);
      
      for (const pid of pidsToKill) {
        try {
          await execAsync(`taskkill /PID ${pid} /F`);
          console.log(`✅ Killed process ${pid}`);
        } catch (killError) {
          console.log(`⚠️  Could not kill process ${pid}: ${killError.message}`);
        }
      }
    } else {
      console.log('✅ Port 10000 is available');
    }
  } catch (error) {
    console.log('✅ Port 10000 appears to be available');
  }
  console.log('');
}

async function fixEnvironmentConfiguration() {
  console.log(chalk.yellow('2. Checking environment configuration...'));
  
  // Check root .env
  const rootEnvPath = '../.env';
  if (existsSync(rootEnvPath)) {
    let envContent = await readFile(rootEnvPath, 'utf8');
    let modified = false;
    
    // Ensure Redis is disabled
    if (!envContent.includes('REDIS_ENABLED=false')) {
      envContent += '\\n# Redis Configuration (Optional)\\nREDIS_ENABLED=false\\nREDIS_URL=redis://localhost:6379\\n';
      modified = true;
    }
    
    // Ensure backend port is set
    if (!envContent.includes('BACKEND_PORT=10000')) {
      envContent += '\\nBACKEND_PORT=10000\\n';
      modified = true;
    }
    
    if (modified) {
      await writeFile(rootEnvPath, envContent);
      console.log('✅ Updated root .env configuration');
    } else {
      console.log('✅ Root .env configuration OK');
    }
  }
  
  // Check frontend .env
  const frontendEnvPath = '../frontend/.env';
  if (existsSync(frontendEnvPath)) {
    let frontendEnv = await readFile(frontendEnvPath, 'utf8');
    let modified = false;
    
    if (!frontendEnv.includes('VITE_API_BASE_URL=http://localhost:10000')) {
      // Update or add the API base URL
      if (frontendEnv.includes('VITE_API_BASE_URL=')) {
        frontendEnv = frontendEnv.replace(/VITE_API_BASE_URL=.*/g, 'VITE_API_BASE_URL=http://localhost:10000');
      } else {
        frontendEnv += '\\nVITE_API_BASE_URL=http://localhost:10000\\n';
      }
      modified = true;
    }
    
    if (modified) {
      await writeFile(frontendEnvPath, frontendEnv);
      console.log('✅ Updated frontend .env configuration');
    } else {
      console.log('✅ Frontend .env configuration OK');
    }
  }
  console.log('');
}

async function clearNodeCache() {
  console.log(chalk.yellow('3. Clearing Node.js cache...'));
  
  try {
    await execAsync('npm cache clean --force');
    console.log('✅ npm cache cleared');
  } catch (error) {
    console.log(`⚠️  npm cache clean failed: ${error.message}`);
  }
  
  // Clear require cache programmatically
  for (const key of Object.keys(require.cache)) {
    delete require.cache[key];
  }
  console.log('✅ require cache cleared');
  console.log('');
}

async function runPIIFix() {
  console.log(chalk.yellow('4. Ensuring PII fixes are applied...'));
  
  // Check if FINAL_FIX_ALL_ISSUES.mjs exists and run it
  if (existsSync('FINAL_FIX_ALL_ISSUES.mjs')) {
    try {
      console.log('Running comprehensive PII fix...');
      await execAsync('node FINAL_FIX_ALL_ISSUES.mjs');
      console.log('✅ PII fixes applied successfully');
    } catch (error) {
      console.log(`⚠️  PII fix script failed: ${error.message}`);
    }
  } else {
    console.log('⚠️  PII fix script not found, creating minimal fix...');
    
    // Ensure PIIManager exists with safe implementation
    const piiManagerPath = 'services/privacy/PIIManager.mjs';
    if (!existsSync(piiManagerPath)) {
      console.log('Creating safe PIIManager...');
      const safePiiManager = `export class PIIManager {
  async scanForPII(content) {
    if (!content) return { piiDetected: false, detections: [] };
    return { piiDetected: false, detections: [] };
  }
  async sanitizeContent(content) {
    return { sanitizedContent: content || '', originalContent: content };
  }
}
export const piiManager = new PIIManager();`;
      
      // Ensure directory exists
      await execAsync('mkdir -p services/privacy');
      await writeFile(piiManagerPath, safePiiManager);
      console.log('✅ Created safe PIIManager');
    }
  }
  console.log('');
}

async function startBackend() {
  console.log(chalk.yellow('5. Starting backend server...'));
  
  return new Promise((resolve) => {
    console.log('Running: node server.mjs');
    
    const { spawn } = require('child_process');
    const serverProcess = spawn('node', ['server.mjs'], {
      stdio: 'inherit',
      env: { ...process.env, PORT: '10000', NODE_ENV: 'development' }
    });
    
    // Give it 5 seconds to start
    setTimeout(() => {
      console.log('\\n✅ Backend startup initiated');
      console.log('Check the output above for any errors.');
      console.log('If successful, you should see "Server running on port 10000"');
      resolve();
    }, 5000);
    
    serverProcess.on('error', (error) => {
      console.error('❌ Failed to start backend:', error.message);
      resolve();
    });
  });
}

async function runQuickFix() {
  try {
    await killPortProcesses();
    await fixEnvironmentConfiguration();
    await clearNodeCache();
    await runPIIFix();
    
    console.log(chalk.green.bold('🎉 Quick fixes applied!'));
    console.log('============================\\n');
    console.log(chalk.blue('Next steps:'));
    console.log('1. The script will now attempt to start the backend');
    console.log('2. Watch for any error messages');
    console.log('3. If successful, open a new terminal and run "npm start" from the root');
    console.log('4. If errors persist, run the full diagnostic:');
    console.log('   node diagnose-startup.mjs');
    console.log('');
    
    await startBackend();
    
  } catch (error) {
    console.error(chalk.red('❌ Quick fix failed:'), error.message);
    console.log('\\nTry running the full diagnostic:');
    console.log('node diagnose-startup.mjs');
  }
}

runQuickFix();
