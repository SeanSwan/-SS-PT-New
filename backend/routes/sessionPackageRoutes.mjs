// backend/routes/sessionPackageRoutes.mjs
import express from 'express';
import Stripe from 'stripe';
import StorefrontItem from '../models/StorefrontItem.mjs';
import { protect } from '../middleware/authMiddleware.mjs';
import logger from '../utils/logger.mjs';
import { isStripeEnabled } from '../utils/apiKeyChecker.mjs';
import { buildWindowedStripeIdempotencyKey } from '../utils/stripeIdempotency.mjs';
import { getStorefrontSessionCredits } from '../services/SessionGrantService.mjs';
import sessionPackageManualGrantRoutes from './sessionPackageManualGrantRoutes.mjs';
import {
  SESSION_PACKAGE_CHECKOUT_SOURCE,
  fulfillSessionPackageCheckoutSession,
  isSessionPackageCheckoutSession,
  SessionPackageFulfillmentError,
} from '../services/sessionPackageCheckoutFulfillmentService.mjs';

const router = express.Router();

function getStorefrontPackagePrice(packageRecord) {
  const parsed = Number(packageRecord?.price ?? packageRecord?.totalCost ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function serializeStorefrontSessionPackage(packageRecord) {
  const sessions = getStorefrontSessionCredits(packageRecord);
  const price = getStorefrontPackagePrice(packageRecord);
  return {
    id: packageRecord.id,
    name: packageRecord.name,
    description: packageRecord.description,
    sessions,
    price,
    savings: 0,
    popular: false,
  };
}

function isPurchasableSessionPackage(sessionPackage) {
  return sessionPackage.sessions > 0 && sessionPackage.price > 0;
}

// --- Conditionally initialize Stripe ---
let stripeClient = null;
if (isStripeEnabled()) {
  try {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16' // Use a fixed, recent API version
    });
    logger.info('Stripe client initialized successfully in sessionPackageRoutes.');
  } catch (error) {
      logger.error(`Failed to initialize Stripe in sessionPackageRoutes: ${error.message}`);
      // stripeClient remains null
  }
} else {
    logger.warn('Stripe client NOT initialized in sessionPackageRoutes due to missing/invalid API key.');
}
// --- End Conditional Initialization ---

/**
 * @route   GET /api/session-packages
 * @desc    Get list of available session packages
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const packages = await StorefrontItem.findAll({
      // Exclude hidden per-client "SwanStudios Special" items — they must NOT appear in
      // this PUBLIC package list (same leak class as HR-007-F1: storeFrontRoutes GET /:id).
      // The owner buys their special via the authed cart flow (YourSpecialCard ->
      // /api/custom-packages/my), never this generic listing.
      where: { isActive: true, isSpecialOffer: false },
      order: [['displayOrder', 'ASC'], ['id', 'ASC']],
    });
    const sessionPackages = packages
      .map(serializeStorefrontSessionPackage)
      .filter(isPurchasableSessionPackage);
    
    res.json(sessionPackages);
  } catch (error) {
    logger.error('Error fetching session packages:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching session packages' 
    });
  }
});

/**
 * @route   POST /api/session-packages/purchase
 * @desc    Create a checkout session for purchasing training sessions
 * @access  Private
 */
router.post('/purchase', protect, async (req, res) => {
  // --- Add check for Stripe client ---
  if (!stripeClient) {
    logger.error('Attempted /api/session-packages/purchase but Stripe is not enabled/initialized.');
    return res.status(503).json({
      success: false,
      message: 'Payment service is currently unavailable. Please try again later or contact support.',
    });
  }
  // --- End check ---

  try {
    const { packageId } = req.body;
    const userId = req.user.id;
    const normalizedPackageId = Number(packageId);
    
    if (!Number.isInteger(normalizedPackageId) || normalizedPackageId <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid package ID is required'
      });
    }

    const selectedPackage = await StorefrontItem.findOne({
      where: {
        id: normalizedPackageId,
        isActive: true,
        // A per-client special is NOT purchasable via this generic path — it would skip
        // the assertClientOwnsActiveSpecial ownership + redemption guards, letting any
        // authenticated user buy another client's special (IDOR on the money path).
        // Specials are bought only via the owner's cart -> v2 checkout flow, which
        // enforces those guards. Excluding them here 400s "Invalid package". (HR-007-F4)
        isSpecialOffer: false,
      },
    });
    
    if (!selectedPackage) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid package selected' 
      });
    }

    const packageSessions = getStorefrontSessionCredits(selectedPackage);
    const packagePrice = getStorefrontPackagePrice(selectedPackage);

    if (packageSessions <= 0 || packagePrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Package is not available for checkout'
      });
    }
    
    // Determine the frontend URLs for success and cancel pages
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const idempotencyKey = buildWindowedStripeIdempotencyKey(
      `session-package-checkout:${userId}:${normalizedPackageId}`,
      {
        packageId: normalizedPackageId,
        sessions: packageSessions,
        price: packagePrice
      }
    );
    
    // Create the Stripe checkout session
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: selectedPackage.name,
              description: selectedPackage.description
                || `Package includes ${packageSessions} training session${packageSessions > 1 ? 's' : ''}`,
            },
            unit_amount: Math.round(packagePrice * 100), // Convert dollars to cents
          },
          quantity: 1,
        }
      ],
      mode: 'payment',
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout/cancel?reason=session_package_cancelled`,
      client_reference_id: userId.toString(),
      metadata: {
        source: SESSION_PACKAGE_CHECKOUT_SOURCE,
        packageId: String(normalizedPackageId),
        sessions: String(packageSessions)
      }
    }, {
      idempotencyKey
    });

    // Return the checkout URL to redirect the user to Stripe
    res.status(200).json({ 
      success: true, 
      checkoutUrl: session.url 
    });
  } catch (error) {
    logger.error('Error creating session package checkout:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create checkout session. Please try again.' 
    });
  }
});

/**
 * @route   POST /api/session-packages/webhook
 * @desc    Handle Stripe webhook events for session purchases
 * @access  Public (secured by Stripe signature verification)
 */
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  if (!stripeClient) {
    logger.error('Stripe webhook received but Stripe is not enabled/initialized.');
    return res.status(503).end();
  }
  
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    logger.error('Stripe webhook secret not configured.');
    return res.status(500).end();
  }
  
  let event;
  
  try {
    event = stripeClient.webhooks.constructEvent(
      req.body,
      signature,
      webhookSecret
    );
  } catch (err) {
    logger.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    try {
      // Check if this is a session package purchase
      if (isSessionPackageCheckoutSession(session)) {
        await fulfillSessionPackageCheckoutSession(session);
      }
    } catch (error) {
      logger.error(`Error processing session purchase: ${error.message}`);
      if (error instanceof SessionPackageFulfillmentError && error.statusCode < 500) {
        return res.send();
      }
      return res.status(500).send('Session package webhook processing error');
    }
  }
  
  // Return a 200 response to acknowledge receipt of the event
  res.send();
});

router.use(sessionPackageManualGrantRoutes);

export default router;
