#!/usr/bin/env node

/**
 * Production Environment Verification Script
 * ==========================================
 * Verifies all required environment variables are set for production deployment
 */

console.log('🔍 SwanStudios Production Environment Check');
console.log('==========================================\\n');

const REQUIRED_ENV_VARS = [
  { name: 'NODE_ENV', expected: 'production', critical: true },
  { name: 'PORT', expected: '10000', critical: true },
  { name: 'DATABASE_URL', description: 'PostgreSQL connection string (set by Render)', critical: true },
  { name: 'FRONTEND_ORIGINS', description: 'Comma-separated list of allowed origins', critical: true },
  { name: 'JWT_SECRET', description: 'Secret key for JWT tokens (min 32 chars)', critical: true },
  { name: 'ACCESS_TOKEN_EXPIRY', expected: '3600', critical: false },
  { name: 'USE_SQLITE_FALLBACK', expected: 'false', critical: false }
];

const OPTIONAL_ENV_VARS = [
  { name: 'ENABLE_MCP_HEALTH_CHECKS', expected: 'false' },
  { name: 'ENABLE_MCP_HEALTH_ALERTS', expected: 'false' },
  { name: 'ENABLE_MCP_SERVICES', expected: 'false' }
];

let criticalIssues = 0;
let warnings = 0;

function checkEnvironmentVariable(envVar) {
  const value = process.env[envVar.name];
  const status = value ? '✅' : '❌';
  
  console.log(`${status} ${envVar.name}`);
  
  if (!value) {
    if (envVar.critical) {
      console.log(`   🚨 CRITICAL: Missing required variable`);
      criticalIssues++;
    } else {
      console.log(`   ⚠️  WARNING: Recommended variable not set`);
      warnings++;
    }
    
    if (envVar.description) {
      console.log(`   📝 Description: ${envVar.description}`);
    }
    
    if (envVar.expected) {
      console.log(`   💡 Expected value: ${envVar.expected}`);
    }
  } else {
    console.log(`   ✅ Set: ${value.length > 50 ? '[LONG VALUE]' : value}`);
    
    // Validate specific values
    if (envVar.expected && value !== envVar.expected) {
      console.log(`   ⚠️  WARNING: Expected '${envVar.expected}', got '${value}'`);
      warnings++;
    }
    
    // Validate JWT secret length
    if (envVar.name === 'JWT_SECRET' && value.length < 32) {
      console.log(`   ⚠️  WARNING: JWT_SECRET should be at least 32 characters (current: ${value.length})`);
      warnings++;
    }
    
    // Validate FRONTEND_ORIGINS format
    if (envVar.name === 'FRONTEND_ORIGINS') {
      const origins = value.split(',');
      console.log(`   📊 Origins configured: ${origins.length}`);
      origins.forEach((origin, index) => {
        console.log(`     ${index + 1}. ${origin.trim()}`);
      });
      
      if (!origins.some(origin => origin.includes('sswanstudios.com'))) {
        console.log(`   ⚠️  WARNING: No sswanstudios.com origin found`);
        warnings++;
      }
    }
  }
  
  console.log('');
}

function generateJWTSecret() {
  try {
    const crypto = await import('crypto');
    return crypto.randomBytes(64).toString('hex');
  } catch (error) {
    return 'Please use: node -e "console.log(require(\\'crypto\\').randomBytes(64).toString(\\'hex\\'))"';
  }
}

async function main() {
  console.log('🔐 Required Environment Variables:');
  console.log('─'.repeat(40));
  
  for (const envVar of REQUIRED_ENV_VARS) {
    checkEnvironmentVariable(envVar);
  }
  
  console.log('🔧 Optional Environment Variables:');
  console.log('─'.repeat(40));
  
  for (const envVar of OPTIONAL_ENV_VARS) {
    checkEnvironmentVariable(envVar);
  }
  
  console.log('📊 Summary:');
  console.log('─'.repeat(20));
  console.log(`🚨 Critical Issues: ${criticalIssues}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log('');
  
  if (criticalIssues > 0) {
    console.log('❌ DEPLOYMENT BLOCKED: Critical environment variables missing');
    console.log('');
    console.log('🔧 Required Actions:');
    console.log('1. Set missing environment variables in Render dashboard');
    console.log('2. Generate JWT_SECRET if missing:');
    console.log(`   ${await generateJWTSecret()}`);
    console.log('3. Redeploy after setting environment variables');
    console.log('');
    process.exit(1);
  } else if (warnings > 0) {
    console.log('⚠️  DEPLOYMENT POSSIBLE: With warnings');
    console.log('Consider fixing warnings for optimal performance');
    console.log('');
  } else {
    console.log('✅ DEPLOYMENT READY: All environment variables properly configured');
    console.log('');
  }
  
  console.log('🚀 Next Steps:');
  console.log('1. Ensure these variables are set in Render service dashboard');
  console.log('2. Deploy the updated code');
  console.log('3. Test with: npm run test-health');
  console.log('4. Check frontend connectivity');
}

main().catch(error => {
  console.error('Environment check failed:', error);
  process.exit(1);
});
