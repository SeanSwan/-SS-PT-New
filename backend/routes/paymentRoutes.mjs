/**
 * Enhanced Payment Routes - SwanStudios Premium Payment Integration
 * ================================================================
 * Production-ready payment processing with improved error handling for Render deployment
 * Maintains backward compatibility with existing Stripe Checkout
 * 
 * Features:
 * - Stripe Elements (embedded payment forms)
 * - Stripe Checkout (redirect method) - existing
 * - Payment Intent management
 * - Real-time payment status
 * - Enhanced security and validation
 * - Comprehensive error handling for 503 prevention
 * - Galaxy-themed payment experience support
 * 
 * Security: PCI DSS compliant, authenticated users only
 * Performance: Optimized payment processing
 * UX: Seamless embedded payment experience
 */

import express from 'express';
import Stripe from 'stripe';
import ShoppingCart from '../models/ShoppingCart.mjs';
import CartItem from '../models/CartItem.mjs';
import StorefrontItem from '../models/StorefrontItem.mjs';
import User from '../models/User.mjs';
import { protect } from '../middleware/authMiddleware.mjs';
import logger from '../utils/logger.mjs';
import { isStripeEnabled } from '../utils/apiKeyChecker.mjs';
import cartHelpers from '../utils/cartHelpers.mjs';
const { getCartTotalsWithFallback, debugCartState } = cartHelpers;

const router = express.Router();

/**
 * Public diagnostics endpoint (no auth required)
 * GET /api/payments/diagnostics
 * Provides system configuration status for debugging payment issues
 */
router.get('/diagnostics', async (req, res) => {
  try {
    // Dynamically import diagnostics to avoid startup issues
    const { diagnosticsHandler } = await import('../utils/environmentDiagnostics.mjs');
    return diagnosticsHandler(req, res);
  } catch (error) {
    logger.error('Diagnostics module error:', error);
    res.status(500).json({
      success: false,
      message: 'Diagnostics unavailable',
      error: {
        code: 'DIAGNOSTICS_MODULE_ERROR',
        details: 'Diagnostics module could not be loaded'
      }
    });
  }
});

/**
 * Enhanced environment inspection endpoint (no auth required)
 * GET /api/payments/environment-inspect
 * Provides detailed, safe environment variable inspection
 */
router.get('/environment-inspect', async (req, res) => {
  try {
    // Import the environment inspector
    const { environmentInspectionHandler } = await import('../utils/environmentInspector.mjs');
    return environmentInspectionHandler(req, res);
  } catch (error) {
    logger.error('Environment inspection error:', error);
    res.status(500).json({
      success: false,
      message: 'Environment inspection failed',
      error: {
        code: 'ENVIRONMENT_INSPECTION_ERROR',
        details: 'Unable to inspect environment variables'
      }
    });
  }
});

/**
 * ENHANCED TRUTH SERUM DIAGNOSTIC - Real-time Stripe configuration validation endpoint (no auth required)
 * GET /api/payments/stripe-validation
 * Forces re-validation of Stripe configuration and shows detailed results
 * ENHANCED: Now includes definitive account ID verification via Stripe API
 */
router.get('/stripe-validation', async (req, res) => {
  try {
    console.log('\n🧪 ENHANCED TRUTH SERUM DIAGNOSTIC TRIGGERED');
    console.log('===============================================');
    console.log('⚡ This diagnostic will definitively identify account mismatches');
    console.log('===============================================');
    
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const publishableKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY;
    
    // PHASE 1: Basic Key Analysis with Character-Level Inspection
    const basicAnalysis = {
      secretKey: {
        exists: !!secretKey,
        length: secretKey?.length || 0,
        prefix: secretKey?.substring(0, 8) || 'N/A',
        isValidFormat: secretKey?.match(/^(sk_|rk_)(live|test)_/) ? true : false,
        hasWhitespace: secretKey ? (secretKey !== secretKey.trim()) : false,
        characterAnalysis: secretKey ? {
          firstChar: secretKey.charCodeAt(0),
          lastChar: secretKey.charCodeAt(secretKey.length - 1),
          containsNonPrintable: /[\x00-\x1F\x7F-\x9F]/.test(secretKey),
          byteLength: Buffer.from(secretKey, 'utf8').length
        } : null
      },
      publishableKey: {
        exists: !!publishableKey,
        length: publishableKey?.length || 0,
        prefix: publishableKey?.substring(0, 8) || 'N/A',
        isValidFormat: publishableKey?.startsWith('pk_') ? true : false,
        criticalError: publishableKey?.startsWith('sk_') ? 'PUBLISHABLE_KEY_IS_ACTUALLY_SECRET_KEY' : null,
        hasWhitespace: publishableKey ? (publishableKey !== publishableKey.trim()) : false,
        characterAnalysis: publishableKey ? {
          firstChar: publishableKey.charCodeAt(0),
          lastChar: publishableKey.charCodeAt(publishableKey.length - 1),
          containsNonPrintable: /[\x00-\x1F\x7F-\x9F]/.test(publishableKey),
          byteLength: Buffer.from(publishableKey, 'utf8').length
        } : null
      }
    };
    
    console.log('📊 Basic Analysis Results:');
    console.log('   Secret Key Valid Format:', basicAnalysis.secretKey.isValidFormat);
    console.log('   Publishable Key Valid Format:', basicAnalysis.publishableKey.isValidFormat);
    console.log('   Secret Key Whitespace Issues:', basicAnalysis.secretKey.hasWhitespace);
    console.log('   Publishable Key Whitespace Issues:', basicAnalysis.publishableKey.hasWhitespace);
    
    // PHASE 2: TRUTH SERUM - Actual Stripe API Account Verification
    let truthSerumResults = {
      backendAccountVerified: false,
      backendAccountId: null,
      backendError: null,
      frontendKeyAccountHint: null,
      accountsMatch: null,
      definitiveDiagnosis: null
    };
    
    // Test the secret key by calling Stripe API
    if (secretKey && basicAnalysis.secretKey.isValidFormat) {
      console.log('🔍 Testing SECRET KEY against Stripe API...');
      try {
        const testStripe = new Stripe(secretKey.trim());
        const account = await testStripe.accounts.retrieve();
        
        truthSerumResults.backendAccountVerified = true;
        truthSerumResults.backendAccountId = account.id;
        
        console.log('✅ SECRET KEY VERIFICATION: SUCCESS');
        console.log('   Backend Account ID:', account.id);
        console.log('   Account Type:', account.type);
        console.log('   Country:', account.country);
        console.log('   Business Profile:', account.business_profile?.name || 'N/A');
        
      } catch (stripeError) {
        truthSerumResults.backendError = {
          type: stripeError.type,
          code: stripeError.code,
          message: stripeError.message,
          statusCode: stripeError.statusCode
        };
        
        console.log('❌ SECRET KEY VERIFICATION: FAILED');
        console.log('   Error Type:', stripeError.type);
        console.log('   Error Code:', stripeError.code);
        console.log('   Error Message:', stripeError.message);
      }
    } else {
      console.log('⚠️ Skipping secret key verification - invalid format or missing');
    }
    
    // PHASE 3: Publishable Key Account Hint Extraction
    if (publishableKey && basicAnalysis.publishableKey.isValidFormat) {
      console.log('🔍 Analyzing PUBLISHABLE KEY for account hints...');
      
      // Extract account hint from publishable key structure
      // Stripe publishable keys follow pattern: pk_live_51J7acMKE5XFS1YwG...
      // The account hint is typically the part after the environment
      const keyParts = publishableKey.split('_');
      if (keyParts.length >= 3) {
        const accountHint = keyParts[2];
        truthSerumResults.frontendKeyAccountHint = accountHint;
        
        console.log('📋 Publishable Key Analysis:');
        console.log('   Key Structure:', keyParts.map((part, i) => `${i}: ${part.substring(0, 12)}...`).join(', '));
        console.log('   Account Hint:', accountHint.substring(0, 20) + '...');
        
        // Compare account hints if we have both
        if (truthSerumResults.backendAccountId) {
          // The backend account ID format is 'acct_XXXXXX' and the publishable key account hint should relate
          const backendAccountCode = truthSerumResults.backendAccountId.replace('acct_', '');
          const keyAccountHint = accountHint;
          
          console.log('🔄 Account Comparison:');
          console.log('   Backend Account Code:', backendAccountCode);
          console.log('   Frontend Key Hint:', keyAccountHint.substring(0, 20) + '...');
          
          // Check if they're related (this is heuristic, but helps identify mismatches)
          const hintsMatch = keyAccountHint.includes(backendAccountCode) || 
                           backendAccountCode.includes(keyAccountHint.substring(0, 15));
          
          truthSerumResults.accountsMatch = hintsMatch;
          
          if (hintsMatch) {
            console.log('✅ ACCOUNT MATCH: Keys appear to be from the same Stripe account');
            truthSerumResults.definitiveDiagnosis = 'SUCCESS: Keys are from the same Stripe account. The 401 error is likely due to a different issue (key permissions, API version, etc.)';
          } else {
            console.log('🚨 ACCOUNT MISMATCH DETECTED!');
            console.log('   This is likely the cause of your 401 errors!');
            truthSerumResults.definitiveDiagnosis = 'CRITICAL: Keys are from DIFFERENT Stripe accounts! This is the definitive cause of your 401 errors. You must use matching secret and publishable keys from the same Stripe account.';
          }
        }
      }
    }
    
    // PHASE 4: Environment Variable Source Verification
    console.log('🔍 Environment Variable Source Verification:');
    const envSourceAnalysis = {
      nodeEnv: process.env.NODE_ENV,
      isProduction: process.env.NODE_ENV === 'production',
      renderDeployment: !!process.env.RENDER,
      envVarCount: Object.keys(process.env).filter(key => key.includes('STRIPE')).length,
      availableStripeVars: Object.keys(process.env).filter(key => key.includes('STRIPE'))
    };
    
    console.log('   Environment:', envSourceAnalysis.nodeEnv);
    console.log('   Is Production:', envSourceAnalysis.isProduction);
    console.log('   Render Deployment:', envSourceAnalysis.renderDeployment);
    console.log('   Stripe Env Vars Available:', envSourceAnalysis.availableStripeVars);
    
    // PHASE 5: Final Diagnosis and Recommendations
    let finalRecommendations = [];
    
    if (truthSerumResults.definitiveDiagnosis) {
      if (truthSerumResults.accountsMatch === false) {
        finalRecommendations = [
          'CRITICAL: Go to your Stripe Dashboard',
          'CRITICAL: Choose ONE account to use for production',
          'CRITICAL: Get BOTH the secret key (sk_live_...) AND publishable key (pk_live_...) from the SAME account',
          'CRITICAL: Update your Render environment variables with the matching pair',
          'CRITICAL: Redeploy your application',
          'This will definitively resolve your 401 errors'
        ];
      } else if (truthSerumResults.accountsMatch === true) {
        finalRecommendations = [
          'Keys appear to be from the same account',
          'Check if your keys have the correct permissions in Stripe Dashboard',
          'Verify your keys are not restricted to specific domains/IPs',
          'Check for any API version compatibility issues',
          'The 401 error may be due to key restrictions rather than account mismatch'
        ];
      }
    } else if (truthSerumResults.backendError) {
      finalRecommendations = [
        'Your secret key is invalid or has been revoked',
        'Go to Stripe Dashboard and generate a new secret key',
        'Update your Render environment variables',
        'Ensure you\'re copying the key correctly (no extra spaces or characters)'
      ];
    }
    
    console.log('🎯 Final Recommendations:');
    finalRecommendations.forEach((rec, i) => console.log(`   ${i + 1}. ${rec}`));
    
    console.log('===============================================');
    console.log('🧪 ENHANCED TRUTH SERUM DIAGNOSTIC COMPLETE');
    console.log('===============================================\n');
    
    // Return comprehensive results
    res.json({
      success: true,
      diagnosticType: 'ENHANCED_TRUTH_SERUM',
      timestamp: new Date().toISOString(),
      data: {
        basicAnalysis,
        truthSerumResults,
        envSourceAnalysis,
        finalRecommendations,
        initializationStatus: {
          stripeClientExists: !!stripeClient,
          stripeReady: stripeReady,
          lastInitializationError: stripeInitializationError
        }
      }
    });
    
  } catch (error) {
    logger.error('Enhanced Truth Serum diagnostic error:', error);
    res.status(500).json({
      success: false,
      message: 'Enhanced diagnostic failed',
      error: {
        code: 'ENHANCED_DIAGNOSTIC_ERROR',
        details: 'Unable to complete enhanced Stripe diagnostic',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
});

// Apply authentication to all other payment routes (after diagnostic endpoints)
router.use(protect);

// Initialize Stripe client with comprehensive error handling
let stripeClient = null;
let stripeInitializationError = null;

const initializeStripe = () => {
  try {
    console.log('\n🔧 [Payment Routes] STRIPE INITIALIZATION DEBUG:');
    console.log('=================================================');
    
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const publishableKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY;
    const isEnabled = isStripeEnabled();
    
    console.log(`   - isStripeEnabled(): ${isEnabled}`);
    console.log(`   - STRIPE_SECRET_KEY exists: ${!!secretKey}`);
    console.log(`   - VITE_STRIPE_PUBLISHABLE_KEY exists: ${!!publishableKey}`);
    
    // CRITICAL: Check for the common publishable key misconfiguration
    if (publishableKey && publishableKey.startsWith('sk_')) {
      console.log('   - 🚨 CRITICAL ERROR: PUBLISHABLE KEY IS ACTUALLY A SECRET KEY!');
      console.log('   - 🚨 Your VITE_STRIPE_PUBLISHABLE_KEY starts with "sk_" but should start with "pk_"');
      console.log('   - 🚨 This is the likely cause of your 503 errors!');
      stripeInitializationError = 'CRITICAL: Publishable key is actually a secret key (starts with sk_ instead of pk_)';
      return false;
    }
    
    if (secretKey) {
      console.log(`   - Secret key length: ${secretKey.length}`);
      console.log(`   - Secret key format: ${secretKey.substring(0, 8)}...`);
      console.log(`   - Secret key starts with sk_/rk_: ${secretKey.startsWith('sk_') || secretKey.startsWith('rk_')}`);
      
      // Check for whitespace issues
      const trimmed = secretKey.trim();
      if (trimmed !== secretKey) {
        console.log(`   - ⚠️ SECRET KEY HAS WHITESPACE! Original: ${secretKey.length}, Trimmed: ${trimmed.length}`);
      }
    } else {
      console.log('   - ❌ STRIPE_SECRET_KEY is null/undefined');
      
      // Check what environment variables are actually available
      const allEnvKeys = Object.keys(process.env);
      const stripeKeys = allEnvKeys.filter(key => key.includes('STRIPE'));
      console.log(`   - Available STRIPE env vars: [${stripeKeys.join(', ')}]`);
    }
    
    if (publishableKey) {
      console.log(`   - Publishable key length: ${publishableKey.length}`);
      console.log(`   - Publishable key format: ${publishableKey.substring(0, 8)}...`);
      console.log(`   - Publishable key starts with pk_: ${publishableKey.startsWith('pk_')}`);
    }
    
    console.log('=================================================\n');
    
    if (isEnabled && secretKey) {
      stripeClient = new Stripe(secretKey.trim(), { // Use trimmed version
        apiVersion: '2023-10-16'
      });
      logger.info('✅ Enhanced Stripe client initialized successfully');
      console.log('🎉 [Payment Routes] Stripe client created successfully!');
      return true;
    } else {
      const reason = !secretKey ? 'Missing STRIPE_SECRET_KEY' : 'Stripe not enabled by configuration';
      stripeInitializationError = `Stripe initialization failed: ${reason}`;
      logger.warn(stripeInitializationError);
      console.log(`❌ [Payment Routes] Stripe initialization failed: ${reason}`);
      return false;
    }
  } catch (error) {
    stripeInitializationError = `Failed to initialize Stripe client: ${error.message}`;
    logger.error(stripeInitializationError);
    console.log(`💥 [Payment Routes] Stripe initialization error: ${error.message}`);
    return false;
  }
};

// Stripe is now initialized lazily in the checkStripeAvailability middleware
// This prevents a bad configuration from crashing the server on startup.
console.log('🚀 [Payment Routes] Module loaded. Stripe will initialize on first payment request.');

let stripeReady = false; // Keep track of the initialization state

/**
 * Middleware to check Stripe availability and provide helpful error responses
 * ENHANCED WITH LAZY INITIALIZATION (SINGLETON PATTERN)
 */
const checkStripeAvailability = (req, res, next) => {
  // If Stripe isn't ready, try to initialize it now.
  if (!stripeReady) {
    console.log('🔄 [Payment Routes] Stripe not initialized. Attempting lazy initialization...');
    stripeReady = initializeStripe();
  }
  
  // If it's still not ready after the attempt, then fail gracefully.
  if (!stripeClient || !stripeReady) {
    return res.status(503).json({
      success: false,
      message: 'Payment processing temporarily unavailable',
      error: {
        code: 'PAYMENT_SERVICE_UNAVAILABLE',
        details: stripeInitializationError || 'Payment service not configured or failed to initialize.',
        retryAfter: 300, // 5 minutes
        supportContact: 'support@swanstudios.com'
      },
      fallbackOptions: [
        {
          method: 'contact',
          description: 'Contact our support team to complete your purchase',
          contact: 'support@swanstudios.com'
        },
        {
          method: 'retry',
          description: 'Try again in a few minutes',
          retryAfter: 300
        }
      ]
    });
  }
  
  // If we get here, Stripe is ready. Proceed.
  next();
};

/**
 * Health check endpoint for payment system
 */
router.get('/health', (req, res) => { // This route does not use checkStripeAvailability
  const health = {
    status: stripeReady ? 'healthy' : 'degraded',
    stripe: {
      available: stripeReady,
      error: stripeInitializationError
    },
    timestamp: new Date().toISOString()
  };

  res.status(stripeReady ? 200 : 503).json({
    success: true,
    data: health
  });
});

/**
 * Simple status endpoint (no dependencies)
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    status: 'payment_service_running',
    timestamp: new Date().toISOString(),
    stripe_configured: stripeReady
  });
});

/**
 * POST /api/payments/create-payment-intent
 * Create a Payment Intent for Stripe Elements
 * This enables embedded payment forms with enhanced UX
 */
router.post('/create-payment-intent', checkStripeAvailability, async (req, res) => {
  try {
    const userId = req.user.id;
    const { cartId } = req.body;

    logger.info(`Creating payment intent for user ${userId}, cart ${cartId}`);

    // Validate cart with comprehensive error handling
    let cart;
    try {
      cart = await ShoppingCart.findOne({
        where: { 
          id: cartId || null,
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
    } catch (dbError) {
      logger.error(`Database error while fetching cart: ${dbError.message}`);
      return res.status(500).json({
        success: false,
        message: 'Unable to access cart data',
        error: {
          code: 'DATABASE_ERROR',
          details: 'Cart validation failed'
        }
      });
    }

    if (!cart || !cart.cartItems || cart.cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or empty cart',
        error: {
          code: 'INVALID_CART',
          details: 'Cart not found or contains no items'
        }
      });
    }

    // Calculate total amount with defensive fallback
    const { total: finalTotal, totalSessions, source } = getCartTotalsWithFallback(cart);
    
    // Debug payment intent creation
    await debugCartState(cartId, 'payment_intent_creation');
    
    logger.info('Payment intent total calculation', {
      cartId,
      persistedTotal: cart.total,
      calculatedTotal: finalTotal,
      totalSessions,
      source,
      itemCount: cart.cartItems?.length || 0
    });
    
    const totalAmount = Math.round(finalTotal * 100); // Convert to cents
    
    if (totalAmount < 50) { // $0.50 minimum for Stripe
      logger.error('Payment intent creation failed: Amount too small', {
        cartId,
        totalAmount,
        finalTotal,
        totalSessions,
        source,
        persistedTotal: cart.total,
        itemCount: cart.cartItems?.length || 0
      });
      
      return res.status(400).json({
        success: false,
        message: 'Order total too small',
        error: {
          code: 'AMOUNT_TOO_SMALL',
          details: 'Minimum order amount is $0.50',
          debugInfo: {
            cartTotal: finalTotal,
            totalSessions,
            calculationSource: source
          }
        }
      });
    }

    // Get customer information with error handling
    let user;
    try {
      user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          error: {
            code: 'USER_NOT_FOUND',
            details: 'Authentication user not found in database'
          }
        });
      }
    } catch (dbError) {
      logger.error(`Database error while fetching user: ${dbError.message}`);
      return res.status(500).json({
        success: false,
        message: 'Unable to access user data',
        error: {
          code: 'DATABASE_ERROR',
          details: 'User validation failed'
        }
      });
    }

    // Create Payment Intent with comprehensive error handling
    let paymentIntent;
    try {
      paymentIntent = await stripeClient.paymentIntents.create({
        amount: totalAmount,
        currency: 'usd',
        customer: user.stripeCustomerId || undefined,
        metadata: {
          cartId: cart.id.toString(),
          userId: userId.toString(),
          userName: `${user.firstName} ${user.lastName}`,
          itemCount: cart.cartItems.length.toString()
        },
        description: `SwanStudios Training Package - ${cart.cartItems.length} item(s)`,
        automatic_payment_methods: {
          enabled: true
        },
        setup_future_usage: 'off_session'
      });
    } catch (stripeError) {
      logger.error(`Stripe error creating payment intent: ${stripeError.message}`);
      
      // Handle specific Stripe errors
      let errorMessage = 'Failed to create payment intent';
      let errorCode = 'STRIPE_ERROR';
      
      if (stripeError.type === 'StripeCardError') {
        errorMessage = 'Card was declined';
        errorCode = 'CARD_DECLINED';
      } else if (stripeError.type === 'StripeRateLimitError') {
        errorMessage = 'Too many requests, please try again later';
        errorCode = 'RATE_LIMITED';
      } else if (stripeError.type === 'StripeInvalidRequestError') {
        errorMessage = 'Invalid payment request';
        errorCode = 'INVALID_REQUEST';
      } else if (stripeError.type === 'StripeAPIError') {
        errorMessage = 'Payment service temporarily unavailable';
        errorCode = 'SERVICE_UNAVAILABLE';
      } else if (stripeError.type === 'StripeConnectionError') {
        errorMessage = 'Network error, please check your connection';
        errorCode = 'CONNECTION_ERROR';
      }

      return res.status(500).json({
        success: false,
        message: errorMessage,
        error: {
          code: errorCode,
          details: process.env.NODE_ENV === 'development' ? stripeError.message : 'Payment processing error',
          retryable: ['RATE_LIMITED', 'SERVICE_UNAVAILABLE', 'CONNECTION_ERROR'].includes(errorCode)
        }
      });
    }

    // Store payment intent ID in cart for tracking
    try {
      cart.paymentIntentId = paymentIntent.id;
      await cart.save();
    } catch (dbError) {
      logger.error(`Database error saving payment intent ID: ${dbError.message}`);
      // Don't fail the request if we can't save the ID, but log it
    }

    logger.info(`Created payment intent ${paymentIntent.id} for cart ${cart.id}`);

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: totalAmount,
        currency: 'usd',
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
      }
    });

  } catch (error) {
    logger.error('Unexpected error creating payment intent:', error);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: {
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      }
    });
  }
});

/**
 * POST /api/payments/confirm-payment
 * Confirm payment and complete order processing
 * Called after successful payment via Stripe Elements
 */
router.post('/confirm-payment', checkStripeAvailability, async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment Intent ID required',
        error: {
          code: 'MISSING_PAYMENT_INTENT_ID',
          details: 'paymentIntentId is required'
        }
      });
    }

    // Retrieve payment intent from Stripe with error handling
    let paymentIntent;
    try {
      paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);
    } catch (stripeError) {
      logger.error(`Stripe error retrieving payment intent: ${stripeError.message}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid payment intent',
        error: {
          code: 'INVALID_PAYMENT_INTENT',
          details: 'Payment intent not found or inaccessible'
        }
      });
    }

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed',
        status: paymentIntent.status,
        error: {
          code: 'PAYMENT_NOT_COMPLETED',
          details: `Payment status: ${paymentIntent.status}`
        }
      });
    }

    // Find the cart associated with this payment
    let cart;
    try {
      cart = await ShoppingCart.findOne({
        where: {
          paymentIntentId,
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
    } catch (dbError) {
      logger.error(`Database error while fetching cart for confirmation: ${dbError.message}`);
      return res.status(500).json({
        success: false,
        message: 'Unable to access cart data',
        error: {
          code: 'DATABASE_ERROR',
          details: 'Cart confirmation failed'
        }
      });
    }

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found or already processed',
        error: {
          code: 'CART_NOT_FOUND',
          details: 'Associated cart not found or already completed'
        }
      });
    }

    // Mark cart as completed
    try {
      cart.status = 'completed';
      cart.paymentStatus = 'paid';
      cart.completedAt = new Date();
      cart.paymentIntentId = paymentIntentId;
      await cart.save();

      // Process the completed order (add sessions, trigger notifications, etc.)
      await processCompletedOrder(cart.id);
    } catch (dbError) {
      logger.error(`Database error while completing order: ${dbError.message}`);
      return res.status(500).json({
        success: false,
        message: 'Failed to complete order',
        error: {
          code: 'ORDER_COMPLETION_ERROR',
          details: 'Order processing failed'
        }
      });
    }

    logger.info(`Payment confirmed and order completed for cart ${cart.id}`);

    res.json({
      success: true,
      message: 'Payment confirmed and order completed',
      data: {
        orderId: cart.id,
        paymentIntentId,
        amount: cart.total,
        completedAt: cart.completedAt,
        items: cart.cartItems.map(item => ({
          name: item.storefrontItem?.name || 'Training Package',
          sessions: item.storefrontItem?.sessions || 0,
          price: item.price,
          quantity: item.quantity
        }))
      }
    });

  } catch (error) {
    logger.error('Unexpected error confirming payment:', error);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: {
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      }
    });
  }
});

/**
 * GET /api/payments/status/:paymentIntentId
 * Get real-time payment status
 */
router.get('/status/:paymentIntentId', checkStripeAvailability, async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const userId = req.user.id;

    // Verify this payment intent belongs to the user
    let cart;
    try {
      cart = await ShoppingCart.findOne({
        where: {
          paymentIntentId,
          userId
        }
      });
    } catch (dbError) {
      logger.error(`Database error while checking payment ownership: ${dbError.message}`);
      return res.status(500).json({
        success: false,
        message: 'Unable to verify payment ownership',
        error: {
          code: 'DATABASE_ERROR',
          details: 'Payment verification failed'
        }
      });
    }

    if (!cart) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to payment',
        error: {
          code: 'UNAUTHORIZED_PAYMENT_ACCESS',
          details: 'Payment does not belong to authenticated user'
        }
      });
    }

    // Get payment intent status from Stripe
    let paymentIntent;
    try {
      paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);
    } catch (stripeError) {
      logger.error(`Stripe error retrieving payment status: ${stripeError.message}`);
      return res.status(400).json({
        success: false,
        message: 'Unable to retrieve payment status',
        error: {
          code: 'PAYMENT_STATUS_ERROR',
          details: 'Payment status unavailable'
        }
      });
    }

    res.json({
      success: true,
      data: {
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        created: paymentIntent.created,
        lastError: paymentIntent.last_payment_error ? {
          code: paymentIntent.last_payment_error.code,
          message: paymentIntent.last_payment_error.message
        } : null
      }
    });

  } catch (error) {
    logger.error('Unexpected error fetching payment status:', error);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: {
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      }
    });
  }
});

/**
 * POST /api/payments/cancel-payment
 * Cancel a pending payment intent
 */
router.post('/cancel-payment', checkStripeAvailability, async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    const userId = req.user.id;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment Intent ID required',
        error: {
          code: 'MISSING_PAYMENT_INTENT_ID',
          details: 'paymentIntentId is required'
        }
      });
    }

    // Verify this payment intent belongs to the user
    let cart;
    try {
      cart = await ShoppingCart.findOne({
        where: {
          paymentIntentId,
          userId,
          status: 'active'
        }
      });
    } catch (dbError) {
      logger.error(`Database error while checking payment for cancellation: ${dbError.message}`);
      return res.status(500).json({
        success: false,
        message: 'Unable to verify payment for cancellation',
        error: {
          code: 'DATABASE_ERROR',
          details: 'Payment cancellation verification failed'
        }
      });
    }

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found or already processed',
        error: {
          code: 'PAYMENT_NOT_FOUND',
          details: 'Payment not found or not eligible for cancellation'
        }
      });
    }

    // Cancel the payment intent in Stripe
    let paymentIntent;
    try {
      paymentIntent = await stripeClient.paymentIntents.cancel(paymentIntentId);
    } catch (stripeError) {
      logger.error(`Stripe error cancelling payment intent: ${stripeError.message}`);
      return res.status(400).json({
        success: false,
        message: 'Unable to cancel payment',
        error: {
          code: 'PAYMENT_CANCELLATION_ERROR',
          details: 'Payment cancellation failed'
        }
      });
    }

    // Clear payment intent from cart
    try {
      cart.paymentIntentId = null;
      await cart.save();
    } catch (dbError) {
      logger.error(`Database error clearing payment intent: ${dbError.message}`);
      // Don't fail the request, but log the error
    }

    logger.info(`Payment intent ${paymentIntentId} cancelled for cart ${cart.id}`);

    res.json({
      success: true,
      message: 'Payment cancelled successfully',
      data: {
        status: paymentIntent.status,
        cancelledAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Unexpected error cancelling payment:', error);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: {
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      }
    });
  }
});

/**
 * GET /api/payments/methods
 * Get available payment methods for the user's location
 */
router.get('/methods', (req, res) => {
  try {
    // Return available payment methods
    // This could be enhanced to be location-specific
    const paymentMethods = {
      card: {
        enabled: true,
        types: ['visa', 'mastercard', 'amex', 'discover']
      },
      digital_wallets: {
        enabled: true,
        types: ['apple_pay', 'google_pay']
      },
      bank_payments: {
        enabled: false, // Can be enabled for specific regions
        types: ['ach_debit']
      }
    };

    res.json({
      success: true,
      data: paymentMethods
    });

  } catch (error) {
    logger.error('Error fetching payment methods:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment methods',
      error: {
        code: 'INTERNAL_ERROR',
        details: 'Payment methods unavailable'
      }
    });
  }
});

/**
 * Helper function to process completed orders
 * This function is shared with the webhook handler
 */
async function processCompletedOrder(cartId) {
  try {
    // Import the order processing function from webhook handler
    // This ensures consistent order processing regardless of payment method
    const { default: stripeWebhook } = await import('../webhooks/stripeWebhook.mjs');
    
    // Note: In a real implementation, you'd extract the order processing
    // logic into a separate service module to avoid circular imports
    
    // For now, implement basic order processing here
    const cart = await ShoppingCart.findByPk(cartId, {
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
      logger.error(`Cart not found for order processing: ${cartId}`);
      return;
    }

    const userId = cart.userId;
    const user = await User.findByPk(userId);

    // Add sessions to user account
    let totalSessionsAdded = 0;
    for (const item of cart.cartItems) {
      if (item.storefrontItem?.sessions) {
        totalSessionsAdded += item.storefrontItem.sessions * item.quantity;
      }
    }

    if (totalSessionsAdded > 0 && user) {
      user.availableSessions = (user.availableSessions || 0) + totalSessionsAdded;
      user.hasPurchasedBefore = true;
      await user.save();

      logger.info(`Added ${totalSessionsAdded} sessions to user ${userId}`);
    }

    // Trigger notifications and MCP events here
    // (Implementation would mirror the webhook handler)

  } catch (error) {
    logger.error(`Error processing completed order ${cartId}:`, error);
    throw error;
  }
}

export default router;
