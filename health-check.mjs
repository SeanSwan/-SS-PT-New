#!/usr/bin/env node

/**
 * SwanStudios System Health Checker
 * Verifies all services are running correctly
 */

import http from 'http';
import { URL } from 'url';

// Color functions for pretty output
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`
};

// Services to check
const services = {
  backend: {
    name: 'Backend API',
    url: 'http://localhost:10000/health',
    critical: true
  },
  frontend: {
    name: 'Frontend Dev Server',
    url: 'http://localhost:5173',
    critical: true
  },
  workout_mcp: {
    name: 'Workout MCP Server',
    url: 'http://localhost:8000/health',
    critical: false
  },
  gamification_mcp: {
    name: 'Gamification MCP Server',
    url: 'http://localhost:8002/health',
    critical: false
  }
};

/**
 * Check a single service
 */
function checkService(key, config) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(config.url);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname,
        timeout: 5000,
        method: 'GET'
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const success = res.statusCode >= 200 && res.statusCode < 300;
          resolve({
            key,
            name: config.name,
            success,
            status: res.statusCode,
            critical: config.critical,
            response: data ? data.substring(0, 200) : null
          });
        });
      });

      req.on('error', (error) => {
        resolve({
          key,
          name: config.name,
          success: false,
          critical: config.critical,
          error: error.message
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          key,
          name: config.name,
          success: false,
          critical: config.critical,
          error: 'Timeout'
        });
      });

      req.setTimeout(5000);
      req.end();
    } catch (error) {
      resolve({
        key,
        name: config.name,
        success: false,
        critical: config.critical,
        error: error.message
      });
    }
  });
}

/**
 * Run health check on all services
 */
async function runHealthCheck() {
  console.log(colors.bold(colors.blue('🏥 SwanStudios Health Check')));
  console.log(colors.cyan('=' + '='.repeat(40)));
  console.log('');

  const results = [];
  
  // Check all services
  for (const [key, config] of Object.entries(services)) {
    process.stdout.write(`Checking ${config.name}... `);
    const result = await checkService(key, config);
    results.push(result);
    
    if (result.success) {
      console.log(colors.green('✓ OK'));
      if (result.status) {
        console.log(colors.green(`  Status: ${result.status}`));
      }
    } else {
      const marker = result.critical ? '✗ CRITICAL' : '⚠ WARNING';
      const colorFunc = result.critical ? colors.red : colors.yellow;
      console.log(colorFunc(marker));
      console.log(colorFunc(`  Error: ${result.error || 'Unknown error'}`));
    }
    console.log('');
  }

  // Summary
  console.log(colors.cyan('=' + '='.repeat(40)));
  console.log(colors.bold('📊 Summary:'));
  console.log('');

  const successfulServices = results.filter(r => r.success);
  const criticalFailures = results.filter(r => !r.success && r.critical);
  const warnings = results.filter(r => !r.success && !r.critical);

  console.log(`${colors.green('✓')} Operational: ${successfulServices.length}/${results.length}`);
  if (criticalFailures.length > 0) {
    console.log(`${colors.red('✗')} Critical Failures: ${criticalFailures.length}`);
  }
  if (warnings.length > 0) {
    console.log(`${colors.yellow('⚠')} Warnings: ${warnings.length}`);
  }

  console.log('');

  // Status and recommendations
  if (criticalFailures.length === 0) {
    if (warnings.length === 0) {
      console.log(colors.green(colors.bold('🎉 All systems operational!')));
      console.log(colors.green('Your SwanStudios platform is ready to use.'));
    } else {
      console.log(colors.yellow(colors.bold('✅ Core systems operational with warnings')));
      console.log(colors.yellow('The platform is functional but some optional services are down.'));
    }
  } else {
    console.log(colors.red(colors.bold('❌ Critical system failures detected')));
    console.log(colors.red('Please check the errors above and restart affected services.'));
  }

  console.log('');
  console.log(colors.cyan('Access URLs:'));
  console.log(`  Frontend: ${colors.blue('http://localhost:5173')}`);
  console.log(`  Backend API: ${colors.blue('http://localhost:10000')}`);
  console.log(`  Backend Health: ${colors.blue('http://localhost:10000/health')}`);

  return {
    success: criticalFailures.length === 0,
    results,
    criticalFailures,
    warnings
  };
}

// Run the check if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runHealthCheck()
    .then(summary => {
      process.exit(summary.success ? 0 : 1);
    })
    .catch(error => {
      console.error(colors.red(`Health check failed: ${error.message}`));
      process.exit(1);
    });
}

export default runHealthCheck;
