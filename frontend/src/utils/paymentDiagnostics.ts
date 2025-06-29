/**
 * Payment Diagnostics Utility
 * ===========================
 * Comprehensive payment system diagnostics and validation
 * Helps debug 401 errors, client secret issues, and API key mismatches
 */

interface PaymentDiagnosticResult {
  success: boolean;
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    code: string;
    message: string;
    recommendation?: string;
  }>;
  environment: {
    frontend: string;
    backend: string;
    stripe: string;
  };
  keys: {
    publishableKey: {
      present: boolean;
      format: string;
      environment: 'live' | 'test' | 'unknown';
      length: number;
    };
  };
  connectivity: {
    backendReachable: boolean;
    stripeReachable: boolean;
    paymentEndpointAvailable: boolean;
  };
}

class PaymentDiagnostics {
  private issues: PaymentDiagnosticResult['issues'] = [];

  /**
   * Run comprehensive payment system diagnostics
   */
  async runDiagnostics(): Promise<PaymentDiagnosticResult> {
    console.log('🔧 [Payment Diagnostics] Starting comprehensive system check...');
    this.issues = [];

    const environment = this.checkEnvironment();
    const keys = this.validateKeys();
    const connectivity = await this.checkConnectivity();

    // Cross-validate frontend and backend configuration
    await this.validateIntegration();

    const result: PaymentDiagnosticResult = {
      success: this.issues.filter(issue => issue.severity === 'error').length === 0,
      issues: this.issues,
      environment,
      keys,
      connectivity
    };

    console.log('📊 [Payment Diagnostics] Results:', result);
    return result;
  }

  /**
   * Check environment configuration
   */
  private checkEnvironment() {
    const frontend = import.meta.env.VITE_NODE_ENV || 'development';
    const backend = import.meta.env.VITE_API_URL || 'unknown';
    
    let stripe = 'unknown';
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (publishableKey) {
      if (publishableKey.includes('_live_')) {
        stripe = 'live';
      } else if (publishableKey.includes('_test_')) {
        stripe = 'test';
      }
    }

    // Check for environment mismatches
    if (frontend === 'production' && stripe === 'test') {
      this.issues.push({
        severity: 'warning',
        code: 'ENV_MISMATCH_TEST_IN_PROD',
        message: 'Using Stripe test keys in production environment',
        recommendation: 'Switch to live Stripe keys for production use'
      });
    }

    if (frontend === 'development' && stripe === 'live') {
      this.issues.push({
        severity: 'warning',
        code: 'ENV_MISMATCH_LIVE_IN_DEV',
        message: 'Using Stripe live keys in development environment',
        recommendation: 'Be cautious with live payment processing in development'
      });
    }

    return { frontend, backend, stripe };
  }

  /**
   * Validate Stripe keys
   */
  private validateKeys() {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    
    const keyInfo = {
      present: !!publishableKey,
      format: 'invalid',
      environment: 'unknown' as 'live' | 'test' | 'unknown',
      length: publishableKey?.length || 0
    };

    if (!publishableKey) {
      this.issues.push({
        severity: 'error',
        code: 'MISSING_PUBLISHABLE_KEY',
        message: 'VITE_STRIPE_PUBLISHABLE_KEY is missing',
        recommendation: 'Add Stripe publishable key to environment variables'
      });
      return { publishableKey: keyInfo };
    }

    if (!publishableKey.startsWith('pk_')) {
      this.issues.push({
        severity: 'error',
        code: 'INVALID_PUBLISHABLE_KEY_FORMAT',
        message: 'Publishable key must start with pk_',
        recommendation: 'Check your Stripe publishable key format'
      });
    } else {
      keyInfo.format = 'valid';
    }

    if (publishableKey.includes('_live_')) {
      keyInfo.environment = 'live';
    } else if (publishableKey.includes('_test_')) {
      keyInfo.environment = 'test';
    }

    if (publishableKey.length < 50) {
      this.issues.push({
        severity: 'warning',
        code: 'SHORT_PUBLISHABLE_KEY',
        message: 'Publishable key seems unusually short',
        recommendation: 'Verify the complete key was copied'
      });
    }

    return { publishableKey: keyInfo };
  }

  /**
   * Check backend connectivity
   */
  private async checkConnectivity() {
    const backendUrl = import.meta.env.VITE_API_URL || window.location.origin;
    
    const connectivity = {
      backendReachable: false,
      stripeReachable: false,
      paymentEndpointAvailable: false
    };

    // Test backend connectivity
    try {
      const response = await fetch(`${backendUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      connectivity.backendReachable = response.ok;
      
      if (!response.ok) {
        this.issues.push({
          severity: 'error',
          code: 'BACKEND_UNREACHABLE',
          message: `Backend health check failed: ${response.status} ${response.statusText}`,
          recommendation: 'Check backend server status and URL configuration'
        });
      }
    } catch (error) {
      this.issues.push({
        severity: 'error',
        code: 'BACKEND_CONNECTION_ERROR',
        message: `Cannot reach backend: ${error}`,
        recommendation: 'Check network connection and backend URL'
      });
    }

    // Test payment endpoint specifically
    try {
      const response = await fetch(`${backendUrl}/api/payments/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      connectivity.paymentEndpointAvailable = response.ok;
      
      if (!response.ok) {
        this.issues.push({
          severity: 'error',
          code: 'PAYMENT_ENDPOINT_UNAVAILABLE',
          message: `Payment service unavailable: ${response.status}`,
          recommendation: 'Check payment service configuration'
        });
      }
    } catch (error) {
      this.issues.push({
        severity: 'warning',
        code: 'PAYMENT_ENDPOINT_ERROR',
        message: `Payment endpoint check failed: ${error}`,
        recommendation: 'Payment service may not be running'
      });
    }

    // Test Stripe API reachability
    try {
      const response = await fetch('https://api.stripe.com/v1/payment_methods', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY}`
        }
      });
      
      connectivity.stripeReachable = true;
      
      if (response.status === 401) {
        this.issues.push({
          severity: 'error',
          code: 'STRIPE_API_UNAUTHORIZED',
          message: 'Stripe API returned 401 Unauthorized',
          recommendation: 'Check publishable key validity and format'
        });
      }
    } catch (error) {
      this.issues.push({
        severity: 'warning',
        code: 'STRIPE_API_CONNECTION_ERROR',
        message: `Cannot reach Stripe API: ${error}`,
        recommendation: 'Check network connection to Stripe'
      });
    }

    return connectivity;
  }

  /**
   * Validate frontend-backend integration
   */
  private async validateIntegration() {
    // Try to validate that frontend and backend keys match
    try {
      const backendUrl = import.meta.env.VITE_API_URL || window.location.origin;
      const response = await fetch(`${backendUrl}/api/payments/stripe-validation`);
      
      if (response.ok) {
        const validation = await response.json();
        
        if (validation.data?.validation?.environment) {
          const backendEnv = validation.data.validation.environment;
          const frontendEnv = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.includes('_live_') ? 'live' : 'test';
          
          if (backendEnv !== frontendEnv) {
            this.issues.push({
              severity: 'error',
              code: 'FRONTEND_BACKEND_KEY_MISMATCH',
              message: `Frontend using ${frontendEnv} keys, backend using ${backendEnv} keys`,
              recommendation: 'Ensure frontend and backend use matching Stripe key environments'
            });
          } else {
            this.issues.push({
              severity: 'info',
              code: 'FRONTEND_BACKEND_KEY_MATCH',
              message: `Frontend and backend both using ${frontendEnv} environment`,
              recommendation: 'Key environments are correctly matched'
            });
          }
        }
        
        if (!validation.data?.validation?.configured) {
          this.issues.push({
            severity: 'error',
            code: 'BACKEND_STRIPE_NOT_CONFIGURED',
            message: 'Backend Stripe configuration is invalid',
            recommendation: 'Check backend environment variables and Stripe configuration'
          });
        }
      }
    } catch (error) {
      this.issues.push({
        severity: 'warning',
        code: 'INTEGRATION_VALIDATION_FAILED',
        message: 'Could not validate frontend-backend integration',
        recommendation: 'Check backend connectivity and validation endpoint'
      });
    }
  }

  /**
   * Get recommendations for fixing issues
   */
  getRecommendations(): string[] {
    return this.issues
      .filter(issue => issue.recommendation)
      .map(issue => `${issue.severity.toUpperCase()}: ${issue.recommendation}`);
  }

  /**
   * Generate diagnostic report
   */
  generateReport(results: PaymentDiagnosticResult): string {
    const lines = [
      '='.repeat(60),
      '🔧 PAYMENT SYSTEM DIAGNOSTIC REPORT',
      '='.repeat(60),
      '',
      `📊 Overall Status: ${results.success ? '✅ HEALTHY' : '❌ ISSUES FOUND'}`,
      '',
      '🌍 Environment:',
      `   Frontend: ${results.environment.frontend}`,
      `   Backend: ${results.environment.backend}`,
      `   Stripe: ${results.environment.stripe}`,
      '',
      '🔑 Keys:',
      `   Publishable Key: ${results.keys.publishableKey.present ? '✅' : '❌'} ${results.keys.publishableKey.format} (${results.keys.publishableKey.environment})`,
      '',
      '🌐 Connectivity:',
      `   Backend: ${results.connectivity.backendReachable ? '✅' : '❌'}`,
      `   Stripe API: ${results.connectivity.stripeReachable ? '✅' : '❌'}`,
      `   Payment Endpoint: ${results.connectivity.paymentEndpointAvailable ? '✅' : '❌'}`,
      ''
    ];

    if (results.issues.length > 0) {
      lines.push('⚠️ Issues Found:');
      results.issues.forEach(issue => {
        const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        lines.push(`   ${icon} [${issue.code}] ${issue.message}`);
        if (issue.recommendation) {
          lines.push(`      💡 ${issue.recommendation}`);
        }
      });
      lines.push('');
    }

    lines.push('='.repeat(60));

    return lines.join('\n');
  }
}

// Create global instance for browser console access
const paymentDiagnostics = new PaymentDiagnostics();

// Make available globally for debugging
declare global {
  interface Window {
    SwanPaymentDiagnostics: {
      run: () => Promise<PaymentDiagnosticResult>;
      runAndReport: () => Promise<void>;
    };
  }
}

if (typeof window !== 'undefined') {
  window.SwanPaymentDiagnostics = {
    run: () => paymentDiagnostics.runDiagnostics(),
    runAndReport: async () => {
      const results = await paymentDiagnostics.runDiagnostics();
      console.log(paymentDiagnostics.generateReport(results));
      return results;
    }
  };
}

export default paymentDiagnostics;
export { PaymentDiagnostics };
export type { PaymentDiagnosticResult };
