#!/usr/bin/env node
/**
 * manualDiagnostics.mjs
 * ====================
 * Manual diagnostics runner for troubleshooting
 * Run with: node backend/utils/manualDiagnostics.mjs
 */

import { performEnvironmentDiagnostics } from './environmentDiagnostics.mjs';

try {
  console.log('🔧 Running SwanStudios Environment Diagnostics...\n');
  const results = performEnvironmentDiagnostics();
  
  console.log('\n🎯 Diagnostics completed successfully!');
  console.log('📋 Results saved for troubleshooting.');
  
  // Exit with error code if there are recommendations (issues found)
  if (results.recommendations.length > 0) {
    console.log(`\n⚠️  Found ${results.recommendations.length} configuration issue(s).`);
    process.exit(1);
  } else {
    console.log('\n✅ All systems operational!');
    process.exit(0);
  }
} catch (error) {
  console.error('❌ Failed to run diagnostics:', error.message);
  process.exit(1);
}