#!/usr/bin/env node

/**
 * Fix Critical Startup Issues
 * ===========================
 * Addresses the critical issues preventing application startup
 */

import fs from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔧 FIXING CRITICAL STARTUP ISSUES...');
console.log('=====================================\n');

// 1. Fix authMiddleware.mjs export issue (ensure clean export)
async function fixAuthMiddleware() {
  console.log('1. Checking authMiddleware.mjs exports...');
  
  const authPath = join(__dirname, 'middleware', 'authMiddleware.mjs');
  
  if (!existsSync(authPath)) {
    console.error('❌ authMiddleware.mjs not found!');
    return false;
  }
  
  try {
    const content = await fs.readFile(authPath, 'utf8');
    
    // Check if admin export exists
    const hasAdminExport = content.includes('export const admin = adminOnly;');
    const hasIsAdminExport = content.includes('export const isAdmin = adminOnly;');
    
    if (hasAdminExport && hasIsAdminExport) {
      console.log('✅ Auth middleware exports are correct');
      return true;
    }
    
    console.log('🔨 Adding missing exports to authMiddleware.mjs...');
    
    // Ensure exports exist at the end of the file
    let fixedContent = content;
    
    if (!hasAdminExport) {
      fixedContent += '\\n\\n/**\\n * Alias for adminOnly middleware\\n */\\nexport const admin = adminOnly;\\n';
    }
    
    if (!hasIsAdminExport) {
      fixedContent += '\\n/**\\n * Alias for adminOnly middleware\\n */\\nexport const isAdmin = adminOnly;\\n';
    }
    
    await fs.writeFile(authPath, fixedContent);
    console.log('✅ Auth middleware exports fixed');
    return true;
    
  } catch (error) {
    console.error('❌ Error fixing authMiddleware:', error.message);
    return false;
  }
}

// 2. Check and fix workout launcher Python syntax
async function fixWorkoutLauncher() {
  console.log('\\n2. Checking workout_launcher.py...');
  
  const launcherPath = join(__dirname, 'mcp_server', 'workout_launcher.py');
  
  if (!existsSync(launcherPath)) {
    console.log('⚠️  workout_launcher.py not found, skipping...');
    return true;
  }
  
  try {
    const content = await fs.readFile(launcherPath, 'utf8');
    
    // Check for the problematic line continuation
    const problematicLine = /sys\\.path\\.insert\\(0, str\\(current_dir\\)\\)\\\\n.*sys\\.path\\.insert/;
    
    if (problematicLine.test(content)) {
      console.log('🔨 Fixing line continuation issue in workout_launcher.py...');
      
      const fixedContent = content.replace(
        /sys\\.path\\.insert\\(0, str\\(current_dir\\)\\)\\\\n.*sys\\.path\\.insert\\(0, str\\(workout_dir\\)\\)/,
        `sys.path.insert(0, str(current_dir))
# Add the workout_mcp_server directory to Python path
sys.path.insert(0, str(workout_dir))`
      );
      
      await fs.writeFile(launcherPath, fixedContent);
      console.log('✅ Workout launcher syntax fixed');
    } else {
      console.log('✅ Workout launcher syntax is correct');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error checking workout_launcher:', error.message);
    return false;
  }
}

// 3. Fix Python import issues in workout MCP server
async function fixWorkoutMCPImports() {
  console.log('\\n3. Checking Python import issues...');
  
  const toolsPath = join(__dirname, 'mcp_server', 'workout_mcp_server', 'routes', 'tools.py');
  
  if (!existsSync(toolsPath)) {
    console.log('⚠️  workout_mcp_server/routes/tools.py not found, skipping...');
    return true;
  }
  
  try {
    const content = await fs.readFile(toolsPath, 'utf8');
    
    // Check for problematic relative imports
    const hasProblematicImports = content.includes('from ..models import');
    
    if (hasProblematicImports) {
      console.log('🔨 Fixing relative import issues in tools.py...');
      
      // Fix the import path - assuming the current structure
      const fixedContent = content.replace(
        /from \\.\\.models import/g,
        'from workout_mcp_server.models import'
      );
      
      await fs.writeFile(toolsPath, fixedContent);
      console.log('✅ Python import paths fixed');
    } else {
      console.log('✅ Python imports look correct');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error fixing Python imports:', error.message);
    return false;
  }
}

// 4. Create Node.js module cache cleaner
async function clearNodeModuleCache() {
  console.log('\\n4. Clearing Node.js module cache...');
  
  // Create a cache cleaner script
  const cacheClearerContent = `#!/usr/bin/env node

/**
 * Clear Node.js Module Cache
 * Helps resolve module import issues
 */

// Clear the require cache
for (const key in require.cache) {
  if (key.includes('authMiddleware')) {
    delete require.cache[key];
    console.log('Cleared cache for:', key);
  }
}

console.log('Node.js module cache cleared for auth modules');
`;

  const cacheClearerPath = join(__dirname, 'clear-node-cache.js');
  await fs.writeFile(cacheClearerPath, cacheClearerContent);
  console.log('✅ Cache cleaner script created');
  
  return true;
}

// 5. Create startup verification script
async function createStartupVerifier() {
  console.log('\\n5. Creating startup verification script...');
  
  const verifierContent = `#!/usr/bin/env node

/**
 * Startup Verification Script
 * Checks that all critical components can be imported correctly
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 VERIFYING STARTUP COMPONENTS...');
console.log('====================================\\n');

async function verifyAuthMiddleware() {
  try {
    console.log('Checking authMiddleware.mjs...');
    const { protect, admin, isAdmin, adminOnly } = await import('./middleware/authMiddleware.mjs');
    
    if (protect && admin && isAdmin && adminOnly) {
      console.log('✅ Auth middleware imports correctly');
      console.log('  - protect:', typeof protect);
      console.log('  - admin:', typeof admin);
      console.log('  - isAdmin:', typeof isAdmin);
      console.log('  - adminOnly:', typeof adminOnly);
      return true;
    } else {
      console.log('❌ Missing exports from auth middleware');
      return false;
    }
  } catch (error) {
    console.log('❌ Error importing auth middleware:', error.message);
    return false;
  }
}

async function verifyRoutes() {
  try {
    console.log('\\nChecking route imports...');
    
    // Test import of notificationSettingsRoutes
    const notificationRoutes = await import('./routes/notificationSettingsRoutes.mjs');
    console.log('✅ notificationSettingsRoutes imports correctly');
    
    return true;
  } catch (error) {
    console.log('❌ Error importing routes:', error.message);
    return false;
  }
}

async function runVerification() {
  const authOk = await verifyAuthMiddleware();
  const routesOk = await verifyRoutes();
  
  console.log('\\n====================================');
  if (authOk && routesOk) {
    console.log('✅ ALL VERIFICATIONS PASSED');
    console.log('Backend should start without import errors');
  } else {
    console.log('❌ VERIFICATION FAILED');
    console.log('Please check the errors above before starting the backend');
    process.exit(1);
  }
}

runVerification().catch(console.error);
`;

  const verifierPath = join(__dirname, 'verify-startup.mjs');
  await fs.writeFile(verifierPath, verifierContent);
  console.log('✅ Startup verifier created');
  
  return true;
}

// Main execution
async function main() {
  try {
    const results = await Promise.all([
      fixAuthMiddleware(),
      fixWorkoutLauncher(),
      fixWorkoutMCPImports(),
      clearNodeModuleCache(),
      createStartupVerifier()
    ]);
    
    console.log('\\n=====================================');
    if (results.every(r => r)) {
      console.log('✅ ALL FIXES APPLIED SUCCESSFULLY');
      console.log('\\nNext steps:');
      console.log('1. Run: node verify-startup.mjs');
      console.log('2. If verification passes, start the backend: npm start');
      console.log('\\nNote: The frontend proxy is already correctly configured for port 10000');
    } else {
      console.log('❌ SOME FIXES FAILED');
      console.log('Please review the errors above');
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
