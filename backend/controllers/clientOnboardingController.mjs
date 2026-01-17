import logger from '../utils/logger.mjs';
import { getAllModels } from '../models/index.mjs';
import { Op } from 'sequelize';

const TOTAL_QUESTION_COUNT = 85;
const SELF_ROLES = new Set(['client', 'user']);

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const parseUserId = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeJsonObject = (value) => {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }
  return isPlainObject(value) ? value : null;
};

const countAnsweredQuestions = (value) => {
  if (value === null || value === undefined) {
    return 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? 1 : 0;
  }
  if (typeof value === 'object') {
    return Object.values(value).reduce((sum, item) => sum + countAnsweredQuestions(item), 0);
  }
  if (typeof value === 'string') {
    return value.trim().length > 0 ? 1 : 0;
  }
  return 1;
};

const calculateCompletionPercentage = (responses) => {
  if (!responses || !isPlainObject(responses)) {
    return 0;
  }
  const answered = countAnsweredQuestions(responses);
  const percent = Math.round((answered / TOTAL_QUESTION_COUNT) * 100);
  return Math.min(100, Math.max(0, percent));
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const extractPrimaryGoal = (responses) => {
  return (
    responses?.section2_goals?.primary_goal ??
    responses?.section2_goals?.primaryGoal ??
    responses?.section2?.primary_goal ??
    responses?.section2?.primaryGoal ??
    responses?.goals?.primary_goal ??
    responses?.goals?.primary ??
    null
  );
};

const extractTrainingTier = (responses) => {
  return (
    responses?.section2_goals?.preferred_package ??
    responses?.section2_goals?.preferredPackage ??
    responses?.section2?.preferred_package ??
    responses?.section2?.preferredPackage ??
    responses?.package?.tier ??
    null
  );
};

const extractCommitmentLevel = (responses) => {
  const rawValue =
    responses?.section3_lifestyle?.commitment_level ??
    responses?.section3_lifestyle?.commitmentLevel ??
    responses?.section2_goals?.commitment_level ??
    responses?.section2_goals?.commitmentLevel ??
    responses?.goals?.commitmentLevel ??
    null;
  const parsed = toNumber(rawValue);
  return parsed !== null ? Math.round(parsed) : null;
};

const extractNutritionPrefs = (responses) => {
  const nutrition = responses?.section5_nutrition ?? responses?.nutrition ?? {};
  const dietaryRestrictions =
    nutrition?.dietary_restrictions ??
    nutrition?.dietaryRestrictions ??
    nutrition?.dietary_preferences ??
    [];
  const allergies = nutrition?.allergies ?? [];
  const mealFrequency =
    nutrition?.meals_per_day ??
    nutrition?.meal_frequency ??
    nutrition?.mealFrequency ??
    null;

  return {
    dietary_restrictions: Array.isArray(dietaryRestrictions) ? dietaryRestrictions : [],
    meal_frequency: toNumber(mealFrequency) ?? 3,
    allergies: Array.isArray(allergies) ? allergies : [],
  };
};

const calculateHealthRisk = (responses) => {
  const health = responses?.section4_health ?? responses?.health ?? {};
  const history = responses?.section3_health_history ?? responses?.health_history ?? {};

  const medicalConditions = [
    health?.medical_conditions,
    health?.medicalConditions,
    health?.chronic_conditions,
    history?.chronic_conditions,
    history?.medical_conditions,
  ].reduce((sum, value) => sum + (Array.isArray(value) ? value.length : 0), 0);

  const injuries = [
    health?.current_injuries,
    health?.injuries,
    history?.injuries,
    history?.past_injuries,
  ].reduce((sum, value) => sum + (Array.isArray(value) ? value.length : 0), 0);

  const painLevel = toNumber(
    health?.pain_level ?? health?.painLevel ?? responses?.pain_level ?? responses?.painLevel ?? 0
  );

  if (medicalConditions >= 3 || (painLevel !== null && painLevel >= 8)) {
    return 'critical';
  }
  if (medicalConditions >= 1 || injuries >= 2 || (painLevel !== null && painLevel >= 5)) {
    return 'high';
  }
  if (injuries >= 1 || (painLevel !== null && painLevel >= 3)) {
    return 'medium';
  }
  return 'low';
};

const hasParqRisk = (parqScreening) => {
  if (!parqScreening || !isPlainObject(parqScreening)) {
    return false;
  }
  const parqKeys = [
    'q1_heart_condition',
    'q2_chest_pain',
    'q3_balance_dizziness',
    'q4_bone_joint_problem',
    'q5_blood_pressure_meds',
    'q6_medical_reason',
    'q7_aware_of_other',
  ];

  return parqKeys.some((key) => parqScreening[key] === true);
};

const ensureClientAccess = async (requester, targetUserId, ClientTrainerAssignment) => {
  const requesterId = parseUserId(requester?.id);
  const requesterRole = requester?.role;

  if (!requesterId || !requesterRole) {
    return { ok: false, status: 401, message: 'Not authenticated' };
  }

  if (requesterRole === 'admin') {
    return { ok: true };
  }

  if (requesterRole === 'trainer') {
    const assignment = await ClientTrainerAssignment.findOne({
      where: {
        clientId: targetUserId,
        trainerId: requesterId,
        status: 'active',
      },
    });

    if (!assignment) {
      return { ok: false, status: 403, message: 'Access denied: Trainer not assigned to this client' };
    }
    return { ok: true };
  }

  if (SELF_ROLES.has(requesterRole)) {
    if (requesterId !== targetUserId) {
      return { ok: false, status: 403, message: 'Access denied: Cannot access another user' };
    }
    return { ok: true };
  }

  return { ok: false, status: 403, message: 'Access denied: Invalid role' };
};

const ensureTrainerAccess = async (requester, targetUserId, ClientTrainerAssignment) => {
  const requesterId = parseUserId(requester?.id);
  const requesterRole = requester?.role;

  if (!requesterId || !requesterRole) {
    return { ok: false, status: 401, message: 'Not authenticated' };
  }

  if (requesterRole === 'admin') {
    return { ok: true };
  }

  if (requesterRole === 'trainer') {
    const assignment = await ClientTrainerAssignment.findOne({
      where: {
        clientId: targetUserId,
        trainerId: requesterId,
        status: 'active',
      },
    });

    if (!assignment) {
      return { ok: false, status: 403, message: 'Access denied: Trainer not assigned to this client' };
    }
    return { ok: true };
  }

  return { ok: false, status: 403, message: 'Access denied: Only trainers or admins can perform assessments' };
};

export const createQuestionnaire = async (req, res) => {
  try {
    const targetUserId = parseUserId(req.params.userId);
    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'Invalid userId parameter' });
    }

    const models = getAllModels();
    const { User, ClientTrainerAssignment, ClientOnboardingQuestionnaire } = models;

    const accessResult = await ensureClientAccess(req.user, targetUserId, ClientTrainerAssignment);
    if (!accessResult.ok) {
      return res.status(accessResult.status).json({ success: false, message: accessResult.message });
    }

    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const rawResponses = req.body?.responses ?? req.body?.responsesJson;
    const responses = normalizeJsonObject(rawResponses);
    if (!responses) {
      return res.status(400).json({ success: false, message: 'responses must be a valid JSON object' });
    }

    const completionPercentage = calculateCompletionPercentage(responses);
    const primaryGoal = extractPrimaryGoal(responses);
    const trainingTier = extractTrainingTier(responses);
    const commitmentLevel = extractCommitmentLevel(responses);
    const healthRisk = calculateHealthRisk(responses);
    const nutritionPrefs = extractNutritionPrefs(responses);

    const status = completionPercentage === 100 ? 'completed' : 'submitted';
    const completedAt = completionPercentage === 100 ? new Date() : null;

    const questionnaire = await ClientOnboardingQuestionnaire.create({
      userId: targetUserId,
      createdBy: parseUserId(req.user?.id),
      questionnaireVersion: req.body?.questionnaireVersion ?? '3.0',
      status,
      responsesJson: responses,
      primaryGoal,
      trainingTier,
      commitmentLevel,
      healthRisk,
      nutritionPrefs,
      completedAt,
    });

    return res.status(201).json({
      success: true,
      questionnaire: {
        id: questionnaire.id,
        userId: questionnaire.userId,
        status: questionnaire.status,
        completionPercentage,
        questionnaireVersion: questionnaire.questionnaireVersion,
        primaryGoal: questionnaire.primaryGoal,
        trainingTier: questionnaire.trainingTier,
        commitmentLevel: questionnaire.commitmentLevel,
        healthRisk: questionnaire.healthRisk,
        createdAt: questionnaire.createdAt,
        completedAt: questionnaire.completedAt,
      },
    });
  } catch (error) {
    logger.error('Client onboarding questionnaire creation failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to save questionnaire' });
  }
};

export const getQuestionnaire = async (req, res) => {
  try {
    const targetUserId = parseUserId(req.params.userId);
    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'Invalid userId parameter' });
    }

    const models = getAllModels();
    const { User, ClientTrainerAssignment, ClientOnboardingQuestionnaire } = models;

    const accessResult = await ensureClientAccess(req.user, targetUserId, ClientTrainerAssignment);
    if (!accessResult.ok) {
      return res.status(accessResult.status).json({ success: false, message: accessResult.message });
    }

    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const questionnaire = await ClientOnboardingQuestionnaire.findOne({
      where: { userId: targetUserId },
      order: [['createdAt', 'DESC']],
    });

    if (!questionnaire) {
      return res.status(404).json({ success: false, message: 'Questionnaire not found' });
    }

    const responses = normalizeJsonObject(questionnaire.responsesJson) ?? {};
    const completionPercentage = calculateCompletionPercentage(responses);

    return res.status(200).json({
      success: true,
      questionnaire: {
        id: questionnaire.id,
        userId: questionnaire.userId,
        status: questionnaire.status,
        completionPercentage,
        questionnaireVersion: questionnaire.questionnaireVersion,
        primaryGoal: questionnaire.primaryGoal,
        trainingTier: questionnaire.trainingTier,
        commitmentLevel: questionnaire.commitmentLevel,
        healthRisk: questionnaire.healthRisk,
        nutritionPrefs: questionnaire.nutritionPrefs,
        responses,
        completedAt: questionnaire.completedAt,
        createdAt: questionnaire.createdAt,
      },
    });
  } catch (error) {
    logger.error('Client onboarding questionnaire fetch failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve questionnaire' });
  }
};

export const createMovementScreen = async (req, res) => {
  try {
    const targetUserId = parseUserId(req.params.userId);
    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'Invalid userId parameter' });
    }

    const models = getAllModels();
    const {
      User,
      ClientTrainerAssignment,
      ClientBaselineMeasurements,
      ClientOnboardingQuestionnaire,
    } = models;

    const accessResult = await ensureTrainerAccess(req.user, targetUserId, ClientTrainerAssignment);
    if (!accessResult.ok) {
      return res.status(accessResult.status).json({ success: false, message: accessResult.message });
    }

    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const parqScreening = normalizeJsonObject(req.body?.parqScreening);
    const overheadSquatAssessment = normalizeJsonObject(req.body?.overheadSquatAssessment);
    const posturalAssessment = normalizeJsonObject(req.body?.posturalAssessment);
    const performanceAssessments = normalizeJsonObject(req.body?.performanceAssessments);

    if (!parqScreening || !overheadSquatAssessment) {
      return res.status(400).json({
        success: false,
        message: 'parqScreening and overheadSquatAssessment are required',
      });
    }

    const medicalClearanceRequired =
      parqScreening.medicalClearanceRequired === true || hasParqRisk(parqScreening);
    const normalizedParq = { ...parqScreening, medicalClearanceRequired };

    const nasmAssessmentScore = ClientBaselineMeasurements.calculateNASMScore(overheadSquatAssessment);
    const correctiveExerciseStrategy =
      ClientBaselineMeasurements.generateCorrectiveStrategy(overheadSquatAssessment);

    const latestQuestionnaire = await ClientOnboardingQuestionnaire.findOne({
      where: { userId: targetUserId },
      order: [['createdAt', 'DESC']],
    });

    const optPhase = ClientBaselineMeasurements.selectOPTPhase(
      nasmAssessmentScore ?? 0,
      latestQuestionnaire?.primaryGoal ?? 'general_fitness'
    );

    const baseline = await ClientBaselineMeasurements.create({
      userId: targetUserId,
      recordedBy: parseUserId(req.user?.id),
      takenAt: req.body?.takenAt ? new Date(req.body.takenAt) : new Date(),
      parqScreening: normalizedParq,
      overheadSquatAssessment,
      nasmAssessmentScore,
      posturalAssessment,
      performanceAssessments,
      correctiveExerciseStrategy,
      flexibilityNotes: req.body?.flexibilityNotes ?? null,
      injuryNotes: req.body?.injuryNotes ?? null,
      painLevel: toNumber(req.body?.painLevel),
      medicalClearanceRequired,
      medicalClearanceDate: req.body?.medicalClearanceDate ?? null,
      medicalClearanceProvider: req.body?.medicalClearanceProvider ?? null,
    });

    return res.status(201).json({
      success: true,
      movementScreen: {
        id: baseline.id,
        userId: baseline.userId,
        nasmAssessmentScore: baseline.nasmAssessmentScore,
        correctiveExerciseStrategy: baseline.correctiveExerciseStrategy,
        optPhase,
        flexibilityNotes: baseline.flexibilityNotes,
        injuryNotes: baseline.injuryNotes,
        painLevel: baseline.painLevel,
        medicalClearanceRequired: baseline.medicalClearanceRequired,
        createdAt: baseline.createdAt,
      },
    });
  } catch (error) {
    logger.error('Movement screen creation failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to save movement screen' });
  }
};

export const getClientDataOverview = async (req, res) => {
  try {
    const targetUserId = parseUserId(req.params.userId);
    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'Invalid userId parameter' });
    }

    const models = getAllModels();
    const {
      User,
      ClientTrainerAssignment,
      ClientOnboardingQuestionnaire,
      ClientBaselineMeasurements,
      ClientNutritionPlan,
      ClientPhoto,
      ClientNote,
    } = models;

    const accessResult = await ensureClientAccess(req.user, targetUserId, ClientTrainerAssignment);
    if (!accessResult.ok) {
      return res.status(accessResult.status).json({ success: false, message: accessResult.message });
    }

    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const [
      questionnaire,
      baselineMeasurement,
      nutritionPlan,
      photoCount,
      latestPhoto,
      noteCount,
      latestNote,
    ] = await Promise.all([
      ClientOnboardingQuestionnaire.findOne({
        where: { userId: targetUserId },
        order: [['createdAt', 'DESC']],
      }),
      ClientBaselineMeasurements.findOne({
        where: { userId: targetUserId },
        order: [['takenAt', 'DESC']],
      }),
      ClientNutritionPlan.findOne({
        where: { userId: targetUserId, status: 'active' },
        order: [['startDate', 'DESC']],
      }),
      ClientPhoto.count({ where: { userId: targetUserId, isDeleted: false } }),
      ClientPhoto.findOne({
        where: { userId: targetUserId, isDeleted: false },
        order: [['uploadedAt', 'DESC']],
      }),
      ClientNote.count({ where: { userId: targetUserId } }),
      ClientNote.findOne({
        where: { userId: targetUserId },
        order: [['createdAt', 'DESC']],
      }),
    ]);

    const responses = normalizeJsonObject(questionnaire?.responsesJson) ?? {};
    const completionPercentage = questionnaire ? calculateCompletionPercentage(responses) : 0;
    const onboardingCompleted = questionnaire?.status === 'completed' || completionPercentage === 100;

    const movementCompleted = !!baselineMeasurement;
    const movementDate = baselineMeasurement?.takenAt ?? baselineMeasurement?.createdAt ?? null;

    const baselineSummary = baselineMeasurement
      ? {
          bodyWeight: baselineMeasurement?.bodyWeight ?? null,
          bodyFatPercentage: baselineMeasurement?.bodyFatPercentage ?? null,
          restingHeartRate: baselineMeasurement?.restingHeartRate ?? null,
          bloodPressure: baselineMeasurement?.bloodPressureSystolic && baselineMeasurement?.bloodPressureDiastolic
            ? `${baselineMeasurement.bloodPressureSystolic}/${baselineMeasurement.bloodPressureDiastolic}`
            : null,
          benchPress: baselineMeasurement?.benchPressWeight && baselineMeasurement?.benchPressReps
            ? `${baselineMeasurement.benchPressWeight} lbs x ${baselineMeasurement.benchPressReps}`
            : null,
          squat: baselineMeasurement?.squatWeight && baselineMeasurement?.squatReps
            ? `${baselineMeasurement.squatWeight} lbs x ${baselineMeasurement.squatReps}`
            : null,
          lastUpdated: movementDate,
        }
      : null;

    const nutritionSummary = nutritionPlan
      ? {
          active: true,
          dailyCalories: nutritionPlan.dailyCalories ?? null,
          macros: {
            protein: nutritionPlan.proteinGrams ? Number(nutritionPlan.proteinGrams) : null,
            carbs: nutritionPlan.carbsGrams ? Number(nutritionPlan.carbsGrams) : null,
            fat: nutritionPlan.fatGrams ? Number(nutritionPlan.fatGrams) : null,
          },
        }
      : {
          active: false,
          dailyCalories: null,
          macros: { protein: null, carbs: null, fat: null },
        };

    return res.status(200).json({
      success: true,
      overview: {
        userId: targetUserId,
        onboardingStatus: {
          completed: onboardingCompleted,
          completionPercentage,
          primaryGoal: questionnaire?.primaryGoal ?? null,
          trainingTier: questionnaire?.trainingTier ?? null,
        },
        movementScreen: {
          completed: movementCompleted,
          nasmAssessmentScore: baselineMeasurement?.nasmAssessmentScore ?? null,
          date: movementDate,
        },
        baselineMeasurements: baselineSummary,
        nutritionPlan: nutritionSummary,
        progressPhotos: {
          count: photoCount ?? 0,
          lastUpload: latestPhoto?.uploadedAt ?? null,
        },
        trainerNotes: {
          count: noteCount ?? 0,
          lastNote: latestNote?.createdAt ?? null,
        },
      },
    });
  } catch (error) {
    logger.error('Client data overview fetch failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to load client overview' });
  }
};

/**
 * GET /api/admin/onboarding
 * Get all client onboarding data for admin management table
 * RBAC: admin, trainer only
 */
export const getAdminOnboardingList = async (req, res) => {
  try {
    const { User, ClientOnboardingQuestionnaire, ClientBaselineMeasurements, Package } = await getAllModels();

    // Parse query params
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const packageFilter = req.query.package;
    const statusFilter = req.query.status;
    const searchQuery = req.query.search;

    // Build where clauses
    const userWhere = {};
    if (searchQuery) {
      userWhere[Op.or] = [
        { firstName: { [Op.iLike]: `%${searchQuery}%` } },
        { lastName: { [Op.iLike]: `%${searchQuery}%` } },
        { email: { [Op.iLike]: `%${searchQuery}%` } },
      ];
    }

    // Fetch users with their onboarding data
    const { count, rows: users } = await User.findAndCountAll({
      where: userWhere,
      include: [
        {
          model: Package,
          as: 'packages',
          required: false,
        },
        {
          model: ClientOnboardingQuestionnaire,
          as: 'questionnaires',
          required: false,
          order: [['createdAt', 'DESC']],
          limit: 1,
        },
        {
          model: ClientBaselineMeasurements,
          as: 'baselineMeasurements',
          required: false,
          order: [['createdAt', 'DESC']],
          limit: 1,
        },
      ],
      limit,
      offset,
      distinct: true,
    });

    // Format response data
    const clients = users.map((user) => {
      const latestQuestionnaire = user.questionnaires?.[0] || null;
      const latestBaseline = user.baselineMeasurements?.[0] || null;
      const activePackage = user.packages?.find((pkg) => pkg.status === 'active') || user.packages?.[0] || null;

      // Apply status filter
      const questionnaireStatus = latestQuestionnaire?.status === 'submitted' || latestQuestionnaire?.status === 'reviewed'
        ? 'complete'
        : latestQuestionnaire
        ? 'draft'
        : 'not_started';

      if (statusFilter && statusFilter !== 'all' && questionnaireStatus !== statusFilter) {
        return null;
      }

      // Apply package filter
      if (packageFilter && packageFilter !== 'all' && activePackage?.name !== packageFilter) {
        return null;
      }

      return {
        userId: user.id,
        client: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
        package: {
          name: activePackage?.name || 'No Package',
        },
        questionnaire: latestQuestionnaire
          ? {
              status: latestQuestionnaire.status,
              completionPercentage: latestQuestionnaire.completionPercentage || 0,
              primaryGoal: latestQuestionnaire.primaryGoal,
              createdAt: latestQuestionnaire.createdAt,
            }
          : null,
        movementScreen: latestBaseline
          ? {
              nasmAssessmentScore: latestBaseline.nasmAssessmentScore,
              status: latestBaseline.nasmAssessmentScore !== null ? 'completed' : 'pending',
              createdAt: latestBaseline.createdAt,
            }
          : {
              nasmAssessmentScore: null,
              status: 'pending',
            },
      };
    }).filter(Boolean);

    const totalPages = Math.ceil(count / limit);

    return res.status(200).json({
      success: true,
      clients,
      pagination: {
        page,
        limit,
        totalPages,
        totalCount: count,
      },
    });
  } catch (error) {
    logger.error('Admin onboarding list fetch failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to load onboarding list' });
  }
};

/**
 * POST /api/admin/baseline-measurements
 * Create new baseline measurements record
 * RBAC: admin, trainer only
 */
export const createBaselineMeasurements = async (req, res) => {
  try {
    const { ClientBaselineMeasurements } = await getAllModels();
    const { userId, ...measurementData } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }

    // Create baseline measurement record
    const baseline = await ClientBaselineMeasurements.create({
      userId,
      recordedBy: req.user.id,
      takenAt: measurementData.takenAt || new Date(),
      restingHeartRate: measurementData.restingHeartRate || null,
      bloodPressureSystolic: measurementData.bloodPressureSystolic || null,
      bloodPressureDiastolic: measurementData.bloodPressureDiastolic || null,
      bodyWeight: measurementData.bodyWeight || null,
      bodyFatPercentage: measurementData.bodyFatPercentage || null,
      benchPressWeight: measurementData.benchPressWeight || null,
      benchPressReps: measurementData.benchPressReps || null,
      squatWeight: measurementData.squatWeight || null,
      squatReps: measurementData.squatReps || null,
      deadliftWeight: measurementData.deadliftWeight || null,
      deadliftReps: measurementData.deadliftReps || null,
      pullUpsReps: measurementData.pullUpsReps || null,
      plankDuration: measurementData.plankDuration || null,
      flexibilityNotes: measurementData.flexibilityNotes || null,
      injuryNotes: measurementData.injuryNotes || null,
      painLevel: measurementData.painLevel || 0,
    });

    logger.info(`Baseline measurements created for user ${userId} by ${req.user.id}`);

    return res.status(201).json({
      success: true,
      baseline,
    });
  } catch (error) {
    logger.error('Baseline measurements creation failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to create baseline measurements' });
  }
};

/**
 * GET /api/admin/baseline-measurements/:userId
 * Get baseline measurements history for a user
 * RBAC: admin, trainer, client (own data only)
 */
export const getBaselineMeasurementsHistory = async (req, res) => {
  try {
    const { ClientBaselineMeasurements } = await getAllModels();
    const targetUserId = parseUserId(req.params.userId);

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'Invalid userId' });
    }

    // RBAC check
    const isSelf = req.user.id === targetUserId;
    const isAdminOrTrainer = req.user.role === 'admin' || req.user.role === 'trainer';

    if (!isSelf && !isAdminOrTrainer) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const measurements = await ClientBaselineMeasurements.findAll({
      where: { userId: targetUserId },
      order: [['takenAt', 'DESC']],
      limit: 50,
    });

    return res.status(200).json({
      success: true,
      measurements,
    });
  } catch (error) {
    logger.error('Baseline measurements history fetch failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to load baseline measurements' });
  }
};
