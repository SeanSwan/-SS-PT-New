/**
 * Stripe Account Validator
 * ========================
 * Real-time validation tool to detect key mismatches
 * Prevents 401 errors before they happen
 */

export class StripeAccountValidator {
  static extractAccountFromPaymentIntent(clientSecret: string): string | null {
    // Payment intent format: pi_[random]_secret_[random]
    // But the account is embedded in the payment intent ID
    const match = clientSecret.match(/pi_[A-Za-z0-9]+([A-Za-z0-9]{16})/);
    return match ? match[1] : null;
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
    const backendAccount = this.extractAccountFromPaymentIntent(clientSecret);
    const frontendAccount = this.extractAccountFromKey(publishableKey);

    console.log('🔍 ACCOUNT VALIDATION CHECK:');
    console.log(`   Backend (from payment intent): ${backendAccount || 'Unable to extract'}`);
    console.log(`   Frontend (from publishable key): ${frontendAccount || 'Unable to extract'}`);

    if (!backendAccount || !frontendAccount) {
      return {
        valid: false,
        backendAccount,
        frontendAccount,
        details: 'Unable to extract account IDs for comparison'
      };
    }

    if (backendAccount === frontendAccount) {
      console.log('✅ ACCOUNT MATCH: Frontend and backend keys are from the same Stripe account');
      return {
        valid: true,
        backendAccount,
        frontendAccount,
        details: `Account match confirmed: ${backendAccount}`
      };
    } else {
      console.error('❌ ACCOUNT MISMATCH DETECTED:');
      console.error(`   Backend account: ${backendAccount}`);
      console.error(`   Frontend account: ${frontendAccount}`);
      console.error('🚨 This WILL cause 401 Unauthorized errors!');
      
      return {
        valid: false,
        backendAccount,
        frontendAccount,
        details: `Account mismatch: Backend(${backendAccount}) !== Frontend(${frontendAccount})`
      };
    }
  }

  static createValidationDisplay(validation: ReturnType<typeof StripeAccountValidator.validateAccountMatch>) {
    return {
      type: validation.valid ? 'success' : 'error',
      title: validation.valid ? 'Account Validation Passed' : 'Account Validation Failed',
      message: validation.details,
      action: validation.valid ? null : 'Update frontend .env with matching publishable key'
    };
  }
}

export default StripeAccountValidator;
