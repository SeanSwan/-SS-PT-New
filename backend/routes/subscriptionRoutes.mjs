/**
 * ============================================================================
 * FILE: subscriptionRoutes.mjs
 * PURPOSE: REST endpoints for SwanStudios subscription tier management
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Handles subscription CRUD, Stripe checkout for
 * recurring billing, subscription status checks, and admin management.
 *
 * ENDPOINTS:
 *   GET    /api/subscriptions/status          - Get current user subscription + usage
 *   GET    /api/subscriptions/tiers           - List available tiers + pricing
 *   POST   /api/subscriptions/start-trial     - Start 30-day free trial
 *   POST   /api/subscriptions/checkout        - Create Stripe subscription checkout
 *   POST   /api/subscriptions/cancel          - Cancel subscription
 *   POST   /api/subscriptions/webhook         - Stripe webhook handler
 *   GET    /api/subscriptions/admin/all       - Admin: list all subscriptions
 *   POST   /api/subscriptions/admin/grant     - Admin: manually grant subscription
 */

import express from 'express';
import Stripe from 'stripe';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import Subscription from '../models/Subscription.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

// Stripe initialization (lazy — only when STRIPE_SECRET_KEY exists)
let stripe = null;
const getStripe = () => {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
  }
  return stripe;
};

// ─────────────────────────────────────────────────────────────
// SECTION: Tier Definitions
// PURPOSE: Single source of truth for tier features and pricing
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// TIER PHILOSOPHY: Mission-first. AI is free for everyone.
// Tiers gate FEATURES (calculators, charts, trainer access),
// NOT AI message counts. Anomaly detection for bots only.
// ─────────────────────────────────────────────────────────────
const TIER_DEFINITIONS = {
  free: {
    id: 'free',
    name: 'Swan Starter',
    tagline: 'AI coaching, workout logging, nutrition — free forever',
    price: 0,
    priceDisplay: 'Free',
    donationEnabled: true,
    features: [
      'AI Coach chat (unlimited)',
      'AI workout generation (unlimited, with review flow)',
      'Workout logging (unlimited)',
      'Nutrition & macro counter',
      'Exercise library (840+ exercises)',
      'Social feed & community',
      'Gamification (XP, levels, badges, streaks)',
      'Basic progress charts',
      'BMI calculator',
      'Pain & injury body map',
      'Session booking',
      '30-day trial of all premium features',
    ],
    limits: {
      aiMessagesPerMonth: Infinity,   // No caps — anomaly detection only
      aiGenerationsPerMonth: Infinity,
    },
  },
  pro: {
    id: 'pro',
    name: 'Swan Guardian',
    tagline: 'Support the mission — unlock advanced tools & analytics',
    price: 5,
    priceDisplay: 'Pay what you can (suggested $5/mo)',
    donationBased: true,
    minimumPrice: 1,
    maximumPrice: 50.00,
    suggestedPrice: 5,
    features: [
      'Everything in Swan Starter',
      'All 4 NASM calculators (1RM, TDEE, Body Fat %, BMI)',
      'Full 50-chart Victory analytics gallery',
      'Detailed NASM Analytics dashboard (14 charts)',
      'AI Nutrition coaching (meal planning, food intelligence)',
      'Advanced progress analytics & insights',
      'Swan Guardian badge (Rare — Gilded Fern)',
      'Priority in community challenges',
      'Support keeps SwanStudios free for everyone',
    ],
    donationTiers: [
      { minAmount: 1,    maxAmount: 4.99,  label: 'Supporter' },
      { minAmount: 5,    maxAmount: 9.99,  label: 'Champion' },
      { minAmount: 10,   maxAmount: 24.99, label: 'Hero' },
      { minAmount: 25,   maxAmount: 50,    label: 'Legendary Patron' },
    ],
    limits: {
      aiMessagesPerMonth: Infinity,   // No caps — same AI as everyone
      aiGenerationsPerMonth: Infinity,
    },
  },
  elite: {
    id: 'elite',
    name: 'Crystalline Swan',
    tagline: 'Human trainer access — your personal coach in your pocket',
    price: 24.99,
    priceDisplay: '$24.99/mo',
    annualPrice: 249.99,
    annualPriceDisplay: '$249.99/yr (save $50)',
    stripePriceId: null, // Set via Stripe dashboard
    features: [
      'Everything in Swan Guardian',
      'Direct trainer messaging (async chat with your trainer)',
      'Video form check submissions (48h feedback)',
      'Monthly custom workout plan review',
      'Content Studio access',
      'Creator Economy access',
      'Live streaming (create broadcasts)',
      'Crystalline Swan badge (Epic — Wing Purple)',
      'Priority scheduling for sessions',
      'Exclusive trainer Q&A sessions',
    ],
    limits: {
      aiMessagesPerMonth: Infinity,
      aiGenerationsPerMonth: Infinity,
    },
  },
};

// ─────────────────────────────────────────────────────────────
// SECTION: Public Endpoints
// ─────────────────────────────────────────────────────────────

/** GET /api/subscriptions/tiers - List available tiers */
router.get('/tiers', (_req, res) => {
  res.json({
    success: true,
    tiers: Object.values(TIER_DEFINITIONS),
  });
});

/** GET /api/subscriptions/status - Get current user subscription + usage */
router.get('/status', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    // Admins/trainers have unlimited access
    if (role === 'admin' || role === 'trainer') {
      return res.json({
        success: true,
        subscription: {
          tier: 'elite',
          status: 'active',
          isAdmin: true,
          hasFullAIAccess: true,
        },
        usage: null,
      });
    }

    let subscription = await Subscription.findOne({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });

    // Auto-create trial if no subscription exists
    if (!subscription) {
      const now = new Date();
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + 30);

      subscription = await Subscription.create({
        userId,
        tier: 'free',
        status: 'trial',
        trialStartDate: now,
        trialEndDate: trialEnd,
      });
    }

    // Get usage data from User model
    const UserModel = (await import('../models/User.mjs')).default;
    const user = await UserModel.findByPk(userId, {
      attributes: ['aiMessagesUsedThisMonth', 'aiGenerationsUsedThisMonth', 'aiUsageResetDate'],
    });

    const tierDef = TIER_DEFINITIONS[subscription.tier] || TIER_DEFINITIONS.free;

    res.json({
      success: true,
      subscription: {
        tier: subscription.tier,
        tierName: tierDef.name,
        status: subscription.status,
        hasFullAIAccess: subscription.hasFullAIAccess(),
        isInTrial: subscription.isInTrial(),
        trialDaysRemaining: subscription.trialDaysRemaining(),
        trialEndDate: subscription.trialEndDate,
        currentPeriodEnd: subscription.currentPeriodEnd,
        amount: subscription.amount,
        paymentMethod: subscription.paymentMethod,
      },
      usage: {
        aiMessagesUsed: user?.aiMessagesUsedThisMonth || 0,
        aiMessagesLimit: tierDef.limits.aiMessagesPerMonth,
        aiGenerationsUsed: user?.aiGenerationsUsedThisMonth || 0,
        aiGenerationsLimit: tierDef.limits.aiGenerationsPerMonth,
        resetDate: user?.aiUsageResetDate,
      },
      tierDefinition: tierDef,
    });
  } catch (error) {
    logger.error('[Subscription] Error fetching status:', error);
    res.status(500).json({ success: false, message: 'Error fetching subscription status' });
  }
});

/** POST /api/subscriptions/start-trial - Explicitly start 30-day trial */
router.post('/start-trial', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const existing = await Subscription.findOne({ where: { userId } });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You already have a subscription record. Trial may already be active or expired.',
        subscription: {
          tier: existing.tier,
          status: existing.status,
          isInTrial: existing.isInTrial(),
          trialDaysRemaining: existing.trialDaysRemaining(),
        },
      });
    }

    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 30);

    const subscription = await Subscription.create({
      userId,
      tier: 'free',
      status: 'trial',
      trialStartDate: now,
      trialEndDate: trialEnd,
    });

    res.status(201).json({
      success: true,
      message: 'Your 30-day free trial has started! Enjoy unlimited AI features.',
      subscription: {
        tier: subscription.tier,
        status: subscription.status,
        trialEndDate: subscription.trialEndDate,
        trialDaysRemaining: subscription.trialDaysRemaining(),
      },
    });
  } catch (error) {
    logger.error('[Subscription] Error starting trial:', error);
    res.status(500).json({ success: false, message: 'Error starting trial' });
  }
});

/** POST /api/subscriptions/checkout - Create Stripe subscription checkout session */
router.post('/checkout', protect, async (req, res) => {
  try {
    const { tier, amount, billingInterval = 'month' } = req.body;
    const userId = req.user.id;
    const s = getStripe();

    if (!s) {
      return res.status(503).json({
        success: false,
        message: 'Payment processing is not configured. Please contact support.',
      });
    }

    if (!tier || !['pro', 'elite'].includes(tier)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tier. Choose pro or elite.',
      });
    }

    if (!['month', 'year'].includes(billingInterval)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid billing interval. Choose month or year.',
      });
    }

    const tierDef = TIER_DEFINITIONS[tier];
    const isAnnual = billingInterval === 'year';

    // Pro tier: donation-based (pay what you can, $0-$50)
    let checkoutAmount = isAnnual ? tierDef.annualPrice : tierDef.price;
    if (tier === 'pro' && amount !== undefined && !isAnnual) {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount < 0) {
        return res.status(400).json({ success: false, message: 'Invalid donation amount.' });
      }
      if (parsedAmount > tierDef.maximumPrice) {
        return res.status(400).json({ success: false, message: `Maximum donation is $${tierDef.maximumPrice}/mo.` });
      }
      checkoutAmount = parsedAmount;
    }

    // For annual Pro donation: multiply monthly donation × 10 (2 months free discount)
    if (tier === 'pro' && isAnnual && amount !== undefined) {
      const monthlyDonation = parseFloat(amount);
      if (!isNaN(monthlyDonation) && monthlyDonation > 0) {
        checkoutAmount = Math.round(monthlyDonation * 10 * 100) / 100; // 10 months = 2 free
      }
    }

    // $0 donation = skip Stripe, create directly as active
    if (checkoutAmount === 0) {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await Subscription.upsert({
        userId,
        tier: 'pro',
        status: 'active',
        amount: 0,
        paymentMethod: 'manual',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelledAt: null,
        cancelReason: null,
      });

      const UserModel = (await import('../models/User.mjs')).default;
      await UserModel.update({ subscriptionTier: 'pro' }, { where: { id: userId } });

      return res.json({
        success: true,
        message: 'Swan Guardian activated! Thank you for supporting the SwanStudios mission.',
        tier: 'pro',
        donationAmount: 0,
      });
    }

    // Get or create Stripe customer
    const UserModel = (await import('../models/User.mjs')).default;
    const user = await UserModel.findByPk(userId);

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await s.customers.create({
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
        metadata: { userId: String(userId), tier },
      });
      customerId = customer.id;
      await user.update({ stripeCustomerId: customerId });
    }

    // Build product name with billing interval
    const intervalLabel = isAnnual ? 'Annual' : 'Monthly';
    const savingsNote = isAnnual ? ' (2 months free!)' : '';

    // Create Stripe Checkout Session in subscription mode
    const session = await s.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `SwanStudios ${tierDef.name} — ${intervalLabel}${savingsNote}`,
              description: tierDef.tagline,
            },
            unit_amount: Math.round(checkoutAmount * 100),
            recurring: { interval: billingInterval },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          userId: String(userId),
          tier,
          billingInterval,
          requestedAmount: String(checkoutAmount),
        },
      },
      success_url: `${process.env.FRONTEND_URL || 'https://sswanstudios.com'}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://sswanstudios.com'}/store/subscriptions`,
      metadata: {
        userId: String(userId),
        tier,
        billingInterval,
        amount: String(checkoutAmount),
      },
    });

    res.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    logger.error('[Subscription] Checkout error:', error);
    res.status(500).json({ success: false, message: 'Error creating checkout session' });
  }
});

/** POST /api/subscriptions/cancel - Cancel subscription */
router.post('/cancel', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { reason } = req.body;

    const subscription = await Subscription.findOne({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });

    if (!subscription || subscription.tier === 'free') {
      return res.status(400).json({
        success: false,
        message: 'No active paid subscription to cancel.',
      });
    }

    // Cancel on Stripe if applicable
    const s = getStripe();
    if (s && subscription.stripeSubscriptionId) {
      await s.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    subscription.cancelledAt = new Date();
    subscription.cancelReason = reason || 'User requested cancellation';
    // Keep active until period end (Stripe handles this)
    await subscription.save();

    res.json({
      success: true,
      message: 'Subscription will cancel at the end of your current billing period.',
      cancelEffective: subscription.currentPeriodEnd,
    });
  } catch (error) {
    logger.error('[Subscription] Cancel error:', error);
    res.status(500).json({ success: false, message: 'Error cancelling subscription' });
  }
});

// ─────────────────────────────────────────────────────────────
// SECTION: Stripe Webhook
// PURPOSE: Handle subscription lifecycle events from Stripe
// WHY: Stripe pushes payment success/failure/cancellation events
// ─────────────────────────────────────────────────────────────

/** POST /api/subscriptions/webhook - Stripe webhook (no auth — verified by signature) */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const s = getStripe();
  if (!s) return res.status(503).send('Stripe not configured');

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET;

  let event;
  try {
    if (webhookSecret) {
      event = s.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // Dev mode — trust the payload
      event = JSON.parse(req.body.toString());
      logger.warn('[Subscription Webhook] No webhook secret configured — accepting unverified event');
    }
  } catch (err) {
    logger.error('[Subscription Webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription') {
          const userId = parseInt(session.metadata?.userId, 10);
          const tier = session.metadata?.tier || 'pro';
          const amount = parseFloat(session.metadata?.amount || '9.99');
          const interval = session.metadata?.billingInterval || 'month';

          if (userId) {
            const now = new Date();
            const periodEnd = new Date(now);
            if (interval === 'year') {
              periodEnd.setFullYear(periodEnd.getFullYear() + 1);
            } else {
              periodEnd.setMonth(periodEnd.getMonth() + 1);
            }

            // For annual, store the effective monthly amount for donation tier calc
            const effectiveMonthlyAmount = interval === 'year'
              ? Math.round((amount / 12) * 100) / 100
              : amount;

            await Subscription.upsert({
              userId,
              tier,
              status: 'active',
              amount: effectiveMonthlyAmount, // Store monthly equivalent for donation tier calc
              stripeSubscriptionId: session.subscription,
              stripeCustomerId: session.customer,
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              paymentMethod: 'stripe',
              cancelledAt: null,
              cancelReason: null,
            });

            // Update user tier cache
            const UserModel = (await import('../models/User.mjs')).default;
            await UserModel.update(
              { subscriptionTier: tier },
              { where: { id: userId } }
            );

            logger.info(`[Subscription Webhook] Activated ${tier} for user ${userId} at $${amount}/mo`);
          }
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subId = invoice.subscription;

        if (subId) {
          const subscription = await Subscription.findOne({
            where: { stripeSubscriptionId: subId },
          });

          if (subscription) {
            const periodEnd = new Date();
            periodEnd.setMonth(periodEnd.getMonth() + 1);

            subscription.status = 'active';
            subscription.currentPeriodStart = new Date();
            subscription.currentPeriodEnd = periodEnd;
            await subscription.save();

            logger.info(`[Subscription Webhook] Renewal payment succeeded for sub ${subId}`);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subId = invoice.subscription;

        if (subId) {
          const subscription = await Subscription.findOne({
            where: { stripeSubscriptionId: subId },
          });

          if (subscription) {
            subscription.status = 'past_due';
            await subscription.save();

            logger.warn(`[Subscription Webhook] Payment failed for sub ${subId}`);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const subscription = await Subscription.findOne({
          where: { stripeSubscriptionId: sub.id },
        });

        if (subscription) {
          subscription.status = 'cancelled';
          subscription.tier = 'free';
          subscription.cancelledAt = new Date();
          await subscription.save();

          // Reset user tier
          const UserModel = (await import('../models/User.mjs')).default;
          await UserModel.update(
            { subscriptionTier: 'free' },
            { where: { id: subscription.userId } }
          );

          logger.info(`[Subscription Webhook] Subscription cancelled for user ${subscription.userId}`);
        }
        break;
      }

      default:
        logger.debug(`[Subscription Webhook] Unhandled event: ${event.type}`);
    }
  } catch (error) {
    logger.error('[Subscription Webhook] Processing error:', error);
  }

  res.json({ received: true });
});

// ─────────────────────────────────────────────────────────────
// SECTION: Admin Endpoints
// ─────────────────────────────────────────────────────────────

/** GET /api/subscriptions/admin/all - List all subscriptions */
router.get('/admin/all', protect, adminOnly, async (req, res) => {
  try {
    const subscriptions = await Subscription.findAll({
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, subscriptions });
  } catch (error) {
    logger.error('[Subscription Admin] Error listing:', error);
    res.status(500).json({ success: false, message: 'Error listing subscriptions' });
  }
});

/** POST /api/subscriptions/admin/grant - Manually grant subscription (Zelle/Venmo) */
router.post('/admin/grant', protect, adminOnly, async (req, res) => {
  try {
    const { userId, tier, amount, paymentMethod, durationMonths = 1 } = req.body;

    if (!userId || !tier || !['pro', 'elite'].includes(tier)) {
      return res.status(400).json({
        success: false,
        message: 'userId and tier (pro/elite) are required',
      });
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + durationMonths);

    const [subscription] = await Subscription.upsert({
      userId: parseInt(userId, 10),
      tier,
      status: 'active',
      amount: amount || TIER_DEFINITIONS[tier].price,
      paymentMethod: paymentMethod || 'manual',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelledAt: null,
      cancelReason: null,
    });

    // Update user tier cache
    const UserModel = (await import('../models/User.mjs')).default;
    await UserModel.update(
      { subscriptionTier: tier },
      { where: { id: userId } }
    );

    res.json({
      success: true,
      message: `Granted ${tier} subscription to user ${userId} for ${durationMonths} month(s)`,
      subscription,
    });
  } catch (error) {
    logger.error('[Subscription Admin] Grant error:', error);
    res.status(500).json({ success: false, message: 'Error granting subscription' });
  }
});

export default router;
