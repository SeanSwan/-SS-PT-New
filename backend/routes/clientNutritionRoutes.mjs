/**
 * Client Nutrition Routes
 * =======================
 * API endpoints for client nutrition data
 * Phase 2 Task 5 - Dashboard Tab Wiring
 */

import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import { searchFoodCatalog } from '../services/nutrition/foodCatalogSearchService.mjs';
import { validateNutritionPlanBody } from '../services/nutrition/nutritionPlanValidation.mjs';
import { setNutritionTarget, getActiveNutritionTarget } from '../services/nutrition/nutritionTargetService.mjs';
import { getUserLocalToday } from '../services/nutrition/nutritionAdherenceService.mjs';
import { ensureClientAccess } from '../utils/clientAccess.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

const INTERNAL_ERROR = 'Internal server error';

const sendInternalError = (res, message) => res.status(500).json({
  success: false,
  message,
  error: INTERNAL_ERROR
});

/**
 * GET /api/nutrition/food-search?q=chicken
 * Protected server-side food catalog proxy for FoodTracker search.
 */
router.get('/food-search', protect, async (req, res) => {
  try {
    const query = String(req.query.q ?? req.query.query ?? '').trim();
    if (!query) {
      return res.status(400).json({ success: false, message: 'Food search query is required' });
    }

    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 15;
    const result = await searchFoodCatalog(query, pageSize);
    if (!result.ok) {
      return res.status(502).json({
        success: false,
        message: result.error || 'Food lookup is temporarily unavailable.',
      });
    }

    return res.status(200).json({ success: true, foods: result.foods });
  } catch (error) {
    logger.error('Error searching food catalog:', error);
    return res.status(500).json({
      success: false,
      message: 'Food lookup is temporarily unavailable.',
      error: INTERNAL_ERROR,
    });
  }
});
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

    // S1.4: the versioned target is the adherence truth; the plan document is
    // supporting context. Surface the target even when no plan document exists.
    const activeTarget = await getActiveNutritionTarget(clientId).catch(() => null);
    const targetPayload = activeTarget ? {
      id: activeTarget.id,
      dailyCalories: activeTarget.dailyCalories,
      proteinGrams: parseFloat(activeTarget.proteinGrams) || null,
      carbsGrams: parseFloat(activeTarget.carbsGrams) || null,
      fatGrams: parseFloat(activeTarget.fatGrams) || null,
      fiberGrams: parseFloat(activeTarget.fiberGrams) || null,
      sodiumLimitMg: activeTarget.sodiumLimitMg,
      hydrationTargetLiters: parseFloat(activeTarget.hydrationTargetLiters) || null,
      effectiveFrom: activeTarget.effectiveFrom,
    } : null;

    if (!plan) {
      return res.status(200).json({
        success: true,
        data: null,
        target: targetPayload,
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
    return sendInternalError(res, 'Server error fetching nutrition plan');
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

    // S0.2: strict allowlist + bounds. Garbage types 400 instead of 500ing in
    // the DECIMAL columns, and the JSONB fields are shape- and size-capped.
    const validation = validateNutritionPlanBody(req.body);
    if (!validation.ok) {
      return res.status(400).json({
        success: false,
        message: 'Invalid nutrition plan payload',
        errors: validation.errors
      });
    }

    // S1.4: targets route through the SINGLE WRITER (nutritionTargetService),
    // so /api/macros/summary, the coach context, and this Builder all agree on
    // one adherence denominator. Bounds are validated BEFORE the plan document
    // is created — a rejected target rejects the whole write with a 400 the
    // Builder can show, instead of a plan that silently "didn't take".
    const targetFields = {
      dailyCalories: validation.plan.dailyCalories,
      proteinGrams: validation.plan.proteinGrams,
      carbsGrams: validation.plan.carbsGrams,
      fatGrams: validation.plan.fatGrams,
      fiberGrams: validation.plan.fiberGrams,
      hydrationTargetLiters: validation.plan.hydrationTarget,
    };
    const hasTargetFields = Object.values(targetFields).some((v) => v !== undefined && v !== null);

    let targetResult = null;
    if (hasTargetFields) {
      const { todayLocal } = await getUserLocalToday(clientId);
      targetResult = await setNutritionTarget({
        userId: clientId,
        fields: targetFields,
        createdBy: req.user.id,
        source: 'manual',
        activate: true,
        effectiveFrom: todayLocal,
      });
      if (!targetResult.ok) {
        return res.status(400).json({
          success: false,
          message: 'Nutrition targets failed validation',
          errors: targetResult.errors
        });
      }
    }

    const plan = await ClientNutritionPlan.create({
      ...validation.plan,
      userId: clientId,
      planName: validation.plan.planName || 'Custom Nutrition Plan',
      startDate: validation.plan.startDate || new Date(),
      // Attribution was never captured before S0.2 — the createdByUser
      // association was unusable and no audit story existed for plan writes.
      createdBy: req.user.id
    });

    return res.status(201).json({
      success: true,
      data: plan,
      target: targetResult?.target ?? null,
      message: 'Nutrition plan created successfully'
    });
  } catch (error) {
    logger.error('Error creating nutrition plan:', error);
    return sendInternalError(res, 'Server error creating nutrition plan');
  }
});

export default router;
