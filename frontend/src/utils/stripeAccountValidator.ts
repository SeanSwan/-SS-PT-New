/**
 * Stripe Account Validator
 * ========================
 * Real-time validation tool to detect key mismatches
 * Prevents 401 errors before they happen
 * 
 * SIMPLIFIED APPROACH: Focus on environment consistency rather than account parsing
 */

import { logger } from '@/utils/logger';

export class StripeAccountValidator {
  static extractAccountFromPaymentIntent(_clientSecret: string): string | null {
    // DEPRECATED: Payment intent ID parsing is unreliable
    // Instead, we'll focus on environment consistency
    return null;
  }

  static extractAccountFromKey(key: string): string | null {
    const match = key.match(/p[kr]_(?:live|test)_([A-Za-z0-9]{16,})/);
    return match ? match[1].substring(0, 16) : null;
  }

  static validateAccountMatch(clientSecret: string, publishableKey: string): {
    valid: boolean;
    backendAccount: string | null;
    frontendAccount: string | null;
    details: string;
  } {
    logger.log('🔍 ACCOUNT VALIDATION CHECK:');
    
    // SIMPLIFIED VALIDATION: Check environment consistency
    const isBackendLive = clientSecret.startsWith('pi_') && !clientSecret.includes('_test_');
    const isFrontendLive = publishableKey.includes('pk_live_');
    const isFrontendTest = publishableKey.includes('pk_test_');
    
    // Extract frontend account ID for logging
    const frontendAccount = this.extractAccountFromKey(publishableKey);
    
    logger.log(`   Backend environment: ${isBackendLive ? 'LIVE' : 'TEST'}`);
    logger.log(`   Frontend environment: ${isFrontendLive ? 'LIVE' : (isFrontendTest ? 'TEST' : 'UNKNOWN')}`);
    logger.log(`   Frontend account ID: ${frontendAccount || 'Unable to extract'}`);
    
    // Check environment consistency
    if (isBackendLive && isFrontendLive) {
      logger.log('✅ ENVIRONMENT MATCH: Both backend and frontend using LIVE Stripe keys');
      logger.log('✅ ACCOUNT VALIDATION PASSED: Keys are from same environment');
      
      return {
        valid: true,
        backendAccount: 'live-env',
        frontendAccount: frontendAccount || 'live-env',
        details: 'Environment consistency verified - both using live Stripe keys'
      };
    }
    
    if (!isBackendLive && isFrontendTest) {
      logger.log('✅ ENVIRONMENT MATCH: Both backend and frontend using TEST Stripe keys');
      logger.log('✅ ACCOUNT VALIDATION PASSED: Keys are from same environment');
      
      return {
        valid: true,
        backendAccount: 'test-env',
        frontendAccount: frontendAccount || 'test-env',
        details: 'Environment consistency verified - both using test Stripe keys'
      };
    }
    
    // Environment mismatch detected
    console.error('❌ ENVIRONMENT MISMATCH DETECTED:');
    console.error(`   Backend: ${isBackendLive ? 'LIVE' : 'TEST'} environment`);
    console.error(`   Frontend: ${isFrontendLive ? 'LIVE' : (isFrontendTest ? 'TEST' : 'UNKNOWN')} environment`);
    console.error('🚨 This WILL cause 401 Unauthorized errors!');
    
    return {
      valid: false,
      backendAccount: isBackendLive ? 'live-env' : 'test-env',
      frontendAccount: frontendAccount,
      details: `Environment mismatch: Backend(${isBackendLive ? 'LIVE' : 'TEST'}) !== Frontend(${isFrontendLive ? 'LIVE' : 'TEST'})`
    };
  }

  static createValidationDisplay(validation: ReturnType<typeof StripeAccountValidator.validateAccountMatch>) {
    return {
      type: validation.valid ? 'success' : 'error',
      title: validation.valid ? 'Stripe Environment Validation Passed' : 'Stripe Environment Validation Failed',
      message: validation.details,
      action: validation.valid ? null : 'Ensure both frontend and backend use matching Stripe environment (live or test)'
    };
  }
}

export default StripeAccountValidator;
