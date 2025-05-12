#!/usr/bin/env node
/**
 * Quick Verification Script
 * Tests all the new configurations and provides setup guidance
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

console.log('🔍 SwanStudios Setup Verification\n');

// Check if required files exist
const requiredFiles = [
  'scripts/server-status.mjs',
  'backend/mcp_server/start_enhanced_gamification_server.py',
  'backend/mcp_server/enhanced_gamification_mcp/enhanced_gamification_mcp_server.py',
  'backend/controllers/adminClientController.mjs',
  'backend/routes/adminClientRoutes.mjs'
];

console.log('📁 Checking required files...');
for (const file of requiredFiles) {
  const exists = fs.existsSync(path.join(projectRoot, file));
  console.log(`   ${exists ? '✅' : '❌'} ${file}`);
}

// Check package.json scripts
console.log('\n📄 Checking package.json scripts...');
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const requiredScripts = [
  'start-enhanced-gamification-mcp',
  'monitor-servers',
  'start-with-monitor'
];

for (const script of requiredScripts) {
  const exists = packageJson.scripts[script];
  console.log(`   ${exists ? '✅' : '❌'} ${script}`);
}

// Check Python environment
console.log('\n🐍 Checking Python setup...');
try {
  const pythonVersion = execSync('python --version', { encoding: 'utf8' }).trim();
  console.log(`   ✅ Python: ${pythonVersion}`);
} catch (error) {
  console.log('   ❌ Python not found or not in PATH');
}

// Check Node.js dependencies
console.log('\n📦 Checking Node.js dependencies...');
const requiredDeps = ['axios', 'chalk', 'ora'];
let needsInstall = false;

for (const dep of requiredDeps) {
  try {
    execSync(`npm list ${dep}`, { stdio: 'pipe' });
    console.log(`   ✅ ${dep}`);
  } catch (error) {
    console.log(`   ❌ ${dep} (needs installation)`);
    needsInstall = true;
  }
}

// Provide setup instructions
console.log('\n🚀 Setup Instructions:');

if (needsInstall) {
  console.log('1. Install missing dependencies:');
  console.log('   npm install axios chalk ora --save-dev');
  console.log();
}

console.log('2. Start all servers with monitoring:');
console.log('   npm run start-with-monitor');
console.log();
console.log('3. Or start servers separately:');
console.log('   npm start                  # Start all servers');
console.log('   npm run monitor-servers    # Monitor only');
console.log();
console.log('4. Test the enhanced gamification MCP:');
console.log('   Visit http://localhost:8002 after starting');
console.log();
console.log('5. Test admin features:');
console.log('   Set ADMIN_TOKEN=your_jwt_token');
console.log('   node backend/scripts/test-admin-features.mjs');

console.log('\n✨ Setup verification complete!');
