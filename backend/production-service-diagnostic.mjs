#!/usr/bin/env node

/**
 * Production Backend Service Diagnostic
 * Check if Render backend is properly serving API routes
 * Run in Render shell to diagnose service issues
 */

import express from 'express';
import { promises as fs } from 'fs';

console.log('🔧 Production Backend Service Diagnostic');
console.log('======================================\n');

async function checkProductionService() {
  try {
    console.log('🔍 Environment Check:');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`   PORT: ${process.env.PORT}`);
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'Set' : 'Missing'}`);
    
    console.log('\n📁 File System Check:');
    
    // Check if server.mjs exists and can be read
    try {
      const serverFile = await fs.readFile('./server.mjs', 'utf8');
      console.log('✅ server.mjs found and readable');
      console.log(`   Size: ${serverFile.length} characters`);
    } catch (serverError) {
      console.log('❌ server.mjs not found or not readable');
      console.log(`   Error: ${serverError.message}`);
    }
    
    // Check if package.json exists
    try {
      const packageFile = await fs.readFile('./package.json', 'utf8');
      const packageData = JSON.parse(packageFile);
      console.log('✅ package.json found');
      console.log(`   Start script: ${packageData.scripts?.start || 'Not defined'}`);
    } catch (packageError) {
      console.log('❌ package.json not found or corrupted');
    }
    
    // Check if routes directory exists
    try {
      const routesDir = await fs.readdir('./routes');
      console.log('✅ routes directory found');
      console.log(`   Route files: ${routesDir.filter(f => f.endsWith('.mjs')).join(', ')}`);
      
      // Specifically check for authRoutes
      if (routesDir.includes('authRoutes.mjs')) {
        console.log('✅ authRoutes.mjs found');
      } else {
        console.log('❌ authRoutes.mjs missing');
      }
      
      // Check for healthRoutes
      if (routesDir.includes('healthRoutes.mjs')) {
        console.log('✅ healthRoutes.mjs found');
      } else {
        console.log('⚠️ healthRoutes.mjs missing - explains 404 on /health');
      }
      
    } catch (routesError) {
      console.log('❌ routes directory not found');
    }
    
    console.log('\n🌐 Service Status Check:');
    
    // Check if process is listening on expected port
    const expectedPort = process.env.PORT || 10000;
    console.log(`   Expected port: ${expectedPort}`);
    
    // Try to make internal health check
    try {
      const testApp = express();
      testApp.get('/test', (req, res) => res.json({ status: 'ok' }));
      
      const server = testApp.listen(0, () => {
        const actualPort = server.address().port;
        console.log(`✅ Express can start on port ${actualPort}`);
        server.close();
      });
    } catch (expressError) {
      console.log('❌ Express cannot start');
      console.log(`   Error: ${expressError.message}`);
    }
    
    console.log('\n📊 Process Information:');
    console.log(`   Process ID: ${process.pid}`);
    console.log(`   Node Version: ${process.version}`);
    console.log(`   Platform: ${process.platform}`);
    console.log(`   Architecture: ${process.arch}`);
    console.log(`   Working Directory: ${process.cwd()}`);
    
    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('================');
    
    // Check if we can start the actual server
    console.log('1. Try starting server manually:');
    console.log('   node server.mjs');
    console.log('');
    console.log('2. Check Render service logs for startup errors');
    console.log('');
    console.log('3. Verify render.yaml configuration');
    console.log('');
    console.log('4. Check if all dependencies are installed:');
    console.log('   npm install');
    
    return true;

  } catch (error) {
    console.error('❌ Diagnostic error:', error.message);
    return false;
  }
}

// Run diagnostic
async function main() {
  const success = await checkProductionService();
  
  if (success) {
    console.log('\n✅ Diagnostic complete - check recommendations above');
  } else {
    console.log('\n💥 Diagnostic failed');
  }
}

main();
