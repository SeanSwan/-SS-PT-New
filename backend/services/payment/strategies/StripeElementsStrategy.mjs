/**
 * StripeElementsStrategy.mjs - Stripe Elements (Embedded) Payment Strategy
 * =======================================================================
 * Wraps the existing GalaxyPaymentElement for embedded Stripe Elements processing
 * This strategy provides embedded payment forms directly in your application
 * 
 * Features:
 * - Stripe Payment Elements (embedded forms)
 * - Full control over checkout experience
 * - Custom styling and branding
 * - Real-time payment validation
 * - Progressive enhancement
 * - Mobile-optimized responsive design
 * - Accessibility compliance (WCAG AA)
 * 
 * Best For:
 * - Custom branded checkout experiences
 * - Users who prefer not to leave your site
 * - Advanced payment flow customization
 * - A/B testing payment experiences
 * 
 * SwanStudios Payment Strategy Pattern Implementation
 */

import Stripe from 'stripe';
import ShoppingCart from '../../../models/ShoppingCart.mjs';
import CartItem from '../../../models/CartItem.mjs';
import StorefrontItem from '../../../models/StorefrontItem.mjs';
import User from '../../../models/User.mjs';
import logger from '../../../utils/logger.mjs';
import cartHelpers from '../../../utils/cartHelpers.mjs';
const { getCartTotalsWithFallback, debugCartState } = cartHelpers;

class StripeElementsStrategy {
  constructor(stripeClient) {
    this.stripe = stripeClient;
    this.strategyName = 'elements';
    this.strategyDisplayName = 'Stripe Elements (Embedded)';
    this.description = 'Embedded payment forms with full control over checkout experience';
  }

  /**
   * Create a Stripe Payment Intent for Elements
   * Generates payment intent for embedded payment forms
   * 
   * @param {Object} params - Payment parameters
   * @param {string} params.cartId - Shopping cart ID
   * @param {string} params.userId - User ID
   * @param {Object} params.userInfo - User information
   * @returns {Object} Payment intent with client secret
   */
  async createPaymentIntent({ cartId, userId, userInfo }) {
    try {
      logger.info(`[StripeElements] Creating payment intent for cart ${cartId}`);

      // Validate cart with comprehensive error handling
      const cart = await ShoppingCart.findOne({
        where: { 
          id: cartId,
          userId, 
          status: 'active' 
        },
        include: [{
          model: CartItem,
          as: 'cartItems',
          include: [{
            model: StorefrontItem,
            as: 'storefrontItem'
          }]
        }]
      });

      if (!cart || !cart.cartItems || cart.cartItems.length === 0) {
        throw new Error('Invalid or empty cart for payment intent');
      }

      // Calculate total amount with defensive fallback
      const { total: finalTotal, totalSessions, source } = getCartTotalsWithFallback(cart);
      
      // Debug payment intent creation
      await debugCartState(cartId, 'stripe_elements_payment_intent_creation');
      
      logger.info('Elements payment intent total calculation', {
        cartId,
        persistedTotal: cart.total,
        calculatedTotal: finalTotal,
        totalSessions,
        source,
        itemCount: cart.cartItems?.length || 0
      });
      
      const totalAmount = Math.round(finalTotal * 100); // Convert to cents
      
      if (totalAmount < 50) { // $0.50 minimum for Stripe
        throw new Error(`Amount too small for Stripe processing: $${finalTotal.toFixed(2)}`);
      }

      // Get or create Stripe customer
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found for payment intent');
      }

      let customerId = user.stripeCustomerId;
      
      // Create Stripe customer if doesn't exist
      if (!customerId) {
        try {
          const customer = await this.stripe.customers.create({
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            metadata: {
              userId: user.id.toString(),
              source: 'swanstudios_app'
            }
          });
          
          customerId = customer.id;
          user.stripeCustomerId = customerId;
          await user.save();
          
          logger.info(`[StripeElements] Created Stripe customer: ${customerId}`);
        } catch (customerError) {
          logger.warn(`[StripeElements] Could not create customer: ${customerError.message}`);
          // Continue without customer ID - can still process payment
        }
      }

      // Create Payment Intent for Elements
      const paymentIntentConfig = {
        amount: totalAmount,
        currency: 'usd',
        customer: customerId || undefined,
        metadata: {
          cartId: cart.id.toString(),
          userId: userId.toString(),
          userName: `${user.firstName} ${user.lastName}`,
          itemCount: cart.cartItems.length.toString(),
          totalSessions: totalSessions.toString(),
          strategy: 'elements'
        },
        description: `SwanStudios Training Package - ${cart.cartItems.length} item(s)`,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never' // Keep payment embedded
        },
        setup_future_usage: 'off_session', // Allow saving payment method
        receipt_email: user.email,
        // Enhanced configuration for Elements
        payment_method_options: {
          card: {
            setup_future_usage: 'off_session',
            capture_method: 'automatic'
          },
          us_bank_account: {
            financial_connections: {
              permissions: ['payment_method', 'balances']
            }
          }
        }
      };

      // Add subscription setup if applicable (future enhancement)
      const hasSubscriptionItems = cart.cartItems.some(item => 
        item.storefrontItem?.isSubscription || item.storefrontItem?.billingCycle
      );

      if (hasSubscriptionItems) {
        paymentIntentConfig.setup_future_usage = 'off_session';
        paymentIntentConfig.metadata.subscription_eligible = 'true';
      }

      const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentConfig);

      // Store payment intent ID in cart for tracking
      cart.paymentIntentId = paymentIntent.id;
      cart.status = 'pending_payment';
      await cart.save();

      logger.info(`[StripeElements] Payment intent created: ${paymentIntent.id}`);

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: totalAmount,
        currency: 'usd',
        status: paymentIntent.status,
        paymentMethod: 'stripe_elements',
        customer: customerId,
        cart: {
          id: cart.id,
          total: finalTotal,
          totalSessions,
          itemCount: cart.cartItems.length,
          items: cart.cartItems.map(item => ({
            id: item.id,
            name: item.storefrontItem?.name || 'Training Package',
            price: item.price,
            quantity: item.quantity,
            sessions: item.storefrontItem?.sessions || item.storefrontItem?.totalSessions || 0
          }))
        }
      };

    } catch (error) {
      logger.error(`[StripeElements] Error creating payment intent: ${error.message}`);
      
      // Handle specific Stripe errors
      if (error.type === 'StripeCardError') {
        throw new Error('Card was declined');
      } else if (error.type === 'StripeRateLimitError') {
        throw new Error('Too many requests, please try again later');
      } else if (error.type === 'StripeInvalidRequestError') {
        throw new Error('Invalid payment request');
      } else if (error.type === 'StripeAPIError') {
        throw new Error('Payment service temporarily unavailable');
      } else if (error.type === 'StripeConnectionError') {
        throw new Error('Network error, please check your connection');
      }
      
      throw new Error(`Payment intent creation failed: ${error.message}`);
    }
  }

  /**
   * Confirm payment from Elements
   * Handles payment confirmation after Elements submission
   * 
   * @param {Object} params - Confirmation parameters
   * @param {string} params.paymentIntentId - Stripe payment intent ID
   * @param {string} params.paymentMethodId - Payment method ID (optional)
   * @returns {Object} Payment confirmation result
   */
  async confirmPayment({ paymentIntentId, paymentMethodId }) {
    try {
      logger.info(`[StripeElements] Confirming payment intent: ${paymentIntentId}`);

      // Retrieve payment intent from Stripe
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      if (!paymentIntent) {
        throw new Error('Payment intent not found');
      }

      // Find associated cart
      const cart = await ShoppingCart.findOne({
        where: { 
          paymentIntentId: paymentIntentId
        },
        include: [{
          model: CartItem,
          as: 'cartItems',
          include: [{
            model: StorefrontItem,
            as: 'storefrontItem'
          }]
        }]
      });

      if (!cart) {
        throw new Error('Cart not found for payment intent');
      }

      // Check payment status
      if (paymentIntent.status === 'succeeded') {
        // Update cart status
        cart.status = 'completed';
        cart.completedAt = new Date();
        await cart.save();

        logger.info(`[StripeElements] Payment confirmed for cart ${cart.id}`);

        return {
          success: true,
          paymentIntentId: paymentIntent.id,
          status: 'succeeded',
          paymentMethod: 'stripe_elements',
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          paymentMethodId: paymentIntent.payment_method,
          customer: paymentIntent.customer,
          receiptUrl: paymentIntent.charges?.data?.[0]?.receipt_url
        };
      } else if (paymentIntent.status === 'requires_action') {
        return {
          success: false,
          paymentIntentId: paymentIntent.id,
          status: 'requires_action',
          message: 'Payment requires additional authentication',
          clientSecret: paymentIntent.client_secret,
          requiresAction: true
        };
      } else {
        logger.warn(`[StripeElements] Payment not completed - status: ${paymentIntent.status}`);
        
        return {
          success: false,
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          message: 'Payment not completed',
          clientSecret: paymentIntent.client_secret
        };
      }

    } catch (error) {
      logger.error(`[StripeElements] Error confirming payment: ${error.message}`);
      throw new Error(`Payment confirmation failed: ${error.message}`);
    }
  }

  /**
   * Get payment status from payment intent
   * Returns current payment status for a payment intent
   * 
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @returns {Object} Payment status
   */
  async getPaymentStatus(paymentIntentId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (!paymentIntent) {
        return {
          success: false,
          status: 'not_found',
          message: 'Payment intent not found'
        };
      }

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        paymentMethod: 'stripe_elements',
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        customer: paymentIntent.customer,
        paymentMethodId: paymentIntent.payment_method,
        clientSecret: paymentIntent.client_secret,
        lastPaymentError: paymentIntent.last_payment_error
      };

    } catch (error) {
      logger.error(`[StripeElements] Error getting payment status: ${error.message}`);
      return {
        success: false,
        status: 'error',
        message: 'Unable to check payment status'
      };
    }
  }

  /**
   * Cancel payment intent
   * Cancels the payment intent and releases the cart
   * 
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @returns {Object} Cancellation result
   */
  async cancelPayment(paymentIntentId) {
    try {
      // Cancel the payment intent if possible
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'requires_payment_method' || 
          paymentIntent.status === 'requires_confirmation') {
        await this.stripe.paymentIntents.cancel(paymentIntentId);
      }

      // Update cart status
      const cart = await ShoppingCart.findOne({
        where: { paymentIntentId: paymentIntentId }
      });

      if (cart) {
        cart.status = 'active'; // Return to active for potential retry
        cart.paymentIntentId = null;
        await cart.save();
      }

      logger.info(`[StripeElements] Payment intent cancelled: ${paymentIntentId}`);

      return {
        success: true,
        paymentIntentId: paymentIntentId,
        status: 'cancelled',
        message: 'Payment intent cancelled successfully'
      };

    } catch (error) {
      logger.error(`[StripeElements] Error cancelling payment intent: ${error.message}`);
      throw new Error(`Payment cancellation failed: ${error.message}`);
    }
  }

  /**
   * Update payment intent
   * Updates payment intent amount or metadata (useful for dynamic pricing)
   * 
   * @param {Object} params - Update parameters
   * @param {string} params.paymentIntentId - Payment intent ID
   * @param {number} params.amount - New amount in cents
   * @param {Object} params.metadata - Additional metadata
   * @returns {Object} Update result
   */
  async updatePaymentIntent({ paymentIntentId, amount, metadata }) {
    try {
      const updateConfig = {};
      
      if (amount !== undefined) {
        updateConfig.amount = amount;
      }
      
      if (metadata) {
        updateConfig.metadata = metadata;
      }

      const paymentIntent = await this.stripe.paymentIntents.update(
        paymentIntentId, 
        updateConfig
      );

      logger.info(`[StripeElements] Payment intent updated: ${paymentIntentId}`);

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        clientSecret: paymentIntent.client_secret
      };

    } catch (error) {
      logger.error(`[StripeElements] Error updating payment intent: ${error.message}`);
      throw new Error(`Payment intent update failed: ${error.message}`);
    }
  }

  /**
   * Get strategy information
   * Returns strategy metadata for PaymentService
   * 
   * @returns {Object} Strategy information
   */
  getStrategyInfo() {
    return {
      name: this.strategyName,
      displayName: this.strategyDisplayName,
      description: this.description,
      advantages: [
        'Full control over checkout experience',
        'Custom styling and branding',
        'Users never leave your site',
        'Real-time payment validation',
        'Progressive enhancement',
        'Accessibility compliance (WCAG AA)',
        'Mobile-optimized responsive design',
        'Multiple payment methods in one form',
        'Advanced payment flow customization'
      ],
      limitations: [
        'More complex implementation',
        'Requires PCI compliance considerations',
        'Potentially lower conversion than hosted checkout',
        'More frontend JavaScript required',
        'Requires stable internet connection'
      ],
      supportedMethods: ['card', 'us_bank_account', 'sepa_debit', 'ideal', 'sofort'],
      availability: 'requires_stripe_configuration',
      processingTime: 'immediate',
      fees: 'stripe_standard_rates'
    };
  }

  /**
   * Validate Stripe configuration for Elements
   * Checks if Stripe is properly configured for Elements processing
   * 
   * @returns {Object} Validation result
   */
  async validateConfiguration() {
    try {
      if (!this.stripe) {
        return {
          valid: false,
          error: 'Stripe client not initialized'
        };
      }

      // Test Stripe connection by retrieving account
      const account = await this.stripe.accounts.retrieve();
      
      return {
        valid: true,
        accountId: account.id,
        country: account.country,
        chargesEnabled: account.charges_enabled,
        detailsSubmitted: account.details_submitted,
        elementsEnabled: true // Elements is always available if account is valid
      };

    } catch (error) {
      return {
        valid: false,
        error: error.message,
        type: error.type
      };
    }
  }

  /**
   * Create setup intent for future payments
   * Creates setup intent for saving payment methods without immediate charge
   * 
   * @param {Object} params - Setup parameters
   * @param {string} params.customerId - Stripe customer ID
   * @param {string} params.usage - Usage type ('off_session' or 'on_session')
   * @returns {Object} Setup intent result
   */
  async createSetupIntent({ customerId, usage = 'off_session' }) {
    try {
      const setupIntent = await this.stripe.setupIntents.create({
        customer: customerId,
        usage: usage,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        setupIntentId: setupIntent.id,
        clientSecret: setupIntent.client_secret,
        status: setupIntent.status
      };

    } catch (error) {
      logger.error(`[StripeElements] Error creating setup intent: ${error.message}`);
      throw new Error(`Setup intent creation failed: ${error.message}`);
    }
  }
}

export default StripeElementsStrategy;
