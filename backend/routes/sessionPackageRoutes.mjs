// backend/routes/sessionPackageRoutes.mjs
import express from 'express';
import Stripe from 'stripe';
import User from '../models/User.mjs';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import logger from '../utils/logger.mjs';
import { isStripeEnabled } from '../utils/apiKeyChecker.mjs';

const router = express.Router();

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
    // Hard-coded session packages
    const sessionPackages = [
      {
        id: 'single',
        name: 'Single Session',
        description: 'One training session with our professional trainer',
        sessions: 1,
        price: 85,
        savings: 0,
        popular: false
      },
      {
        id: 'starter',
        name: 'Starter Package',
        description: 'Get started with 5 training sessions',
        sessions: 5,
        price: 400,
        savings: 25,
        popular: true
      },
      {
        id: 'premium',
        name: 'Premium Package',
        description: '10 training sessions for dedicated fitness enthusiasts',
        sessions: 10,
        price: 750,
        savings: 100,
        popular: false
      },
      {
        id: 'elite',
        name: 'Elite Package',
        description: '20 training sessions for maximum results',
        sessions: 20,
        price: 1400,
        savings: 300,
        popular: false
      }
    ];
    
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
    
    if (!packageId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Package ID is required' 
      });
    }
    
    // Get package details (in a real app, these would come from the database)
    const packages = {
      single: { 
        name: 'Single Session',
        sessions: 1,
        price: 85 
      },
      starter: { 
        name: 'Starter Package (5 Sessions)',
        sessions: 5,
        price: 400 
      },
      premium: { 
        name: 'Premium Package (10 Sessions)',
        sessions: 10,
        price: 750 
      },
      elite: { 
        name: 'Elite Package (20 Sessions)',
        sessions: 20,
        price: 1400 
      }
    };
    
    const selectedPackage = packages[packageId];
    
    if (!selectedPackage) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid package selected' 
      });
    }
    
    // Determine the frontend URLs for success and cancel pages
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // Create the Stripe checkout session
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: selectedPackage.name,
              description: `Package includes ${selectedPackage.sessions} training session${selectedPackage.sessions > 1 ? 's' : ''}`,
            },
            unit_amount: Math.round(selectedPackage.price * 100), // Convert dollars to cents
          },
          quantity: 1,
        }
      ],
      mode: 'payment',
      success_url: `${baseUrl}/sessions/purchase-success?sessions=${selectedPackage.sessions}`,
      cancel_url: `${baseUrl}/sessions/purchase-cancel`,
      client_reference_id: userId.toString(),
      metadata: {
        packageId,
        sessions: selectedPackage.sessions.toString()
      }
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
      if (session.metadata && session.metadata.packageId && session.metadata.sessions) {
        const userId = session.client_reference_id;
        const sessionsToAdd = parseInt(session.metadata.sessions, 10);
        
        // Find the user and update their available sessions
        const user = await User.findByPk(userId);
        
        if (user) {
          // Add the purchased sessions to the user's account
          const currentSessions = user.availableSessions || 0;
          user.availableSessions = currentSessions + sessionsToAdd;
          await user.save();
          
          logger.info(`Added ${sessionsToAdd} sessions to user ${userId}`);
        } else {
          logger.error(`User not found for session purchase: ${userId}`);
        }
      }
    } catch (error) {
      logger.error(`Error processing session purchase: ${error.message}`);
    }
  }
  
  // Return a 200 response to acknowledge receipt of the event
  res.send();
});

/**
 * @route   POST /api/session-packages/add-sessions
 * @desc    Manually add sessions to a user (admin only)
 * @access  Private/Admin
 */
router.post('/add-sessions', protect, adminOnly, async (req, res) => {
  try {
    const { clientId, sessions, notes } = req.body;
    
    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID is required'
      });
    }
    
    if (!sessions || isNaN(sessions) || sessions <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid number of sessions is required'
      });
    }
    
    // Find the user
    const user = await User.findByPk(clientId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Add sessions to the user's account
    const currentSessions = user.availableSessions || 0;
    user.availableSessions = currentSessions + parseInt(sessions, 10);
    await user.save();
    
    // Log the manual addition
    logger.info(`Admin ${req.user.id} added ${sessions} sessions to user ${clientId}. Notes: ${notes || 'None'}`);
    
    res.status(200).json({
      success: true,
      message: `Successfully added ${sessions} sessions to user`,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        availableSessions: user.availableSessions
      }
    });
  } catch (error) {
    logger.error(`Error adding sessions to user: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error adding sessions'
    });
  }
});

/**
 * @route   POST /api/session-packages/add-test-sessions
 * @desc    Add sessions to test user (development only)
 * @access  Private
 */
router.post('/add-test-sessions', protect, async (req, res) => {
  try {
    // Only allow this in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'This endpoint is only available in development mode'
      });
    }
    
    const { sessions } = req.body;
    const userId = req.user.id;
    
    if (!sessions || isNaN(sessions) || sessions <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid number of sessions is required'
      });
    }
    
    // Update user's sessions
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Add sessions
    const currentSessions = user.availableSessions || 0;
    user.availableSessions = currentSessions + parseInt(sessions, 10);
    await user.save();
    
    logger.info(`Added ${sessions} test sessions to user ${userId}`);
    
    res.status(200).json({
      success: true,
      message: `Added ${sessions} test sessions to your account`,
      availableSessions: user.availableSessions
    });
  } catch (error) {
    logger.error(`Error adding test sessions: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error adding test sessions'
    });
  }
});

export default router;