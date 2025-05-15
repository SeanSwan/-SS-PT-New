#!/usr/bin/env node
/**
 * Fix All Syntax Errors Script
 * Comprehensive fix for all identified syntax errors in the backend
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const backendPath = path.join(projectRoot, 'backend');

const log = {
  success: (msg) => console.log(chalk.green('✓'), msg),
  error: (msg) => console.log(chalk.red('✗'), msg),
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  warn: (msg) => console.log(chalk.yellow('⚠'), msg),
  header: (msg) => console.log(chalk.bgBlue.white.bold(`\n ${msg} `))
};

/**
 * Find and fix specific syntax issues
 */
async function fixAllSyntaxErrors() {
  log.header('Comprehensive Syntax Error Fix');
  
  const fixedFiles = [];
  const errors = [];
  
  // Define files and their specific fixes
  const fileFixes = [
    {
      file: 'services/ai/EthicalAIReview.mjs',
      fixes: [
        {
          search: /girls can't/g,
          replace: 'girls cannot',
          description: 'Fixed "girls can\'t" contraction'
        },
        {
          search: /boys don't/g,
          replace: 'boys do not',
          description: 'Fixed "boys don\'t" contraction'
        },
        {
          search: /girls can\\\\\\\\'t/g,
          replace: 'girls cannot',
          description: 'Fixed escaped "girls can\'t"'
        },
        {
          search: /boys don\\\\\\\\'t/g,
          replace: 'boys do not',
          description: 'Fixed escaped "boys don\'t"'
        }
      ]
    },
    {
      file: 'services/accessibility/AccessibilityTesting.mjs',
      fixes: [
        {
          search: /throw new Error\(\\\\`Unknown AI feature: \\\\\\$\\{featureName\\}\\\\`\);/g,
          replace: 'throw new Error(`Unknown AI feature: ${featureName}`);',
          description: 'Fixed template literal escaping'
        },
        {
          search: /\\\\\\$/g,
          replace: '$',
          description: 'Fixed escaped dollar signs in template literals'
        },
        {
          search: /\\\\`/g,
          replace: '`',
          description: 'Fixed escaped backticks in template literals'
        }
      ]
    }
  ];
  
  // Process each file
  for (const fileConfig of fileFixes) {
    const fullPath = path.join(backendPath, fileConfig.file);
    
    if (!fs.existsSync(fullPath)) {
      log.warn(`File not found: ${fileConfig.file}`);
      continue;
    }
    
    try {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      
      log.info(`Processing ${fileConfig.file}...`);
      
      // Apply each fix
      for (const fix of fileConfig.fixes) {
        const beforeLength = content.length;
        content = content.replace(fix.search, fix.replace);
        
        if (content.length !== beforeLength || fix.search.test(content)) {
          modified = true;
          log.success(`  ${fix.description}`);
        }
      }
      
      // Write the fixed content back
      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        fixedFiles.push(fileConfig.file);
        log.success(`Fixed ${fileConfig.file}`);
      } else {
        log.info(`No changes needed for ${fileConfig.file}`);
      }
      
    } catch (error) {
      errors.push({ file: fileConfig.file, error: error.message });
      log.error(`Error processing ${fileConfig.file}: ${error.message}`);
    }
  }
  
  // Additional check for other malformed files
  log.info('Scanning for other malformed files...');
  
  const scanResults = await scanForMalformedFiles();
  for (const result of scanResults) {
    if (result.fixed) {
      fixedFiles.push(result.file);
    } else if (result.error) {
      errors.push({ file: result.file, error: result.error });
    }
  }
  
  // Summary
  log.header('Fix Summary');
  console.log(`Files processed: ${fileFixes.length + scanResults.length}`);
  console.log(`Successfully fixed: ${chalk.green(fixedFiles.length)}`);
  console.log(`Errors: ${chalk.red(errors.length)}`);
  
  if (fixedFiles.length > 0) {
    log.success('Fixed files:');
    fixedFiles.forEach(file => console.log(`  - ${file}`));
  }
  
  if (errors.length > 0) {
    log.error('Files with errors:');
    errors.forEach(({ file, error }) => console.log(`  - ${file}: ${error}`));
  }
  
  if (errors.length === 0) {
    log.success('All syntax errors have been fixed!');
    log.info('You can now restart the backend server.');
  } else {
    log.warn('Some files still have issues. Manual review may be required.');
  }
  
  return { fixedFiles, errors };
}

/**
 * Scan for additional malformed files
 */
async function scanForMalformedFiles() {
  const results = [];
  const searchDir = backendPath;
  
  // Common problematic patterns
  const patterns = [
    {
      pattern: /\\\\n/g,
      replacement: '\n',
      description: 'Fixed escaped newlines'
    },
    {
      pattern: /\\\\`/g,
      replacement: '`',
      description: 'Fixed escaped backticks'
    },
    {
      pattern: /\\\\\\$/g,
      replacement: '$',
      description: 'Fixed escaped dollar signs'
    }
  ];
  
  // Scan specific directories
  const dirsToScan = [
    'services',
    'routes',
    'controllers',
    'middleware',
    'utils'
  ];
  
  for (const dir of dirsToScan) {
    const dirPath = path.join(searchDir, dir);
    if (fs.existsSync(dirPath)) {
      const files = await scanDirectory(dirPath);
      for (const file of files) {
        if (file.endsWith('.mjs') || file.endsWith('.js')) {
          const result = await fixFilePatterns(file, patterns);
          if (result) {
            results.push(result);
          }
        }
      }
    }
  }
  
  return results;
}

/**
 * Recursively scan directory for files
 */
async function scanDirectory(dir) {
  const files = [];
  
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !['node_modules', '.git'].includes(item)) {
      const subFiles = await scanDirectory(fullPath);
      files.push(...subFiles);
    } else if (stat.isFile()) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Fix patterns in a specific file
 */
async function fixFilePatterns(filePath, patterns) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    const appliedFixes = [];
    
    for (const pattern of patterns) {
      if (pattern.pattern.test(content)) {
        content = content.replace(pattern.pattern, pattern.replacement);
        modified = true;
        appliedFixes.push(pattern.description);
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      const relativePath = path.relative(backendPath, filePath);
      log.success(`Fixed patterns in ${relativePath}:`);
      appliedFixes.forEach(fix => log.info(`  - ${fix}`));
      return { file: relativePath, fixed: true, fixes: appliedFixes };
    }
    
    return null;
  } catch (error) {
    const relativePath = path.relative(backendPath, filePath);
    log.error(`Error fixing ${relativePath}: ${error.message}`);
    return { file: relativePath, fixed: false, error: error.message };
  }
}

/**
 * Validate files after fixing
 */
async function validateFiles(fixedFiles) {
  log.header('Validating Fixed Files');
  
  const validationResults = [];
  
  for (const file of fixedFiles) {
    const fullPath = path.join(backendPath, file);
    try {
      // Try to read and parse the file
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Basic syntax checks
      let hasIssues = false;
      const issues = [];
      
      // Check for unescaped template literals
      if (content.includes('\\`') && !content.includes('\\\\`')) {
        hasIssues = true;
        issues.push('May have unescaped backticks');
      }
      
      // Check for malformed contractions
      if (content.includes("can\\'t") || content.includes("don\\'t")) {
        hasIssues = true;
        issues.push('May have improperly escaped contractions');
      }
      
      if (hasIssues) {
        validationResults.push({ file, status: 'warning', issues });
        log.warn(`${file}: ${issues.join(', ')}`);
      } else {
        validationResults.push({ file, status: 'valid' });
        log.success(`${file}: Validation passed`);
      }
      
    } catch (error) {
      validationResults.push({ file, status: 'error', error: error.message });
      log.error(`${file}: Validation failed - ${error.message}`);
    }
  }
  
  return validationResults;
}

// Main execution
async function main() {
  try {
    const { fixedFiles, errors } = await fixAllSyntaxErrors();
    
    if (fixedFiles.length > 0) {
      await validateFiles(fixedFiles);
    }
    
    // Final recommendation
    log.header('Next Steps');
    if (errors.length === 0) {
      log.success('All syntax errors have been fixed!');
      log.info('Run the following commands:');
      console.log(chalk.cyan('  npm run clear-cache-restart'));
      console.log(chalk.cyan('  npm run test-auth'));
    } else {
      log.warn('Some issues remain. Please review the errors above.');
      log.info('You may need to manually fix the remaining files.');
    }
    
  } catch (error) {
    log.error(`Script execution failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  log.error(`Unexpected error: ${error.message}`);
  process.exit(1);
});
