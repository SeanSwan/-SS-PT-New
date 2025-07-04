/**
 * ManualPaymentStrategy.mjs - Manual/Offline Payment Processing Strategy
 * =====================================================================
 * The ultimate fallback payment strategy for when Stripe is unavailable
 * Creates manual payment records for offline processing and invoice generation
 * 
 * Features:
 * - Creates payment records without external payment processor
 * - Generates unique payment references for tracking
 * - Emails payment instructions to customer
 * - Provides admin dashboard for manual payment management
 * - Maintains order integrity during payment system outages
 * 
 * Use Cases:
 * - Stripe service outages
 * - Configuration issues preventing Stripe processing
 * - Large enterprise customers requiring custom payment terms
 * - Bank transfer payments for international clients
 * 
 * SwanStudios Payment Strategy Pattern Implementation
 */

import ShoppingCart from '../../../models/ShoppingCart.mjs';
import CartItem from '../../../models/CartItem.mjs';
import StorefrontItem from '../../../models/StorefrontItem.mjs';
import User from '../../../models/User.mjs';
import logger from '../../../utils/logger.mjs';
import { v4 as uuidv4 } from 'uuid';

class ManualPaymentStrategy {
  constructor() {
    this.strategyName = 'manual';
    this.strategyDisplayName = 'Manual Payment Processing';
    this.description = 'Offline payment processing with invoice generation';
  }

  /**
   * Create a manual payment intent
   * Generates a payment reference and creates order record for manual processing
   * 
   * @param {Object} params - Payment parameters
   * @param {string} params.cartId - Shopping cart ID
   * @param {string} params.userId - User ID
   * @param {Object} params.userInfo - User information
   * @returns {Object} Manual payment intent with reference ID
   */
  async createPaymentIntent({ cartId, userId, userInfo }) {
    try {
      logger.info(`[ManualPayment] Creating manual payment intent for cart ${cartId}`);

      // Validate cart
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
        throw new Error('Invalid or empty cart for manual payment');
      }

      // Generate unique payment reference
      const paymentReference = `SWAN-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;
      const orderReference = `ORD-${Date.now()}-${cartId}`;

      // Calculate totals
      const subtotal = cart.cartItems.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0);

      const totalSessions = cart.cartItems.reduce((sum, item) => {
        const sessions = item.storefrontItem?.sessions || item.storefrontItem?.totalSessions || 0;
        return sum + (sessions * item.quantity);
      }, 0);

      // Create manual payment record
      const manualPaymentData = {
        paymentReference,
        orderReference,
        cartId,
        userId,
        userInfo,
        amount: subtotal,
        currency: 'USD',
        totalSessions,
        status: 'pending_manual_payment',
        paymentMethod: 'manual',
        items: cart.cartItems.map(item => ({
          id: item.id,
          name: item.storefrontItem?.name || 'Training Package',
          price: item.price,
          quantity: item.quantity,
          sessions: item.storefrontItem?.sessions || 0
        })),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days to complete payment
        paymentInstructions: this.generatePaymentInstructions({
          paymentReference,
          orderReference,
          amount: subtotal,
          userInfo
        })
      };

      // Store payment reference in cart for tracking
      cart.paymentIntentId = paymentReference;
      cart.status = 'pending_payment';
      await cart.save();

      logger.info(`[ManualPayment] Manual payment intent created: ${paymentReference}`);

      return {
        success: true,
        paymentIntentId: paymentReference,
        orderReference,
        clientSecret: `manual_${paymentReference}`, // Consistent interface with Stripe
        amount: Math.round(subtotal * 100), // Cents for consistency
        currency: 'usd',
        status: 'requires_manual_payment',
        paymentMethod: 'manual',
        paymentInstructions: manualPaymentData.paymentInstructions,
        expiresAt: manualPaymentData.expiresAt,
        cart: {
          id: cart.id,
          total: subtotal,
          totalSessions,
          itemCount: cart.cartItems.length,
          items: manualPaymentData.items
        }
      };

    } catch (error) {
      logger.error(`[ManualPayment] Error creating payment intent: ${error.message}`);
      throw new Error(`Manual payment creation failed: ${error.message}`);
    }
  }

  /**
   * Confirm manual payment
   * Marks payment as completed when manual verification is done
   * 
   * @param {Object} params - Confirmation parameters
   * @param {string} params.paymentIntentId - Payment reference ID
   * @param {string} params.adminNotes - Admin verification notes
   * @param {string} params.verifiedBy - Admin user who verified payment
   * @returns {Object} Confirmation result
   */
  async confirmPayment({ paymentIntentId, adminNotes, verifiedBy }) {
    try {
      logger.info(`[ManualPayment] Confirming manual payment: ${paymentIntentId}`);

      // Find cart by payment reference
      const cart = await ShoppingCart.findOne({
        where: { 
          paymentIntentId,
          status: 'pending_payment'
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
        throw new Error('Payment record not found or already processed');
      }

      // Update cart status
      cart.status = 'completed';
      cart.completedAt = new Date();
      await cart.save();

      // Log manual payment completion
      logger.info(`[ManualPayment] Payment confirmed by ${verifiedBy}: ${paymentIntentId}`, {
        cartId: cart.id,
        amount: cart.total,
        adminNotes,
        verifiedBy
      });

      return {
        success: true,
        paymentIntentId,
        status: 'succeeded',
        paymentMethod: 'manual',
        verificationDetails: {
          verifiedBy,
          verifiedAt: new Date(),
          adminNotes
        }
      };

    } catch (error) {
      logger.error(`[ManualPayment] Error confirming payment: ${error.message}`);
      throw new Error(`Manual payment confirmation failed: ${error.message}`);
    }
  }

  /**
   * Generate payment instructions for customer
   * Creates detailed instructions for completing manual payment
   * 
   * @param {Object} params - Instruction parameters
   * @returns {Object} Payment instructions
   */
  generatePaymentInstructions({ paymentReference, orderReference, amount, userInfo }) {
    const instructions = {
      title: 'Complete Your SwanStudios Payment',
      paymentReference,
      orderReference,
      amount: amount.toFixed(2),
      currency: 'USD',
      methods: [
        {
          method: 'bank_transfer',
          title: 'Bank Transfer (ACH)',
          description: 'Direct bank transfer - lowest fees',
          details: {
            accountName: 'SwanStudios Training',
            routingNumber: '[CONFIGURED_IN_ADMIN]',
            accountNumber: '[CONFIGURED_IN_ADMIN]',
            transferType: 'ACH',
            memo: `Payment for ${orderReference}`
          },
          processingTime: '1-3 business days',
          fees: 'No additional fees'
        },
        {
          method: 'check',
          title: 'Check Payment',
          description: 'Mail check to our business address',
          details: {
            payableTo: 'SwanStudios Training',
            mailTo: '[CONFIGURED_IN_ADMIN]',
            memo: `Payment for ${orderReference}`,
            includeReference: `Include payment reference: ${paymentReference}`
          },
          processingTime: '5-7 business days',
          fees: 'No additional fees'
        },
        {
          method: 'contact',
          title: 'Contact Support',
          description: 'Speak with our team for payment assistance',
          details: {
            email: 'support@swanstudios.com',
            phone: '[CONFIGURED_IN_ADMIN]',
            businessHours: 'Monday-Friday, 9AM-6PM EST'
          },
          processingTime: 'Immediate assistance',
          fees: 'Varies by method'
        }
      ],
      nextSteps: [
        'Choose your preferred payment method from the options above',
        'Include your payment reference number in all communications',
        'We will email you confirmation once payment is received',
        'Your training sessions will be activated upon payment confirmation',
        'Contact support if you have any questions or need assistance'
      ],
      importantNotes: [
        `Payment must be completed within 7 days to reserve your sessions`,
        `Reference number: ${paymentReference} must be included with payment`,
        `Email confirmation will be sent to: ${userInfo.email}`,
        'All payments are processed securely and confidentially'
      ],
      supportContact: {
        email: 'support@swanstudios.com',
        subject: `Payment Assistance - ${paymentReference}`
      }
    };

    return instructions;
  }

  /**
   * Check payment status
   * Returns current status of manual payment
   * 
   * @param {string} paymentIntentId - Payment reference ID
   * @returns {Object} Payment status
   */
  async getPaymentStatus(paymentIntentId) {
    try {
      const cart = await ShoppingCart.findOne({
        where: { paymentIntentId }
      });

      if (!cart) {
        return {
          success: false,
          status: 'not_found',
          message: 'Payment record not found'
        };
      }

      const status = cart.status === 'completed' ? 'succeeded' : 
                    cart.status === 'pending_payment' ? 'requires_manual_payment' : 
                    'processing';

      return {
        success: true,
        paymentIntentId,
        status,
        paymentMethod: 'manual',
        amount: Math.round((cart.total || 0) * 100),
        currency: 'usd',
        createdAt: cart.createdAt,
        completedAt: cart.completedAt || null
      };

    } catch (error) {
      logger.error(`[ManualPayment] Error checking payment status: ${error.message}`);
      return {
        success: false,
        status: 'error',
        message: 'Unable to check payment status'
      };
    }
  }

  /**
   * Cancel manual payment
   * Cancels pending manual payment and releases cart
   * 
   * @param {string} paymentIntentId - Payment reference ID
   * @returns {Object} Cancellation result
   */
  async cancelPayment(paymentIntentId) {
    try {
      const cart = await ShoppingCart.findOne({
        where: { 
          paymentIntentId,
          status: 'pending_payment'
        }
      });

      if (!cart) {
        return {
          success: false,
          message: 'Payment not found or already processed'
        };
      }

      cart.status = 'cancelled';
      cart.paymentIntentId = null;
      await cart.save();

      logger.info(`[ManualPayment] Payment cancelled: ${paymentIntentId}`);

      return {
        success: true,
        paymentIntentId,
        status: 'cancelled',
        message: 'Manual payment cancelled successfully'
      };

    } catch (error) {
      logger.error(`[ManualPayment] Error cancelling payment: ${error.message}`);
      throw new Error(`Payment cancellation failed: ${error.message}`);
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
        'Always available - no external dependencies',
        'No payment processing fees',
        'Suitable for enterprise clients with custom payment terms',
        'Maintains business continuity during service outages',
        'Full audit trail for compliance'
      ],
      limitations: [
        'Requires manual verification by admin staff',
        'Longer processing time (1-7 business days)',
        'Customer must complete payment outside the platform',
        'Not suitable for immediate service activation'
      ],
      supportedMethods: ['bank_transfer', 'check', 'wire_transfer', 'contact'],
      availability: 'always',
      processingTime: '1-7 business days',
      fees: 'none'
    };
  }
}

export default ManualPaymentStrategy;
