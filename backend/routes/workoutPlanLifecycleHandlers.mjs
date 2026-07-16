/**
 * ============================================================================
 * FILE: workoutPlanLifecycleHandlers.mjs
 * PURPOSE: Expose safe status and legacy activation HTTP handlers.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */
import sequelize from '../database.mjs';
import { getModel } from '../models/index.mjs';
import { buildClientTrainingOverview } from '../services/clientTrainingReadModelService.mjs';
import { transitionWorkoutPlanLifecycle } from '../services/workoutPlanLifecycleService.mjs';
import logger from '../utils/logger.mjs';

const SAFE_MESSAGES = Object.freeze({
  WORKOUT_PLAN_LIFECYCLE_ACTION_INVALID: 'Choose activate, pause, archive, or complete.',
  WORKOUT_PLAN_LIFECYCLE_CONFLICT: 'Workout plan cannot make that lifecycle transition.',
  WORKOUT_PLAN_NOT_FOUND: 'Workout plan not found.',
});

export const createWorkoutPlanLifecycleHandlers = ({
  transition = transitionWorkoutPlanLifecycle,
  sequelizeInstance = sequelize,
  getWorkoutPlan = () => getModel('WorkoutPlan'),
  logger: handlerLogger = logger,
} = {}) => {
  const execute = async (req, res, action) => {
    try {
      const result = await transition({
        sequelize: sequelizeInstance,
        WorkoutPlan: getWorkoutPlan(),
        planId: req.params.id,
        action,
        actorId: req.user?.id,
      });
      const activePlan = result.plans.find((plan) => plan.status === 'active') || null;
      const overview = buildClientTrainingOverview({ activePlan, plans: result.plans });
      return res.json({
        success: true,
        plan: result.plan,
        pdfDerivative: result.pdfDerivative,
        lifecycleReceipt: result.lifecycleReceipt,
        trainingPlanCatalog: overview.trainingPlanCatalog,
      });
    } catch (error) {
      const status = Number(error?.statusCode);
      if (Number.isInteger(status) && status >= 400 && status < 500) {
        return res.status(status).json({
          success: false,
          code: error.code || 'WORKOUT_PLAN_LIFECYCLE_FAILED',
          message: SAFE_MESSAGES[error.code] || 'Workout plan lifecycle request was rejected.',
        });
      }
      handlerLogger.error('[WorkoutPlanLifecycle] transition failed: %s', error?.message || 'unknown');
      return res.status(500).json({
        success: false,
        code: 'WORKOUT_PLAN_LIFECYCLE_FAILED',
        message: 'Failed to update workout plan status.',
      });
    }
  };

  return {
    statusHandler: (req, res) => execute(req, res, req.body?.action),
    activateHandler: (req, res) => execute(req, res, 'activate'),
    archiveHandler: (req, res) => execute(req, res, 'archive'),
  };
};

export const {
  statusHandler: workoutPlanStatusHandler,
  activateHandler: workoutPlanActivateHandler,
  archiveHandler: workoutPlanArchiveHandler,
} = createWorkoutPlanLifecycleHandlers();