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
import { Op } from 'sequelize';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import Subscription from '../models/Subscription.mjs';
import sequelize from '../database.mjs';
import { TIER_DEFINITIONS as CATALOG_TIERS } from '../config/tierCatalog.mjs';
import logger from '../utils/logger.mjs';
import {
  buildStripeIdempotencyKey,
  buildWindowedStripeIdempotencyKey,
} from '../utils/stripeIdempotency.mjs';

const router = express.Router();

// Stripe initialization (lazy — only when STRIPE_SECRET_KEY exists)
let stripe = null;
const getStripe = () => {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
  }
  return stripe;
};

async function ensureSubscriptionStripeCustomer(stripeClient, user, userId, tier) {
  if (!user) {
    throw new Error('Authenticated subscription user not found');
  }

  if (user.stripeCustomerId) {
    try {
      const existingCustomer = await stripeClient.customers.retrieve(user.stripeCustomerId);
      if (existingCustomer?.deleted !== true) {
        return existingCustomer.id;
      }
      logger.warn('[Subscription] Stored Stripe customer was deleted; creating a replacement', {
        userId,
        tier,
      });
    } catch (error) {
      if (error?.code !== 'resource_missing') throw error;
      logger.warn('[Subscription] Stored Stripe customer no longer exists; creating a replacement', {
        userId,
        tier,
        errorCode: error?.code || error?.type || 'STRIPE_CUSTOMER_RETRIEVE_FAILED',
      });
    }
  }

  const customerIdempotencyKey = buildStripeIdempotencyKey('subscription-customer', {
    userId,
    previousCustomerId: user.stripeCustomerId || null,
  });
  const customer = await stripeClient.customers.create({
    email: user.email,
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
    metadata: { userId: String(userId), tier },
  }, { idempotencyKey: customerIdempotencyKey });

  await user.update({ stripeCustomerId: customer.id });
  return customer.id;
}

async function claimSubscriptionCheckoutSession({
  sessionId,
  userId,
  tier,
  amount,
  transaction,
}) {
  const [inserted] = await sequelize.query(
    `INSERT INTO processed_stripe_sessions ("sessionId", "userId", tier, amount)
     VALUES (:sessionId, :userId, :tier, :amount)
     ON CONFLICT ("sessionId") DO NOTHING
     RETURNING id`,
    {
      replacements: { sessionId, userId, tier, amount },
      type: sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  return Boolean(inserted);
}

function addUtcCalendarMonthsClamped(startDate, months) {
  if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) {
    throw new TypeError('startDate must be a valid Date');
  }
  if (!Number.isInteger(months) || months < 1) {
    throw new TypeError('months must be a positive integer');
  }

  const result = new Date(startDate);
  const originalDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(originalDay, lastDay));
  return result;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Tier Definitions — imported from central catalog
// PHILOSOPHY: Mission-first. AI is free for everyone.
// Tiers gate FEATURES, NOT AI message counts.
// ─────────────────────────────────────────────────────────────
const TIER_DEFINITIONS = CATALOG_TIERS;

const buildTransientTrialSubscription = (userId, now = new Date()) => {
  const trialEndDate = new Date(now);
  trialEndDate.setDate(trialEndDate.getDate() + 30);

  return {
    userId,
    tier: 'free',
    status: 'trial',
    trialStartDate: now,
    trialEndDate,
    currentPeriodEnd: null,
    amount: null,
    paymentMethod: null,
    cumulativeDonationAmount: 0,
    hasFullAIAccess() {
      return false;
    },
    isInTrial() {
      return this.status === 'trial' && this.trialEndDate && new Date() < new Date(this.trialEndDate);
    },
    trialDaysRemaining() {
      if (!this.trialEndDate) return 0;
      const diff = new Date(this.trialEndDate) - new Date();
      return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    },
  };
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
      const transientTrialSubscription = buildTransientTrialSubscription(userId);

      try {
        subscription = await Subscription.create({
          userId,
          tier: transientTrialSubscription.tier,
          status: transientTrialSubscription.status,
          trialStartDate: transientTrialSubscription.trialStartDate,
          trialEndDate: transientTrialSubscription.trialEndDate,
          cumulativeDonationAmount: transientTrialSubscription.cumulativeDonationAmount,
        });
      } catch (creationError) {
        logger.warn('[Subscription] Trial auto-create failed; returning transient status.', {
          errorName: creationError instanceof Error ? creationError.name : typeof creationError,
        });
        subscription = transientTrialSubscription;
      }
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
        // Cancellation truth: set by POST /cancel (cancel_at_period_end);
        // lets the client surface say "will not renew" across remounts.
        cancelledAt: subscription.cancelledAt ?? null,
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
      const customerId = await ensureSubscriptionStripeCustomer(s, user, userId, 'pro');

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

    const activeRecurringSubscription = await Subscription.findOne({
      where: {
        userId,
        stripeSubscriptionId: { [Op.ne]: null },
        status: { [Op.in]: ['active', 'past_due', 'paused'] },
      },
      order: [['createdAt', 'DESC']],
    });
    if (activeRecurringSubscription) {
      return res.status(409).json({
        success: false,
        message: 'You already have an active recurring subscription.',
        code: 'ACTIVE_SUBSCRIPTION_EXISTS',
      });
    }

    const UserModel = (await import('../models/User.mjs')).default;
    const user = await UserModel.findByPk(userId);
    const customerId = await ensureSubscriptionStripeCustomer(s, user, userId, 'elite');

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

  // Fail closed in ALL environments — a signed event is required. The prior
  // code accepted UNSIGNED events when NODE_ENV !== 'production', which let a
  // forged checkout.session.completed grant a free 'elite' subscription on any
  // non-prod instance reachable against the (shared) DB. The primary + cart +
  // session-package webhooks already require the secret; this now matches.
  if (!webhookSecret) {
    logger.error('[Subscription Webhook] STRIPE_SUBSCRIPTION_WEBHOOK_SECRET missing — refusing unsigned event');
    return res.status(503).send('Subscription webhook is not configured');
  }
  if (!hasRawBody) {
    logger.error('[Subscription Webhook] Raw request body missing for signed webhook verification');
    return res.status(400).send('Webhook Error: raw body required');
  }

  let event;
  try {
    event = s.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    logger.error('[Subscription Webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.payment_status !== 'paid') {
          logger.warn('[Subscription Webhook] Skipping unpaid checkout completion', {
            sessionId: session.id,
            paymentStatus: session.payment_status || 'unknown',
          });
          break;
        }

        const UserModel = (await import('../models/User.mjs')).default;
        const metadataUserId = Number.parseInt(session.metadata?.userId, 10);
        const stripeCustomerId = typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id;
        if (!Number.isInteger(metadataUserId) || !stripeCustomerId) {
          throw new Error(`Paid subscription checkout ${session.id} is missing its user/customer binding`);
        }

        // Bind fulfillment to the server-persisted Stripe customer. Metadata is
        // editable in Stripe and can only corroborate that authoritative mapping.
        const checkoutUser = await UserModel.findOne({
          where: { stripeCustomerId },
          attributes: ['id'],
        });
        if (!checkoutUser || checkoutUser.id !== metadataUserId) {
          throw new Error(`Paid subscription checkout ${session.id} has an invalid user/customer binding`);
        }
        const userId = checkoutUser.id;

        // Guardian donation (mode:payment) — one-time, no recurring
        if (session.mode === 'payment') {
          const amountTotalCents = Number(session.amount_total);
          if (!Number.isInteger(amountTotalCents) || amountTotalCents <= 0) {
            throw new Error(`Paid Guardian checkout ${session.id} is missing a valid Stripe amount_total`);
          }
          const donationAmount = amountTotalCents / 100;
          const sessionId = session.id;

          // C1: Idempotency — skip if this session was already processed
          let guardianApplied = false;

          // C3: findOne+save in transaction — no upsert, no duplicate rows
          await sequelize.transaction(async (t) => {
            await UserModel.findByPk(userId, {
              attributes: ['id'],
              transaction: t,
              lock: t.LOCK.UPDATE,
            });
            const claimed = await claimSubscriptionCheckoutSession({
              sessionId,
              userId,
              tier: 'pro',
              amount: donationAmount,
              transaction: t,
            });
            if (!claimed) return;
            guardianApplied = true;

            const sub = await Subscription.findOne({
              where: { userId },
              transaction: t,
              lock: t.LOCK.UPDATE,
              order: [['createdAt', 'DESC']],
            });

            const prevCumulative = parseFloat(sub?.cumulativeDonationAmount || 0);
            const newCumulative = Math.round((prevCumulative + donationAmount) * 100) / 100;

            if (sub) {
              sub.tier = 'pro';
              sub.status = 'active';
              sub.amount = donationAmount;
              sub.cumulativeDonationAmount = newCumulative;
              sub.stripeCustomerId = stripeCustomerId;
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
                stripeCustomerId,
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
          if (!guardianApplied) {
            logger.info(`[Subscription Webhook] Duplicate Guardian session ${sessionId} was skipped`);
          }
        }

        // Crystalline subscription (mode:subscription) — recurring
        if (session.mode === 'subscription') {
          const stripeSubscriptionId = typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id;
          if (!stripeSubscriptionId) {
            throw new Error(`Paid recurring checkout ${session.id} is missing a Stripe subscription`);
          }

          // Stripe metadata is editable and is therefore routing context only,
          // never the authority for paid tier, price, cadence, or entitlement dates.
          const stripeSubscription = await s.subscriptions.retrieve(stripeSubscriptionId);
          const price = stripeSubscription.items?.data?.[0]?.price;
          const amountTotalCents = Number(price?.unit_amount);
          const interval = price?.recurring?.interval;
          const intervalCount = Number(price?.recurring?.interval_count || 1);
          const periodStartSeconds = Number(stripeSubscription.current_period_start);
          const periodEndSeconds = Number(stripeSubscription.current_period_end);
          if (
            !Number.isInteger(amountTotalCents)
            || amountTotalCents <= 0
            || !['month', 'year'].includes(interval)
            || intervalCount !== 1
            || !Number.isFinite(periodStartSeconds)
            || !Number.isFinite(periodEndSeconds)
            || periodEndSeconds <= periodStartSeconds
          ) {
            throw new Error(`Stripe subscription ${stripeSubscriptionId} has invalid billing details`);
          }

          const tier = 'elite';
          const amount = amountTotalCents / 100;
          const effectiveMonthlyAmount = interval === 'year'
            ? Math.round((amount / 12) * 100) / 100
            : amount;
          const periodStart = new Date(periodStartSeconds * 1000);
          const periodEnd = new Date(periodEndSeconds * 1000);

          let recurringApplied = false;
          await sequelize.transaction(async (t) => {
            await UserModel.findByPk(userId, {
              attributes: ['id'],
              transaction: t,
              lock: t.LOCK.UPDATE,
            });
            const claimed = await claimSubscriptionCheckoutSession({
              sessionId: session.id,
              userId,
              tier,
              amount,
              transaction: t,
            });
            if (!claimed) return;
            recurringApplied = true;

            const sub = await Subscription.findOne({
              where: { userId },
              transaction: t,
              lock: t.LOCK.UPDATE,
              order: [['createdAt', 'DESC']],
            });
            const subscriptionValues = {
              tier,
              status: 'active',
              amount: effectiveMonthlyAmount,
              stripeSubscriptionId,
              stripeCustomerId,
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              paymentMethod: 'stripe',
              cancelledAt: null,
              cancelReason: null,
            };

            if (sub) {
              Object.assign(sub, subscriptionValues);
              await sub.save({ transaction: t });
            } else {
              await Subscription.create({
                userId,
                ...subscriptionValues,
              }, { transaction: t });
            }

            await UserModel.update(
              { subscriptionTier: tier },
              { where: { id: userId }, transaction: t }
            );
          });

          if (recurringApplied) {
            logger.info(`[Subscription Webhook] Activated ${tier} for user ${userId} at $${amount}/${interval}`);
          } else {
            logger.info(`[Subscription Webhook] Duplicate recurring session ${session.id} was skipped`);
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
            const lineItem = invoice.lines?.data?.[0];
            const periodStartSeconds = lineItem?.period?.start;
            const periodEndSeconds = lineItem?.period?.end;

            if (Number.isFinite(periodStartSeconds) && Number.isFinite(periodEndSeconds)) {
              subscription.currentPeriodStart = new Date(periodStartSeconds * 1000);
              subscription.currentPeriodEnd = new Date(periodEndSeconds * 1000);
            } else {
              logger.warn('[Subscription Webhook] Paid invoice omitted authoritative period timestamps', {
                invoiceId: invoice.id,
                subscriptionId: subId,
              });
            }

            subscription.status = 'active';
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
    const parsedUserId = Number(userId);
    const parsedDurationMonths = Number(durationMonths);
    const parsedAmount = amount == null ? TIER_DEFINITIONS[tier]?.price : Number(amount);
    const normalizedPaymentMethod = paymentMethod || 'manual';

    if (
      !Number.isInteger(parsedUserId)
      || parsedUserId <= 0
      || !['pro', 'elite'].includes(tier)
      || !Number.isInteger(parsedDurationMonths)
      || parsedDurationMonths < 1
      || parsedDurationMonths > 120
      || !Number.isFinite(parsedAmount)
      || parsedAmount < 0
      || !['zelle', 'venmo', 'manual'].includes(normalizedPaymentMethod)
    ) {
      return res.status(400).json({
        success: false,
        message: 'A valid userId, tier, amount, payment method, and duration are required',
      });
    }

    const now = new Date();
    const periodEnd = addUtcCalendarMonthsClamped(now, parsedDurationMonths);

    const UserModel = (await import('../models/User.mjs')).default;
    const subscription = await sequelize.transaction(async (t) => {
      const user = await UserModel.findByPk(parsedUserId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }

      const existing = await Subscription.findOne({
        where: { userId: parsedUserId },
        transaction: t,
        lock: t.LOCK.UPDATE,
        order: [['createdAt', 'DESC']],
      });
      if (
        existing?.stripeSubscriptionId
        && ['active', 'past_due', 'paused'].includes(existing.status)
      ) {
        const error = new Error('Cannot manually overwrite an active Stripe subscription');
        error.statusCode = 409;
        throw error;
      }

      const values = {
        tier,
        status: 'active',
        amount: parsedAmount,
        paymentMethod: normalizedPaymentMethod,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelledAt: null,
        cancelReason: null,
      };
      const granted = existing
        ? Object.assign(existing, values)
        : Subscription.build({ userId: parsedUserId, ...values });

      await granted.save({ transaction: t });
      await user.update({ subscriptionTier: tier }, { transaction: t });
      return granted;
    });

    res.json({
      success: true,
      message: `Granted ${tier} subscription to user ${parsedUserId} for ${parsedDurationMonths} month(s)`,
      subscription,
    });
  } catch (error) {
    logger.error('[Subscription Admin] Grant error:', error);
    if (error.statusCode === 404 || error.statusCode === 409) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Error granting subscription' });
  }
});

export default router;
