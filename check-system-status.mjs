#!/usr/bin/env node

/**
 * System Status Checker
 * Verifies that both backend and frontend are running correctly
 */

import http from 'http';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔍 SwanStudios System Status Check');
console.log('==================================\n');

// Check backend health
async function checkBackend() {
  return new Promise((resolve) => {
    console.log('Checking backend (port 10000)...');
    
    const options = {
      hostname: 'localhost',
      port: 10000,
      path: '/health',
      method: 'GET',
      timeout: 5000
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('✅ Backend is running');
          console.log(`   Status: ${response.status}`);
          console.log(`   Environment: ${response.environment}`);
          console.log(`   Database Connected: ${response.dbStatus?.connected || 'Unknown'}`);
          resolve(true);
        } catch (error) {
          console.log('❌ Backend response is not valid JSON');
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ Backend is not responding');
      console.log(`   Error: ${error.message}`);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log('❌ Backend timeout (no response in 5 seconds)');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

// Check frontend
async function checkFrontend() {
  return new Promise((resolve) => {
    console.log('\nChecking frontend (port 5173)...');
    
    const options = {
      hostname: 'localhost',
      port: 5173,
      path: '/',
      method: 'GET',
      timeout: 5000
    };
    
    const req = http.request(options, (res) => {
      console.log('✅ Frontend is running');
      console.log(`   Status: ${res.statusCode}`);
      resolve(true);
    });
    
    req.on('error', (error) => {
      console.log('❌ Frontend is not responding');
      console.log(`   Error: ${error.message}`);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log('❌ Frontend timeout (no response in 5 seconds)');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

// Test API endpoints
async function testAPI() {
  return new Promise((resolve) => {
    console.log('\nTesting API proxy (/api/health)...');
    
    const options = {
      hostname: 'localhost',
      port: 5173,
      path: '/api/health',
      method: 'GET',
      timeout: 5000
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ API proxy is working');
          resolve(true);
        } else {
          console.log(`❌ API proxy returned status ${res.statusCode}`);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ API proxy is not working');
      console.log(`   Error: ${error.message}`);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log('❌ API proxy timeout');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

// Run all checks
async function runChecks() {
  const backendOk = await checkBackend();
  const frontendOk = await checkFrontend();
  const apiOk = await testAPI();
  
  console.log('\n==================================');
  console.log('SUMMARY');
  console.log('==================================');
  console.log(`Backend:  ${backendOk ? '✅ OK' : '❌ FAIL'}`);
  console.log(`Frontend: ${frontendOk ? '✅ OK' : '❌ FAIL'}`);
  console.log(`API Proxy: ${apiOk ? '✅ OK' : '❌ FAIL'}`);
  
  if (backendOk && frontendOk && apiOk) {
    console.log('\n🎉 All systems operational!');
    console.log('You can now login with:');
    console.log('• Admin: admin / admin123');
    console.log('• Trainer: trainer@test.com / password123');
    console.log('• Client: client@test.com / password123');
  } else {
    console.log('\n⚠️  Some systems are not working properly.');
    console.log('Try running the complete-system-fix.bat script again.');
  }
}

runChecks().catch(console.error);
