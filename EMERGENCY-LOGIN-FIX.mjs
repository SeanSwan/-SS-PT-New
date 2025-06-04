/**
 * EMERGENCY PRODUCTION LOGIN FIX
 * ==============================
 * Fixes the backend URL mismatch causing 401 login errors
 */

console.log('🚨 EMERGENCY PRODUCTION LOGIN FIX');
console.log('=================================');

// Step 1: Test current backend endpoints
console.log('🔍 Step 1: Testing Backend URLs...\n');

const urlsToTest = [
  'https://ss-pt-new.onrender.com/api/health',
  'https://swan-studios-api.onrender.com/api/health',
  'https://sswanstudios-backend.onrender.com/api/health'
];

import fetch from 'node-fetch';

async function testUrl(url) {
  try {
    console.log(`Testing: ${url}`);
    const response = await fetch(url, { 
      method: 'GET',
      timeout: 10000 
    });
    
    console.log(`✅ ${url} - Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.text();
      console.log(`📄 Response: ${data.substring(0, 100)}...`);
      return { url, status: response.status, working: true };
    }
    
    return { url, status: response.status, working: false };
    
  } catch (error) {
    console.log(`❌ ${url} - Error: ${error.message}`);
    return { url, error: error.message, working: false };
  }
}

async function findWorkingBackend() {
  console.log('🔍 Testing all possible backend URLs...\n');
  
  const results = [];
  
  for (const url of urlsToTest) {
    const result = await testUrl(url);
    results.push(result);
    console.log(''); // Add spacing
  }
  
  const workingUrls = results.filter(r => r.working);
  
  if (workingUrls.length > 0) {
    const correctUrl = workingUrls[0].url.replace('/api/health', '');
    console.log(`🎉 FOUND WORKING BACKEND: ${correctUrl}`);
    return correctUrl;
  } else {
    console.log('❌ No working backend found. Backend may be down.');
    return null;
  }
}

async function updateFrontendConfig(correctUrl) {
  if (!correctUrl) {
    console.log('⚠️ Cannot update config - no working backend found');
    return false;
  }
  
  console.log(`🔧 Updating frontend config to use: ${correctUrl}`);
  
  // Update .env.production
  const envContent = `# Production Environment Variables - UPDATED ${new Date().toISOString()}
VITE_API_URL=${correctUrl}
VITE_BACKEND_URL=${correctUrl}
VITE_NODE_ENV=production
`;
  
  // Write to file system
  const fs = await import('fs');
  const path = await import('path');
  
  const frontendDir = './frontend';
  const envFile = path.join(frontendDir, '.env.production');
  
  fs.writeFileSync(envFile, envContent);
  console.log(`✅ Updated: ${envFile}`);
  
  // Also update vite.config.js
  const viteConfigPath = path.join(frontendDir, 'vite.config.js');
  let viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
  
  // Replace the old URL with the new one
  viteConfig = viteConfig.replace(
    /https:\/\/ss-pt-new\.onrender\.com/g,
    correctUrl
  );
  
  fs.writeFileSync(viteConfigPath, viteConfig);
  console.log(`✅ Updated: ${viteConfigPath}`);
  
  return true;
}

async function testLogin(backendUrl) {
  console.log(`🔐 Testing login with admin credentials at: ${backendUrl}`);
  
  try {
    const loginResponse = await fetch(`${backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usernameOrEmail: 'admin',
        password: 'KlackKlack80'  // From .env
      })
    });
    
    console.log(`Login response status: ${loginResponse.status}`);
    
    if (loginResponse.ok) {
      const data = await loginResponse.json();
      console.log('✅ LOGIN SUCCESSFUL!');
      console.log(`👤 User: ${data.user?.firstName} ${data.user?.lastName}`);
      return true;
    } else {
      const errorData = await loginResponse.text();
      console.log('❌ LOGIN FAILED');
      console.log(`Error: ${errorData}`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Login test failed: ${error.message}`);
    return false;
  }
}

// Main execution
async function main() {
  try {
    const workingBackend = await findWorkingBackend();
    
    if (workingBackend) {
      const configUpdated = await updateFrontendConfig(workingBackend);
      
      if (configUpdated) {
        console.log('\n🧪 Testing login with updated configuration...');
        const loginWorks = await testLogin(workingBackend);
        
        if (loginWorks) {
          console.log('\n🎉 SUCCESS! Frontend config updated and login tested.');
          console.log('\n📋 NEXT STEPS:');
          console.log('1. Rebuild frontend: cd frontend && npm run build');
          console.log('2. Redeploy to production');
          console.log('3. Test login at https://sswanstudios.com');
          
        } else {
          console.log('\n⚠️ Config updated but login still failing.');
          console.log('💡 Check admin credentials in backend .env');
        }
      }
    } else {
      console.log('\n🔧 MANUAL ACTION NEEDED:');
      console.log('1. Check Render dashboard for actual backend URL');
      console.log('2. Ensure backend service is running');
      console.log('3. Update frontend/.env.production with correct URL');
    }
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

main();
