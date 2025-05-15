#!/usr/bin/env node

/**
 * Comprehensive Fix All Import/Export Issues
 * Master Prompt v26 Compliant - Direct MCP File Editing
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const log = {
  success: (msg) => console.log(chalk.green('✓'), msg),
  error: (msg) => console.log(chalk.red('✗'), msg),
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  warn: (msg) => console.log(chalk.yellow('⚠'), msg),
  header: (msg) => console.log(chalk.bgBlue.white.bold(`\n ${msg} \n`))
};

// Known import/export fixes
const fixes = [
  {
    file: 'routes/aiMonitoringRoutes.mjs',
    search: "import { authMiddleware } from '../middleware/authMiddleware.mjs';",
    replace: "import { protect as authMiddleware } from '../middleware/authMiddleware.mjs';",
    description: "Fix authMiddleware import in aiMonitoringRoutes"
  },
  {
    file: 'routes/mcpRoutes.mjs', 
    search: "import { authMiddleware } from '../middleware/authMiddleware.mjs';",
    replace: "import { protect as authMiddleware } from '../middleware/authMiddleware.mjs';",
    description: "Fix authMiddleware import in mcpRoutes"
  },
  {
    file: 'services/gamification/GamificationEngine.mjs',
    search: "import { GamificationPersistence } from './GamificationPersistence.mjs';",
    replace: "import GamificationPersistence from './GamificationPersistence.mjs';",
    description: "Fix GamificationPersistence import (should be default import)"
  }
];

// Additional dynamic checks for common patterns
const dynamicPatterns = [
  {
    pattern: /import\s*{\s*authMiddleware\s*}\s*from\s*['\"](.+?authMiddleware\.mjs)['\"]/g,
    replacement: "import { protect as authMiddleware } from '$1'",
    description: "Fix authMiddleware named imports"
  },
  {
    pattern: /import\s*{\s*GamificationPersistence\s*}\s*from\s*['\"](.+?GamificationPersistence\.mjs)['\"]/g,
    replacement: "import GamificationPersistence from '$1'",
    description: "Fix GamificationPersistence named imports to default"
  }
];

// Function to apply specific fixes
function applySpecificFix(fix) {
  const filePath = path.join(__dirname, fix.file);
  
  if (!fs.existsSync(filePath)) {
    log.warn(`File not found: ${fix.file}`);
    return false;
  }
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes(fix.search)) {
      content = content.replace(fix.search, fix.replace);
      fs.writeFileSync(filePath, content, 'utf8');
      log.success(`${fix.description}`);
      return true;
    } else {
      log.info(`No changes needed in ${fix.file}`);
      return false;
    }
  } catch (error) {
    log.error(`Error fixing ${fix.file}: ${error.message}`);
    return false;
  }
}

// Function to apply dynamic pattern fixes
function applyDynamicPatterns(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changes = 0;
    
    for (const pattern of dynamicPatterns) {
      const originalContent = content;
      content = content.replace(pattern.pattern, pattern.replacement);
      
      if (content !== originalContent) {
        changes++;
        log.info(`  Applied: ${pattern.description}`);
      }
    }
    
    if (changes > 0) {
      fs.writeFileSync(filePath, content, 'utf8');
      return changes;
    }
    
    return 0;
  } catch (error) {
    log.error(`Error applying patterns to ${filePath}: ${error.message}`);
    return 0;
  }
}

// Function to scan all .mjs files for issues
function scanAllFiles() {
  const files = [];
  
  function scanDirectory(dir, basePath = '') {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(basePath, entry.name);
        
        if (entry.isDirectory() && !['node_modules', '.git', 'uploads'].includes(entry.name)) {
          scanDirectory(fullPath, relativePath);
        } else if (entry.isFile() && entry.name.endsWith('.mjs')) {
          files.push({ fullPath, relativePath });
        }
      }
    } catch (error) {
      log.warn(`Could not scan directory ${dir}: ${error.message}`);
    }
  }
  
  scanDirectory(__dirname);
  return files;
}

// Main function
async function fixAllImportExportIssues() {
  log.header('Comprehensive Import/Export Fix');
  
  let totalFixes = 0;
  
  // Apply specific known fixes
  log.info('Applying specific fixes...');
  for (const fix of fixes) {
    if (applySpecificFix(fix)) {
      totalFixes++;
    }
  }
  
  // Scan all files for dynamic patterns
  log.info('Scanning all .mjs files for common patterns...');
  const allFiles = scanAllFiles();
  
  for (const { fullPath, relativePath } of allFiles) {
    const patternFixes = applyDynamicPatterns(fullPath);
    if (patternFixes > 0) {
      log.success(`Fixed ${patternFixes} pattern(s) in ${relativePath}`);
      totalFixes += patternFixes;
    }
  }
  
  // Check for missing dependencies
  log.info('Checking for missing dependencies...');
  const packageJsonPath = path.join(__dirname, 'package.json');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const requiredDeps = ['ioredis', 'mongoose', 'sequelize', 'express'];
    
    for (const dep of requiredDeps) {
      if (!packageJson.dependencies[dep]) {
        log.warn(`Missing dependency: ${dep}`);
      } else {
        log.success(`Dependency found: ${dep}`);
      }
    }
  } catch (error) {
    log.error(`Error checking dependencies: ${error.message}`);
  }
  
  // Summary
  log.header('Fix Summary');
  if (totalFixes > 0) {
    log.success(`Applied ${totalFixes} fix(es) total`);
    log.info('Backend should now start without import/export errors');
  } else {
    log.success('No import/export issues found to fix');
  }
  
  // Next steps
  log.header('Next Steps');
  log.info('Run one of these commands to test:');
  log.info('  npm run dev');
  log.info('  npm start');
  log.info('  node test-startup.mjs');
  
  return totalFixes;
}

// Export for use as module or run directly
if (import.meta.url === `file://${__filename}`) {
  fixAllImportExportIssues().catch(error => {
    log.error('Fix script failed:', error);
    process.exit(1);
  });
}

export default fixAllImportExportIssues;
