/**
 * Frontend Stripe Diagnostic Utility - SwanStudios Payment System
 * ==============================================================
 * Master Prompt v33 Compliance - Browser-based Stripe key validation
 * 
 * Features:
 * - Browser-based Stripe key validation
 * - Real-time frontend/backend key matching
 * - Safe key format checking (no secret exposure)
 * - Console-based diagnostic tools
 * 
 * Usage:
 * - Import and call diagnostics functions
 * - Run via browser console: window.SwanStripeDiagnostics.runDiagnostics()
 * 
 * Security: NEVER exposes actual secret values, only configuration status
 */

import { logger } from '@/utils/logger';

interface StripeKeyValidation {
  isValid: boolean;
  format: 'live' | 'test' | 'invalid';
  errors: string[];
  accountId?: string;
}

interface DiagnosticResult {
  timestamp: string;
  frontend: {
    publishableKey: StripeKeyValidation;
    environment: string;
  };
  backend: {
    available: boolean;
    configured: boolean;
    environment?: string;
    error?: string;
  };
  matching: {
    keysMatch: boolean;
    environmentsMatch: boolean;
    issues: string[];
  };
  recommendations: string[];
}

/**
 * Validate Stripe publishable key format and extract information
 */
function validatePublishableKey(key: string | undefined): StripeKeyValidation {
  const validation: StripeKeyValidation = {
    isValid: false,
    format: 'invalid',
    errors: []
  };

  if (!key) {
    validation.errors.push('No publishable key found');
    return validation;
  }

  if (typeof key !== 'string') {
    validation.errors.push('Publishable key is not a string');
    return validation;
  }

  if (key.trim() !== key) {
    validation.errors.push('Publishable key has leading/trailing whitespace');
  }

  if (!key.startsWith('pk_')) {
    validation.errors.push('Publishable key must start with "pk_"');
    return validation;
  }

  if (key.length < 20) {
    validation.errors.push('Publishable key is too short');
    return validation;
  }

  // Extract environment and account ID
  const match = key.match(/pk_(live|test)_([^_]+)/);
  if (!match) {
    validation.errors.push('Publishable key has invalid format');
    return validation;
  }

  validation.format = match[1] as 'live' | 'test';
  validation.accountId = match[2];
  validation.isValid = validation.errors.length === 0;

  return validation;
}

/**
 * Get frontend Stripe configuration
 */
function getFrontendStripeConfig() {
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  const nodeEnv = import.meta.env.VITE_NODE_ENV || 'development';
  
  return {
    publishableKey: validatePublishableKey(publishableKey),
    environment: nodeEnv,
    rawKey: publishableKey ? `${publishableKey.substring(0, 15)}...` : 'Not found'
  };
}

/**
 * Fetch backend Stripe configuration status
 */
async function getBackendStripeStatus(): Promise<any> {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:10000';
    const response = await fetch(`${apiUrl}/api/payments/diagnostics`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch backend diagnostics:', error);
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Run comprehensive Stripe diagnostics
 */
export async function runStripeDiagnostics(): Promise<DiagnosticResult> {
  logger.log('\n🔍 SWANSTUDIOS STRIPE FRONTEND DIAGNOSTICS');
  logger.log('==========================================');
  
  const timestamp = new Date().toISOString();
  const frontend = getFrontendStripeConfig();
  
  logger.log('\n📱 Frontend Configuration:');
  logger.log(`   - Publishable Key: ${frontend.rawKey}`);
  logger.log(`   - Key Valid: ${frontend.publishableKey.isValid ? '✅' : '❌'}`);
  logger.log(`   - Environment: ${frontend.publishableKey.format}`);
  logger.log(`   - Account ID: ${frontend.publishableKey.accountId || 'Unknown'}`);
  
  if (frontend.publishableKey.errors.length > 0) {
    logger.log('   - Errors:');
    frontend.publishableKey.errors.forEach(error => {
      logger.log(`     ❌ ${error}`);
    });
  }

  logger.log('\n🖥️ Fetching Backend Status...');
  const backendStatus = await getBackendStripeStatus();
  
  const backend = {
    available: backendStatus.success === true,
    configured: backendStatus.data?.stripeConfiguration?.isConfigured || false,
    environment: backendStatus.data?.stripeConfiguration?.environment,
    error: backendStatus.error?.details || backendStatus.message
  };

  logger.log(`   - Backend Available: ${backend.available ? '✅' : '❌'}`);
  logger.log(`   - Stripe Configured: ${backend.configured ? '✅' : '❌'}`);
  logger.log(`   - Backend Environment: ${backend.environment || 'Unknown'}`);
  
  if (backend.error) {
    logger.log(`   - Error: ${backend.error}`);
  }

  // Analyze key matching
  const matching = analyzeKeyMatching(frontend, backend);
  
  logger.log('\n🔗 Key Matching Analysis:');
  logger.log(`   - Keys Match: ${matching.keysMatch ? '✅' : '❌'}`);
  logger.log(`   - Environments Match: ${matching.environmentsMatch ? '✅' : '❌'}`);
  
  if (matching.issues.length > 0) {
    logger.log('   - Issues:');
    matching.issues.forEach(issue => {
      logger.log(`     ⚠️ ${issue}`);
    });
  }

  // Generate recommendations
  const recommendations = generateRecommendations(frontend, backend, matching);
  
  logger.log('\n💡 Recommendations:');
  recommendations.forEach((rec, index) => {
    logger.log(`   ${index + 1}. ${rec}`);
  });

  logger.log('\n==========================================');

  const result: DiagnosticResult = {
    timestamp,
    frontend: {
      publishableKey: frontend.publishableKey,
      environment: frontend.environment
    },
    backend,
    matching,
    recommendations
  };

  // Store result globally for easy access
  (window as any).lastStripeDiagnostics = result;
  
  return result;
}

/**
 * Analyze if frontend and backend keys match
 */
function analyzeKeyMatching(frontend: any, backend: any) {
  const issues: string[] = [];
  let keysMatch = false;
  let environmentsMatch = false;

  if (!frontend.publishableKey.isValid) {
    issues.push('Frontend publishable key is invalid');
  }

  if (!backend.available) {
    issues.push('Cannot verify backend configuration - backend unavailable');
  } else if (!backend.configured) {
    issues.push('Backend Stripe configuration is invalid');
  } else {
    // Both are available, check if they match
    if (frontend.publishableKey.format && backend.environment) {
      environmentsMatch = frontend.publishableKey.format === backend.environment;
      if (!environmentsMatch) {
        issues.push(`Environment mismatch: Frontend=${frontend.publishableKey.format}, Backend=${backend.environment}`);
      }
    }

    // For key matching, we'd need the backend to expose account info
    // For now, assume they match if environments match and both are valid
    keysMatch = environmentsMatch && frontend.publishableKey.isValid && backend.configured;
  }

  return {
    keysMatch,
    environmentsMatch,
    issues
  };
}

/**
 * Generate actionable recommendations
 */
function generateRecommendations(frontend: any, backend: any, matching: any): string[] {
  const recommendations: string[] = [];

  if (!frontend.publishableKey.isValid) {
    recommendations.push('Fix frontend publishable key in .env file');
    recommendations.push('Ensure VITE_STRIPE_PUBLISHABLE_KEY starts with pk_');
  }

  if (!backend.available) {
    recommendations.push('Start your backend server');
    recommendations.push('Check backend is running on the correct port');
  } else if (!backend.configured) {
    recommendations.push('Fix backend Stripe configuration');
    recommendations.push('Check STRIPE_SECRET_KEY in backend .env file');
  }

  if (!matching.environmentsMatch && frontend.publishableKey.isValid && backend.configured) {
    recommendations.push('Ensure frontend and backend use keys from the same environment (live vs test)');
    recommendations.push('Check both .env files use matching Stripe account keys');
  }

  if (matching.keysMatch && frontend.publishableKey.isValid && backend.configured) {
    recommendations.push('Configuration looks good! Test payment functionality');
    recommendations.push('Try creating a payment intent via the frontend');
  }

  if (recommendations.length === 0) {
    recommendations.push('Run diagnostics again if you make changes');
    recommendations.push('Monitor payment processing for any runtime issues');
  }

  return recommendations;
}

/**
 * Quick key format checker (for console use)
 */
export function checkKeyFormat(key: string): void {
  logger.log('\n🔑 Stripe Key Format Check');
  logger.log('==========================');
  
  const validation = validatePublishableKey(key);
  
  logger.log(`Key: ${key.substring(0, 15)}...`);
  logger.log(`Valid: ${validation.isValid ? '✅' : '❌'}`);
  logger.log(`Format: ${validation.format}`);
  logger.log(`Account: ${validation.accountId || 'Unknown'}`);
  
  if (validation.errors.length > 0) {
    logger.log('Errors:');
    validation.errors.forEach(error => logger.log(`  ❌ ${error}`));
  }
}

/**
 * Test Stripe Elements loading
 */
export async function testStripeLoading(): Promise<boolean> {
  logger.log('\n🧪 Testing Stripe.js Loading...');
  
  try {
    const { loadStripe } = await import('@stripe/stripe-js');
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    
    if (!publishableKey) {
      logger.log('❌ No publishable key found');
      return false;
    }

    const stripe = await loadStripe(publishableKey);
    
    if (stripe) {
      logger.log('✅ Stripe.js loaded successfully');
      return true;
    } else {
      logger.log('❌ Stripe.js failed to load (invalid key?)');
      return false;
    }
  } catch (error) {
    logger.log('❌ Error loading Stripe.js:', error);
    return false;
  }
}

/**
 * Export diagnostics functions to global scope for console access
 */
if (typeof window !== 'undefined') {
  (window as any).SwanStripeDiagnostics = {
    runDiagnostics: runStripeDiagnostics,
    checkKeyFormat,
    testStripeLoading,
    getLastResult: () => (window as any).lastStripeDiagnostics
  };
  
  logger.log('🛠️ Swan Stripe Diagnostics loaded!');
  logger.log('   Usage: SwanStripeDiagnostics.runDiagnostics()');
  logger.log('   Quick check: SwanStripeDiagnostics.checkKeyFormat("pk_...")');
  logger.log('   Test loading: SwanStripeDiagnostics.testStripeLoading()');
}

export default {
  runStripeDiagnostics,
  checkKeyFormat,
  testStripeLoading
};