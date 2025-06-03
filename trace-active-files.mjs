#!/usr/bin/env node
/**
 * SwanStudios Active File Usage Tracer
 * ====================================
 * Master Prompt v28 aligned - The Swan Alchemist
 * 
 * Advanced analysis that traces actual file usage through import chains
 * to determine what files are truly needed vs accumulated debris
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Console styling
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  title: (msg) => console.log(`${colors.bold}${colors.cyan}🌟 ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.magenta}🔧 ${msg}${colors.reset}`)
};

/**
 * Active File Usage Tracer
 */
class ActiveFileTracer {
  constructor() {
    this.projectRoot = __dirname;
    this.activeFiles = new Set();
    this.importMap = new Map();
    this.packageJsonFiles = new Map();
    this.ignoredDirs = new Set(['node_modules', '.git', 'dist', 'build']);
  }

  /**
   * Read file contents safely
   */
  async readFileSafely(filePath) {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract import statements from a file
   */
  extractImports(content, filePath) {
    const imports = new Set();
    
    // Common import patterns
    const patterns = [
      // ES6 imports
      /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
      // Dynamic imports
      /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      // Require statements
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      // TypeScript-style imports
      /import\s+.*?\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const importPath = match[1];
        
        // Skip node_modules imports (external dependencies)
        if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
          continue;
        }
        
        // Resolve relative imports
        const resolvedPath = this.resolveImportPath(importPath, filePath);
        if (resolvedPath) {
          imports.add(resolvedPath);
        }
      }
    });

    return imports;
  }

  /**
   * Resolve import path to actual file path
   */
  resolveImportPath(importPath, fromFile) {
    const fromDir = path.dirname(fromFile);
    let resolvedPath;

    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      resolvedPath = path.resolve(fromDir, importPath);
    } else if (importPath.startsWith('/')) {
      resolvedPath = path.join(this.projectRoot, importPath);
    } else {
      return null; // External module
    }

    // Try different extensions
    const extensions = ['', '.js', '.mjs', '.ts', '.tsx', '.jsx'];
    
    for (const ext of extensions) {
      const testPath = resolvedPath + ext;
      if (existsSync(testPath)) {
        return testPath;
      }
    }

    // Try index files
    for (const ext of extensions) {
      const indexPath = path.join(resolvedPath, 'index' + ext);
      if (existsSync(indexPath)) {
        return indexPath;
      }
    }

    return null;
  }

  /**
   * Trace imports recursively from a starting file
   */
  async traceImportsRecursively(filePath, visited = new Set()) {
    if (visited.has(filePath) || !existsSync(filePath)) {
      return;
    }

    visited.add(filePath);
    this.activeFiles.add(filePath);

    const content = await this.readFileSafely(filePath);
    if (!content) {
      return;
    }

    const imports = this.extractImports(content, filePath);
    this.importMap.set(filePath, imports);

    // Recursively trace each import
    for (const importPath of imports) {
      await this.traceImportsRecursively(importPath, visited);
    }
  }

  /**
   * Analyze package.json files for referenced scripts and files
   */
  async analyzePackageJsonFiles() {
    log.step('Analyzing package.json files...');

    const packageFiles = [
      path.join(this.projectRoot, 'package.json'),
      path.join(this.projectRoot, 'backend', 'package.json'),
      path.join(this.projectRoot, 'frontend', 'package.json')
    ];

    for (const packageFile of packageFiles) {
      if (existsSync(packageFile)) {
        const content = await this.readFileSafely(packageFile);
        if (content) {
          try {
            const packageData = JSON.parse(content);
            this.packageJsonFiles.set(packageFile, packageData);
            
            // Mark package.json as active
            this.activeFiles.add(packageFile);
            
            // Extract file references from scripts
            if (packageData.scripts) {
              Object.values(packageData.scripts).forEach(script => {
                // Extract file references from script commands
                const fileReferences = script.match(/\b[\w\-\.\/]+\.(mjs|js|ts|tsx|jsx|json)\b/g);
                if (fileReferences) {
                  fileReferences.forEach(ref => {
                    const resolvedPath = path.resolve(path.dirname(packageFile), ref);
                    if (existsSync(resolvedPath)) {
                      this.activeFiles.add(resolvedPath);
                    }
                  });
                }
              });
            }
            
            // Check main entry points
            const entryPoints = [packageData.main, packageData.module, packageData.browser];
            entryPoints.forEach(entry => {
              if (entry) {
                const entryPath = path.resolve(path.dirname(packageFile), entry);
                if (existsSync(entryPath)) {
                  this.activeFiles.add(entryPath);
                }
              }
            });
            
          } catch (error) {
            log.warning(`Error parsing ${packageFile}: ${error.message}`);
          }
        }
      }
    }
    
    log.success(`Analyzed ${this.packageJsonFiles.size} package.json files`);
  }

  /**
   * Get all files in project (excluding ignored directories)
   */
  async getAllProjectFiles(dir = this.projectRoot, files = []) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (!this.ignoredDirs.has(entry.name) && !entry.name.startsWith('.')) {
            await this.getAllProjectFiles(fullPath, files);
          }
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
    
    return files;
  }

  /**
   * Get configuration files that should be preserved
   */
  getConfigurationFiles() {
    const configFiles = [
      '.env',
      '.env.example',
      '.env.local',
      '.env.production',
      '.gitignore',
      'README.md',
      'vite.config.js',
      'tailwind.config.js',
      'tsconfig.json',
      'tsconfig.node.json',
      'postcss.config.js',
      '.eslintrc.cjs',
      'components.json',
      '_redirects',
      'vercel.json',
      '.htaccess',
      'nginx-spa-config.conf'
    ];

    const foundConfigs = [];
    
    configFiles.forEach(configFile => {
      const fullPath = path.join(this.projectRoot, configFile);
      if (existsSync(fullPath)) {
        foundConfigs.push(fullPath);
        this.activeFiles.add(fullPath);
      }
      
      // Check in frontend directory too
      const frontendPath = path.join(this.projectRoot, 'frontend', configFile);
      if (existsSync(frontendPath)) {
        foundConfigs.push(frontendPath);
        this.activeFiles.add(frontendPath);
      }
    });

    return foundConfigs;
  }

  /**
   * Identify entry points and trace from them
   */
  async traceFromEntryPoints() {
    log.step('Tracing from application entry points...');

    const entryPoints = [
      // Backend entry points
      path.join(this.projectRoot, 'backend', 'server.mjs'),
      
      // Frontend entry points  
      path.join(this.projectRoot, 'frontend', 'src', 'main.jsx'),
      path.join(this.projectRoot, 'frontend', 'src', 'App.tsx'),
      path.join(this.projectRoot, 'frontend', 'index.html'),
      
      // Root scripts
      path.join(this.projectRoot, 'file-tree.js'),
      
      // Recently created important files
      path.join(this.projectRoot, 'verify-spa-routing-fix.mjs'),
      path.join(this.projectRoot, 'DEPLOY-SPA-ROUTING-FIX.bat')
    ];

    let tracedEntryPoints = 0;
    
    for (const entryPoint of entryPoints) {
      if (existsSync(entryPoint)) {
        log.info(`Tracing from: ${path.relative(this.projectRoot, entryPoint)}`);
        await this.traceImportsRecursively(entryPoint);
        tracedEntryPoints++;
      }
    }
    
    log.success(`Traced from ${tracedEntryPoints} entry points`);
  }

  /**
   * Generate cleanup recommendations
   */
  async generateCleanupRecommendations() {
    log.step('Generating cleanup recommendations...');

    const allFiles = await this.getAllProjectFiles();
    const unusedFiles = allFiles.filter(file => !this.activeFiles.has(file));
    
    // Categorize unused files
    const categories = {
      tempFixes: [],
      documentation: [],
      testFiles: [],
      batchFiles: [],
      sqlFiles: [],
      obsolete: []
    };

    unusedFiles.forEach(file => {
      const fileName = path.basename(file).toLowerCase();
      const relativePath = path.relative(this.projectRoot, file);
      
      // Skip files in certain directories
      if (relativePath.includes('node_modules') || 
          relativePath.includes('.git') ||
          relativePath.includes('dist') ||
          relativePath.includes('build')) {
        return;
      }

      if (fileName.includes('fix-') || 
          fileName.includes('emergency-') || 
          fileName.includes('repair-')) {
        categories.tempFixes.push(file);
      } else if (fileName.endsWith('.md') && !fileName.includes('readme')) {
        categories.documentation.push(file);
      } else if (fileName.includes('test-') || 
                 fileName.includes('verify-') || 
                 fileName.includes('check-') ||
                 fileName.includes('debug-')) {
        categories.testFiles.push(file);
      } else if (fileName.endsWith('.bat') || fileName.endsWith('.sh')) {
        categories.batchFiles.push(file);
      } else if (fileName.endsWith('.sql')) {
        categories.sqlFiles.push(file);
      } else {
        categories.obsolete.push(file);
      }
    });

    return { categories, totalUnused: unusedFiles.length, totalActive: this.activeFiles.size };
  }

  /**
   * Create safe cleanup script
   */
  async createSafeCleanupScript(categories) {
    const safesToRemove = [
      ...categories.tempFixes.filter(f => this.isSafeToRemove(f)),
      ...categories.testFiles.filter(f => this.isSafeToRemove(f)),
      ...categories.documentation.filter(f => this.isSafeToRemove(f)),
      ...categories.batchFiles.filter(f => this.isSafeToRemove(f)),
      ...categories.sqlFiles.filter(f => this.isSafeToRemove(f))
    ];

    const script = `#!/usr/bin/env node
/**
 * SwanStudios Safe Project Cleanup
 * ================================
 * Removes unused files identified by Active File Tracer
 * Generated: ${new Date().toISOString()}
 */

import fs from 'fs/promises';
import path from 'path';

const filesToRemove = [
${safesToRemove.map(file => `  '${file}'`).join(',\n')}
];

console.log('🧹 SwanStudios Safe Project Cleanup');
console.log('===================================');
console.log(\`Removing \${filesToRemove.length} unused files...\`);

let removed = 0;
let errors = 0;

for (const filePath of filesToRemove) {
  try {
    await fs.unlink(filePath);
    const fileName = path.basename(filePath);
    console.log(\`✅ Removed: \${fileName}\`);
    removed++;
  } catch (error) {
    const fileName = path.basename(filePath);
    console.log(\`❌ Error removing \${fileName}: \${error.message}\`);
    errors++;
  }
}

console.log(\`\`);
console.log(\`📊 CLEANUP COMPLETE:\`);
console.log(\`✅ Successfully removed: \${removed} files\`);
console.log(\`❌ Errors: \${errors} files\`);

if (removed > 0) {
  console.log(\`\`);
  console.log(\`🎉 Project cleanup successful!\`);
  console.log(\`Your SwanStudios project is now cleaner and more focused.\`);
  console.log(\`\`);
  console.log(\`📋 Next steps:\`);
  console.log(\`1. Review changes: git status\`);
  console.log(\`2. Test application: npm run start\`);
  console.log(\`3. Commit cleanup: git add . && git commit -m "🧹 Remove unused project files"\`);
}
`;

    const scriptPath = path.join(this.projectRoot, 'run-safe-cleanup.mjs');
    await fs.writeFile(scriptPath, script);
    
    return { scriptPath, safeCount: safesToRemove.length };
  }

  /**
   * Determine if a file is safe to remove
   */
  isSafeToRemove(filePath) {
    const fileName = path.basename(filePath).toLowerCase();
    const relativePath = path.relative(this.projectRoot, filePath).toLowerCase();
    
    // Never remove these patterns
    const keepPatterns = [
      /readme/,
      /license/,
      /changelog/,
      /package\.json/,
      /\.env/,
      /\.git/,
      /config/,
      /spa-routing-fix/,  // Keep our recent important fixes
      /session-summary/   // Keep session summaries
    ];

    if (keepPatterns.some(pattern => pattern.test(fileName) || pattern.test(relativePath))) {
      return false;
    }

    // Safe to remove patterns
    const safePatterns = [
      /^fix-.*\.(mjs|js|bat)$/,
      /^emergency-.*\.(mjs|js|bat)$/,
      /^test-.*\.(mjs|js|bat)$/,
      /^verify-.*\.(mjs|js|bat)$/,
      /^check-.*\.(mjs|js|bat)$/,
      /^debug-.*\.(mjs|js|bat)$/,
      /^diagnose-.*\.(mjs|js|bat)$/,
      /.*-fix-complete\.md$/,
      /.*-fixes-applied\.md$/,
      /.*-guide\.md$/,
      /.*hotfix.*\.sql$/,
      /.*manual.*\.sql$/
    ];

    return safePatterns.some(pattern => pattern.test(fileName));
  }

  /**
   * Run complete analysis
   */
  async runCompleteAnalysis() {
    log.title('SWANSTUDIOS ACTIVE FILE USAGE ANALYSIS');
    console.log('Tracing actual file usage through import chains...\n');

    // Step 1: Analyze package.json files
    await this.analyzePackageJsonFiles();

    // Step 2: Add configuration files
    const configFiles = this.getConfigurationFiles();
    log.success(`Found ${configFiles.length} configuration files`);

    // Step 3: Trace from entry points
    await this.traceFromEntryPoints();

    // Step 4: Generate recommendations
    const { categories, totalUnused, totalActive } = await this.generateCleanupRecommendations();

    // Step 5: Create cleanup script
    const { scriptPath, safeCount } = await this.createSafeCleanupScript(categories);

    // Display results
    log.title('ANALYSIS RESULTS');
    
    console.log(`\n📊 FILE USAGE SUMMARY:`);
    console.log(`${colors.green}Active files (in use): ${totalActive}${colors.reset}`);
    console.log(`${colors.yellow}Unused files: ${totalUnused}${colors.reset}`);
    console.log(`${colors.cyan}Safe to remove: ${safeCount}${colors.reset}`);

    console.log(`\n📁 UNUSED FILE BREAKDOWN:`);
    Object.entries(categories).forEach(([category, files]) => {
      if (files.length > 0) {
        console.log(`  ${category}: ${files.length} files`);
      }
    });

    const totalSize = await this.calculateTotalSize(categories);
    console.log(`\n💾 POTENTIAL SPACE SAVINGS: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);

    console.log(`\n🎯 RECOMMENDATIONS:`);
    console.log(`\n1. ${colors.green}Review active files:${colors.reset} Your core application uses ${totalActive} files`);
    console.log(`2. ${colors.yellow}Cleanup unused files:${colors.reset} Run 'node run-safe-cleanup.mjs'`);
    console.log(`3. ${colors.cyan}Manual review:${colors.reset} Check remaining ${totalUnused - safeCount} files manually`);
    
    console.log(`\n${colors.bold}🧹 SAFE CLEANUP COMMAND:${colors.reset}`);
    console.log(`node run-safe-cleanup.mjs`);
    
    console.log(`\n${colors.bold}⚠️  BEFORE CLEANUP:${colors.reset}`);
    console.log(`- Create backup: git add . && git commit -m "Backup before cleanup"`);
    console.log(`- Review the files in run-safe-cleanup.mjs`);
    console.log(`- Test application after cleanup`);

    return {
      activeFiles: totalActive,
      unusedFiles: totalUnused,
      safeToRemove: safeCount,
      spaceSavings: (totalSize / (1024 * 1024)).toFixed(2),
      scriptPath
    };
  }

  /**
   * Calculate total size of files
   */
  async calculateTotalSize(categories) {
    let totalSize = 0;
    
    for (const fileList of Object.values(categories)) {
      for (const file of fileList) {
        try {
          const stats = await fs.stat(file);
          totalSize += stats.size;
        } catch (error) {
          // Ignore stat errors
        }
      }
    }
    
    return totalSize;
  }
}

// Run the analysis
const tracer = new ActiveFileTracer();
tracer.runCompleteAnalysis().catch(error => {
  log.error(`Analysis failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
