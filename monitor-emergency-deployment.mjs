#!/usr/bin/env node

/**
 * 🚨 EMERGENCY DEPLOYMENT MONITOR
 * ================================
 * 
 * Monitors the emergency production fix deployment
 * Checks site availability and reports status
 */

const https = require('https');

const SITE_URL = 'https://sswanstudios.com';
const CHECK_INTERVAL = 30000; // 30 seconds
const MAX_CHECKS = 20; // 10 minutes total

let checkCount = 0;

function checkSiteStatus() {
  return new Promise((resolve) => {
    const req = https.get(SITE_URL, (res) => {
      const isOnline = res.statusCode === 200;
      resolve({
        online: isOnline,
        statusCode: res.statusCode,
        timestamp: new Date().toISOString()
      });
    });

    req.on('error', (error) => {
      resolve({
        online: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        online: false,
        error: 'Request timeout',
        timestamp: new Date().toISOString()
      });
    });
  });
}

async function monitorDeployment() {
  console.log('🚨 EMERGENCY DEPLOYMENT MONITOR');
  console.log('================================');
  console.log(`🌐 Monitoring: ${SITE_URL}`);
  console.log(`⏱️  Check interval: ${CHECK_INTERVAL/1000}s`);
  console.log(`🎯 Max duration: ${(MAX_CHECKS * CHECK_INTERVAL)/60000} minutes`);
  console.log('');

  const startTime = Date.now();

  while (checkCount < MAX_CHECKS) {
    checkCount++;
    
    console.log(`[Check ${checkCount}/${MAX_CHECKS}] Checking site status...`);
    
    const status = await checkSiteStatus();
    
    if (status.online) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log('');
      console.log('🎉 SUCCESS! Site is back online!');
      console.log('================================');
      console.log(`✅ Status: ${status.statusCode}`);
      console.log(`⏱️  Duration: ${duration}s`);
      console.log(`🌐 URL: ${SITE_URL}`);
      console.log('');
      console.log('🚀 EMERGENCY DEPLOYMENT SUCCESSFUL');
      console.log('Next steps:');
      console.log('- Verify admin dashboard functionality');
      console.log('- Check Redux store initialization');
      console.log('- Monitor for any console errors');
      return;
    } else {
      console.log(`❌ Site offline - ${status.error || `Status: ${status.statusCode}`}`);
      
      if (checkCount < MAX_CHECKS) {
        console.log(`⏳ Waiting ${CHECK_INTERVAL/1000}s for next check...`);
        await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
      }
    }
  }

  console.log('');
  console.log('⚠️  TIMEOUT: Site still not responding after maximum checks');
  console.log('Manual intervention may be required.');
  console.log('');
  console.log('🔍 Troubleshooting steps:');
  console.log('1. Check Render dashboard for build status');
  console.log('2. Review deployment logs for errors');
  console.log('3. Verify git commit was pushed successfully');
  console.log('4. Check for additional build errors');
}

// Start monitoring
monitorDeployment().catch(console.error);
