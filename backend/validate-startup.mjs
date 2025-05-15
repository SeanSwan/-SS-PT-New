#!/usr/bin/env node

/**
 * STARTUP VALIDATION SCRIPT
 * Tests all critical components before server starts
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import chalk from 'chalk';

console.log(chalk.blue.bold('🔬 SwanStudios Startup Validation'));
console.log('===================================\\n');

const errors = [];
const warnings = [];

async function validateEnvironment() {
  console.log(chalk.yellow('Validating Environment...'));
  
  // Check critical environment variables
  const required = ['JWT_SECRET', 'MONGODB_URI', 'PG_HOST'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    errors.push(`Missing required environment variables: ${missing.join(', ')}`);
  } else {
    console.log('✅ Environment variables OK');
  }
  
  // Validate port configuration
  const port = process.env.PORT || process.env.BACKEND_PORT || '10000';
  if (port !== '10000') {
    warnings.push(`Backend port is ${port}, expected 10000`);
  }
  
  console.log('');
}

async function validateCriticalImports() {
  console.log(chalk.yellow('Validating Critical Imports...'));
  
  const imports = [
    { path: './services/privacy/PIIManager.mjs', name: 'PIIManager' },
    { path: './utils/monitoring/piiSafeLogging.mjs', name: 'piiSafeLogging' },
    { path: './utils/apiKeyChecker.mjs', name: 'apiKeyChecker' },
    { path: './database.mjs', name: 'database' }
  ];
  
  for (const imp of imports) {
    try {
      if (!existsSync(imp.path.substring(2))) {
        errors.push(`Missing critical file: ${imp.path}`);
        continue;
      }
      
      const module = await import(imp.path);
      console.log(`✅ ${imp.name} imported successfully`);
    } catch (error) {
      errors.push(`Failed to import ${imp.name}: ${error.message}`);
    }
  }
  
  console.log('');
}

async function validatePIIComponents() {
  console.log(chalk.yellow('Validating PII Components...'));
  
  try {
    const { piiManager } = await import('./services/privacy/PIIManager.mjs');
    
    // Test with problematic inputs that caused the original error
    const testInputs = [
      null,
      undefined,
      '',
      'test string',
      123,
      [],
      {},
      'test@example.com'
    ];
    
    for (const input of testInputs) {
      try {
        const result = await piiManager.scanForPII(input);
        if (!result || typeof result !== 'object') {
          errors.push(`PIIManager.scanForPII returned invalid result for input: ${typeof input}`);
        }
      } catch (error) {
        errors.push(`PIIManager.scanForPII failed for ${typeof input}: ${error.message}`);
      }
    }
    
    // Test sanitization
    try {
      const sanitizeResult = await piiManager.sanitizeContent('test content');
      if (!sanitizeResult || !sanitizeResult.hasOwnProperty('sanitizedContent')) {
        errors.push('PIIManager.sanitizeContent returned invalid result');
      }
    } catch (error) {
      errors.push(`PIIManager.sanitizeContent failed: ${error.message}`);
    }
    
    if (errors.length === 0) {
      console.log('✅ PII components validated successfully');
    }
  } catch (error) {
    errors.push(`Failed to load PIIManager: ${error.message}`);
  }
  
  console.log('');
}

async function validateDatabase() {
  console.log(chalk.yellow('Validating Database Configuration...'));
  
  // Check database configuration
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.DATABASE_URL) {
      errors.push('DATABASE_URL required for production');
    } else {
      console.log('✅ Production database URL configured');
    }
  } else {
    const dbVars = ['PG_HOST', 'PG_DB', 'PG_USER'];
    const missing = dbVars.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      warnings.push(`Development DB vars missing: ${missing.join(', ')}`);
    } else {
      console.log('✅ Development database configuration OK');
    }
  }
  
  // Check MongoDB configuration
  if (!process.env.MONGODB_URI) {
    warnings.push('MONGODB_URI not configured');
  } else {
    console.log('✅ MongoDB configuration OK');
  }
  
  console.log('');
}

async function validateRoutes() {
  console.log(chalk.yellow('Validating Route Files...'));
  
  const routes = [
    'routes/authRoutes.mjs',
    'routes/profileRoutes.mjs',
    'routes/healthRoutes.mjs'
  ];
  
  for (const route of routes) {
    if (!existsSync(route)) {
      errors.push(`Missing route file: ${route}`);
    } else {
      console.log(`✅ ${route} exists`);
    }
  }
  
  console.log('');
}

async function generateReport() {
  console.log(chalk.blue.bold('📊 Validation Report'));
  console.log('====================\\n');
  
  if (errors.length === 0) {
    console.log(chalk.green.bold('✅ ALL VALIDATIONS PASSED!'));
    console.log(chalk.green('The backend should start successfully.\\n'));
    
    if (warnings.length > 0) {
      console.log(chalk.yellow.bold('⚠️  Warnings:'));
      warnings.forEach(warning => console.log(chalk.yellow(`  • ${warning}`)));
      console.log('');
    }
    
    console.log(chalk.blue('Next steps:'));
    console.log('1. Start the backend: npm run dev');
    console.log('2. Or run full system: npm start (from root directory)');
    console.log('');
    
    return true;
  } else {
    console.log(chalk.red.bold('❌ VALIDATION FAILED!'));
    console.log(chalk.red(`Found ${errors.length} error(s) that must be fixed:\\n`));
    
    errors.forEach((error, index) => {
      console.log(chalk.red(`${index + 1}. ${error}`));
    });
    
    if (warnings.length > 0) {
      console.log(chalk.yellow.bold('\\n⚠️  Additional warnings:'));
      warnings.forEach(warning => console.log(chalk.yellow(`  • ${warning}`)));
    }
    
    console.log(chalk.blue.bold('\\n🔧 Recommended Fixes:'));
    console.log('1. Run the PII fix script:');
    console.log('   node FINAL_FIX_ALL_ISSUES.mjs');
    console.log('2. Run the quick startup fix:');
    console.log('   node quick-startup-fix.mjs');
    console.log('3. Check environment variables in .env files');
    console.log('4. Ensure all dependencies are installed: npm install');
    console.log('');
    
    return false;
  }
}

async function runValidation() {
  await validateEnvironment();
  await validateCriticalImports();
  await validatePIIComponents();
  await validateDatabase();
  await validateRoutes();
  
  const passed = await generateReport();
  process.exit(passed ? 0 : 1);
}

// Handle uncaught errors during validation
process.on('uncaughtException', (error) => {
  console.error(chalk.red.bold('\\n💥 CRITICAL ERROR during validation:'));
  console.error(chalk.red(error.message));
  console.error(chalk.gray(error.stack));
  console.log(chalk.blue('\\nRun the diagnostic script for more details:'));
  console.log('node diagnose-startup.mjs');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red.bold('\\n💥 UNHANDLED REJECTION during validation:'));
  console.error(chalk.red(reason));
  console.log(chalk.blue('\\nRun the diagnostic script for more details:'));
  console.log('node diagnose-startup.mjs');
  process.exit(1);
});

runValidation();
