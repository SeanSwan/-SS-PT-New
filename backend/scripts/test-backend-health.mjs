#!/usr/bin/env node

/**
 * Backend Health Test Script
 * ==========================
 * Tests backend connectivity and CORS configuration
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('SwanStudios Backend Health Test');
console.log('===============================\n');

const BACKEND_URLS = [
  'http://localhost:10000', // Local development
  'https://ss-pt-new.onrender.com' // Production
];

const FRONTEND_ORIGIN = 'https://sswanstudios.com';

async function testHealthEndpoint(baseUrl) {
  console.log(`Testing health endpoint: ${baseUrl}/health`);

  try {
    const curlCommand = `curl -s -w "HTTP_CODE:%{http_code}" "${baseUrl}/health"`;
    const { stdout } = await execAsync(curlCommand);

    const httpCodeMatch = stdout.match(/HTTP_CODE:(\d+)$/);
    const httpCode = httpCodeMatch ? httpCodeMatch[1] : 'unknown';
    const response = stdout.replace(/HTTP_CODE:\d+$/, '');

    console.log(`  Status: ${httpCode}`);

    if (httpCode === '200') {
      try {
        const jsonResponse = JSON.parse(response);
        console.log(`  Message: ${jsonResponse.message || jsonResponse.status}`);
        console.log(`  Uptime: ${jsonResponse.uptime || 'unknown'}s`);
        console.log(`  Environment: ${jsonResponse.environment || 'unknown'}`);
      } catch (e) {
        console.log(`  Response: ${response.slice(0, 100)}...`);
      }
    } else {
      console.log(`  Failed with code ${httpCode}`);
      console.log(`  Response: ${response.slice(0, 200)}`);
    }
  } catch (error) {
    console.log(`  Error: ${error.message}`);
  }

  console.log('');
}

async function testCORS(baseUrl) {
  console.log(`Testing CORS for: ${baseUrl}/health`);
  console.log(`  Origin: ${FRONTEND_ORIGIN}`);

  try {
    const corsCommand = `curl -s -w "HTTP_CODE:%{http_code}" -H "Origin: ${FRONTEND_ORIGIN}" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: Content-Type,Authorization" -X OPTIONS "${baseUrl}/health"`;

    const { stdout } = await execAsync(corsCommand);

    const httpCodeMatch = stdout.match(/HTTP_CODE:(\d+)$/);
    const httpCode = httpCodeMatch ? httpCodeMatch[1] : 'unknown';

    console.log(`  OPTIONS Status: ${httpCode}`);

    if (httpCode === '200' || httpCode === '204') {
      console.log('  CORS preflight successful');
    } else {
      console.log('  CORS preflight failed');
    }
  } catch (error) {
    console.log(`  CORS test error: ${error.message}`);
  }

  console.log('');
}

async function testActualRequest(baseUrl) {
  console.log(`Testing actual request with CORS headers: ${baseUrl}/health`);

  try {
    const requestCommand = `curl -s -w "HTTP_CODE:%{http_code}" -H "Origin: ${FRONTEND_ORIGIN}" "${baseUrl}/health"`;

    const { stdout } = await execAsync(requestCommand);

    const httpCodeMatch = stdout.match(/HTTP_CODE:(\d+)$/);
    const httpCode = httpCodeMatch ? httpCodeMatch[1] : 'unknown';
    const response = stdout.replace(/HTTP_CODE:\d+$/, '');

    console.log(`  Request Status: ${httpCode}`);

    if (httpCode === '200') {
      try {
        const jsonResponse = JSON.parse(response);
        console.log(`  Success: ${jsonResponse.success || false}`);
        console.log(`  Status: ${jsonResponse.status || 'unknown'}`);
      } catch (e) {
        console.log('  Response received but not JSON');
      }
    } else {
      console.log(`  Request failed with code ${httpCode}`);
    }
  } catch (error) {
    console.log(`  Request error: ${error.message}`);
  }

  console.log('');
}

async function main() {
  for (const url of BACKEND_URLS) {
    console.log(`Testing Backend: ${url}`);
    console.log('='.repeat(50));

    await testHealthEndpoint(url);
    await testCORS(url);
    await testActualRequest(url);

    console.log('='.repeat(50));
    console.log('');
  }

  console.log('Test Summary:');
  console.log('- If local (port 10000) works but production fails -> deployment issue');
  console.log('- If CORS tests fail -> check FRONTEND_ORIGINS environment variable');
  console.log('- If health endpoint fails -> check server startup and logs');
  console.log('');
  console.log('Next steps if production fails:');
  console.log('1. Check Render service logs');
  console.log('2. Verify environment variables in Render dashboard');
  console.log('3. Ensure DATABASE_URL is set by Render');
  console.log('4. Redeploy after setting environment variables');
}

main().catch(error => {
  console.error('Test script failed:', error);
  process.exit(1);
});
