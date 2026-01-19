/**
 * Client Nutrition Routes
 * =======================
 * API endpoints for client nutrition data
 * Phase 2 Task 5 - Dashboard Tab Wiring
 */

import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import { ensureClientAccess } from '../utils/clientAccess.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

/**
 * GET /api/nutrition/:userId/current
 * Get the client's current nutrition plan
 */
router.get('/:userId/current', protect, async (req, res) => {
  try {
    const access = await ensureClientAccess(req, req.params.userId);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const { clientId, models } = access;
    const { ClientNutritionPlan } = models;

    if (!ClientNutritionPlan) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'Nutrition tracking not available'
      });
    }

    // Find the most recent active nutrition plan
    const plan = await ClientNutritionPlan.findOne({
      where: { userId: clientId },
      order: [['createdAt', 'DESC']]
    });

    if (!plan) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No nutrition plan available. Complete your onboarding to receive personalized guidance.'
      });
    }

    // Format the response
    const formattedPlan = {
      id: plan.id,
      name: plan.planName,
      dailyCalories: plan.dailyCalories,
      macros: {
        protein: parseFloat(plan.proteinGrams) || 0,
        carbs: parseFloat(plan.carbsGrams) || 0,
        fat: parseFloat(plan.fatGrams) || 0,
        fiber: parseFloat(plan.fiberGrams) || 0
      },
      meals: plan.mealsJson || [],
      groceryList: plan.groceryListJson || [],
      dietaryRestrictions: plan.dietaryRestrictions || [],
      allergies: plan.allergies || [],
      hydrationTarget: parseFloat(plan.hydrationTarget) || 0,
      notes: plan.notes || '',
      startDate: plan.startDate,
      endDate: plan.endDate,
      createdAt: plan.createdAt
    };

    return res.status(200).json({
      success: true,
      data: formattedPlan
    });
  } catch (error) {
    logger.error('Error fetching nutrition plan:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching nutrition plan',
      error: error.message
    });
  }
});

/**
 * POST /api/nutrition/:userId
 * Create/update nutrition plan (trainer/admin only)
 */
router.post('/:userId', protect, async (req, res) => {
  try {
    // Only trainers and admins can create nutrition plans
    if (!['trainer', 'admin'].includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Only trainers and admins can create nutrition plans' });
    }

    const access = await ensureClientAccess(req, req.params.userId);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const { clientId, models } = access;
    const { ClientNutritionPlan } = models;

    if (!ClientNutritionPlan) {
      return res.status(500).json({ success: false, message: 'Nutrition model not available' });
    }

    const {
      planName,
      dailyCalories,
      proteinGrams,
      carbsGrams,
      fatGrams,
      fiberGrams,
      mealsJson,
      groceryListJson,
      dietaryRestrictions,
      allergies,
      hydrationTarget,
      notes,
      startDate,
      endDate
    } = req.body;

    const plan = await ClientNutritionPlan.create({
      userId: clientId,
      planName: planName || 'Custom Nutrition Plan',
      dailyCalories,
      proteinGrams,
      carbsGrams,
      fatGrams,
      fiberGrams,
      mealsJson,
      groceryListJson,
      dietaryRestrictions,
      allergies,
      hydrationTarget,
      notes,
      startDate: startDate || new Date(),
      endDate
    });

    return res.status(201).json({
      success: true,
      data: plan,
      message: 'Nutrition plan created successfully'
    });
  } catch (error) {
    logger.error('Error creating nutrition plan:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating nutrition plan',
      error: error.message
    });
  }
});

export default router;
