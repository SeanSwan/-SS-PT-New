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
import sequelize from '../database.mjs';
import { TIER_DEFINITIONS as CATALOG_TIERS } from '../config/tierCatalog.mjs';
import logger from '../utils/logger.mjs';
import { buildWindowedStripeIdempotencyKey } from '../utils/stripeIdempotency.mjs';

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
// SECTION: Tier Definitions — imported from central catalog
// PHILOSOPHY: Mission-first. AI is free for everyone.
// Tiers gate FEATURES, NOT AI message counts.
// ─────────────────────────────────────────────────────────────
const TIER_DEFINITIONS = CATALOG_TIERS;

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

    const cumDonation = parseFloat(subscription.cumulativeDonationAmount || 0);
    const crystallinePromoEligible = subscription.tier === 'pro' && cumDonation >= 25;

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
        cumulativeDonationAmount: cumDonation,
        crystallinePromoEligible,
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

/** POST /api/subscriptions/checkout - Create Stripe checkout session */
// BILLING MODES:
//   Guardian (pro)     = mode:payment  (one-time donation, $1-$50)
//   Crystalline (elite) = mode:subscription (recurring $24.99/mo or $249.99/yr)
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

    const tierDef = TIER_DEFINITIONS[tier];

    // ── Guardian (pro): one-time donation via mode:payment ──
    if (tier === 'pro') {
      let donationAmount = tierDef.suggestedPrice;
      if (amount !== undefined) {
        const parsed = parseFloat(amount);
        if (isNaN(parsed) || parsed < tierDef.minimumPrice) {
          return res.status(400).json({
            success: false,
            message: `Minimum Guardian donation is $${tierDef.minimumPrice}.`,
          });
        }
        if (parsed > tierDef.maximumPrice) {
          return res.status(400).json({ success: false, message: `Maximum donation is $${tierDef.maximumPrice}.` });
        }
        donationAmount = parsed;
      }

      // Get or create Stripe customer
      const UserModel = (await import('../models/User.mjs')).default;
      const user = await UserModel.findByPk(userId);
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await s.customers.create({
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
          metadata: { userId: String(userId), tier: 'pro' },
        });
        customerId = customer.id;
        await user.update({ stripeCustomerId: customerId });
      }

      const idempotencyKey = buildWindowedStripeIdempotencyKey(
        `subscription-donation-checkout:${userId}:pro`,
        {
          userId,
          tier: 'pro',
          amount: donationAmount
        }
      );

      const session = await s.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `SwanStudios ${tierDef.name} — Donation`,
                description: tierDef.tagline,
              },
              unit_amount: Math.round(donationAmount * 100),
            },
            quantity: 1,
          },
        ],
        success_url: `${process.env.FRONTEND_URL || 'https://sswanstudios.com'}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL || 'https://sswanstudios.com'}/ascension`,
        metadata: {
          userId: String(userId),
          tier: 'pro',
          amount: String(donationAmount),
          billingMode: 'payment',
        },
      }, {
        idempotencyKey,
      });

      return res.json({
        success: true,
        checkoutUrl: session.url,
        sessionId: session.id,
      });
    }

    // ── Crystalline (elite): recurring subscription ──
    if (!['month', 'year'].includes(billingInterval)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid billing interval. Choose month or year.',
      });
    }

    const isAnnual = billingInterval === 'year';
    const checkoutAmount = isAnnual ? tierDef.annualPrice : tierDef.price;

    const UserModel = (await import('../models/User.mjs')).default;
    const user = await UserModel.findByPk(userId);
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await s.customers.create({
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
        metadata: { userId: String(userId), tier: 'elite' },
      });
      customerId = customer.id;
      await user.update({ stripeCustomerId: customerId });
    }

    const intervalLabel = isAnnual ? 'Annual' : 'Monthly';
    const savingsNote = isAnnual ? ' (save $50!)' : '';

    const idempotencyKey = buildWindowedStripeIdempotencyKey(
      `subscription-checkout:${userId}:elite`,
      {
        userId,
        tier: 'elite',
        billingInterval,
        amount: checkoutAmount
      }
    );

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
          tier: 'elite',
          billingInterval,
          requestedAmount: String(checkoutAmount),
        },
      },
      success_url: `${process.env.FRONTEND_URL || 'https://sswanstudios.com'}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://sswanstudios.com'}/ascension`,
      metadata: {
        userId: String(userId),
        tier: 'elite',
        billingInterval,
        amount: String(checkoutAmount),
        billingMode: 'subscription',
      },
    }, {
      idempotencyKey,
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
  const hasRawBody = Buffer.isBuffer(req.body) || typeof req.body === 'string';

  let event;
  try {
    if (webhookSecret) {
      if (!hasRawBody) {
        logger.error('[Subscription Webhook] Raw request body missing for signed webhook verification');
        return res.status(400).send('Webhook Error: raw body required');
      }
      event = s.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else if (process.env.NODE_ENV === 'production') {
      logger.error('[Subscription Webhook] STRIPE_SUBSCRIPTION_WEBHOOK_SECRET missing in production');
      return res.status(503).send('Subscription webhook is not configured');
    } else {
      event = hasRawBody ? JSON.parse(req.body.toString()) : req.body;
      logger.warn('[Subscription Webhook] No webhook secret configured; accepting unsigned development event');
    }
  } catch (err) {
    logger.error('[Subscription Webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = parseInt(session.metadata?.userId, 10);
        if (!userId) break;

        const UserModel = (await import('../models/User.mjs')).default;

        // Guardian donation (mode:payment) — one-time, no recurring
        if (session.mode === 'payment') {
          const donationAmount = parseFloat(session.metadata?.amount || '5');
          const sessionId = session.id;

          // C1: Idempotency — skip if this session was already processed
          const [inserted] = await sequelize.query(
            `INSERT INTO processed_stripe_sessions ("sessionId", "userId", tier, amount)
             VALUES (:sessionId, :userId, 'pro', :amount)
             ON CONFLICT ("sessionId") DO NOTHING
             RETURNING id`,
            { replacements: { sessionId, userId, amount: donationAmount }, type: sequelize.QueryTypes.SELECT }
          );
          if (!inserted) {
            logger.info(`[Subscription Webhook] Duplicate Guardian session ${sessionId} — skipped`);
            break;
          }

          // C3: findOne+save in transaction — no upsert, no duplicate rows
          await sequelize.transaction(async (t) => {
            const sub = await Subscription.findOne({ where: { userId }, transaction: t, order: [['createdAt', 'DESC']] });

            const prevCumulative = parseFloat(sub?.cumulativeDonationAmount || 0);
            const newCumulative = Math.round((prevCumulative + donationAmount) * 100) / 100;

            if (sub) {
              sub.tier = 'pro';
              sub.status = 'active';
              sub.amount = donationAmount;
              sub.cumulativeDonationAmount = newCumulative;
              sub.stripeCustomerId = session.customer;
              sub.stripeSubscriptionId = null;
              sub.currentPeriodStart = new Date();
              sub.currentPeriodEnd = null;
              sub.paymentMethod = 'stripe';
              sub.cancelledAt = null;
              sub.cancelReason = null;
              await sub.save({ transaction: t });
            } else {
              await Subscription.create({
                userId,
                tier: 'pro',
                status: 'active',
                amount: donationAmount,
                cumulativeDonationAmount: newCumulative,
                stripeCustomerId: session.customer,
                stripeSubscriptionId: null,
                currentPeriodStart: new Date(),
                currentPeriodEnd: null,
                paymentMethod: 'stripe',
              }, { transaction: t });
            }

            await UserModel.update(
              { subscriptionTier: 'pro' },
              { where: { id: userId }, transaction: t }
            );

            logger.info(`[Subscription Webhook] Guardian donation $${donationAmount} for user ${userId} (cumulative: $${newCumulative})`);
          });
        }

        // Crystalline subscription (mode:subscription) — recurring
        if (session.mode === 'subscription') {
          const tier = session.metadata?.tier || 'elite';
          const amount = parseFloat(session.metadata?.amount || '24.99');
          const interval = session.metadata?.billingInterval || 'month';

          const now = new Date();
          const periodEnd = new Date(now);
          if (interval === 'year') {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
          }

          const effectiveMonthlyAmount = interval === 'year'
            ? Math.round((amount / 12) * 100) / 100
            : amount;

          await Subscription.upsert({
            userId,
            tier,
            status: 'active',
            amount: effectiveMonthlyAmount,
            stripeSubscriptionId: session.subscription,
            stripeCustomerId: session.customer,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            paymentMethod: 'stripe',
            cancelledAt: null,
            cancelReason: null,
          });

          await UserModel.update(
            { subscriptionTier: tier },
            { where: { id: userId } }
          );

          logger.info(`[Subscription Webhook] Activated ${tier} for user ${userId} at $${amount}/${interval}`);
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
            // Derive billing interval from Stripe subscription object
            // Stripe sends the full subscription in invoice.subscription_details
            // or we can check the line item period
            const now = new Date();
            const periodEnd = new Date(now);
            const lineItem = invoice.lines?.data?.[0];
            const intervalFromStripe = lineItem?.plan?.interval || lineItem?.price?.recurring?.interval;

            if (intervalFromStripe === 'year') {
              periodEnd.setFullYear(periodEnd.getFullYear() + 1);
            } else {
              periodEnd.setMonth(periodEnd.getMonth() + 1);
            }

            subscription.status = 'active';
            subscription.currentPeriodStart = now;
            subscription.currentPeriodEnd = periodEnd;
            await subscription.save();

            logger.info(`[Subscription Webhook] Renewal payment succeeded for sub ${subId} (interval: ${intervalFromStripe || 'month'})`);
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
    return res.status(500).json({ received: false, message: 'Webhook processing failed' });
  }

  return res.json({ received: true });
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
