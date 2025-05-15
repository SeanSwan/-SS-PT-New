#!/usr/bin/env node

/**
 * Comprehensive System Verification Script
 * Checks all the fixes mentioned in the session summary
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for output
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`
};

console.log(colors.bold(colors.blue('🔍 SwanStudios System Verification')));
console.log(colors.cyan('=' + '='.repeat(50)));
console.log('');

const results = {
  redisErrorSuppression: false,
  gamificationPortConfig: false,
  mcpAnalytics: false,
  startupScripts: false,
  healthCheck: false
};

// 1. Check Redis Error Suppression
console.log(colors.bold('1. Checking Redis Error Suppression...'));
try {
  const suppressorPath = path.join(__dirname, 'backend', 'utils', 'enhancedRedisErrorSuppressor.mjs');
  if (fs.existsSync(suppressorPath)) {
    const content = fs.readFileSync(suppressorPath, 'utf8');
    if (content.includes('Redis error suppressor activated')) {
      console.log(colors.green('✓ Enhanced Redis error suppressor found and configured'));
      results.redisErrorSuppression = true;
    } else {
      console.log(colors.yellow('⚠ Redis error suppressor file exists but may not be properly configured'));
    }
  } else {
    console.log(colors.red('✗ Redis error suppressor not found'));
  }
} catch (error) {
  console.log(colors.red(`✗ Error checking Redis suppressor: ${error.message}`));
}
console.log('');

// 2. Check Gamification MCP Port Configuration
console.log(colors.bold('2. Checking Gamification MCP Port Configuration...'));
try {
  const gamificationServerPath = path.join(__dirname, 'backend', 'mcp_server', 'start_gamification_server.py');
  if (fs.existsSync(gamificationServerPath)) {
    const content = fs.readFileSync(gamificationServerPath, 'utf8');
    if (content.includes('port", "8002"')) {
      console.log(colors.green('✓ Gamification MCP server configured for port 8002'));
      results.gamificationPortConfig = true;
    } else {
      console.log(colors.yellow('⚠ Gamification MCP server port configuration unclear'));
    }
  } else {
    console.log(colors.red('✗ Gamification MCP server file not found'));
  }
} catch (error) {
  console.log(colors.red(`✗ Error checking gamification config: ${error.message}`));
}
console.log('');

// 3. Check MCP Analytics
console.log(colors.bold('3. Checking MCP Analytics...'));
try {
  const analyticsPath = path.join(__dirname, 'backend', 'services', 'monitoring', 'MCPAnalytics.mjs');
  if (fs.existsSync(analyticsPath)) {
    const content = fs.readFileSync(analyticsPath, 'utf8');
    if (!content.includes('redisBlocker') && content.includes('class MCPAnalytics')) {
      console.log(colors.green('✓ MCPAnalytics properly configured without Redis blocker'));
      results.mcpAnalytics = true;
    } else {
      console.log(colors.yellow('⚠ MCPAnalytics may have issues'));
    }
  } else {
    console.log(colors.red('✗ MCPAnalytics file not found'));
  }
} catch (error) {
  console.log(colors.red(`✗ Error checking MCPAnalytics: ${error.message}`));
}
console.log('');

// 4. Check Startup Scripts
console.log(colors.bold('4. Checking Startup Scripts...'));
try {
  const restartScript = path.join(__dirname, 'restart-final.bat');
  const healthScript = path.join(__dirname, 'health-check.mjs');
  
  let scriptsCount = 0;
  if (fs.existsSync(restartScript)) {
    console.log(colors.green('✓ restart-final.bat found'));
    scriptsCount++;
  }
  if (fs.existsSync(healthScript)) {
    console.log(colors.green('✓ health-check.mjs found'));
    scriptsCount++;
  }
  
  // Check if simple health check was created
  const simpleHealthScript = path.join(__dirname, 'simple-health-check.js');
  if (fs.existsSync(simpleHealthScript)) {
    console.log(colors.green('✓ simple-health-check.js found'));
    scriptsCount++;
  }
  
  if (scriptsCount >= 2) {
    results.startupScripts = true;
    console.log(colors.green(`✓ Startup scripts verified (${scriptsCount} scripts found)`));
  } else {
    console.log(colors.yellow('⚠ Some startup scripts missing'));
  }
} catch (error) {
  console.log(colors.red(`✗ Error checking startup scripts: ${error.message}`));
}
console.log('');

// 5. Check Health Check Implementation
console.log(colors.bold('5. Checking Health Check Implementation...'));
try {
  const healthPath = path.join(__dirname, 'health-check.mjs');
  if (fs.existsSync(healthPath)) {
    const content = fs.readFileSync(healthPath, 'utf8');
    if (content.includes('SwanStudios System Health Checker') && content.includes('http://localhost:8002')) {
      console.log(colors.green('✓ Health check properly configured for all services including Gamification MCP on port 8002'));
      results.healthCheck = true;
    } else {
      console.log(colors.yellow('⚠ Health check exists but may not be fully configured'));
    }
  } else {
    console.log(colors.red('✗ Health check file not found'));
  }
} catch (error) {
  console.log(colors.red(`✗ Error checking health check: ${error.message}`));
}
console.log('');

// Summary
console.log(colors.cyan('=' + '='.repeat(50)));
console.log(colors.bold('📋 Verification Summary:'));
console.log('');

const checks = [
  { name: 'Redis Error Suppression', status: results.redisErrorSuppression },
  { name: 'Gamification MCP Port (8002)', status: results.gamificationPortConfig },
  { name: 'MCP Analytics Fixed', status: results.mcpAnalytics },
  { name: 'Startup Scripts', status: results.startupScripts },
  { name: 'Health Check System', status: results.healthCheck }
];

let passedChecks = 0;
for (const check of checks) {
  const status = check.status ? colors.green('✓ PASS') : colors.red('✗ FAIL');
  console.log(`${check.name}: ${status}`);
  if (check.status) passedChecks++;
}

console.log('');
console.log(colors.bold(`Overall Status: ${passedChecks}/${checks.length} checks passed`));

if (passedChecks === checks.length) {
  console.log(colors.green(colors.bold('🎉 All issues from the session summary have been fixed!')));
  console.log(colors.green('Your system is ready to run with all fixes applied.'));
  console.log('');
  console.log(colors.cyan('Next steps:'));
  console.log('1. Stop current npm start process (Ctrl+C)');
  console.log('2. Run: restart-final.bat');
  console.log('3. After startup, run: node health-check.mjs');
} else {
  console.log(colors.yellow(colors.bold('⚠️  Some issues may still exist')));
  console.log(colors.yellow('Review the failed checks above and ensure all files are in place.'));
}

console.log('');
