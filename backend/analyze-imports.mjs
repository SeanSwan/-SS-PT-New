#!/usr/bin/env node

/**
 * Comprehensive Import/Export Analysis
 * Finds and fixes import/export mismatches systematically
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

// Known import/export patterns to check and fix
const importPatterns = [
  {
    // Pattern 1: authMiddleware import issue
    pattern: /import\s*{\s*authMiddleware\s*}\s*from\s*['\"](.+?authMiddleware\.mjs)['\"]/g,
    fix: "import { protect as authMiddleware } from '$1'",
    description: "Fix authMiddleware import (should import protect as authMiddleware)"
  },
  {
    // Pattern 2: GamificationPersistence named import issue  
    pattern: /import\s*{\s*GamificationPersistence\s*}\s*from\s*['\"](.+?GamificationPersistence\.mjs)['\"]/g,
    fix: "import GamificationPersistence from '$1'",
    description: "Fix GamificationPersistence import (should be default import)"
  }
];

// Analyze exports in a file
function analyzeExports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const exports = {
      named: [],
      default: null,
      hasDefault: false
    };
    
    // Find named exports
    const namedExportRegex = /export\s+(?:const|let|var|function|class)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    let match;
    while ((match = namedExportRegex.exec(content)) !== null) {
      exports.named.push(match[1]);
    }
    
    // Find export { ... } statements
    const exportListRegex = /export\s*{\s*([^}]+)\s*}/g;
    while ((match = exportListRegex.exec(content)) !== null) {
      const exportList = match[1].split(',')
        .map(exp => exp.split(' as ')[0].trim())
        .filter(exp => exp);
      exports.named.push(...exportList);
    }
    
    // Find default export
    const defaultExportRegex = /export\s+default\s+([a-zA-Z_$][a-zA-Z0-9_$]*|class\s+[a-zA-Z_$][a-zA-Z0-9_$]*|function\s+[a-zA-Z_$][a-zA-Z0-9_$]*)/;
    const defaultMatch = content.match(defaultExportRegex);
    if (defaultMatch) {
      exports.hasDefault = true;
      exports.default = defaultMatch[1];
    }
    
    return exports;
  } catch (error) {
    log.error(`Failed to analyze exports in ${filePath}: ${error.message}`);
    return { named: [], default: null, hasDefault: false };
  }
}

// Find all .mjs files
function findMjsFiles(dir, excludeDirs = ['node_modules', '.git']) {
  let files = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !excludeDirs.includes(entry.name)) {
        files = files.concat(findMjsFiles(fullPath, excludeDirs));
      } else if (entry.isFile() && entry.name.endsWith('.mjs')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    log.warn(`Could not read directory: ${dir}`);
  }
  
  return files;
}

// Analyze import statements in a file
function analyzeImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const imports = [];
    
    // Match different import patterns
    const importRegex = /import\s+(?:(\*\s+as\s+\w+)|(\w+)|{\s*([^}]+)\s*})\s+from\s+['\"]([^'\"]+)['\"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const type = match[1] ? 'namespace' : match[2] ? 'default' : 'named';
      const name = match[1] || match[2] || match[3];
      const source = match[4];
      
      imports.push({
        type,
        name: type === 'named' ? name.split(',').map(n => n.trim()) : name,
        source,
        fullMatch: match[0]
      });
    }
    
    return imports;
  } catch (error) {
    log.error(`Failed to analyze imports in ${filePath}: ${error.message}`);
    return [];
  }
}

// Check for import/export mismatches
function checkImportExportMatch(importFile, importData, exportFile) {
  const exports = analyzeExports(exportFile);
  const issues = [];
  
  for (const imp of importData) {
    if (imp.source.includes(path.basename(exportFile, '.mjs'))) {
      if (imp.type === 'named') {
        for (const name of imp.name) {
          if (!exports.named.includes(name) && name !== exports.default) {
            issues.push({
              type: 'named_not_found',
              importName: name,
              importFile,
              exportFile,
              availableNamed: exports.named,
              hasDefault: exports.hasDefault,
              suggestion: exports.hasDefault ? `Use default import: import ${name} from '...'` : 
                         exports.named.length > 0 ? `Available named exports: ${exports.named.join(', ')}` : 'No exports found'
            });
          }
        }
      } else if (imp.type === 'default' && !exports.hasDefault) {
        issues.push({
          type: 'default_not_found',
          importName: imp.name,
          importFile,
          exportFile,
          availableNamed: exports.named,
          suggestion: exports.named.length > 0 ? `Use named import: import { ${exports.named[0]} } from '...'` : 'No exports found'
        });
      }
    }
  }
  
  return issues;
}

// Fix import/export issues
function fixImportIssues(filePath, issues) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changes = 0;
    
    // Apply pattern-based fixes
    for (const pattern of importPatterns) {
      const originalContent = content;
      content = content.replace(pattern.pattern, pattern.fix);
      if (content !== originalContent) {
        changes++;
        log.success(`Applied fix: ${pattern.description}`);
      }
    }
    
    // Write back if changes were made
    if (changes > 0) {
      fs.writeFileSync(filePath, content, 'utf8');
      return changes;
    }
    
    return 0;
  } catch (error) {
    log.error(`Failed to fix imports in ${filePath}: ${error.message}`);
    return 0;
  }
}

// Main analysis function
async function analyzeImportExports() {
  log.header('Comprehensive Import/Export Analysis');
  
  const backendDir = __dirname;
  log.info(`Analyzing files in: ${backendDir}`);
  
  // Find all .mjs files
  const mjsFiles = findMjsFiles(backendDir);
  log.info(`Found ${mjsFiles.length} .mjs files`);
  
  const allIssues = [];
  let totalFixes = 0;
  
  // Analyze each file
  for (const file of mjsFiles) {
    const relativePath = path.relative(backendDir, file);
    const imports = analyzeImports(file);
    
    if (imports.length > 0) {
      log.info(`\nAnalyzing ${relativePath}:`);
      
      // Check each import against its target file
      for (const imp of imports) {
        if (imp.source.startsWith('./') || imp.source.startsWith('../')) {
          const targetFile = path.resolve(path.dirname(file), imp.source + (imp.source.endsWith('.mjs') ? '' : '.mjs'));
          
          if (fs.existsSync(targetFile)) {
            const issues = checkImportExportMatch(file, [imp], targetFile);
            if (issues.length > 0) {
              allIssues.push(...issues);
              log.warn(`  Found ${issues.length} issue(s) with import: ${imp.fullMatch}`);
              
              for (const issue of issues) {
                log.warn(`    ${issue.type}: ${issue.suggestion}`);
              }
            }
          }
        }
      }
      
      // Apply fixes
      const fixes = fixImportIssues(file, allIssues.filter(issue => issue.importFile === file));
      if (fixes > 0) {
        log.success(`  Applied ${fixes} fix(es) to ${relativePath}`);
        totalFixes += fixes;
      }
    }
  }
  
  // Summary
  log.header('Analysis Summary');
  if (allIssues.length === 0) {
    log.success('No import/export issues found!');
  } else {
    log.warn(`Found ${allIssues.length} import/export issues`);
    log.success(`Applied ${totalFixes} fixes`);
    
    if (allIssues.length > totalFixes) {
      log.warn(`${allIssues.length - totalFixes} issues need manual attention`);
      
      // Show remaining issues
      const remainingIssues = allIssues.slice(0, 5); // Show first 5
      for (const issue of remainingIssues) {
        log.warn(`\n${path.relative(backendDir, issue.importFile)}:`);
        log.warn(`  ${issue.suggestion}`);
      }
    }
  }
  
  log.info('\nReady to test backend startup!');
}

// Run the analysis
analyzeImportExports().catch(error => {
  log.error('Analysis failed:', error);
  process.exit(1);
});
