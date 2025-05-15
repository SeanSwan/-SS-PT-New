#!/usr/bin/env node
/**
 * Quick Import/Export Fix for authMiddleware
 * Fixes the specific issue where files import 'authMiddleware' instead of 'protect'
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

/**
 * Find all .mjs files that might import authMiddleware
 */
function findMjsFiles(dir) {
  let files = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        files = files.concat(findMjsFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.mjs')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    log.warn(`Could not read directory: ${dir}`);
  }
  
  return files;
}

/**
 * Fix authMiddleware imports in a file
 */
function fixAuthMiddlewareImport(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(backendPath, filePath);
    
    // Check if file imports authMiddleware incorrectly
    const badImportPattern = /import\s*{\s*authMiddleware\s*}\s*from\s*['"`]\.\.\/middleware\/authMiddleware\.mjs['"`]/g;
    const fixedImport = "import { protect as authMiddleware } from '../middleware/authMiddleware.mjs'";
    
    if (badImportPattern.test(content)) {
      log.info(`Fixing: ${relativePath}`);
      const fixedContent = content.replace(badImportPattern, fixedImport);
      fs.writeFileSync(filePath, fixedContent, 'utf8');
      log.success(`Fixed authMiddleware import in ${relativePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    log.error(`Error processing ${filePath}: ${error.message}`);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  log.header('Quick authMiddleware Import Fix');
  
  log.info('Scanning for .mjs files...');
  const mjsFiles = findMjsFiles(backendPath);
  log.info(`Found ${mjsFiles.length} .mjs files`);
  
  let fixedCount = 0;
  
  for (const file of mjsFiles) {
    if (fixAuthMiddlewareImport(file)) {
      fixedCount++;
    }
  }
  
  log.header('Summary');
  if (fixedCount > 0) {
    log.success(`Fixed ${fixedCount} files with authMiddleware import issues`);
  } else {
    log.success('No authMiddleware import issues found');
  }
  
  log.info('Backend should now start without import errors');
}

main().catch(error => {
  log.error('Script error:', error);
  process.exit(1);
});
