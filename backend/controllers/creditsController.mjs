import { User, Order, OrderItem, StorefrontItem, TrainerCommission } from '../models/index.mjs';
import { sequelize } from '../models/index.mjs';
import { calculateCommissionSplit, isEligibleForLoyaltyBump } from '../utils/commissionCalculator.mjs';
import { calculateTax } from '../utils/taxCalculator.mjs';

/**
 * =============================================================================
 * 💳 Credits Controller
 * =============================================================================
 *
 * Purpose:
 * Handles instant credit grant with pending payment flow for purchases
 * Tracks commission splits and tax calculations
 *
 * =============================================================================
 */

const creditsController = {
  /**
   * @description Purchase and grant credits instantly (admin only)
   * @route POST /api/admin/credits/purchase-and-grant
   * @access Private (Admin only)
   * @body {
   *   clientId: number,
   *   storefrontItemId: number,
   *   quantity?: number,
   *   trainerId?: number,
   *   leadSource: 'platform' | 'trainer_brought' | 'resign',
   *   clientState?: string,
   *   absorbTax?: boolean,
   *   grantReason?: string
   * }
   */
  async adminPurchaseAndGrant(req, res) {
    const {
      clientId,
      storefrontItemId,
      quantity = 1,
      trainerId,
      leadSource,
      clientState,
      absorbTax = false,
      grantReason = 'purchase_pending'
    } = req.body;

    // Validation
    if (!clientId || !storefrontItemId || !leadSource) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: clientId, storefrontItemId, leadSource'
      });
    }

    if (!['platform', 'trainer_brought', 'resign'].includes(leadSource)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leadSource. Must be: platform, trainer_brought, or resign'
      });
    }

    const transaction = await sequelize.transaction();

    try {
      // 1. Fetch client
      const client = await User.findByPk(clientId, { transaction });
      if (!client || client.role !== 'client') {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: 'Client not found' });
      }

      // 2. Fetch package
      const storefrontItem = await StorefrontItem.findByPk(storefrontItemId, { transaction });
      if (!storefrontItem || !storefrontItem.isActive) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: 'Package not found or inactive' });
      }

      // 3. Calculate sessions granted
      let sessionsGranted = 0;
      if (storefrontItem.packageType === 'fixed') {
        sessionsGranted = storefrontItem.sessions * quantity;
      } else if (storefrontItem.packageType === 'monthly') {
        // Monthly packages: sessionsPerWeek * 4 weeks * months
        const weeksPerMonth = 4;
        sessionsGranted = storefrontItem.sessionsPerWeek * weeksPerMonth * storefrontItem.months;
      }

      if (sessionsGranted <= 0) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Cannot calculate sessions for this package' });
      }

      // 4. Calculate base cost
      const packageCost = parseFloat(storefrontItem.totalCost) * quantity;

      // 5. Calculate tax
      const taxCalc = await calculateTax(packageCost, clientState, absorbTax);

      // 6. Determine trainer for attribution
      let finalTrainerId = trainerId;
      if (!finalTrainerId && leadSource !== 'platform') {
        // For trainer_brought or resign, trainer is required
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'trainerId is required for trainer_brought and resign lead sources'
        });
      }

      // 7. Check if client is eligible for loyalty bump
      const clientCompletedSessions = (client.sessionsRemaining || 0); // TODO: Track actual completed sessions
      const applyLoyaltyBump = isEligibleForLoyaltyBump(clientCompletedSessions, sessionsGranted);

      // 8. Calculate commission split
      const commission = calculateCommissionSplit(
        leadSource,
        taxCalc.grossAmount,
        sessionsGranted,
        applyLoyaltyBump
      );

      // 9. Create order
      const orderNumber = `ORD-${Date.now()}-${clientId}`;
      const order = await Order.create({
        userId: clientId,
        cartId: null, // Direct purchase, no cart
        orderNumber,
        totalAmount: taxCalc.netAfterTax,
        status: 'pending_payment',
        trainerId: finalTrainerId,
        leadSource,
        taxAmount: taxCalc.taxAmount,
        taxRateApplied: taxCalc.taxRate,
        taxChargedToClient: taxCalc.taxChargedToClient,
        clientState: taxCalc.clientState,
        businessCut: commission.businessCut,
        trainerCut: commission.trainerCut,
        grantReason,
        sessionsGranted,
        creditsGrantedAt: new Date(),
        billingEmail: client.email,
        billingName: `${client.firstName} ${client.lastName}`
      }, { transaction });

      // 10. Create order item
      await OrderItem.create({
        orderId: order.id,
        storefrontItemId: storefrontItem.id,
        name: storefrontItem.name,
        description: storefrontItem.description,
        quantity,
        price: parseFloat(storefrontItem.totalCost),
        subtotal: packageCost,
        itemType: storefrontItem.packageType
      }, { transaction });

      // 11. Create commission record (if trainer involved)
      if (finalTrainerId) {
        await TrainerCommission.create({
          orderId: order.id,
          trainerId: finalTrainerId,
          clientId,
          packageId: storefrontItem.id,
          leadSource,
          isLoyaltyBump: commission.loyaltyBump,
          sessionsGranted,
          sessionsConsumed: 0,
          grossAmount: commission.grossAmount,
          taxAmount: taxCalc.taxAmount,
          netAfterTax: taxCalc.netAfterTax,
          commissionRateBusiness: commission.businessRate,
          commissionRateTrainer: commission.trainerRate,
          businessCut: commission.businessCut,
          trainerCut: commission.trainerCut
        }, { transaction });
      }

      // 12. **INSTANT CREDIT GRANT** - Add sessions to client
      const newCreditsBalance = (client.sessionsRemaining || 0) + sessionsGranted;
      await client.update({ sessionsRemaining: newCreditsBalance }, { transaction });

      await transaction.commit();

      // 13. Return success response
      res.status(200).json({
        success: true,
        message: `Granted ${sessionsGranted} sessions to ${client.firstName} ${client.lastName}. Payment pending.`,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          totalAmount: order.totalAmount
        },
        commission: finalTrainerId ? {
          businessCut: commission.businessCut,
          trainerCut: commission.trainerCut,
          loyaltyBump: commission.loyaltyBump
        } : null,
        creditsGranted: sessionsGranted,
        newCreditBalance: newCreditsBalance,
        taxDetails: {
          grossAmount: taxCalc.grossAmount,
          taxRate: taxCalc.taxRate,
          taxAmount: taxCalc.taxAmount,
          netAfterTax: taxCalc.netAfterTax,
          chargedToClient: taxCalc.taxChargedToClient
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error in adminPurchaseAndGrant:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during purchase',
        error: error.message
      });
    }
  },

  /**
   * @description Purchase and grant credits instantly (trainer only - for assigned clients)
   * @route POST /api/trainer/credits/purchase-and-grant
   * @access Private (Trainer or Admin)
   * @body {
   *   clientId: number,
   *   storefrontItemId: number,
   *   quantity?: number,
   *   leadSource: 'platform' | 'trainer_brought' | 'resign',
   *   clientState?: string,
   *   absorbTax?: boolean
   * }
   */
  async trainerPurchaseAndGrant(req, res) {
    const trainerId = req.user.id;
    const trainerRole = req.user.role;
    const {
      clientId,
      storefrontItemId,
      quantity = 1,
      leadSource,
      clientState,
      absorbTax = false
    } = req.body;

    // Validation
    if (!clientId || !storefrontItemId || !leadSource) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: clientId, storefrontItemId, leadSource'
      });
    }

    const transaction = await sequelize.transaction();

    try {
      // 1. Check if trainer is assigned to this client (unless admin)
      if (trainerRole !== 'admin') {
        const { ClientTrainerAssignment } = await import('../models/index.mjs');
        const assignment = await ClientTrainerAssignment.findOne({
          where: {
            clientId,
            trainerId,
            isActive: true
          },
          transaction
        });

        if (!assignment) {
          await transaction.rollback();
          return res.status(403).json({
            success: false,
            message: 'You are not assigned to this client'
          });
        }
      }

      // 2. Call admin purchase logic with trainer auto-attributed
      req.body.trainerId = trainerId;
      req.body.grantReason = 'purchase_pending';

      // Reuse admin logic
      await transaction.rollback(); // Rollback this transaction
      return creditsController.adminPurchaseAndGrant(req, res);

    } catch (error) {
      await transaction.rollback();
      console.error('Error in trainerPurchaseAndGrant:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during purchase',
        error: error.message
      });
    }
  }
};

export default creditsController;
