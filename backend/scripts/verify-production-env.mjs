#!/usr/bin/env node

/**
 * Production Environment Verification Script
 * ==========================================
 * Verifies required production variables without printing secret values.
 */

import crypto from 'crypto';

console.log('SwanStudios Production Environment Check');
console.log('========================================\n');

const REQUIRED_ENV_VARS = [
  { name: 'NODE_ENV', expected: 'production', critical: true },
  { name: 'PORT', expected: '10000', critical: true },
  { name: 'DATABASE_URL', description: 'PostgreSQL connection string from Render', critical: true, secret: true },
  { name: 'FRONTEND_ORIGINS', description: 'Comma-separated allowed origins', critical: true },
  { name: 'JWT_SECRET', description: 'JWT signing secret, minimum 32 chars', critical: true, secret: true },
  { name: 'ACCESS_TOKEN_EXPIRY', expected: '3600', critical: false },
  { name: 'USE_SQLITE_FALLBACK', expected: 'false', critical: false },
  { name: 'ENABLE_MCP_ROUTES', expected: 'false', critical: false },
  { name: 'ENABLE_MCP_HEALTH_CHECKS', expected: 'false', critical: false },
  { name: 'ENABLE_MCP_HEALTH_ALERTS', expected: 'false', critical: false },
  { name: 'ENABLE_MCP_SERVICES', expected: 'false', critical: false }
];

let criticalIssues = 0;
let warnings = 0;

function describeValue(envVar, value) {
  if (envVar.secret) {
    return value ? `[SET ${value.length} chars]` : '[MISSING]';
  }

  return value || '[MISSING]';
}

function checkEnvironmentVariable(envVar) {
  const value = process.env[envVar.name];
  const isSet = Boolean(value);

  console.log(`${isSet ? 'OK' : 'MISSING'} ${envVar.name}`);

  if (!isSet) {
    if (envVar.critical) {
      console.log('   CRITICAL: Missing required variable');
      criticalIssues++;
    } else {
      console.log('   WARNING: Recommended variable not set');
      warnings++;
    }

    if (envVar.description) {
      console.log(`   Description: ${envVar.description}`);
    }
  } else {
    console.log(`   Set: ${describeValue(envVar, value)}`);

    if (envVar.expected && value !== envVar.expected) {
      console.log(`   WARNING: Expected '${envVar.expected}'`);
      warnings++;
    }

    if (envVar.name === 'JWT_SECRET' && value.length < 32) {
      console.log(`   WARNING: JWT_SECRET should be at least 32 characters, current length ${value.length}`);
      warnings++;
    }

    if (envVar.name === 'FRONTEND_ORIGINS') {
      const origins = value.split(',').map((origin) => origin.trim()).filter(Boolean);
      console.log(`   Origins configured: ${origins.length}`);

      if (!origins.some((origin) => origin.includes('sswanstudios.com'))) {
        console.log('   WARNING: No sswanstudios.com origin found');
        warnings++;
      }
    }
  }

  console.log('');
}

function generateJWTSecretCommand() {
  const sample = crypto.randomBytes(64).toString('hex');
  return `Set JWT_SECRET to a generated 64-byte hex secret. Example length: ${sample.length} chars.`;
}

for (const envVar of REQUIRED_ENV_VARS) {
  checkEnvironmentVariable(envVar);
}

console.log('Summary');
console.log('-------');
console.log(`Critical Issues: ${criticalIssues}`);
console.log(`Warnings: ${warnings}`);
console.log('');

if (criticalIssues > 0) {
  console.log('DEPLOYMENT BLOCKED: Critical environment variables missing');
  console.log(generateJWTSecretCommand());
  process.exit(1);
}

if (warnings > 0) {
  console.log('DEPLOYMENT POSSIBLE: warnings should be reviewed before release');
} else {
  console.log('DEPLOYMENT READY: all checked environment variables are configured');
}
