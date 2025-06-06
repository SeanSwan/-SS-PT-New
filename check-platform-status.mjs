#!/usr/bin/env node

/**
 * SwanStudios Platform Status Checker
 * Quick assessment of current platform state
 */

import { promises as fs } from 'fs';
import path from 'path';
import chalk from 'chalk';

console.log(chalk.cyan.bold('📊 SwanStudios Platform Status Check'));
console.log(chalk.cyan('=====================================\n'));

async function checkPlatformStatus() {
  const checks = {
    backend: { status: '⏳', message: 'Checking...' },
    frontend: { status: '⏳', message: 'Checking...' },
    models: { status: '⏳', message: 'Checking...' },
    auth: { status: '⏳', message: 'Checking...' },
    deployment: { status: '⏳', message: 'Checking...' }
  };

  console.log(chalk.yellow('Running comprehensive status check...\n'));

  try {
    // Check backend structure
    console.log(chalk.blue('🔍 Checking backend structure...'));
    const backendPath = './backend';
    const serverExists = await fs.access(path.join(backendPath, 'server.mjs')).then(() => true).catch(() => false);
    const packageExists = await fs.access(path.join(backendPath, 'package.json')).then(() => true).catch(() => false);
    
    if (serverExists && packageExists) {
      checks.backend = { status: '✅', message: 'Backend structure OK' };
    } else {
      checks.backend = { status: '❌', message: 'Backend files missing' };
    }

    // Check frontend structure
    console.log(chalk.blue('🔍 Checking frontend structure...'));
    const frontendPath = './frontend';
    const frontendPackageExists = await fs.access(path.join(frontendPath, 'package.json')).then(() => true).catch(() => false);
    const srcExists = await fs.access(path.join(frontendPath, 'src')).then(() => true).catch(() => false);
    
    if (frontendPackageExists && srcExists) {
      checks.frontend = { status: '✅', message: 'Frontend structure OK' };
    } else {
      checks.frontend = { status: '❌', message: 'Frontend files missing' };
    }

    // Check models structure
    console.log(chalk.blue('🔍 Checking models structure...'));
    const modelsPath = './backend/models';
    const userModelExists = await fs.access(path.join(modelsPath, 'User.mjs')).then(() => true).catch(() => false);
    const indexExists = await fs.access(path.join(modelsPath, 'index.mjs')).then(() => true).catch(() => false);
    
    if (userModelExists && indexExists) {
      checks.models = { status: '✅', message: 'Models structure OK' };
    } else {
      checks.models = { status: '❌', message: 'Model files missing' };
    }

    // Check auth structure
    console.log(chalk.blue('🔍 Checking authentication structure...'));
    const authControllerExists = await fs.access('./backend/controllers/authController.mjs').then(() => true).catch(() => false);
    const authRoutesExists = await fs.access('./backend/routes/authRoutes.mjs').then(() => true).catch(() => false);
    
    if (authControllerExists && authRoutesExists) {
      checks.auth = { status: '✅', message: 'Auth structure OK' };
    } else {
      checks.auth = { status: '❌', message: 'Auth files missing' };
    }

    // Check deployment readiness
    console.log(chalk.blue('🔍 Checking deployment readiness...'));
    const envExampleExists = await fs.access('./backend/.env.example').then(() => true).catch(() => false);
    const gitignoreExists = await fs.access('./.gitignore').then(() => true).catch(() => false);
    
    if (envExampleExists && gitignoreExists) {
      checks.deployment = { status: '✅', message: 'Deployment ready' };
    } else {
      checks.deployment = { status: '⚠️', message: 'Deployment needs review' };
    }

    // Check for debug files (indicates previous issues)
    console.log(chalk.blue('🔍 Checking for debug artifacts...'));
    const files = await fs.readdir('./');
    const debugFiles = files.filter(file => 
      file.includes('debug') || 
      file.includes('fix-') || 
      file.includes('emergency') ||
      file.includes('diagnostic')
    );

    // Display results
    console.log(chalk.cyan('\n📊 STATUS REPORT:'));
    console.log(chalk.cyan('================='));
    
    Object.entries(checks).forEach(([category, check]) => {
      const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
      console.log(`${check.status} ${categoryName.padEnd(12)} - ${check.message}`);
    });

    console.log(chalk.cyan('\n📁 DEBUG ARTIFACTS DETECTED:'));
    if (debugFiles.length > 0) {
      console.log(chalk.yellow(`   Found ${debugFiles.length} debug files (indicates previous troubleshooting)`));
      if (debugFiles.length > 50) {
        console.log(chalk.yellow('   ⚠️ High number of debug files - suggests extensive troubleshooting history'));
      }
    } else {
      console.log(chalk.green('   ✅ No debug artifacts found - clean project state'));
    }

    // Overall assessment
    const allGreen = Object.values(checks).every(check => check.status === '✅');
    const hasIssues = Object.values(checks).some(check => check.status === '❌');

    console.log(chalk.cyan('\n🎯 OVERALL ASSESSMENT:'));
    console.log(chalk.cyan('====================='));
    
    if (allGreen) {
      console.log(chalk.green('✅ Platform is in excellent condition!'));
      console.log(chalk.green('   Primary issue is likely authentication-specific.'));
      console.log(chalk.cyan('\n🚀 RECOMMENDED ACTION:'));
      console.log(chalk.cyan('   Run: FIX-AUTHENTICATION-P0.bat'));
    } else if (hasIssues) {
      console.log(chalk.red('❌ Platform has structural issues that need addressing first.'));
      console.log(chalk.yellow('   Fix structural issues before running authentication fix.'));
    } else {
      console.log(chalk.yellow('⚠️ Platform has minor issues but should be functional.'));
      console.log(chalk.cyan('\n🚀 RECOMMENDED ACTION:'));
      console.log(chalk.cyan('   Try: FIX-AUTHENTICATION-P0.bat'));
    }

    console.log(chalk.cyan('\n📋 AVAILABLE FIXES:'));
    console.log(chalk.cyan('==================='));
    console.log(chalk.cyan('   🔧 FIX-AUTHENTICATION-P0.bat  - Fix login issues'));
    console.log(chalk.cyan('   🧪 node test-login-flow.mjs    - Test authentication'));
    console.log(chalk.cyan('   🔍 node diagnose-auth-issue.mjs - Deep auth diagnostic'));

    return { allGreen, hasIssues, debugFileCount: debugFiles.length };

  } catch (error) {
    console.log(chalk.red(`❌ Status check failed: ${error.message}`));
    return { allGreen: false, hasIssues: true, debugFileCount: 0 };
  }
}

// Run status check
async function main() {
  const result = await checkPlatformStatus();
  
  console.log(chalk.magenta('\n' + '='.repeat(50)));
  if (result.allGreen) {
    console.log(chalk.green.bold('🎉 Ready for authentication fix!'));
  } else if (result.hasIssues) {
    console.log(chalk.red.bold('⚠️ Structural issues detected - address before auth fix'));
  } else {
    console.log(chalk.yellow.bold('🔧 Minor issues detected - proceed with caution'));
  }
  console.log(chalk.magenta('='.repeat(50)));
}

main();
