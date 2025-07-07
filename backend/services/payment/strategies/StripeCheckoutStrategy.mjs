/**
 * StripeCheckoutStrategy.mjs - Stripe Checkout (Redirect) Payment Strategy
 * =======================================================================
 * Wraps the existing ModernCheckoutOrchestrator for Stripe Checkout processing
 * This strategy redirects users to Stripe's hosted checkout page
 * 
 * Features:
 * - Stripe Checkout Sessions (redirect method)
 * - Higher conversion rates (8% vs custom forms)
 * - Built-in Apple Pay/Google Pay support
 * - Mobile-optimized by Stripe
 * - PCI compliance handled by Stripe
 * - One-click payments with Stripe Link
 * - Guest checkout support
 * 
 * Best For:
 * - Standard e-commerce flows
 * - Users who prefer familiar Stripe checkout experience
 * - Mobile users (optimized conversion)
 * - Businesses wanting minimal PCI compliance responsibility
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

// Production environment detection
const isProduction = process.env.NODE_ENV === 'production';

class StripeCheckoutStrategy {
  constructor(stripeClient) {
    this.stripe = stripeClient;
    this.strategyName = 'checkout';
    this.strategyDisplayName = 'Stripe Checkout (Redirect)';
    this.description = 'Redirect to Stripe-hosted checkout page with optimized conversion';
  }

  /**
   * Create a Stripe Checkout Session
   * Generates checkout session for redirect-based payment flow
   * Enhanced with production error handling and 401 debugging
   * 
   * @param {Object} params - Payment parameters
   * @param {string} params.cartId - Shopping cart ID
   * @param {string} params.userId - User ID
   * @param {Object} params.userInfo - User information
   * @param {string} params.baseUrl - Application base URL for redirects
   * @returns {Object} Checkout session with redirect URL
   */
  async createPaymentIntent({ cartId, userId, userInfo, baseUrl }) {
    // PRODUCTION DEBUG: Log Stripe client status
    logger.info('[StripeCheckout] Creating checkout session', {
      cartId,
      userId,
      hasStripeClient: !!this.stripe,
      environment: process.env.NODE_ENV
    });
    try {
      logger.info(`[StripeCheckout] Creating checkout session for cart ${cartId}`);

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
        throw new Error('Invalid or empty cart for checkout session');
      }

      // Calculate total amount with defensive fallback
      const { total: finalTotal, totalSessions, source } = getCartTotalsWithFallback(cart);
      
      // Debug checkout session creation
      await debugCartState(cartId, 'stripe_checkout_session_creation');
      
      logger.info('Checkout session total calculation', {
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

      // Create line items for Stripe Checkout
      const lineItems = cart.cartItems.map(item => {
        const unitPrice = Math.round(item.price * 100); // Convert to cents
        const itemName = item.storefrontItem?.name || 'Training Package';
        const sessions = item.storefrontItem?.sessions || item.storefrontItem?.totalSessions || 0;
        
        return {
          price_data: {
            currency: 'usd',
            product_data: {
              name: itemName,
              description: sessions > 0 ? `${sessions} training sessions` : 'Personal training package',
              images: item.storefrontItem?.imageUrl ? [item.storefrontItem.imageUrl] : undefined,
              metadata: {
                sessions: sessions.toString(),
                itemId: item.id.toString()
              }
            },
            unit_amount: unitPrice,
          },
          quantity: item.quantity,
        };
      });

      // Get or create Stripe customer
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found for checkout session');
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
          
          logger.info(`[StripeCheckout] Created Stripe customer: ${customerId}`);
        } catch (customerError) {
          logger.warn(`[StripeCheckout] Could not create customer: ${customerError.message}`);
          // Continue without customer ID - Stripe allows guest checkout
        }
      }

      // Create Stripe Checkout Session
      const sessionConfig = {
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        customer: customerId || undefined,
        customer_email: !customerId ? user.email : undefined,
        success_url: `${baseUrl}/checkout/CheckoutSuccess?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/checkout/CheckoutCancel?session_id={CHECKOUT_SESSION_ID}`,
        metadata: {
          cartId: cart.id.toString(),
          userId: userId.toString(),
          userName: `${user.firstName} ${user.lastName}`,
          itemCount: cart.cartItems.length.toString(),
          totalSessions: totalSessions.toString(),
          strategy: 'checkout'
        },
        billing_address_collection: 'required',
        shipping_address_collection: {
          allowed_countries: ['US', 'CA'],
        },
        phone_number_collection: {
          enabled: true,
        },
        // Enhanced checkout features
        allow_promotion_codes: true,
        automatic_tax: {
          enabled: false, // Configure based on business requirements
        },
        consent_collection: {
          terms_of_service: 'required',
        },
        custom_text: {
          submit: {
            message: 'SwanStudios will securely process your payment and activate your training sessions immediately.'
          }
        },
        expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes expiry
      };

      // Add subscription billing if applicable (future enhancement)
      // This can be enabled based on cart contents or user preferences
      const hasSubscriptionItems = cart.cartItems.some(item => 
        item.storefrontItem?.isSubscription || item.storefrontItem?.billingCycle
      );

      if (hasSubscriptionItems) {
        sessionConfig.mode = 'subscription';
        // Configure subscription line items
        sessionConfig.line_items = lineItems.map(item => ({
          ...item,
          price_data: {
            ...item.price_data,
            recurring: {
              interval: 'month' // Default to monthly, can be configured per item
            }
          }
        }));
      }

      const session = await this.stripe.checkout.sessions.create(sessionConfig);

      // Store checkout session ID in cart for tracking
      cart.paymentIntentId = session.id;
      cart.status = 'pending_payment';
      await cart.save();

      logger.info(`[StripeCheckout] Checkout session created: ${session.id}`);

      return {
        success: true,
        paymentIntentId: session.id,
        clientSecret: session.id, // For consistency with Elements strategy
        checkoutUrl: session.url,
        amount: totalAmount,
        currency: 'usd',
        status: 'requires_payment_method',
        paymentMethod: 'stripe_checkout',
        expiresAt: new Date(session.expires_at * 1000),
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
      // PRODUCTION DEBUG: Enhanced error logging for 401 issues
      logger.error(`[StripeCheckout] Error creating checkout session`, {
        errorType: error.type,
        errorCode: error.code,
        statusCode: error.statusCode,
        message: error.message,
        cartId,
        userId,
        stripeConfigured: !!this.stripe
      });
      
      // Handle specific Stripe errors with production debugging
      if (error.type === 'StripeAuthenticationError' || error.statusCode === 401) {
        logger.error('[StripeCheckout] STRIPE AUTHENTICATION ERROR - 401 Issue Detected', {
          errorDetails: error.message,
          possibleCauses: [
            'Invalid or expired Stripe secret key',
            'Key environment mismatch (live vs test)',
            'Stripe account access revoked',
            'Rate limiting or security restrictions'
          ],
          environment: process.env.NODE_ENV,
          recommendation: 'Check Render environment variables for STRIPE_SECRET_KEY'
        });
        throw new Error('Payment authentication failed - please contact support');
      } else if (error.type === 'StripeInvalidRequestError') {
        logger.error('[StripeCheckout] Invalid request to Stripe API', {
          errorDetails: error.message,
          requestData: { cartId, userId }
        });
        throw new Error(`Invalid checkout request: ${error.message}`);
      } else if (error.type === 'StripeAPIError') {
        logger.error('[StripeCheckout] Stripe API error', { errorDetails: error.message });
        throw new Error('Stripe service temporarily unavailable');
      } else if (error.type === 'StripeConnectionError') {
        logger.error('[StripeCheckout] Stripe connection error', { errorDetails: error.message });
        throw new Error('Unable to connect to payment processor');
      }
      
      // Generic error with enhanced logging
      logger.error('[StripeCheckout] Unexpected error during checkout session creation', {
        error: error.message,
        stack: error.stack,
        cartId,
        userId
      });
      throw new Error(`Checkout session creation failed: ${error.message}`);
    }
  }

  /**
   * Confirm payment from checkout session
   * Handles post-checkout verification and order completion
   * 
   * @param {Object} params - Confirmation parameters
   * @param {string} params.sessionId - Stripe checkout session ID
   * @returns {Object} Payment confirmation result
   */
  async confirmPayment({ sessionId }) {
    try {
      logger.info(`[StripeCheckout] Confirming payment for session: ${sessionId}`);

      // Retrieve checkout session from Stripe
      const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent', 'line_items']
      });

      if (!session) {
        throw new Error('Checkout session not found');
      }

      // Find associated cart
      const cart = await ShoppingCart.findOne({
        where: { 
          paymentIntentId: sessionId
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
        throw new Error('Cart not found for checkout session');
      }

      // Verify payment status
      if (session.payment_status === 'paid') {
        // Update cart status
        cart.status = 'completed';
        cart.completedAt = new Date();
        await cart.save();

        logger.info(`[StripeCheckout] Payment confirmed for cart ${cart.id}`);

        return {
          success: true,
          paymentIntentId: sessionId,
          status: 'succeeded',
          paymentMethod: 'stripe_checkout',
          amount: session.amount_total,
          currency: session.currency,
          paymentIntent: session.payment_intent,
          customer: session.customer,
          customerDetails: session.customer_details
        };
      } else {
        logger.warn(`[StripeCheckout] Payment not completed - status: ${session.payment_status}`);
        
        return {
          success: false,
          paymentIntentId: sessionId,
          status: session.payment_status,
          message: 'Payment not completed',
          requiresAction: session.payment_status === 'unpaid'
        };
      }

    } catch (error) {
      logger.error(`[StripeCheckout] Error confirming payment: ${error.message}`);
      throw new Error(`Payment confirmation failed: ${error.message}`);
    }
  }

  /**
   * Get payment status from checkout session
   * Returns current payment status for a checkout session
   * 
   * @param {string} sessionId - Stripe checkout session ID
   * @returns {Object} Payment status
   */
  async getPaymentStatus(sessionId) {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      
      if (!session) {
        return {
          success: false,
          status: 'not_found',
          message: 'Checkout session not found'
        };
      }

      const statusMap = {
        'complete': 'succeeded',
        'open': 'requires_payment_method',
        'expired': 'cancelled'
      };

      return {
        success: true,
        paymentIntentId: sessionId,
        status: statusMap[session.status] || session.status,
        paymentStatus: session.payment_status,
        paymentMethod: 'stripe_checkout',
        amount: session.amount_total,
        currency: session.currency,
        customer: session.customer,
        expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : null
      };

    } catch (error) {
      logger.error(`[StripeCheckout] Error getting payment status: ${error.message}`);
      return {
        success: false,
        status: 'error',
        message: 'Unable to check payment status'
      };
    }
  }

  /**
   * Cancel checkout session
   * Expires the checkout session and releases the cart
   * 
   * @param {string} sessionId - Stripe checkout session ID
   * @returns {Object} Cancellation result
   */
  async cancelPayment(sessionId) {
    try {
      // Expire the checkout session
      const session = await this.stripe.checkout.sessions.expire(sessionId);

      // Update cart status
      const cart = await ShoppingCart.findOne({
        where: { paymentIntentId: sessionId }
      });

      if (cart) {
        cart.status = 'active'; // Return to active for potential retry
        cart.paymentIntentId = null;
        await cart.save();
      }

      logger.info(`[StripeCheckout] Checkout session cancelled: ${sessionId}`);

      return {
        success: true,
        paymentIntentId: sessionId,
        status: 'cancelled',
        message: 'Checkout session cancelled successfully'
      };

    } catch (error) {
      logger.error(`[StripeCheckout] Error cancelling session: ${error.message}`);
      throw new Error(`Session cancellation failed: ${error.message}`);
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
        'Higher conversion rates (8% better than custom forms)',
        'Built-in Apple Pay and Google Pay support',
        'Mobile-optimized checkout experience',
        'PCI compliance handled by Stripe',
        'One-click payments with Stripe Link',
        'Guest checkout supported',
        'Automatic fraud detection',
        'International payment methods'
      ],
      limitations: [
        'Redirects away from your site',
        'Less control over checkout experience',
        'Limited customization options',
        'Requires internet connection for user'
      ],
      supportedMethods: ['card', 'apple_pay', 'google_pay', 'link', 'alipay', 'klarna'],
      availability: 'requires_stripe_configuration',
      processingTime: 'immediate',
      fees: 'stripe_standard_rates'
    };
  }

  /**
   * Validate Stripe configuration for checkout
   * Enhanced validation with production debugging
   * 
   * @returns {Object} Validation result
   */
  async validateConfiguration() {
    try {
      if (!this.stripe) {
        logger.error('[StripeCheckout] Stripe client not initialized', {
          environment: process.env.NODE_ENV,
          hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
          secretKeyFormat: process.env.STRIPE_SECRET_KEY ? 
            process.env.STRIPE_SECRET_KEY.substring(0, 8) + '...' : 'missing'
        });
        return {
          valid: false,
          error: 'Stripe client not initialized - check environment variables'
        };
      }

      // Test Stripe connection by retrieving account
      logger.info('[StripeCheckout] Testing Stripe account connection...');
      const account = await this.stripe.accounts.retrieve();
      
      logger.info('[StripeCheckout] Stripe account validation successful', {
        accountId: account.id,
        country: account.country,
        chargesEnabled: account.charges_enabled,
        detailsSubmitted: account.details_submitted,
        businessType: account.business_type
      });
      
      return {
        valid: true,
        accountId: account.id,
        country: account.country,
        chargesEnabled: account.charges_enabled,
        detailsSubmitted: account.details_submitted
      };

    } catch (error) {
      logger.error('[StripeCheckout] Stripe configuration validation failed', {
        errorType: error.type,
        errorCode: error.code,
        statusCode: error.statusCode,
        message: error.message,
        environment: process.env.NODE_ENV
      });
      
      return {
        valid: false,
        error: error.message,
        type: error.type,
        statusCode: error.statusCode
      };
    }
  }
}

export default StripeCheckoutStrategy;
