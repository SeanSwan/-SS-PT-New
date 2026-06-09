/**
 * adminOnboardingController.mjs
 * ==============================
 * Admin/Trainer endpoints for managing a client's onboarding questionnaire.
 *
 * Routes handled:
 *   POST   /api/admin/clients/:clientId/onboarding  (save draft or submit)
 *   GET    /api/admin/clients/:clientId/onboarding  (get status)
 *   DELETE /api/admin/clients/:clientId/onboarding  (reset to in_progress)
 *
 * Transaction pattern: Managed (`sequelize.transaction(async (t) => {...})`)
 * — auto-commits on success, auto-rollbacks on throw. No manual rollback needed.
 */

import logger from '../utils/logger.mjs';
import { getAllModels } from '../models/index.mjs';
import sequelize from '../database.mjs';
import { ensureClientAccess } from '../utils/clientAccess.mjs';
import {
  isPlainObject,
  toNumber,
  calculateCompletionPercentage,
  computeDerivedFields,
} from '../utils/onboardingHelpers.mjs';
import { transformQuestionnaireToMasterPrompt } from '../services/onboardingMasterPromptBuilder.mjs';
import { generateSpiritName } from './onboardingController.mjs';

/**
 * POST /api/admin/clients/:clientId/onboarding
 * Body: { mode: 'draft' | 'submit', responsesJson: {...} }
 */
export const saveOrSubmitOnboarding = async (req, res) => {
  try {
    // --- Guards (outside transaction — read-only checks) ---
    const access = await ensureClientAccess(req, req.params.clientId);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }
    const { clientId, models } = access;
    const { User, ClientOnboardingQuestionnaire } = models;

    const mode = req.body?.mode;
    if (mode !== 'draft' && mode !== 'submit') {
      return res.status(400).json({ success: false, message: "mode must be 'draft' or 'submit'" });
    }

    const responsesJson = req.body?.responsesJson;
    if (!responsesJson || !isPlainObject(responsesJson)) {
      return res.status(400).json({ success: false, message: 'responsesJson must be a non-null plain object' });
    }

    // Submit-mode validation (before transaction)
    const derived = computeDerivedFields(responsesJson);
    const completionPercentage = calculateCompletionPercentage(responsesJson);

    if (mode === 'submit') {
      const fullName = typeof responsesJson.fullName === 'string' ? responsesJson.fullName.trim() : '';
      const email = typeof responsesJson.email === 'string' ? responsesJson.email.trim() : '';
      const primaryGoalVal = typeof derived.primaryGoal === 'string' ? derived.primaryGoal.trim() : '';

      if (!fullName || !email || !primaryGoalVal) {
        return res.status(400).json({
          success: false,
          message: 'Submit requires non-empty fullName, email, and primaryGoal in responses',
        });
      }
    }

    // --- Managed transaction: auto-commit on success, auto-rollback on throw ---
    const result = await sequelize.transaction(async (t) => {
      let questionnaire = await ClientOnboardingQuestionnaire.findOne({
        where: { userId: clientId },
        order: [['createdAt', 'DESC']],
        transaction: t,
      });

      const sharedFields = {
        responsesJson,
        primaryGoal: derived.primaryGoal,
        trainingTier: derived.trainingTier,
        commitmentLevel: derived.commitmentLevel,
        healthRisk: derived.healthRisk,
        nutritionPrefs: derived.nutritionPrefs,
      };

      if (mode === 'draft') {
        if (questionnaire) {
          await questionnaire.update({ ...sharedFields, status: 'in_progress' }, { transaction: t });
        } else {
          questionnaire = await ClientOnboardingQuestionnaire.create({
            userId: clientId,
            createdBy: req.user?.id ?? null,
            questionnaireVersion: '3.0',
            status: 'in_progress',
            ...sharedFields,
          }, { transaction: t });
        }

        return {
          questionnaire: {
            id: questionnaire.id,
            userId: clientId,
            status: questionnaire.status,
            completionPercentage,
            primaryGoal: derived.primaryGoal,
            trainingTier: derived.trainingTier,
            commitmentLevel: derived.commitmentLevel,
            healthRisk: derived.healthRisk,
          },
        };
      }

      // --- mode === 'submit' ---
      if (questionnaire) {
        await questionnaire.update({
          ...sharedFields,
          status: 'completed',
          completedAt: new Date(),
        }, { transaction: t });
      } else {
        questionnaire = await ClientOnboardingQuestionnaire.create({
          userId: clientId,
          createdBy: req.user?.id ?? null,
          questionnaireVersion: '3.0',
          status: 'completed',
          completedAt: new Date(),
          ...sharedFields,
        }, { transaction: t });
      }

      const masterPromptJson = transformQuestionnaireToMasterPrompt(responsesJson, clientId);
      const anonymousAlias = `Client #${clientId}`;

      // Profile coercion — safe null-aware updates
      const parsedWeight = parseFloat(responsesJson.currentWeight);
      const weightVal = Number.isFinite(parsedWeight) ? parsedWeight : null;
      const ft = parseInt(responsesJson.heightFeet, 10);
      const inches = parseInt(responsesJson.heightInches, 10);
      const heightVal = Number.isFinite(ft) ? (ft * 12 + (Number.isFinite(inches) ? inches : 0)) : null;
      const phoneVal = typeof responsesJson.phone === 'string' ? responsesJson.phone : null;
      const genderVal = typeof responsesJson.gender === 'string' ? responsesJson.gender : null;
      const primaryGoal = typeof derived.primaryGoal === 'string' && derived.primaryGoal ? derived.primaryGoal : null;

      const user = await User.findByPk(clientId, { transaction: t });
      if (!user) {
        throw Object.assign(new Error('Client user not found'), { statusCode: 404 });
      }

      await user.update({
        masterPromptJson,
        spiritName: anonymousAlias,
        isOnboardingComplete: true,
        phone: phoneVal !== null ? phoneVal : user.phone,
        gender: genderVal !== null ? genderVal : user.gender,
        weight: weightVal !== null ? weightVal : user.weight,
        height: heightVal !== null ? heightVal : user.height,
        fitnessGoal: primaryGoal !== null ? primaryGoal : user.fitnessGoal,
      }, { transaction: t });

      return {
        questionnaire: {
          id: questionnaire.id,
          userId: clientId,
          status: 'completed',
          completionPercentage,
          primaryGoal: derived.primaryGoal,
          trainingTier: derived.trainingTier,
          commitmentLevel: derived.commitmentLevel,
          healthRisk: derived.healthRisk,
          completedAt: questionnaire.completedAt,
        },
        masterPromptCreated: true,
        clientId: anonymousAlias,
      };
    });

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    logger.error('Admin onboarding save/submit failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to process onboarding' });
  }
};

/**
 * GET /api/admin/clients/:clientId/onboarding
 */
export const getOnboardingStatus = async (req, res) => {
  try {
    const access = await ensureClientAccess(req, req.params.clientId);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }
    const { clientId, models } = access;
    const { ClientOnboardingQuestionnaire } = models;

    const questionnaire = await ClientOnboardingQuestionnaire.findOne({
      where: { userId: clientId },
      order: [['createdAt', 'DESC']],
    });

    if (!questionnaire) {
      return res.status(404).json({ success: false, message: 'No questionnaire found for this client' });
    }

    const completionPercentage = calculateCompletionPercentage(questionnaire.responsesJson);

    return res.status(200).json({
      success: true,
      questionnaire: {
        id: questionnaire.id,
        userId: clientId,
        status: questionnaire.status,
        completionPercentage,
        primaryGoal: questionnaire.primaryGoal,
        trainingTier: questionnaire.trainingTier,
        commitmentLevel: questionnaire.commitmentLevel,
        healthRisk: questionnaire.healthRisk,
        nutritionPrefs: questionnaire.nutritionPrefs,
        responsesJson: questionnaire.responsesJson,
        completedAt: questionnaire.completedAt,
        createdAt: questionnaire.createdAt,
      },
    });
  } catch (error) {
    logger.error('Admin get onboarding status failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to get onboarding status' });
  }
};

/**
 * DELETE /api/admin/clients/:clientId/onboarding
 * Resets the latest questionnaire to in_progress and clears isOnboardingComplete.
 */
export const resetOnboarding = async (req, res) => {
  try {
    // Guards outside transaction
    const access = await ensureClientAccess(req, req.params.clientId);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }
    const { clientId, models } = access;
    const { User, ClientOnboardingQuestionnaire } = models;

    // Managed transaction
    const result = await sequelize.transaction(async (t) => {
      const questionnaire = await ClientOnboardingQuestionnaire.findOne({
        where: { userId: clientId },
        order: [['createdAt', 'DESC']],
        transaction: t,
      });

      if (!questionnaire) {
        throw Object.assign(new Error('No questionnaire found to reset'), { statusCode: 404 });
      }

      // Preserve completion timestamp for audit trail
      const previousCompletedAt = questionnaire.completedAt;

      await questionnaire.update({
        status: 'in_progress',
        completedAt: null,
      }, { transaction: t });

      // Instance update (not bulk) to prevent mass data corruption
      const userToReset = await User.findByPk(clientId, { transaction: t });
      if (!userToReset) {
        throw Object.assign(new Error('Client user not found for onboarding reset'), { statusCode: 404 });
      }
      await userToReset.update({ isOnboardingComplete: false }, { transaction: t });

      // Audit log
      logger.warn('[AdminOnboarding] Questionnaire reset', {
        questionnaireId: questionnaire.id,
        userId: clientId,
        previousCompletedAt,
        resetBy: req.user?.id,
      });

      return {
        id: questionnaire.id,
        userId: clientId,
        status: 'in_progress',
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Onboarding reset to in_progress',
      questionnaire: result,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    logger.error('Admin reset onboarding failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to reset onboarding' });
  }
};
