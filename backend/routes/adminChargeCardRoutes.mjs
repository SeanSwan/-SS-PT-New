/**
 * Admin Charge Card Routes
 * ========================
 * Endpoints for admin-initiated card-on-file charging via Stripe.
 * Pattern: capture-first, refund-on-failure (AD-1).
 *
 * Endpoints:
 *   GET  /payment-methods/:clientId  — List client's saved Stripe cards
 *   POST /charge                     — Charge a saved card (capture-first)
 *   POST /test-card                  — Attach pm_card_visa (test mode only)
 *
 * Auth: protect + adminOnly on all routes.
 */

import express from 'express';
import Stripe from 'stripe';
import { randomUUID } from 'node:crypto';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import { applyPackagePayment } from '../services/sessionDeductionService.mjs';
import { mapServiceError } from './sessionDeductionRoute.helpers.mjs';
import { isValidUUID } from '../utils/paymentRecovery.constants.mjs';
import { isStripeEnabled } from '../utils/apiKeyChecker.mjs';
import logger from '../utils/logger.mjs';
import sequelize from '../database.mjs';

const router = express.Router();

// ── Stripe client (conditional) ─────────────────────────────────
let stripe = null;
if (isStripeEnabled()) {
  try {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16'
    });
  } catch (err) {
    logger.error(`[AdminChargeCard] Failed to init Stripe: ${err.message}`);
  }
}

function getUser() {
  return sequelize.models.User;
}

// ── Helpers ──────────────────────────────────────────────────────

function isTestMode() {
  return (process.env.STRIPE_SECRET_KEY || '').includes('_test_');
}

function stripeRequired(res) {
  if (!stripe) {
    return res.status(503).json({
      success: false,
      error: 'Stripe is not configured',
      code: 'STRIPE_NOT_CONFIGURED'
    });
  }
  return null;
}

// ── GET /payment-methods/:clientId ──────────────────────────────
router.get('/payment-methods/:clientId', protect, adminOnly, async (req, res) => {
  try {
    const earlyReturn = stripeRequired(res);
    if (earlyReturn) return;

    const clientId = parseInt(req.params.clientId, 10);
    if (!clientId || clientId <= 0) {
      return res.status(422).json({ success: false, error: 'Invalid clientId' });
    }

    const User = getUser();
    const client = await User.findByPk(clientId);
    if (!client || !['client', 'user'].includes(client.role)) {
      return res.status(404).json({ success: false, error: 'Client not found', code: 'CLIENT_NOT_FOUND' });
    }

    if (!client.stripeCustomerId) {
      return res.status(200).json({
        success: true,
        paymentMethods: [],
        hasStripeCustomer: false
      });
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: client.stripeCustomerId,
      type: 'card'
    });

    const cards = paymentMethods.data.map(pm => ({
      id: pm.id,
      brand: pm.card.brand,
      last4: pm.card.last4,
      expMonth: pm.card.exp_month,
      expYear: pm.card.exp_year
    }));

    return res.status(200).json({
      success: true,
      paymentMethods: cards,
      hasStripeCustomer: true
    });
  } catch (error) {
    logger.error('[AdminChargeCard] Error listing payment methods:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to list payment methods' });
  }
});

// ── POST /charge ────────────────────────────────────────────────
router.post('/charge', protect, adminOnly, async (req, res) => {
  try {
    const earlyReturn = stripeRequired(res);
    if (earlyReturn) return;

    const { clientId, storefrontItemId, paymentMethodId, idempotencyToken, force, forceReason } = req.body;
    const adminUserId = req.user.id;

    // 1. Validate inputs
    if (!Number.isInteger(clientId) || clientId <= 0) {
      return res.status(422).json({ success: false, error: 'Invalid clientId' });
    }
    if (!Number.isInteger(storefrontItemId) || storefrontItemId <= 0) {
      return res.status(422).json({ success: false, error: 'Invalid storefrontItemId' });
    }
    if (!paymentMethodId || typeof paymentMethodId !== 'string') {
      return res.status(422).json({ success: false, error: 'paymentMethodId is required' });
    }
    if (!isValidUUID(idempotencyToken)) {
      return res.status(422).json({ success: false, error: 'Invalid idempotencyToken (must be UUID v4)' });
    }

    // 2. Verify client exists + has stripeCustomerId
    const User = getUser();
    const client = await User.findByPk(clientId);
    if (!client || !['client', 'user'].includes(client.role)) {
      return res.status(404).json({ success: false, error: 'Client not found', code: 'CLIENT_NOT_FOUND' });
    }
    if (!client.stripeCustomerId) {
      return res.status(404).json({ success: false, error: 'Client has no Stripe customer on file', code: 'STRIPE_CUSTOMER_NOT_FOUND' });
    }

    // 3. Verify paymentMethodId belongs to client (AD-4 ownership)
    let pm;
    try {
      pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    } catch (err) {
      return res.status(422).json({ success: false, error: 'Invalid payment method', code: 'STRIPE_CHARGE_FAILED' });
    }
    if (pm.customer !== client.stripeCustomerId) {
      return res.status(403).json({ success: false, error: 'Payment method does not belong to this client', code: 'STRIPE_OWNERSHIP_MISMATCH' });
    }

    // 4. Fetch package from StorefrontItem
    const StorefrontItem = sequelize.models.StorefrontItem;
    const pkg = await StorefrontItem.findByPk(storefrontItemId);
    if (!pkg) {
      return res.status(404).json({ success: false, error: 'Package not found', code: 'PACKAGE_NOT_FOUND' });
    }

    const chargeAmount = parseFloat(pkg.totalCost || pkg.price || 0);
    if (chargeAmount <= 0) {
      return res.status(422).json({ success: false, error: 'Package has no price' });
    }

    const sessionsToAdd = pkg.sessions || pkg.totalSessions || 0;

    // 5. CAPTURE: Create PaymentIntent (immediate capture)
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(chargeAmount * 100),
        currency: 'usd',
        customer: client.stripeCustomerId,
        payment_method: paymentMethodId,
        confirm: true,
        off_session: true,
        description: `Admin charge: ${pkg.name} (${sessionsToAdd} sessions)`,
        metadata: {
          adminUserId: adminUserId.toString(),
          clientId: clientId.toString(),
          storefrontItemId: storefrontItemId.toString(),
          source: 'admin_charge_card'
        }
      }, {
        idempotencyKey: randomUUID()
      });
    } catch (stripeErr) {
      logger.error('[AdminChargeCard] Stripe charge failed:', stripeErr.message);
      return res.status(422).json({
        success: false,
        error: `Card charge failed: ${stripeErr.message}`,
        code: 'STRIPE_CHARGE_FAILED'
      });
    }

    // 6. Verify capture succeeded
    if (paymentIntent.status !== 'succeeded') {
      return res.status(422).json({
        success: false,
        error: `Payment not completed (status: ${paymentIntent.status})`,
        code: 'STRIPE_CHARGE_FAILED'
      });
    }

    // 7. Grant sessions via applyPackagePayment
    try {
      const result = await applyPackagePayment({
        clientId,
        storefrontItemId,
        paymentMethod: 'stripe',
        paymentReference: paymentIntent.id,
        adminUserId,
        idempotencyToken,
        force: force || false,
        forceReason: forceReason || undefined
      });

      // 8. Success — return result
      return res.status(200).json({
        success: true,
        ...result,
        chargedAmount: chargeAmount,
        paymentIntentId: paymentIntent.id,
        paymentMethodLast4: pm.card.last4,
        paymentMethodBrand: pm.card.brand
      });

    } catch (serviceError) {
      // Grant failed — refund the Stripe charge
      logger.warn(`[AdminChargeCard] Grant failed after capture, refunding: ${serviceError.message}`);

      try {
        await stripe.refunds.create({ payment_intent: paymentIntent.id });
        logger.info(`[AdminChargeCard] Refund issued for PI ${paymentIntent.id}`);
      } catch (refundErr) {
        // REFUND-FAILURE PROTOCOL
        logger.error(`[REFUND-FAILURE] Stripe refund failed for PI ${paymentIntent.id}: ${refundErr.message}`);
        console.error(`[REFUND-FAILURE] PI=${paymentIntent.id} client=${clientId} amount=${chargeAmount} error=${refundErr.message}`);

        // Create durable audit record
        try {
          const FinancialTransaction = sequelize.models.FinancialTransaction;
          if (FinancialTransaction) {
            await FinancialTransaction.create({
              userId: clientId,
              amount: chargeAmount,
              currency: 'USD',
              status: 'failed',
              stripePaymentIntentId: paymentIntent.id,
              paymentMethod: 'stripe',
              description: 'REFUND_FAILED: Stripe charge captured but session grant failed and refund could not be issued',
              metadata: JSON.stringify({
                clientId,
                storefrontItemId,
                idempotencyToken,
                failureType: 'refund_failed',
                adminUserId,
                paymentMethodLast4: pm.card.last4,
                paymentMethodBrand: pm.card.brand,
                grantError: serviceError.message
              }),
              processedAt: new Date(),
              netAmount: chargeAmount,
              feeAmount: 0
            });
          }
        } catch (auditErr) {
          logger.error(`[REFUND-FAILURE] Audit record creation also failed: ${auditErr.message}`);
        }

        return res.status(500).json({
          success: false,
          error: 'Payment captured but grant failed and refund could not be issued. Please refund manually via Stripe dashboard.',
          code: 'STRIPE_REFUND_FAILED',
          stripePaymentIntentId: paymentIntent.id
        });
      }

      // Refund succeeded — map the original service error to HTTP
      const mapped = mapServiceError(serviceError);
      const statusCode = mapped ? mapped.statusCode : 500;
      const errorCode = mapped ? mapped.errorCode : 'INTERNAL_ERROR';

      return res.status(statusCode).json({
        success: false,
        error: serviceError.message,
        code: errorCode,
        ...(serviceError.duplicateWindow ? { duplicateWindow: serviceError.duplicateWindow } : {})
      });
    }
  } catch (error) {
    logger.error('[AdminChargeCard] Unexpected error in charge:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── POST /test-card ─────────────────────────────────────────────
router.post('/test-card', protect, adminOnly, async (req, res) => {
  try {
    const earlyReturn = stripeRequired(res);
    if (earlyReturn) return;

    // 1. Only allow in test mode
    if (!isTestMode()) {
      return res.status(403).json({
        success: false,
        error: 'Test cards can only be attached in Stripe test mode'
      });
    }

    const { clientId } = req.body;
    if (!Number.isInteger(clientId) || clientId <= 0) {
      return res.status(422).json({ success: false, error: 'Invalid clientId' });
    }

    const User = getUser();
    const client = await User.findByPk(clientId);
    if (!client || !['client', 'user'].includes(client.role)) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    // 2. Create Stripe customer if none exists (write-if-empty)
    let customerId = client.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: client.email,
        name: `${client.firstName || ''} ${client.lastName || ''}`.trim(),
        metadata: {
          userId: clientId.toString(),
          source: 'admin_test_card'
        }
      });
      customerId = customer.id;
      await client.update({ stripeCustomerId: customerId });
      logger.info(`[AdminChargeCard] Created Stripe customer ${customerId} for client ${clientId}`);
    }

    // 3. Attach test payment method
    try {
      await stripe.paymentMethods.attach('pm_card_visa', { customer: customerId });
    } catch (attachErr) {
      // "Already attached" could mean same customer (idempotent) or different customer (reject)
      if (attachErr.code === 'resource_already_exists' ||
          attachErr.message?.includes('already been attached')) {
        // Verify the PM is attached to THIS customer, not a different one
        try {
          const existingPm = await stripe.paymentMethods.retrieve('pm_card_visa');
          if (existingPm.customer !== customerId) {
            return res.status(422).json({
              success: false,
              error: 'Test card is already attached to a different customer',
              code: 'TEST_CARD_OWNERSHIP_CONFLICT'
            });
          }
        } catch (retrieveErr) {
          return res.status(422).json({
            success: false,
            error: `Failed to verify test card ownership: ${retrieveErr.message}`
          });
        }
        logger.info(`[AdminChargeCard] Test card already attached to customer ${customerId}`);
      } else {
        return res.status(422).json({
          success: false,
          error: `Failed to attach test card: ${attachErr.message}`
        });
      }
    }

    return res.status(200).json({
      success: true,
      paymentMethodId: 'pm_card_visa',
      brand: 'visa',
      last4: '4242',
      message: 'Test Visa card attached successfully'
    });
  } catch (error) {
    logger.error('[AdminChargeCard] Error attaching test card:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to attach test card' });
  }
});

export default router;
