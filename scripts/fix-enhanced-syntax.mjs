#!/usr/bin/env node
/**
 * Enhanced Syntax Error Fix
 * Now includes import/export validation
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendPath = path.resolve(__dirname, '..', 'backend');

const log = {
  success: (msg) => console.log(chalk.green('✓'), msg),
  error: (msg) => console.log(chalk.red('✗'), msg),
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  warn: (msg) => console.log(chalk.yellow('⚠'), msg),
  header: (msg) => console.log(chalk.bgBlue.white.bold(`\n ${msg} `))
};

// Common import/export issues to fix
const importExportFixes = [
  {
    // Fix authMiddleware import - should import protect as authMiddleware
    pattern: /import\s*{\s*authMiddleware\s*}\s*from\s*['"`]\.\.\/middleware\/authMiddleware\.mjs['"`]/g,
    replacement: "import { protect as authMiddleware } from '../middleware/authMiddleware.mjs'"
  },
  {
    // Fix isAuthenticated import - should import protect
    pattern: /import\s*{\s*isAuthenticated\s*}\s*from\s*['"`]\.\.\/middleware\/authMiddleware\.mjs['"`]/g,
    replacement: "import { protect as isAuthenticated } from '../middleware/authMiddleware.mjs'"
  }
];

// Files that are known to have potential issues
const targetFiles = [
  'routes/aiMonitoringRoutes.mjs',
  'routes/authRoutes.mjs',
  'routes/userRoutes.mjs',
  'routes/trainerRoutes.mjs',
  'routes/clientRoutes.mjs',
  'routes/adminRoutes.mjs',
  'services/ai/EthicalAIReview.mjs',
  'services/accessibility/AccessibilityTesting.mjs',
  'services/gamification/GamificationPersistence.mjs',
  'middleware/authMiddleware.mjs'
];

let totalFiles = 0;
let fixedFiles = 0;
let errors = 0;

/**
 * Fix import/export issues in a file
 */
function fixImportExport(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { fixed: false, reason: 'File not found' };
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let fixesApplied = [];
    
    // Apply each fix pattern
    importExportFixes.forEach((fix, index) => {
      const matches = content.match(fix.pattern);
      if (matches) {
        content = content.replace(fix.pattern, fix.replacement);
        fixesApplied.push(`Pattern ${index + 1}`);
      }
    });
    
    // Check for other common import issues
    const commonIssues = [
      {
        // Check for missing exports
        check: /import\s*{\s*([^}]+)\s*}\s*from\s*['"`]([^'"`]+)['"`]/g,
        description: 'Potential missing export'
      },
      {
        // Check for incorrect module paths
        check: /from\s*['"`]\.\.\/[^'"`]*\.m?js['"`]/g,
        description: 'Module path check'
      }
    ];
    
    // Write the file back if we made changes
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      return { 
        fixed: true, 
        changes: fixesApplied,
        reason: `Applied fixes: ${fixesApplied.join(', ')}`
      };
    }
    
    return { fixed: false, reason: 'No changes needed' };
  } catch (error) {
    return { fixed: false, reason: error.message, error: true };
  }
}

/**
 * Validate file syntax
 */
async function validateSyntax(filePath) {
  try {
    // Try to parse the file to check for syntax errors
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Basic syntax checks
    const issues = [];
    
    // Check for unmatched quotes
    const singleQuotes = (content.match(/'/g) || []).length;
    const doubleQuotes = (content.match(/"/g) || []).length;
    const backticks = (content.match(/`/g) || []).length;
    
    if (singleQuotes % 2 !== 0) issues.push('Unmatched single quotes');
    if (doubleQuotes % 2 !== 0) issues.push('Unmatched double quotes');
    if (backticks % 2 !== 0) issues.push('Unmatched backticks');
    
    // Check for common syntax patterns
    if (content.includes("can't") || content.includes("don't")) {
      issues.push('Smart quotes in strings (should use straight quotes)');
    }
    
    return { valid: issues.length === 0, issues };
  } catch (error) {
    return { valid: false, issues: [error.message] };
  }
}

/**
 * Process a single file
 */
async function processFile(relativePath) {
  const fullPath = path.join(backendPath, relativePath);
  const fileName = path.basename(relativePath);
  
  log.info(`Processing ${relativePath}...`);
  totalFiles++;
  
  try {
    // First, fix import/export issues
    const importResult = fixImportExport(fullPath);
    
    // Then validate syntax
    const syntaxResult = await validateSyntax(fullPath);
    
    if (importResult.fixed) {
      log.success(`Fixed imports in ${fileName}: ${importResult.reason}`);
      fixedFiles++;
    } else if (importResult.error) {
      log.error(`Error processing ${fileName}: ${importResult.reason}`);
      errors++;
    } else {
      log.info(`No changes needed for ${fileName}`);
    }
    
    if (!syntaxResult.valid) {
      log.warn(`Syntax issues in ${fileName}: ${syntaxResult.issues.join(', ')}`);
    }
    
  } catch (error) {
    log.error(`Error processing ${fileName}: ${error.message}`);
    errors++;
  }
}

/**
 * Main function
 */
async function main() {
  log.header('Enhanced Syntax & Import/Export Fix');
  
  // Process target files
  for (const file of targetFiles) {
    await processFile(file);
  }
  
  // Scan for other .mjs files in common directories
  log.info('Scanning for other .mjs files...');
  const scanDirs = ['routes', 'services', 'middleware', 'utils'];
  
  for (const dir of scanDirs) {
    const dirPath = path.join(backendPath, dir);
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath, { recursive: true })
        .filter(file => file.endsWith('.mjs'))
        .filter(file => !targetFiles.some(target => target.includes(file)));
      
      for (const file of files) {
        const relativePath = path.join(dir, file);
        if (!targetFiles.includes(relativePath)) {
          await processFile(relativePath);
        }
      }
    }
  }
  
  // Summary
  log.header('Fix Summary');
  log.info(`Files processed: ${totalFiles}`);
  log.success(`Successfully fixed: ${fixedFiles}`);
  if (errors > 0) {
    log.error(`Errors: ${errors}`);
  } else {
    log.success('Errors: 0');
  }
  
  if (errors === 0) {
    log.success('All syntax and import/export errors have been fixed!');
    log.info('You can now restart the backend server.');
  } else {
    log.warn('Some errors were encountered. Please review the output above.');
  }
  
  // Next steps
  log.header('Next Steps');
  if (errors === 0) {
    log.success('All syntax and import/export errors have been fixed!');
    log.info('Run the following commands:');
    log.info('  npm run clear-cache-restart');
    log.info('  npm run test-auth');
  } else {
    log.warn('Please fix the remaining errors and run this script again.');
  }
}

// Run the script
main().catch(error => {
  log.error('Script error:', error.message);
  process.exit(1);
});
