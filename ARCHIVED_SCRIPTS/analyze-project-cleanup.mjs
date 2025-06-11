#!/usr/bin/env node
/**
 * SwanStudios Project Cleanup Analyzer
 * ====================================
 * Master Prompt v28 aligned - The Swan Alchemist
 * 
 * Comprehensive analysis of project files to identify:
 * - Core application files (in use)
 * - Temporary fix files (cleanup candidates)
 * - Redundant documentation (cleanup candidates)
 * - Obsolete test/debug files (cleanup candidates)
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
 * Project Cleanup Analyzer
 */
class ProjectCleanupAnalyzer {
  constructor() {
    this.projectRoot = __dirname;
    this.analysis = {
      core: [],
      documentation: [],
      tempFixes: [],
      testFiles: [],
      batchFiles: [],
      obsolete: [],
      safeToclear: []
    };
    this.usedFiles = new Set();
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
   * Get file stats safely
   */
  async getStatsSafely(filePath) {
    try {
      return await fs.stat(filePath);
    } catch (error) {
      return null;
    }
  }

  /**
   * Analyze if a file is actively used by checking imports/references
   */
  async analyzeFileUsage(filePath) {
    // Core files that are always needed
    const coreFiles = [
      'package.json',
      '.env.example',
      '.gitignore',
      'README.md',
      'vite.config.js',
      'tailwind.config.js',
      'tsconfig.json',
      'server.mjs',
      'App.tsx',
      'main.jsx',
      'index.html'
    ];

    const fileName = path.basename(filePath);
    
    if (coreFiles.includes(fileName)) {
      return { used: true, reason: 'Core application file' };
    }

    // Check if file is referenced in package.json scripts
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const packageContent = await this.readFileSafely(packageJsonPath);
    if (packageContent) {
      if (packageContent.includes(fileName)) {
        return { used: true, reason: 'Referenced in package.json' };
      }
    }

    // Check backend package.json too
    const backendPackageJsonPath = path.join(this.projectRoot, 'backend', 'package.json');
    const backendPackageContent = await this.readFileSafely(backendPackageJsonPath);
    if (backendPackageContent) {
      if (backendPackageContent.includes(fileName)) {
        return { used: true, reason: 'Referenced in backend package.json' };
      }
    }

    // Check if file is imported by core files
    const coreFilesToCheck = [
      'backend/server.mjs',
      'backend/core/app.mjs',
      'backend/core/startup.mjs',
      'frontend/src/App.tsx',
      'frontend/src/main.jsx'
    ];

    for (const coreFile of coreFilesToCheck) {
      const coreFilePath = path.join(this.projectRoot, coreFile);
      const content = await this.readFileSafely(coreFilePath);
      if (content && content.includes(fileName.replace('.mjs', '').replace('.js', ''))) {
        return { used: true, reason: `Imported by ${coreFile}` };
      }
    }

    return { used: false, reason: 'No references found' };
  }

  /**
   * Categorize file based on patterns
   */
  categorizeFile(filePath) {
    const fileName = path.basename(filePath).toLowerCase();
    const fullPath = filePath.toLowerCase();

    // Core directories and files that should never be removed
    const corePatterns = [
      /^(backend|frontend|node_modules)/,
      /package\.json$/,
      /\.env$/,
      /\.gitignore$/,
      /readme\.md$/,
      /server\.mjs$/,
      /app\.tsx$/,
      /main\.jsx$/,
      /index\.html$/
    ];

    if (corePatterns.some(pattern => pattern.test(fullPath))) {
      return 'core';
    }

    // Documentation files (many likely redundant)
    if (fileName.endsWith('.md') && !fileName.includes('readme')) {
      return 'documentation';
    }

    // Temporary fix scripts
    if (fileName.includes('fix-') || 
        fileName.includes('emergency-') || 
        fileName.includes('diagnose-') ||
        fileName.includes('repair-') ||
        fileName.includes('hotfix-')) {
      return 'tempFixes';
    }

    // Test and verification files
    if (fileName.includes('test-') || 
        fileName.includes('verify-') || 
        fileName.includes('check-') ||
        fileName.includes('debug-')) {
      return 'testFiles';
    }

    // Batch automation files
    if (fileName.endsWith('.bat') || fileName.endsWith('.sh')) {
      return 'batchFiles';
    }

    // Configuration and SQL files
    if (fileName.endsWith('.sql') || 
        fileName.endsWith('.conf') ||
        fileName.includes('config') ||
        fileName.includes('nginx')) {
      return 'configFiles';
    }

    // Everything else might be obsolete
    return 'obsolete';
  }

  /**
   * Analyze root directory files
   */
  async analyzeRootDirectory() {
    log.step('Analyzing root directory files...');
    
    try {
      const files = await fs.readdir(this.projectRoot);
      
      for (const file of files) {
        const filePath = path.join(this.projectRoot, file);
        const stats = await this.getStatsSafely(filePath);
        
        if (stats && stats.isFile()) {
          const category = this.categorizeFile(filePath);
          const usage = await this.analyzeFileUsage(filePath);
          
          this.analysis[category].push({
            name: file,
            path: filePath,
            size: stats.size,
            modified: stats.mtime,
            used: usage.used,
            reason: usage.reason
          });
        }
      }
      
      log.success(`Analyzed ${files.length} root directory files`);
    } catch (error) {
      log.error(`Error analyzing root directory: ${error.message}`);
    }
  }

  /**
   * Identify files safe to remove
   */
  identifySafeToRemove() {
    log.step('Identifying files safe to remove...');

    // Files that are definitely safe to remove
    const safePatterns = [
      // Old fix files
      /^fix-.*\.(mjs|js|bat|sh)$/,
      /^emergency-.*\.(mjs|js|bat|sh)$/,
      /^test-.*\.(mjs|js|bat|sh)$/,
      /^verify-.*\.(mjs|js|bat|sh)$/,
      /^check-.*\.(mjs|js|bat|sh)$/,
      /^diagnose-.*\.(mjs|js|bat|sh)$/,
      
      // Redundant documentation (keep only recent ones)
      /^.*-fix-complete\.md$/i,
      /^.*-fixes-applied\.md$/i,
      /^.*-summary\.md$/i,
      /^.*-guide\.md$/i,
      /^.*-instructions\.md$/i,
      /^.*-documentation\.md$/i,
      
      // Old deployment scripts
      /^deploy-.*\.bat$/,
      /^run-.*\.bat$/,
      /^apply-.*\.bat$/,
      /^start-.*\.bat$/,
      
      // Temporary SQL files
      /^.*-fix\.sql$/,
      /^emergency-.*\.sql$/,
      /^manual-.*\.sql$/,
      
      // Status and report files
      /.*status.*\.md$/i,
      /.*report.*\.md$/i,
      /.*success.*\.md$/i
    ];

    // Check each category for safe removal candidates
    Object.keys(this.analysis).forEach(category => {
      if (category === 'core') return; // Never remove core files
      
      this.analysis[category].forEach(file => {
        const fileName = file.name.toLowerCase();
        
        // Check if matches safe removal patterns
        const isSafePattern = safePatterns.some(pattern => pattern.test(fileName));
        
        // Check if file is old (more than 30 days)
        const isOld = Date.now() - file.modified.getTime() > (30 * 24 * 60 * 60 * 1000);
        
        // Check if file is not used
        const isUnused = !file.used;
        
        if (isSafePattern || (isOld && isUnused)) {
          this.analysis.safeToclear.push({
            ...file,
            category,
            removeReason: isSafePattern ? 'Matches safe removal pattern' : 'Old and unused'
          });
        }
      });
    });

    log.success(`Identified ${this.analysis.safeToclear.length} files safe to remove`);
  }

  /**
   * Generate cleanup recommendations
   */
  generateRecommendations() {
    log.title('PROJECT CLEANUP ANALYSIS RESULTS');
    
    console.log(`\n📊 FILE CATEGORY BREAKDOWN:`);
    console.log(`${colors.green}Core files: ${this.analysis.core.length}${colors.reset}`);
    console.log(`${colors.yellow}Documentation: ${this.analysis.documentation.length}${colors.reset}`);
    console.log(`${colors.yellow}Temp fixes: ${this.analysis.tempFixes.length}${colors.reset}`);
    console.log(`${colors.yellow}Test files: ${this.analysis.testFiles.length}${colors.reset}`);
    console.log(`${colors.yellow}Batch files: ${this.analysis.batchFiles.length}${colors.reset}`);
    console.log(`${colors.red}Obsolete: ${this.analysis.obsolete.length}${colors.reset}`);
    console.log(`${colors.cyan}Safe to remove: ${this.analysis.safeToclear.length}${colors.reset}`);

    // Calculate potential space savings
    const totalSizeToRemove = this.analysis.safeToclear.reduce((total, file) => total + file.size, 0);
    const sizeMB = (totalSizeToRemove / (1024 * 1024)).toFixed(2);

    console.log(`\n💾 POTENTIAL SPACE SAVINGS: ${sizeMB} MB`);

    // Show top cleanup candidates
    console.log(`\n🗑️  TOP CLEANUP CANDIDATES:`);
    const topCandidates = this.analysis.safeToclear
      .sort((a, b) => b.size - a.size)
      .slice(0, 20);

    topCandidates.forEach((file, index) => {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      console.log(`  ${index + 1}. ${file.name} (${sizeMB} MB) - ${file.removeReason}`);
    });

    // Show documentation files (many likely redundant)
    if (this.analysis.documentation.length > 0) {
      console.log(`\n📚 DOCUMENTATION FILES (${this.analysis.documentation.length} total):`);
      console.log(`Many of these may be redundant fix documentation.`);
      
      const recentDocs = this.analysis.documentation
        .sort((a, b) => b.modified.getTime() - a.modified.getTime())
        .slice(0, 5);
      
      console.log(`\nMost recent (keep these):`);
      recentDocs.forEach(file => {
        console.log(`  ✅ ${file.name} (${file.modified.toDateString()})`);
      });
    }

    return {
      totalFiles: Object.values(this.analysis).flat().length,
      safeToRemove: this.analysis.safeToclear.length,
      sizeSavings: sizeMB,
      categories: Object.keys(this.analysis).map(cat => ({
        name: cat,
        count: this.analysis[cat].length
      }))
    };
  }

  /**
   * Generate cleanup script
   */
  async generateCleanupScript() {
    log.step('Generating cleanup script...');

    const script = `#!/usr/bin/env node
/**
 * GENERATED CLEANUP SCRIPT
 * ========================
 * This script removes identified safe-to-remove files
 * Generated by ProjectCleanupAnalyzer
 */

import fs from 'fs/promises';
import path from 'path';

const filesToRemove = [
${this.analysis.safeToclear.map(file => 
  `  { path: '${file.path}', name: '${file.name}', reason: '${file.removeReason}' }`
).join(',\n')}
];

console.log('🗑️  SwanStudios Project Cleanup');
console.log('===============================');
console.log(\`Removing \${filesToRemove.length} identified cleanup files...\`);

let removed = 0;
let errors = 0;

for (const file of filesToRemove) {
  try {
    await fs.unlink(file.path);
    console.log(\`✅ Removed: \${file.name}\`);
    removed++;
  } catch (error) {
    console.log(\`❌ Error removing \${file.name}: \${error.message}\`);
    errors++;
  }
}

console.log(\`\`);
console.log(\`📊 CLEANUP COMPLETE:\`);
console.log(\`✅ Successfully removed: \${removed} files\`);
console.log(\`❌ Errors: \${errors} files\`);
console.log(\`\`);
console.log(\`🎉 Project cleanup completed!\`);
console.log(\`Your SwanStudios project is now cleaner and more organized.\`);
`;

    const scriptPath = path.join(this.projectRoot, 'run-project-cleanup.mjs');
    await fs.writeFile(scriptPath, script);
    
    log.success(`Cleanup script generated: run-project-cleanup.mjs`);
    return scriptPath;
  }

  /**
   * Run complete analysis
   */
  async runAnalysis() {
    log.title('SWANSTUDIOS PROJECT CLEANUP ANALYZER');
    console.log('Analyzing project structure for cleanup opportunities...\n');

    await this.analyzeRootDirectory();
    this.identifySafeToRemove();
    const summary = this.generateRecommendations();
    await this.generateCleanupScript();

    console.log(`\n${colors.bold}🎯 RECOMMENDED ACTIONS:${colors.reset}`);
    console.log(`\n1. ${colors.green}Review the cleanup candidates above${colors.reset}`);
    console.log(`2. ${colors.yellow}Run: node run-project-cleanup.mjs${colors.reset} (to execute cleanup)`);
    console.log(`3. ${colors.cyan}Commit cleaned project: git add . && git commit -m "🧹 Project cleanup - Remove redundant files"${colors.reset}`);
    
    console.log(`\n${colors.bold}⚠️  BEFORE CLEANUP:${colors.reset}`);
    console.log(`- Review the list of files to be removed`);
    console.log(`- Create a git backup: git commit -am "Backup before cleanup"`);
    console.log(`- The cleanup script only removes files identified as safe`);

    console.log(`\n${colors.bold}✨ BENEFITS AFTER CLEANUP:${colors.reset}`);
    console.log(`- Cleaner, more organized project structure`);
    console.log(`- Faster project navigation and searches`);
    console.log(`- Reduced confusion from old fix files`);
    console.log(`- Better focus on actual application code`);
    console.log(`- Space savings: ${summary.sizeSavings} MB`);

    return summary;
  }
}

// Run the analysis
const analyzer = new ProjectCleanupAnalyzer();
analyzer.runAnalysis().catch(error => {
  log.error(`Analysis failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
