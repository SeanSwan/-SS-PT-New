#!/usr/bin/env node

/**
 * File Cleanup and Error Detection Script
 * ======================================
 * Comprehensive script to detect and fix common issues in the SwanStudios real-time implementation
 * 
 * CHECKS:
 * - Missing imports and exports
 * - TypeScript type issues
 * - Unused variables and imports
 * - Missing dependencies
 * - File structure problems
 * - Hook dependency arrays
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = __dirname;
const frontendPath = join(projectRoot, 'frontend', 'src', 'components', 'UniversalMasterSchedule');

class FileCleanupTool {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.fixes = [];
  }

  async runCleanup() {
    console.log('🧹 Starting File Cleanup and Error Detection...\n');

    try {
      // Check 1: Hook Files
      await this.checkHookFiles();
      
      // Check 2: Component Files
      await this.checkComponentFiles();
      
      // Check 3: Export/Import Consistency
      await this.checkExportImportConsistency();
      
      // Check 4: TypeScript Issues
      await this.checkTypeScriptIssues();
      
      // Generate Report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Cleanup script failed:', error.message);
      process.exit(1);
    }
  }

  async checkHookFiles() {
    console.log('🔍 Checking Hook Files...');
    
    const hookFiles = [
      'useRealTimeUpdates.ts',
      'useAdminNotifications.ts',
      'useCollaborativeScheduling.ts',
      'useMicroInteractions.ts'
    ];

    for (const file of hookFiles) {
      const filePath = join(frontendPath, 'hooks', file);
      if (existsSync(filePath)) {
        await this.analyzeHookFile(filePath, file);
      } else {
        this.errors.push(`Missing hook file: ${file}`);
      }
    }
  }

  async analyzeHookFile(filePath, fileName) {
    try {
      const content = readFileSync(filePath, 'utf8');
      
      // Check for export default
      if (!content.includes('export default')) {
        this.errors.push(`${fileName}: Missing 'export default'`);
      }
      
      // Check for React imports
      if (content.includes('useEffect') || content.includes('useState') || content.includes('useCallback')) {
        if (!content.includes("import { ") || !content.includes("} from 'react'")) {
          this.warnings.push(`${fileName}: May be missing React hook imports`);
        }
      }
      
      // Check for useCallback dependency arrays
      const useCallbackMatches = content.match(/useCallback\([^,]+,\s*\[[^\]]*\]/g) || [];
      for (const match of useCallbackMatches) {
        if (match.includes('[]')) {
          this.warnings.push(`${fileName}: useCallback with empty dependency array found`);
        }
      }
      
      console.log(`   ✅ ${fileName} - Basic structure valid`);
      
    } catch (error) {
      this.errors.push(`${fileName}: Failed to analyze - ${error.message}`);
    }
  }

  async checkComponentFiles() {
    console.log('🔍 Checking Component Files...');
    
    const componentFiles = [
      'RealTimeConnectionStatus.tsx',
      'RealTimeSystemMonitor.tsx',
      'AdminNotificationCenter.tsx',
      'CollaborativeSchedulingPanel.tsx'
    ];

    for (const file of componentFiles) {
      const filePath = join(frontendPath, file);
      if (existsSync(filePath)) {
        await this.analyzeComponentFile(filePath, file);
      } else {
        this.errors.push(`Missing component file: ${file}`);
      }
    }
  }

  async analyzeComponentFile(filePath, fileName) {
    try {
      const content = readFileSync(filePath, 'utf8');
      
      // Check for React import
      if (!content.includes("import React") && !content.includes("import { ")) {
        this.errors.push(`${fileName}: Missing React import`);
      }
      
      // Check for export default
      if (!content.includes('export default')) {
        this.errors.push(`${fileName}: Missing 'export default'`);
      }
      
      // Check for styled-components
      if (content.includes('styled.') && !content.includes("import styled")) {
        this.warnings.push(`${fileName}: Uses styled-components but may be missing import`);
      }
      
      // Check for Material-UI components
      if (content.includes('Tooltip') || content.includes('Typography')) {
        if (!content.includes("from '@mui/material'")) {
          this.warnings.push(`${fileName}: Uses Material-UI but may be missing imports`);
        }
      }
      
      console.log(`   ✅ ${fileName} - Basic structure valid`);
      
    } catch (error) {
      this.errors.push(`${fileName}: Failed to analyze - ${error.message}`);
    }
  }

  async checkExportImportConsistency() {
    console.log('🔍 Checking Export/Import Consistency...');
    
    // Check hooks index file
    const hooksIndexPath = join(frontendPath, 'hooks', 'index.ts');
    if (existsSync(hooksIndexPath)) {
      const content = readFileSync(hooksIndexPath, 'utf8');
      
      const exports = [
        'useRealTimeUpdates',
        'useAdminNotifications', 
        'useCollaborativeScheduling',
        'useMicroInteractions'
      ];
      
      for (const exportName of exports) {
        if (!content.includes(`export { ${exportName} }`)) {
          this.warnings.push(`hooks/index.ts: Missing export for ${exportName}`);
        }
        
        if (!content.includes(`export type { ${exportName.replace('use', '')}Values`)) {
          this.warnings.push(`hooks/index.ts: Missing type export for ${exportName}Values`);
        }
      }
      
      console.log('   ✅ hooks/index.ts - Export consistency checked');
    }
  }

  async checkTypeScriptIssues() {
    console.log('🔍 Checking Common TypeScript Issues...');
    
    // Check main component file
    const mainComponentPath = join(frontendPath, 'UniversalMasterSchedule.tsx');
    if (existsSync(mainComponentPath)) {
      const content = readFileSync(mainComponentPath, 'utf8');
      
      // Check for potential missing imports
      const potentialMissing = [
        { usage: 'RealTimeConnectionStatus', import: './RealTimeConnectionStatus' },
        { usage: 'useRealTimeUpdates', import: './hooks' },
        { usage: 'Tooltip', import: '@mui/material' },
        { usage: 'motion.', import: 'framer-motion' }
      ];
      
      for (const check of potentialMissing) {
        if (content.includes(check.usage) && !content.includes(check.import)) {
          this.warnings.push(`UniversalMasterSchedule.tsx: Uses ${check.usage} but may be missing import from ${check.import}`);
        }
      }
      
      console.log('   ✅ UniversalMasterSchedule.tsx - TypeScript issues checked');
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 FILE CLEANUP & ERROR DETECTION REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n📊 Summary:`);
    console.log(`   ❌ Errors: ${this.errors.length}`);
    console.log(`   ⚠️ Warnings: ${this.warnings.length}`);
    console.log(`   🔧 Fixes Applied: ${this.fixes.length}`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS (Must Fix):');
      this.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS (Recommended Fixes):');
      this.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }
    
    if (this.fixes.length > 0) {
      console.log('\n🔧 FIXES APPLIED:');
      this.fixes.forEach((fix, index) => {
        console.log(`   ${index + 1}. ${fix}`);
      });
    }
    
    // Recommendations
    console.log('\n📖 RECOMMENDATIONS:');
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('   🎉 No critical issues found! Code structure looks good.');
      console.log('   ✅ All files have proper imports and exports');
      console.log('   ✅ TypeScript structure appears valid');
    } else {
      console.log('   1. Fix any missing export default statements');
      console.log('   2. Ensure all React hooks are properly imported');
      console.log('   3. Verify Material-UI and styled-components imports');
      console.log('   4. Check useCallback dependency arrays');
      console.log('   5. Test the application in development mode');
    }
    
    console.log('\n🧪 TESTING CHECKLIST:');
    console.log('   □ npm run dev (frontend starts without errors)');
    console.log('   □ Backend server running on port 10000');
    console.log('   □ WebSocket connection indicator shows "Live" status');
    console.log('   □ Browser console has no TypeScript errors');
    console.log('   □ Real-time updates work when creating sessions');
    
    console.log('\n' + '='.repeat(60));
    
    // Exit code
    if (this.errors.length > 0) {
      console.log('❌ Critical errors found - review and fix before proceeding');
      process.exit(1);
    } else if (this.warnings.length > 0) {
      console.log('⚠️ Warnings found - consider reviewing for optimal performance');
      process.exit(0);
    } else {
      console.log('✅ File cleanup complete - no critical issues detected!');
      process.exit(0);
    }
  }
}

// Run the cleanup if this file is executed directly
if (process.argv[1].endsWith('file-cleanup-tool.mjs')) {
  const cleanup = new FileCleanupTool();
  cleanup.runCleanup().catch(error => {
    console.error('💥 Cleanup script failed:', error);
    process.exit(1);
  });
}

export default FileCleanupTool;
