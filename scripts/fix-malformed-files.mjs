#!/usr/bin/env node
/**
 * Fix Malformed JS Files Script
 * Searches for and fixes files with escaped newline characters
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', 'backend');

const log = {
  success: (msg) => console.log(chalk.green('✓'), msg),
  error: (msg) => console.log(chalk.red('✗'), msg),
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  warn: (msg) => console.log(chalk.yellow('⚠'), msg),
  header: (msg) => console.log(chalk.bgBlue.white.bold(`\n ${msg} `))
};

function findMalformedFiles(dir, malformedFiles = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and other irrelevant directories
      if (!['node_modules', '.git', 'uploads', 'public'].includes(item)) {
        findMalformedFiles(fullPath, malformedFiles);
      }
    } else if (item.endsWith('.mjs') || item.endsWith('.js')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Check for escaped newlines in content (not in strings)
        if (content.includes('\\n * ') || content.includes('/**\\n')) {
          malformedFiles.push({
            path: fullPath,
            relativePath: path.relative(projectRoot, fullPath)
          });
        }
      } catch (error) {
        log.error(`Error reading ${fullPath}: ${error.message}`);
      }
    }
  }
  
  return malformedFiles;
}

function fixMalformedFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace escaped newlines with actual newlines
    content = content.replace(/\\n/g, '\n');
    
    // Write the fixed content back
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (error) {
    log.error(`Error fixing ${filePath}: ${error.message}`);
    return false;
  }
}

async function fixAllMalformedFiles() {
  log.header('Searching for Malformed JavaScript Files');
  
  const malformedFiles = findMalformedFiles(projectRoot);
  
  if (malformedFiles.length === 0) {
    log.success('No malformed files found!');
    return;
  }
  
  log.warn(`Found ${malformedFiles.length} malformed files:`);
  malformedFiles.forEach(file => {
    console.log(`  - ${file.relativePath}`);
  });
  
  log.header('Fixing Malformed Files');
  
  let fixedCount = 0;
  let errorCount = 0;
  
  for (const file of malformedFiles) {
    log.info(`Fixing ${file.relativePath}...`);
    
    if (fixMalformedFile(file.path)) {
      log.success(`Fixed ${file.relativePath}`);
      fixedCount++;
    } else {
      log.error(`Failed to fix ${file.relativePath}`);
      errorCount++;
    }
  }
  
  log.header('Fix Summary');
  console.log(`Total files found: ${malformedFiles.length}`);
  console.log(`Successfully fixed: ${chalk.green(fixedCount)}`);
  console.log(`Errors: ${chalk.red(errorCount)}`);
  
  if (errorCount === 0) {
    log.success('All malformed files have been fixed!');
    log.info('You can now restart the backend server.');
  } else {
    log.warn('Some files could not be fixed. Check the errors above.');
  }
}

// Run the fix
fixAllMalformedFiles().catch(error => {
  log.error(`Fix script error: ${error.message}`);
  process.exit(1);
});
