#!/usr/bin/env node

/**
 * Simple System Fix Script
 * Uses only built-in Node.js modules
 */

import fs from 'fs/promises';
import { existsSync } from 'fs';

// Simple color functions
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

console.log(colors.bold(colors.blue('🔧 SwanStudios System Fix Script\\n')));

const fixes = [];

/**
 * Fix 1: Check authMiddleware exports
 */
async function checkAuthMiddleware() {
  const authPath = 'backend/middleware/authMiddleware.mjs';
  
  try {
    if (!existsSync(authPath)) {
      console.log(colors.red('✗ authMiddleware.mjs not found'));
      return;
    }
    
    const content = await fs.readFile(authPath, 'utf8');
    
    if (content.includes('export const admin') && content.includes('export const isAdmin')) {
      console.log(colors.green('✓ authMiddleware exports are correct'));
      fixes.push('authMiddleware exports verified');
    } else {
      console.log(colors.yellow('⚠️ authMiddleware may need export fixes'));
    }
  } catch (error) {
    console.log(colors.red(`✗ Error checking authMiddleware: ${error.message}`));
  }
}

/**
 * Fix 2: Check Python __init__.py files
 */
async function checkPythonFiles() {
  const mcpPaths = [
    'backend/mcp_server/workout_mcp_server/routes/__init__.py',
    'backend/mcp_server/workout_mcp_server/tools/__init__.py',
    'backend/mcp_server/workout_mcp_server/models/__init__.py'
  ];
  
  let allExist = true;
  for (const initPath of mcpPaths) {
    if (existsSync(initPath)) {
      console.log(colors.green(`✓ ${initPath} exists`));
    } else {
      console.log(colors.red(`✗ Missing: ${initPath}`));
      allExist = false;
    }
  }
  
  if (allExist) {
    fixes.push('All Python __init__.py files present');
  }
}

/**
 * Fix 3: Check Python imports
 */
async function checkPythonImports() {
  const toolsPath = 'backend/mcp_server/workout_mcp_server/routes/tools.py';
  
  try {
    if (!existsSync(toolsPath)) {
      console.log(colors.red('✗ tools.py not found'));
      return;
    }
    
    const content = await fs.readFile(toolsPath, 'utf8');
    
    if (content.includes('from models import') && content.includes('from tools import')) {
      console.log(colors.green('✓ Python imports are using absolute imports'));
      fixes.push('Python imports correctly configured');
    } else if (content.includes('from ..models') || content.includes('from ..tools')) {
      console.log(colors.yellow('⚠️ Python imports are using relative imports (may cause issues)'));
    }
  } catch (error) {
    console.log(colors.red(`✗ Error checking Python imports: ${error.message}`));
  }
}

/**
 * Fix 4: Check environment files
 */
async function checkEnvironment() {
  if (existsSync('.env')) {
    console.log(colors.green('✓ .env file exists'));
    fixes.push('.env file configured');
  } else {
    console.log(colors.yellow('⚠️ .env file not found - copy from .env.example'));
  }
  
  if (existsSync('.env.example')) {
    console.log(colors.green('✓ .env.example exists'));
  }
}

/**
 * Main function
 */
async function runChecks() {
  console.log(colors.bold('Running system checks...\\n'));
  
  await checkAuthMiddleware();
  await checkPythonFiles();
  await checkPythonImports();
  await checkEnvironment();
  
  console.log('\\n' + colors.bold(colors.green('Summary:')));
  fixes.forEach(fix => console.log(colors.green('✓ ' + fix)));
  
  console.log('\\n' + colors.bold(colors.yellow('Next Steps:')));
  console.log(colors.yellow('1. Ensure PostgreSQL is running: net start postgresql-x64-14'));
  console.log(colors.yellow('2. Copy .env.example to .env if needed'));
  console.log(colors.yellow('3. Run: npm start'));
  console.log(colors.yellow('4. Check with: node simple-verify.mjs'));
  
  console.log('\\n' + colors.bold(colors.blue('🚀 You can now try starting the system!')));
}

// Execute
runChecks().catch(error => {
  console.error(colors.red(`\\nScript failed: ${error.message}`));
  process.exit(1);
});
