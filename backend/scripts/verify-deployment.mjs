#!/usr/bin/env node

/**
 * Production Deployment Verification
 * ==================================
 * This script verifies that the production deployment is healthy.
 */

import fetch from 'node-fetch';

const RENDER_URL = process.env.RENDER_EXTERNAL_URL || 'https://ss-pt-new.onrender.com';

async function checkEndpoint(url, name, timeout = 10000) {
  try {
    console.log(`Checking ${name}...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SwanStudios-Health-Check'
      }
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      console.log(`  ${name}: OK (${response.status})`);
      return true;
    }

    console.log(`  ${name}: ${response.status} ${response.statusText}`);
    return false;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`  ${name}: TIMEOUT (> ${timeout / 1000}s)`);
    } else {
      console.log(`  ${name}: ERROR - ${error.message}`);
    }
    return false;
  }
}

async function verifyDeployment() {
  console.log('SwanStudios Production Health Check');
  console.log('====================================');
  console.log(`Target URL: ${RENDER_URL}`);
  console.log('');

  const results = [];

  // Check basic endpoints
  results.push(await checkEndpoint(`${RENDER_URL}/`, 'Root Endpoint'));
  results.push(await checkEndpoint(`${RENDER_URL}/health`, 'Health Check'));
  results.push(await checkEndpoint(`${RENDER_URL}/test`, 'Test Endpoint'));

  // Check API endpoints
  results.push(await checkEndpoint(`${RENDER_URL}/api/storefront`, 'Storefront API'));

  console.log('');
  console.log('Summary');
  console.log('=======');

  const passed = results.filter(Boolean).length;
  const total = results.length;

  console.log(`Passed: ${passed}/${total} checks`);

  if (passed === total) {
    console.log('All checks passed. Deployment appears healthy.');
    process.exit(0);
  }

  console.log('Some checks failed. Review the deployment.');
  process.exit(1);
}

// Add node-fetch if it's not available
try {
  await import('node-fetch');
} catch (e) {
  console.log('node-fetch not available, using built-in fetch if available');
  if (typeof fetch === 'undefined') {
    console.error('No fetch implementation available. Please install node-fetch or use Node 18+');
    process.exit(1);
  }
}

verifyDeployment();
