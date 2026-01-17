import { Op } from 'sequelize';
import sequelize from '../database.mjs';
import { getAllModels } from '../models/index.mjs';
import logger from '../utils/logger.mjs';
import { updateMetrics } from '../routes/aiMonitoringRoutes.mjs';

const WORKOUT_MODEL = 'gpt-4';
const ALLOWED_DAY_TYPES = new Set([
  'training',
  'active_recovery',
  'rest',
  'assessment',
  'specialization',
]);
const ALLOWED_OPT_PHASES = new Set([
  'stabilization_endurance',
  'strength_endurance',
  'hypertrophy',
  'maximal_strength',
  'power',
]);

const isPlainObject = (value) => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const getOpenAIClient = async () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  let OpenAI;
  try {
    const openaiModule = await import('openai');
    OpenAI = openaiModule.OpenAI || openaiModule.default;
  } catch (error) {
    throw new Error('OpenAI SDK not installed. Run: npm install openai');
  }

  if (!OpenAI) {
    throw new Error('OpenAI SDK is unavailable');
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
};

const buildPrompt = (masterPromptJson, constraints) => {
  const constraintsBlock = constraints && Object.keys(constraints).length > 0
    ? JSON.stringify(constraints, null, 2)
    : '{}';

  return [
    'You are a certified personal trainer generating a structured workout plan.',
    'Return ONLY valid JSON matching this schema:',
    '{',
    '  "planName": "string",',
    '  "durationWeeks": number,',
    '  "summary": "string",',
    '  "days": [',
    '    {',
    '      "dayNumber": number,',
    '      "name": "string",',
    '      "focus": "string",',
    '      "dayType": "training|active_recovery|rest|assessment|specialization",',
    '      "estimatedDuration": number,',
    '      "exercises": [',
    '        {',
    '          "name": "string",',
    '          "setScheme": "string",',
    '          "repGoal": "string",',
    '          "restPeriod": number,',
    '          "tempo": "string",',
    '          "intensityGuideline": "string",',
    '          "notes": "string",',
    '          "isOptional": boolean',
    '        }',
    '      ]',
    '    }',
    '  ]',
    '}',
    'Do not include markdown code fences or extra commentary.',
    '',
    'Client master prompt JSON:',
    JSON.stringify(masterPromptJson, null, 2),
    '',
    'Additional constraints:',
    constraintsBlock,
  ].join('\n');
};

const normalizeDayType = (dayType) => {
  if (!dayType || typeof dayType !== 'string') {
    return 'training';
  }
  return ALLOWED_DAY_TYPES.has(dayType) ? dayType : 'training';
};

const normalizeOptPhase = (optPhase) => {
  if (!optPhase || typeof optPhase !== 'string') {
    return null;
  }
  return ALLOWED_OPT_PHASES.has(optPhase) ? optPhase : null;
};

const findExerciseByName = async (Exercise, name, transaction) => {
  if (!name) {
    return null;
  }

  const trimmed = String(name).trim();
  if (!trimmed) {
    return null;
  }

  const exactMatch = await Exercise.findOne({
    where: { name: { [Op.iLike]: trimmed } },
    transaction,
  });

  if (exactMatch) {
    return exactMatch;
  }

  return Exercise.findOne({
    where: { name: { [Op.iLike]: `%${trimmed}%` } },
    transaction,
  });
};

export const generateWorkoutPlan = async (req, res) => {
  const startTime = Date.now();
  try {
    const { userId: rawUserId, masterPromptJson, constraints } = req.body || {};
    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;

    if (!requesterId || !requesterRole) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const parsedUserId = Number.isFinite(Number(rawUserId)) ? Number(rawUserId) : null;
    const targetUserId = Number.isInteger(rawUserId)
      ? rawUserId
      : Number.isInteger(parsedUserId)
        ? parsedUserId
        : requesterRole === 'client'
          ? requesterId
          : null;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Missing or invalid userId',
      });
    }

    if (requesterRole === 'client' && targetUserId !== requesterId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Clients can only generate plans for themselves',
      });
    }

    const models = getAllModels();
    const {
      User,
      Exercise,
      WorkoutPlan,
      WorkoutPlanDay,
      WorkoutPlanDayExercise,
      ClientTrainerAssignment,
    } = models;

    if (requesterRole === 'trainer') {
      const assignment = await ClientTrainerAssignment.findOne({
        where: {
          clientId: targetUserId,
          trainerId: requesterId,
          status: 'active',
        },
      });

      if (!assignment) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Trainer is not assigned to this client',
        });
      }
    } else if (requesterRole !== 'admin' && requesterRole !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Invalid role for workout generation',
      });
    }

    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    let resolvedMasterPrompt = masterPromptJson ?? targetUser.masterPromptJson;
    if (typeof resolvedMasterPrompt === 'string') {
      try {
        resolvedMasterPrompt = JSON.parse(resolvedMasterPrompt);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'masterPromptJson must be valid JSON',
        });
      }
    }

    if (!resolvedMasterPrompt || !isPlainObject(resolvedMasterPrompt)) {
      return res.status(404).json({
        success: false,
        message: 'Master Prompt JSON not found for this user',
      });
    }

    const normalizedConstraints = isPlainObject(constraints) ? constraints : {};
    const openai = await getOpenAIClient();
    const prompt = buildPrompt(resolvedMasterPrompt, normalizedConstraints);

    const completion = await openai.chat.completions.create({
      model: WORKOUT_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You generate structured workout plans as JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(502).json({
        success: false,
        message: 'Empty response from OpenAI',
      });
    }

    let aiPlan;
    try {
      aiPlan = JSON.parse(content);
    } catch (error) {
      logger.error('AI workout generation returned invalid JSON', {
        error: error.message,
        contentSnippet: content.slice(0, 200),
      });
      return res.status(502).json({
        success: false,
        message: 'AI response was not valid JSON',
      });
    }

    const transaction = await sequelize.transaction();
    const unmatchedExercises = [];
    let createdExerciseCount = 0;

    try {
      const durationWeeks = Number.isFinite(Number(aiPlan.durationWeeks))
        ? Math.max(1, Number(aiPlan.durationWeeks))
        : 4;

      const workoutPlan = await WorkoutPlan.create(
        {
          userId: targetUserId,
          title: aiPlan.planName || 'AI Workout Plan',
          description: aiPlan.summary || 'AI-generated workout plan',
          durationWeeks,
          status: 'active',
          tags: ['ai_generated'],
        },
        { transaction }
      );

      const days = Array.isArray(aiPlan.days) ? aiPlan.days : [];
      for (let i = 0; i < days.length; i += 1) {
        const day = days[i] || {};
        const dayNumber = Number.isFinite(Number(day.dayNumber)) ? Number(day.dayNumber) : i + 1;

        const workoutPlanDay = await WorkoutPlanDay.create(
          {
            workoutPlanId: workoutPlan.id,
            dayNumber,
            name: day.name || `Day ${dayNumber}`,
            focus: day.focus || null,
            dayType: normalizeDayType(day.dayType),
            optPhase: normalizeOptPhase(day.optPhase),
            notes: day.notes || null,
            warmupInstructions: day.warmupInstructions || null,
            cooldownInstructions: day.cooldownInstructions || null,
            estimatedDuration: Number.isFinite(Number(day.estimatedDuration))
              ? Number(day.estimatedDuration)
              : null,
            sortOrder: Number.isFinite(Number(day.sortOrder)) ? Number(day.sortOrder) : i + 1,
          },
          { transaction }
        );

        const exercises = Array.isArray(day.exercises) ? day.exercises : [];
        for (let j = 0; j < exercises.length; j += 1) {
          const exercise = exercises[j] || {};
          const exerciseName = exercise.name ? String(exercise.name) : '';
          const exerciseRecord = await findExerciseByName(Exercise, exerciseName, transaction);

          if (!exerciseRecord) {
            unmatchedExercises.push({ dayNumber, name: exerciseName });
            continue;
          }

          await WorkoutPlanDayExercise.create(
            {
              workoutPlanDayId: workoutPlanDay.id,
              exerciseId: exerciseRecord.id,
              orderInWorkout: Number.isFinite(Number(exercise.orderInWorkout))
                ? Number(exercise.orderInWorkout)
                : j + 1,
              setScheme: exercise.setScheme || null,
              repGoal: exercise.repGoal || null,
              restPeriod: Number.isFinite(Number(exercise.restPeriod))
                ? Number(exercise.restPeriod)
                : null,
              tempo: exercise.tempo || null,
              intensityGuideline: exercise.intensityGuideline || null,
              notes: exercise.notes || null,
              isOptional: Boolean(exercise.isOptional),
            },
            { transaction }
          );

          createdExerciseCount += 1;
        }
      }

      if (createdExerciseCount === 0) {
        await transaction.rollback();
        return res.status(422).json({
          success: false,
          message: 'No exercises matched existing library entries',
          unmatchedExercises,
        });
      }

      await transaction.commit();

      const responseTime = Date.now() - startTime;
      const tokensUsed = completion.usage?.total_tokens || 0;
      updateMetrics('workoutGeneration', true, responseTime, tokensUsed, requesterId);

      const workouts = (Array.isArray(aiPlan.days) ? aiPlan.days : []).map((day) => ({
        day: day.name || `Day ${day.dayNumber || ''}`.trim(),
        exercises: (Array.isArray(day.exercises) ? day.exercises : []).map((exercise) => ({
          name: exercise.name,
          sets: exercise.setScheme,
          reps: exercise.repGoal,
          weight: exercise.weight || null,
        })),
      }));

      return res.status(200).json({
        success: true,
        planId: workoutPlan.id,
        summary: aiPlan.summary || 'Workout plan generated',
        workouts,
        unmatchedExercises,
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    updateMetrics('workoutGeneration', false, responseTime, 0, req.user?.id);

    logger.error('AI workout generation failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate workout plan',
    });
  }
};
