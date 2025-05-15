#!/usr/bin/env node

/**
 * Simple System Status Check
 * Uses only built-in Node.js modules
 */

import http from 'http';
import { URL } from 'url';

// Simple color functions
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

// Services to check
const SERVICES = [
  { name: 'Backend API', url: 'http://localhost:10000/health' },
  { name: 'Frontend Dev Server', url: 'http://localhost:5173' },
  { name: 'Workout MCP Server', url: 'http://localhost:8000/health' },
  { name: 'Gamification MCP', url: 'http://localhost:8002/health' }
];

/**
 * Simple HTTP check using built-in modules
 */
function checkService(name, url) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname,
        timeout: 5000
      };

      const req = http.request(options, (res) => {
        const status = res.statusCode;
        if (status >= 200 && status < 300) {
          console.log(colors.green(`✓ ${name} - Status: ${status}`));
          resolve({ success: true, status });
        } else {
          console.log(colors.yellow(`⚠ ${name} - Status: ${status}`));
          resolve({ success: false, status });
        }
      });

      req.on('error', (error) => {
        console.log(colors.red(`✗ ${name} - Error: ${error.message}`));
        resolve({ success: false, error: error.message });
      });

      req.on('timeout', () => {
        console.log(colors.red(`✗ ${name} - Timeout`));
        req.abort();
        resolve({ success: false, error: 'Timeout' });
      });

      req.setTimeout(5000);
      req.end();
    } catch (error) {
      console.log(colors.red(`✗ ${name} - Error: ${error.message}`));
      resolve({ success: false, error: error.message });
    }
  });
}

/**
 * Main verification function
 */
async function verifySystemStatus() {
  console.log(colors.bold(colors.blue('🔍 SwanStudios System Status Check\\n')));
  
  const results = [];
  
  for (const service of SERVICES) {
    const result = await checkService(service.name, service.url);
    results.push(result);
  }
  
  console.log('\\n' + colors.bold(colors.yellow('Summary:')));
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  const successRate = (successful / total * 100).toFixed(1);
  
  if (successRate === '100.0') {
    console.log(colors.green(`🎉 All services operational (${successRate}%)`));
  } else if (successRate >= '50.0') {
    console.log(colors.yellow(`⚠️ Some services operational (${successRate}%)`));
  } else {
    console.log(colors.red(`🚨 Most services down (${successRate}%)`));
  }
  
  console.log('\\n' + colors.bold(colors.yellow('Next Steps:')));
  
  if (successful === 0) {
    console.log(colors.red('• No services running - try: npm start'));
  } else if (successful < total) {
    console.log(colors.yellow('• Some services down - check individual service logs'));
  } else {
    console.log(colors.green('• All systems operational!'));
  }
  
  return { successful, total, successRate };
}

// Run the check
if (import.meta.url === `file://${process.argv[1]}`) {
  verifySystemStatus()
    .then((result) => {
      console.log(colors.blue(`\\nVerification complete. Success rate: ${result.successRate}%`));
      process.exit(result.successful === result.total ? 0 : 1);
    })
    .catch((error) => {
      console.error(colors.red(`Verification failed: ${error.message}`));
      process.exit(1);
    });
}

export default verifySystemStatus;
