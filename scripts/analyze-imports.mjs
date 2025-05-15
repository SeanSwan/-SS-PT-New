#!/usr/bin/env node
/**
 * Comprehensive Import/Export Issue Scanner
 * Finds and fixes common import/export mismatches
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
 * Find all .mjs files
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
 * Analyze a file's exports
 */
function analyzeExports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const exports = {
      named: [],
      default: null,
      all: []
    };
    
    // Find named exports
    const namedExportPattern = /export\s+(?:const|let|var|function|class)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match;
    while ((match = namedExportPattern.exec(content)) !== null) {
      exports.named.push(match[1]);
      exports.all.push(match[1]);
    }
    
    // Find export { ... }
    const exportListPattern = /export\s*{\s*([^}]+)\s*}/g;
    while ((match = exportListPattern.exec(content)) !== null) {
      const exportList = match[1].split(',').map(e => e.trim().split(/\s+as\s+/)[0].trim());
      exports.named.push(...exportList);
      exports.all.push(...exportList);
    }
    
    // Find default export
    const defaultExportPattern = /export\s+default\s+([a-zA-Z_][a-zA-Z0-9_]*)/;
    const defaultMatch = content.match(defaultExportPattern);
    if (defaultMatch) {
      exports.default = defaultMatch[1];
      exports.all.push(`default(${defaultMatch[1]})`);
    }
    
    return exports;
  } catch (error) {
    return { named: [], default: null, all: [], error: error.message };
  }
}

/**
 * Find import issues in a file
 */
function findImportIssues(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];
    const fixes = [];
    
    // Find all imports
    const importPattern = /import\s*({[^}]+}|\*\s+as\s+\w+|\w+)\s*from\s*['"`]([^'"`]+)['"`]/g;
    let match;
    
    while ((match = importPattern.exec(content)) !== null) {
      const importStatement = match[0];
      const importPart = match[1];
      const modulePath = match[2];
      
      // Only check relative imports
      if (!modulePath.startsWith('./') && !modulePath.startsWith('../')) {
        continue;
      }
      
      // Resolve the module path
      const importDir = path.dirname(filePath);
      const resolvedPath = path.resolve(importDir, modulePath);
      
      if (!fs.existsSync(resolvedPath)) {
        continue;
      }
      
      // Analyze exports of the imported module
      const targetExports = analyzeExports(resolvedPath);
      
      // Check named imports
      if (importPart.startsWith('{')) {
        const namedImports = importPart.slice(1, -1).split(',').map(i => {
          const [name, alias] = i.split(/\s+as\s+/);
          return name.trim();
        });
        
        for (const namedImport of namedImports) {
          if (!targetExports.named.includes(namedImport) && namedImport !== targetExports.default) {
            // Check if it should be a default import
            if (namedImport === targetExports.default) {
              issues.push({
                file: path.relative(backendPath, filePath),
                issue: `Named import '${namedImport}' should be default import`,
                currentImport: importStatement,
                suggestedFix: importStatement.replace(`{ ${namedImport} }`, namedImport)
              });
              fixes.push({
                originalText: importStatement,
                fixedText: importStatement.replace(`{ ${namedImport} }`, namedImport)
              });
            } else if (targetExports.named.length > 0) {
              issues.push({
                file: path.relative(backendPath, filePath),
                issue: `Named import '${namedImport}' not found. Available: ${targetExports.named.join(', ')}`,
                currentImport: importStatement,
                availableExports: targetExports.all
              });
            }
          }
        }
      }
      
      // Check default imports
      else if (!importPart.includes('*') && !importPart.includes('{')) {
        if (!targetExports.default) {
          issues.push({
            file: path.relative(backendPath, filePath),
            issue: `Default import '${importPart}' but no default export. Available: ${targetExports.named.join(', ')}`,
            currentImport: importStatement,
            availableExports: targetExports.all
          });
        }
      }
    }
    
    return { issues, fixes };
  } catch (error) {
    return { issues: [{ error: error.message }], fixes: [] };
  }
}

/**
 * Apply fixes to a file
 */
function applyFixes(filePath, fixes) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let applied = 0;
    
    for (const fix of fixes) {
      if (content.includes(fix.originalText)) {
        content = content.replace(fix.originalText, fix.fixedText);
        applied++;
      }
    }
    
    if (applied > 0) {
      fs.writeFileSync(filePath, content, 'utf8');
    }
    
    return applied;
  } catch (error) {
    log.error(`Error applying fixes to ${filePath}: ${error.message}`);
    return 0;
  }
}

/**
 * Main function
 */
async function main() {
  log.header('Comprehensive Import/Export Analysis');
  
  log.info('Scanning for .mjs files...');
  const mjsFiles = findMjsFiles(backendPath);
  log.info(`Found ${mjsFiles.length} .mjs files`);
  
  let totalIssues = 0;
  let totalFixes = 0;
  const allIssues = [];
  
  log.info('Analyzing imports and exports...');
  
  for (const file of mjsFiles) {
    const { issues, fixes } = findImportIssues(file);
    
    if (issues.length > 0) {
      allIssues.push(...issues);
      totalIssues += issues.length;
      
      // Apply automatic fixes
      const appliedFixes = applyFixes(file, fixes);
      totalFixes += appliedFixes;
      
      if (appliedFixes > 0) {
        log.success(`Fixed ${appliedFixes} import issues in ${path.relative(backendPath, file)}`);
      }
    }
  }
  
  // Report issues
  log.header('Analysis Results');
  
  if (allIssues.length === 0) {
    log.success('No import/export issues found!');
  } else {
    log.warn(`Found ${totalIssues} import/export issues`);
    log.success(`Automatically fixed ${totalFixes} issues`);
    
    // Show remaining issues
    const remainingIssues = allIssues.filter(issue => !issue.error);
    if (remainingIssues.length > 0) {
      log.warn(`${remainingIssues.length} issues need manual review:`);
      for (const issue of remainingIssues.slice(0, 10)) { // Show first 10
        log.info(`${issue.file}: ${issue.issue}`);
        if (issue.availableExports) {
          log.info(`  Available exports: ${issue.availableExports.join(', ')}`);
        }
      }
    }
  }
  
  log.info('Analysis complete. Try starting the backend now.');
}

main().catch(error => {
  log.error('Script error:', error);
  process.exit(1);
});
