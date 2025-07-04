/**
 * PaymentService.mjs - Central Payment Strategy Orchestrator
 * =========================================================
 * The Swan Alchemist's Master Payment Service
 * Implements the Strategy Pattern for seamless payment method switching
 * 
 * Features:
 * - Environment-driven strategy selection
 * - Automatic fallback to manual payments
 * - Unified interface for all payment strategies
 * - Real-time strategy switching without code changes
 * - Comprehensive logging and monitoring
 * - Production-ready error handling
 * 
 * Strategy Options:
 * - 'checkout': Stripe Checkout (redirect) - Higher conversion rates
 * - 'elements': Stripe Elements (embedded) - Full control & customization
 * - 'manual': Manual/Offline processing - Ultimate fallback
 * 
 * Environment Variable: PAYMENT_STRATEGY
 * Default: 'checkout'
 * 
 * The Swan Alchemist's Payment Forging Accord Implementation
 * Master Prompt v33 Compliance: Anti-Confusion Protocol Enforced
 */

import Stripe from 'stripe';
import logger from '../../utils/logger.mjs';
import { isStripeEnabled } from '../../utils/apiKeyChecker.mjs';

// Import payment strategies
import ManualPaymentStrategy from './strategies/ManualPaymentStrategy.mjs';
import StripeCheckoutStrategy from './strategies/StripeCheckoutStrategy.mjs';
import StripeElementsStrategy from './strategies/StripeElementsStrategy.mjs';

class PaymentService {
  constructor() {
    this.serviceName = 'PaymentService';
    this.version = '1.0.0';
    this.initializationTime = new Date();
    
    // Strategy instances
    this.strategies = new Map();
    this.activeStrategy = null;
    this.activeStrategyName = null;
    
    // Stripe client (shared between strategies)
    this.stripeClient = null;
    this.stripeInitializationError = null;
    
    // Configuration
    this.paymentStrategy = this.determinePaymentStrategy();
    this.fallbackStrategy = 'manual'; // Ultimate fallback
    
    // Initialize the service
    this.initialize();
  }

  /**
   * Determine which payment strategy to use
   * Reads environment variable and validates the choice
   * 
   * @returns {string} Strategy name
   */
  determinePaymentStrategy() {
    const envStrategy = process.env.PAYMENT_STRATEGY?.toLowerCase();
    const validStrategies = ['checkout', 'elements', 'manual'];
    
    // Validate environment strategy
    if (envStrategy && validStrategies.includes(envStrategy)) {
      logger.info(`[PaymentService] Strategy set from environment: ${envStrategy}`);
      return envStrategy;
    }
    
    // Default strategy
    const defaultStrategy = 'checkout';
    
    if (envStrategy && !validStrategies.includes(envStrategy)) {
      logger.warn(`[PaymentService] Invalid strategy '${envStrategy}' in environment. Using default: ${defaultStrategy}`);
    } else {
      logger.info(`[PaymentService] Using default strategy: ${defaultStrategy}`);
    }
    
    return defaultStrategy;
  }

  /**
   * Initialize the payment service
   * Sets up Stripe client and strategy instances
   */
  async initialize() {
    try {
      console.log('\\n🔧 [PaymentService] PAYMENT SERVICE INITIALIZATION');
      console.log('==================================================');
      console.log(`   Service Version: ${this.version}`);
      console.log(`   Initialization Time: ${this.initializationTime.toISOString()}`);
      console.log(`   Target Strategy: ${this.paymentStrategy}`);
      console.log(`   Fallback Strategy: ${this.fallbackStrategy}`);
      console.log('==================================================');

      // Initialize Stripe client if needed
      await this.initializeStripeClient();

      // Initialize all strategies
      await this.initializeStrategies();

      // Set active strategy
      await this.setActiveStrategy(this.paymentStrategy);

      console.log('🎉 [PaymentService] Initialization complete!');
      console.log('==================================================\\n');

    } catch (error) {
      logger.error(`[PaymentService] Initialization failed: ${error.message}`);
      console.error(`💥 [PaymentService] Initialization failed: ${error.message}`);
      
      // Fallback to manual strategy
      await this.setActiveStrategy(this.fallbackStrategy);
    }
  }

  /**
   * Initialize Stripe client
   * Creates shared Stripe client for strategies that need it
   */
  async initializeStripeClient() {
    try {
      if (!isStripeEnabled()) {
        logger.info('[PaymentService] Stripe not enabled or not configured');
        console.log('   ⚠️ Stripe not enabled - will use manual strategy only');
        return;
      }

      const secretKey = process.env.STRIPE_SECRET_KEY;
      if (!secretKey) {
        throw new Error('STRIPE_SECRET_KEY not found in environment');
      }

      // Validate secret key format
      if (!secretKey.startsWith('sk_') && !secretKey.startsWith('rk_')) {
        throw new Error('Invalid Stripe secret key format');
      }

      this.stripeClient = new Stripe(secretKey.trim(), {
        apiVersion: '2023-10-16'
      });

      // Test Stripe connection
      const account = await this.stripeClient.accounts.retrieve();
      
      logger.info('[PaymentService] Stripe client initialized successfully', {
        accountId: account.id,
        country: account.country,
        chargesEnabled: account.charges_enabled
      });
      
      console.log(`   ✅ Stripe client initialized successfully`);
      console.log(`   🔑 Account ID: ${account.id}`);
      console.log(`   🌍 Country: ${account.country}`);
      console.log(`   💳 Charges Enabled: ${account.charges_enabled}`);

    } catch (error) {
      this.stripeInitializationError = error.message;
      logger.error(`[PaymentService] Stripe initialization failed: ${error.message}`);
      console.log(`   ❌ Stripe initialization failed: ${error.message}`);
      console.log(`   🔄 Will fallback to manual payment strategy`);
    }
  }

  /**
   * Initialize all payment strategies
   * Creates instances of each strategy for potential use
   */
  async initializeStrategies() {
    try {
      console.log('   📦 Initializing payment strategies...');

      // Manual Strategy (always available)
      const manualStrategy = new ManualPaymentStrategy();
      this.strategies.set('manual', manualStrategy);
      console.log(`   ✅ Manual Strategy: ${manualStrategy.getStrategyInfo().displayName}`);

      // Stripe strategies (only if Stripe is configured)
      if (this.stripeClient) {
        const checkoutStrategy = new StripeCheckoutStrategy(this.stripeClient);
        this.strategies.set('checkout', checkoutStrategy);
        console.log(`   ✅ Checkout Strategy: ${checkoutStrategy.getStrategyInfo().displayName}`);

        const elementsStrategy = new StripeElementsStrategy(this.stripeClient);
        this.strategies.set('elements', elementsStrategy);
        console.log(`   ✅ Elements Strategy: ${elementsStrategy.getStrategyInfo().displayName}`);
      } else {
        console.log(`   ⚠️ Stripe strategies not available (Stripe not configured)`);
      }

      console.log(`   📊 Total strategies available: ${this.strategies.size}`);

    } catch (error) {
      logger.error(`[PaymentService] Strategy initialization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Set the active payment strategy
   * Switches to the specified strategy with fallback logic
   * 
   * @param {string} strategyName - Name of strategy to activate
   */
  async setActiveStrategy(strategyName) {
    try {
      // Check if strategy is available
      if (!this.strategies.has(strategyName)) {
        logger.warn(`[PaymentService] Strategy '${strategyName}' not available, falling back to manual`);
        console.log(`   ⚠️ Strategy '${strategyName}' not available, falling back to manual`);
        strategyName = 'manual';
      }

      // Validate Stripe strategies if applicable
      if ((strategyName === 'checkout' || strategyName === 'elements') && this.stripeClient) {
        const strategy = this.strategies.get(strategyName);
        const validation = await strategy.validateConfiguration();
        
        if (!validation.valid) {
          logger.warn(`[PaymentService] Strategy '${strategyName}' validation failed: ${validation.error}`);
          console.log(`   ❌ Strategy '${strategyName}' validation failed: ${validation.error}`);
          console.log(`   🔄 Falling back to manual strategy`);
          strategyName = 'manual';
        }
      }

      // Set active strategy
      this.activeStrategy = this.strategies.get(strategyName);
      this.activeStrategyName = strategyName;

      logger.info(`[PaymentService] Active strategy set to: ${strategyName}`);
      
      console.log(`   🎯 ACTIVE STRATEGY: ${this.activeStrategy.getStrategyInfo().displayName}`);
      console.log(`   📝 Description: ${this.activeStrategy.getStrategyInfo().description}`);
      console.log(`   ⚡ Processing Time: ${this.activeStrategy.getStrategyInfo().processingTime}`);
      console.log(`   💰 Fees: ${this.activeStrategy.getStrategyInfo().fees}`);

    } catch (error) {
      logger.error(`[PaymentService] Error setting active strategy: ${error.message}`);
      
      // Ultimate fallback - manual strategy should always work
      this.activeStrategy = this.strategies.get('manual');
      this.activeStrategyName = 'manual';
      
      console.log(`   🚨 EMERGENCY FALLBACK: Using manual strategy due to error`);
      console.log(`   💾 Error: ${error.message}`);
    }
  }

  /**
   * Create payment intent using active strategy
   * Unified interface for payment intent creation
   * 
   * @param {Object} params - Payment parameters
   * @returns {Object} Payment intent result
   */
  async createPaymentIntent(params) {
    try {
      if (!this.activeStrategy) {
        throw new Error('No payment strategy available');
      }

      logger.info(`[PaymentService] Creating payment intent using ${this.activeStrategyName} strategy`);
      console.log(`💳 [PaymentService] Creating payment intent via ${this.activeStrategy.getStrategyInfo().displayName}`);

      const result = await this.activeStrategy.createPaymentIntent(params);

      // Add strategy metadata to result
      result.strategy = {
        name: this.activeStrategyName,
        displayName: this.activeStrategy.getStrategyInfo().displayName,
        description: this.activeStrategy.getStrategyInfo().description
      };

      logger.info(`[PaymentService] Payment intent created successfully: ${result.paymentIntentId}`);
      console.log(`✅ [PaymentService] Payment intent created: ${result.paymentIntentId}`);

      return result;

    } catch (error) {
      logger.error(`[PaymentService] Error creating payment intent: ${error.message}`);
      console.error(`❌ [PaymentService] Payment intent creation failed: ${error.message}`);
      
      // Attempt fallback to manual strategy if current strategy fails
      if (this.activeStrategyName !== 'manual') {
        logger.warn(`[PaymentService] Attempting fallback to manual strategy`);
        console.log(`🔄 [PaymentService] Attempting fallback to manual strategy`);
        
        try {
          await this.setActiveStrategy('manual');
          return await this.createPaymentIntent(params);
        } catch (fallbackError) {
          logger.error(`[PaymentService] Fallback also failed: ${fallbackError.message}`);
          throw new Error(`Payment processing unavailable: ${error.message}`);
        }
      }
      
      throw error;
    }
  }

  /**
   * Confirm payment using active strategy
   * Unified interface for payment confirmation
   * 
   * @param {Object} params - Confirmation parameters
   * @returns {Object} Confirmation result
   */
  async confirmPayment(params) {
    try {
      if (!this.activeStrategy) {
        throw new Error('No payment strategy available');
      }

      logger.info(`[PaymentService] Confirming payment using ${this.activeStrategyName} strategy`);
      console.log(`🔐 [PaymentService] Confirming payment via ${this.activeStrategy.getStrategyInfo().displayName}`);

      const result = await this.activeStrategy.confirmPayment(params);

      // Add strategy metadata to result
      result.strategy = {
        name: this.activeStrategyName,
        displayName: this.activeStrategy.getStrategyInfo().displayName
      };

      logger.info(`[PaymentService] Payment confirmed successfully: ${result.paymentIntentId}`);
      console.log(`✅ [PaymentService] Payment confirmed: ${result.paymentIntentId}`);

      return result;

    } catch (error) {
      logger.error(`[PaymentService] Error confirming payment: ${error.message}`);
      console.error(`❌ [PaymentService] Payment confirmation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get payment status using active strategy
   * Unified interface for payment status checking
   * 
   * @param {string} paymentIntentId - Payment intent ID
   * @returns {Object} Payment status
   */
  async getPaymentStatus(paymentIntentId) {
    try {
      if (!this.activeStrategy) {
        throw new Error('No payment strategy available');
      }

      const result = await this.activeStrategy.getPaymentStatus(paymentIntentId);

      // Add strategy metadata to result
      if (result.success) {
        result.strategy = {
          name: this.activeStrategyName,
          displayName: this.activeStrategy.getStrategyInfo().displayName
        };
      }

      return result;

    } catch (error) {
      logger.error(`[PaymentService] Error getting payment status: ${error.message}`);
      return {
        success: false,
        status: 'error',
        message: 'Unable to check payment status'
      };
    }
  }

  /**
   * Cancel payment using active strategy
   * Unified interface for payment cancellation
   * 
   * @param {string} paymentIntentId - Payment intent ID
   * @returns {Object} Cancellation result
   */
  async cancelPayment(paymentIntentId) {
    try {
      if (!this.activeStrategy) {
        throw new Error('No payment strategy available');
      }

      logger.info(`[PaymentService] Cancelling payment using ${this.activeStrategyName} strategy`);
      console.log(`❌ [PaymentService] Cancelling payment via ${this.activeStrategy.getStrategyInfo().displayName}`);

      const result = await this.activeStrategy.cancelPayment(paymentIntentId);

      logger.info(`[PaymentService] Payment cancelled successfully: ${paymentIntentId}`);
      console.log(`✅ [PaymentService] Payment cancelled: ${paymentIntentId}`);

      return result;

    } catch (error) {
      logger.error(`[PaymentService] Error cancelling payment: ${error.message}`);
      console.error(`❌ [PaymentService] Payment cancellation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Switch payment strategy at runtime
   * Allows dynamic strategy switching for testing or fallback
   * 
   * @param {string} newStrategy - Strategy name to switch to
   * @returns {Object} Switch result
   */
  async switchStrategy(newStrategy) {
    try {
      const previousStrategy = this.activeStrategyName;
      
      logger.info(`[PaymentService] Switching strategy from ${previousStrategy} to ${newStrategy}`);
      console.log(`🔄 [PaymentService] Switching strategy: ${previousStrategy} → ${newStrategy}`);

      await this.setActiveStrategy(newStrategy);

      const result = {
        success: true,
        previousStrategy,
        newStrategy: this.activeStrategyName,
        switchedAt: new Date(),
        message: `Strategy switched to ${this.activeStrategy.getStrategyInfo().displayName}`
      };

      logger.info(`[PaymentService] Strategy switch completed`, result);
      console.log(`✅ [PaymentService] Strategy switch completed: ${this.activeStrategy.getStrategyInfo().displayName}`);

      return result;

    } catch (error) {
      logger.error(`[PaymentService] Error switching strategy: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get service status and information
   * Returns comprehensive service status for monitoring
   * 
   * @returns {Object} Service status
   */
  getServiceStatus() {
    const strategyInfo = this.activeStrategy ? this.activeStrategy.getStrategyInfo() : null;
    
    return {
      serviceName: this.serviceName,
      version: this.version,
      status: 'operational',
      initializationTime: this.initializationTime,
      activeStrategy: {
        name: this.activeStrategyName,
        displayName: strategyInfo?.displayName,
        description: strategyInfo?.description,
        advantages: strategyInfo?.advantages,
        limitations: strategyInfo?.limitations,
        availability: strategyInfo?.availability,
        processingTime: strategyInfo?.processingTime,
        fees: strategyInfo?.fees
      },
      availableStrategies: Array.from(this.strategies.keys()),
      stripeConfiguration: {
        enabled: !!this.stripeClient,
        error: this.stripeInitializationError
      },
      configuration: {
        paymentStrategy: this.paymentStrategy,
        fallbackStrategy: this.fallbackStrategy,
        environment: process.env.NODE_ENV
      }
    };
  }

  /**
   * Get all available strategies information
   * Returns metadata for all initialized strategies
   * 
   * @returns {Array} Array of strategy information
   */
  getAvailableStrategies() {
    const strategies = [];
    
    for (const [name, strategy] of this.strategies) {
      const info = strategy.getStrategyInfo();
      strategies.push({
        name,
        ...info,
        isActive: name === this.activeStrategyName
      });
    }
    
    return strategies;
  }

  /**
   * Perform health check on payment service
   * Tests active strategy and returns health status
   * 
   * @returns {Object} Health check result
   */
  async performHealthCheck() {
    try {
      const healthCheck = {
        service: 'PaymentService',
        status: 'healthy',
        timestamp: new Date(),
        activeStrategy: this.activeStrategyName,
        checks: {
          serviceInitialized: !!this.activeStrategy,
          stripeAvailable: !!this.stripeClient,
          strategiesLoaded: this.strategies.size > 0
        }
      };

      // Test active strategy if it has validation
      if (this.activeStrategy && typeof this.activeStrategy.validateConfiguration === 'function') {
        const validation = await this.activeStrategy.validateConfiguration();
        healthCheck.checks.activeStrategyValid = validation.valid;
        if (!validation.valid) {
          healthCheck.status = 'degraded';
          healthCheck.error = validation.error;
        }
      }

      return healthCheck;

    } catch (error) {
      return {
        service: 'PaymentService',
        status: 'unhealthy',
        timestamp: new Date(),
        error: error.message,
        activeStrategy: this.activeStrategyName
      };
    }
  }
}

// Create and export singleton instance
const paymentService = new PaymentService();

export default paymentService;
export { PaymentService };
