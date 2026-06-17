/**
 * Exercise Routes
 * ==============
 * Routes for exercise functionality, including recommendations and search
 * Enhanced for NASM WorkoutLogger integration
 */

import express from 'express';
import { apiLimiter } from '../middleware/rateLimiter.mjs';
import { protect, authorize, authorizeResourceAccess, trainerOrAdminOnly } from '../middleware/authMiddleware.mjs';
import workoutController from '../controllers/workoutController.mjs';
import { getExercise, getVideoCatalog } from '../models/index.mjs';
import { Op } from '../database.mjs';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';
import {
  formatLibraryExercise,
  getLibraryAttributes,
  getLibraryWhere,
} from '../services/exerciseLibraryContract.mjs';
import {
  getCatalogVideoSamplesByExercise,
} from '../services/exerciseCatalogVideoSamples.mjs';

const router = express.Router();

const INTERNAL_ERROR = 'Internal server error';

const sendInternalError = (res, message) => res.status(500).json({
  success: false,
  message,
  error: INTERNAL_ERROR
});

const parsePositiveInteger = (value) => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

const parseBoundedPositiveInteger = (value, fallback, max) => {
  const parsed = parsePositiveInteger(value);
  if (!parsed) return fallback;
  return Math.min(parsed, max);
};

/**
 * @route GET /api/exercises/search
 * @desc Search exercises for WorkoutLogger autocomplete
 * @access Private (Trainer/Admin only)
 */
router.get('/search', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const { q, limit = 20, type, difficulty, muscleGroup } = req.query;
    const normalizedLimit = parseBoundedPositiveInteger(limit, 20, 100);
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    const Exercise = getExercise();
    if (!Exercise) {
      return res.status(503).json({
        success: false,
        message: 'Exercise model not available. Database may still be initializing.'
      });
    }
    const searchQuery = q.trim().toLowerCase();
    
    // Build dynamic where clause
    const whereClause = {
      [Op.or]: [
        { name: { [Op.iLike]: `%${searchQuery}%` } },
        { description: { [Op.iLike]: `%${searchQuery}%` } },
        sequelize.where(
          sequelize.cast(sequelize.col('exerciseType'), 'TEXT'),
          { [Op.iLike]: `%${searchQuery}%` }
        )
      ]
    };

    // Add filters if provided
    if (type) {
      whereClause.exerciseType = type;
    }

    if (difficulty) {
      const normalizedDifficulty = parseBoundedPositiveInteger(difficulty, null, 1000);
      if (!normalizedDifficulty) {
        return res.status(400).json({
          success: false,
          message: 'Difficulty must be a positive whole number'
        });
      }
      whereClause.difficulty = {
        [Op.between]: [normalizedDifficulty - 100, normalizedDifficulty + 100]
      };
    }

    // Search for muscle groups in TEXT columns storing JSON arrays
    if (muscleGroup) {
      whereClause[Op.or].push(
        { primaryMuscles: { [Op.iLike]: `%${muscleGroup}%` } },
        { secondaryMuscles: { [Op.iLike]: `%${muscleGroup}%` } }
      );
    }

    const exercises = await Exercise.findAll({
      where: whereClause,
      attributes: [
        'id',
        'name', 
        'description',
        'exerciseType',
        'difficulty',
        'primaryMuscles',
        'secondaryMuscles',
        'instructions',
        'videoUrl',
        'imageUrl'
      ],
      order: [
        // Prioritize exact name matches — use bind parameter to prevent SQL injection
        [sequelize.literal(`CASE WHEN LOWER(name) LIKE LOWER(${sequelize.escape('%' + searchQuery.replace(/[%_\\]/g, '\\$&') + '%')}) THEN 1 ELSE 2 END`), 'ASC'],
        ['name', 'ASC']
      ],
      limit: normalizedLimit
    });

    // Format exercises for frontend
    const formattedExercises = exercises.map(exercise => ({
      id: exercise.id,
      name: exercise.name,
      description: exercise.description,
      exerciseType: exercise.exerciseType,
      difficulty: exercise.difficulty,
      muscleGroups: [...(exercise.primaryMuscles || []), ...(exercise.secondaryMuscles || [])],
      instructions: exercise.instructions,
      videoUrl: exercise.videoUrl,
      imageUrl: exercise.imageUrl,
      primaryMuscles: exercise.primaryMuscles || [],
      secondaryMuscles: exercise.secondaryMuscles || []
    }));

    logger.info(`Exercise search completed: ${exercises.length} results for "${searchQuery}"`);

    res.json({
      success: true,
      exercises: formattedExercises,
      totalCount: exercises.length,
      query: searchQuery,
      filters: { type, difficulty, muscleGroup }
    });

  } catch (error) {
    logger.error('Exercise search error:', error);
    return sendInternalError(res, 'Failed to search exercises');
  }
});

/**
 * @route GET /api/exercises/categories
 * @desc Get exercise categories and muscle groups for filters
 * @access Private (Trainer/Admin only)
 */
router.get('/categories', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const Exercise = getExercise();
    
    // Get distinct exercise types
    const exerciseTypes = await Exercise.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('exerciseType')), 'type']],
      raw: true
    });

    // Get all muscle groups from both primary and secondary
    const allExercises = await Exercise.findAll({
      attributes: ['primaryMuscles', 'secondaryMuscles'],
      raw: true
    });

    const muscleGroups = new Set();
    allExercises.forEach(exercise => {
      if (exercise.primaryMuscles) {
        JSON.parse(exercise.primaryMuscles).forEach(muscle => muscleGroups.add(muscle));
      }
      if (exercise.secondaryMuscles) {
        JSON.parse(exercise.secondaryMuscles).forEach(muscle => muscleGroups.add(muscle));
      }
    });

    res.json({
      success: true,
      categories: {
        exerciseTypes: exerciseTypes.map(t => t.type).filter(Boolean),
        muscleGroups: Array.from(muscleGroups).sort(),
        difficultyLevels: [
          { label: 'Beginner (0-300)', value: 150 },
          { label: 'Intermediate (300-600)', value: 450 },
          { label: 'Advanced (600-800)', value: 700 },
          { label: 'Elite (800+)', value: 900 }
        ]
      }
    });

  } catch (error) {
    logger.error('Exercise categories error:', error);
    return sendInternalError(res, 'Failed to fetch exercise categories');
  }
});

/**
 * @route GET /api/exercises
 * @desc Root exercise list with optional ?search= filtering.
 *       Supports: ?search=bench&limit=20&type=Strength&muscleGroup=chest
 *       Without ?search, returns all exercises (paginated).
 * @access Private (Trainer/Admin only)
 */
router.get('/', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const { search, limit = 50, type, muscleGroup, exerciseKeyPrefix } = req.query;
    const normalizedLimit = parseBoundedPositiveInteger(limit, 50, 500);
    const Exercise = getExercise();
    if (!Exercise) {
      return res.status(503).json({ success: false, message: 'Exercise model not available' });
    }

    const whereClause = {};
    // Add isActive filter (graceful fallback if column missing)
    try {
      whereClause.isActive = true;
    } catch { /* column may not exist */ }

    if (search && search.trim().length >= 2) {
      const q = search.trim().toLowerCase();
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${q}%` } },
        sequelize.where(
          sequelize.cast(sequelize.col('exerciseType'), 'TEXT'),
          { [Op.iLike]: `%${q}%` }
        ),
      ];
    }

    if (type) whereClause.exerciseType = type;
    if (muscleGroup) {
      if (!whereClause[Op.or]) whereClause[Op.or] = [];
      whereClause[Op.or].push(
        { primaryMuscles: { [Op.iLike]: `%${muscleGroup}%` } },
        { secondaryMuscles: { [Op.iLike]: `%${muscleGroup}%` } }
      );
    }

    // V3b.3 MEDIUM 3 fix (2026-05-03): exerciseKeyPrefix filter for
    // namespace-scoped queries. The V3b.3 Playwright smoke spec used
    // to fetch `?limit=500` and rely on alphabetic ordering placing
    // ces-* rows in the first page; if the registry grew past 500
    // rows AND ces-* sorted past row 500, the smoke false-failed.
    // exerciseKeyPrefix narrows the result set server-side so the
    // smoke can fetch ALL ces-* rows in one round-trip regardless
    // of registry growth.
    //
    // Codex Round LOW (2026-05-03): the prior implementation only
    // length-bounded + trimmed; SQL LIKE wildcards (% and _) and
    // backslash were silently passed through to Op.startsWith,
    // which compiles to `LIKE 'prefix%'`. Result: a request with
    // exerciseKeyPrefix=%25 (URL-decoded `%`) would match every row.
    // Not a security vector (the route already allows broad listing
    // without the prefix), but a contract bug.
    //
    // Fix: whitelist the actual namespace alphabet (lowercase ASCII
    // letters + digits + hyphen). Anything else returns 400. This
    // matches the seeder's exercise_key vocabulary
    // (e.g. ces-foam-roll-tfl) without ambiguity.
    if (typeof exerciseKeyPrefix === 'string') {
      const safePrefix = exerciseKeyPrefix.trim();
      if (safePrefix.length > 0) {
        if (!/^[a-z0-9-]{1,64}$/i.test(safePrefix)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid exerciseKeyPrefix — only [a-z0-9-]{1,64} allowed',
          });
        }
        whereClause.exercise_key = { [Op.startsWith]: safePrefix };
      }
    }

    let exercises;
    try {
      exercises = await Exercise.findAll({
        where: whereClause,
        attributes: [
          'id', 'name', 'exerciseType', 'primaryMuscles', 'secondaryMuscles',
          'exercise_key', 'bodyPartCategory', 'difficulty', 'equipmentNeeded', 'source',
          'description',
        ],
        order: [['name', 'ASC']],
        limit: normalizedLimit,
        raw: true,
      });
    } catch {
      // Fallback if V2 columns don't exist
      delete whereClause.isActive;
      exercises = await Exercise.findAll({
        where: whereClause,
        attributes: ['id', 'name', 'exerciseType', 'primaryMuscles', 'difficulty', 'description'],
        order: [['name', 'ASC']],
        limit: normalizedLimit,
        raw: true,
      });
    }

    // Parse JSON string fields safely (equipmentNeeded, primaryMuscles, secondaryMuscles)
    const parseJsonField = (val) => {
      if (Array.isArray(val)) return val;
      if (!val) return [];
      try {
        let parsed = typeof val === 'string' ? JSON.parse(val) : val;
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        return Array.isArray(parsed) ? parsed : [String(parsed)];
      } catch { return typeof val === 'string' ? [val] : []; }
    };

    const formatted = exercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      exerciseKey: ex.exercise_key || '',
      exerciseType: ex.exerciseType || '',
      bodyPartCategory: ex.bodyPartCategory || 'Full Body',
      primaryMuscles: parseJsonField(ex.primaryMuscles),
      secondaryMuscles: parseJsonField(ex.secondaryMuscles),
      difficulty: ex.difficulty || 0,
      equipment: parseJsonField(ex.equipmentNeeded),
      source: ex.source || '',
      description: ex.description || '',
    }));

    res.set('Cache-Control', 'private, max-age=60');
    res.json({ success: true, exercises: formatted, count: formatted.length });
  } catch (error) {
    logger.error('Exercise list/search error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch exercises' });
  }
});

/**
 * @route GET /api/exercises/all
 * @desc Lightweight list of all exercises for client-side search cache.
 *       Returns minimal fields to keep payload small (~500 exercises ≈ 40KB).
 * @access Private (Trainer/Admin only)
 */
router.get('/all', protect, trainerOrAdminOnly, apiLimiter, async (req, res) => {
  try {
    const Exercise = getExercise();
    if (!Exercise) {
      return res.status(503).json({ success: false, message: 'Exercise model not available' });
    }

    // Gracefully handle missing V2 columns (isActive, exercise_key, bodyPartCategory)
    let exercises;
    try {
      exercises = await Exercise.findAll({
        attributes: [
          'id', 'name', 'exerciseType', 'primaryMuscles',
          'exercise_key', 'bodyPartCategory', 'difficulty', 'equipmentNeeded', 'source',
          'description', 'easyVariation', 'hardVariation',
          'kneeMod', 'shoulderMod', 'ankleMod', 'wristMod', 'backMod', 'elbowMod', 'footMod', 'hipMod',
        ],
        where: { isActive: true },
        order: [['name', 'ASC']],
        raw: true,
      });
    } catch {
      // Fallback if V2 columns don't exist yet (migration not run)
      exercises = await Exercise.findAll({
        attributes: ['id', 'name', 'exerciseType', 'primaryMuscles', 'difficulty'],
        order: [['name', 'ASC']],
        raw: true,
      });
    }

    const formatted = exercises.map(ex => {
      // Parse equipmentNeeded — may be double-encoded JSON string in raw mode
      let equipment = [];
      try {
        let parsed = ex.equipmentNeeded;
        // Unwrap up to 2 levels of JSON string encoding
        if (typeof parsed === 'string') {
          parsed = JSON.parse(parsed);
          if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        }
        equipment = Array.isArray(parsed) ? parsed : [];
      } catch { equipment = []; }
      return {
        id: ex.id,
        name: ex.name,
        exerciseKey: ex.exercise_key || '',
        exerciseType: ex.exerciseType || '',
        bodyPartCategory: ex.bodyPartCategory || 'Full Body',
        primaryMuscles: ex.primaryMuscles || [],
        difficulty: ex.difficulty || 0,
        equipment,
        source: ex.source || 'swanstudios',
        description: ex.description || null,
        easyVariation: ex.easyVariation || null,
        hardVariation: ex.hardVariation || null,
        kneeMod: ex.kneeMod || null,
        shoulderMod: ex.shoulderMod || null,
        ankleMod: ex.ankleMod || null,
        wristMod: ex.wristMod || null,
        backMod: ex.backMod || null,
        elbowMod: ex.elbowMod || null,
        footMod: ex.footMod || null,
        hipMod: ex.hipMod || null,
      };
    });

    // Cache for 5 minutes — exercise list doesn't change often
    res.set('Cache-Control', 'private, max-age=300');
    res.json({ success: true, exercises: formatted, count: formatted.length });
  } catch (error) {
    logger.error('Exercise list error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch exercises' });
  }
});

/**
 * @route GET /api/exercises/library
 * @desc Client-safe exercise library listing. Returns the same payload
 *       shape as /api/exercises/all but is available to any authenticated
 *       user (including the `client` role), not just trainers and admins.
 *       Added 2026-04-17 to unblock the client self-log surface at
 *       /dashboard/client/log-workout, which previously called /all and
 *       hit 403.
 * @access Private (any authenticated user — client / trainer / admin)
 * @note The exercise library itself is non-sensitive reference data
 *       (names, muscle groups, difficulty, equipment). Trainer-authored
 *       private programs live on different endpoints and are not
 *       exposed here.
 */
router.get('/library', protect, apiLimiter, async (req, res) => {
  try {
    const Exercise = getExercise();
    if (!Exercise) {
      return res.status(503).json({ success: false, message: 'Exercise model not available' });
    }

    // Same attribute + fallback shape as /all — deliberate duplication
    // (not extraction) to keep the existing /all behavior exactly as-is
    // for its current trainer/admin consumers, and avoid coupling
    // changes on this new client-facing endpoint to the older one.
    let exercises;
    try {
      exercises = await Exercise.findAll({
        attributes: getLibraryAttributes(Exercise),
        where: getLibraryWhere(Exercise),
        order: [['name', 'ASC']],
        raw: true,
      });
    } catch {
      exercises = await Exercise.findAll({
        attributes: ['id', 'name', 'exerciseType', 'primaryMuscles', 'difficulty'],
        order: [['name', 'ASC']],
        raw: true,
      });
    }

    const formatted = exercises.map(formatLibraryExercise);
    const exerciseIds = formatted.map(exercise => exercise.id).filter(Boolean);
    let VideoCatalog = null;
    try {
      VideoCatalog = getVideoCatalog();
    } catch {
      VideoCatalog = null;
    }
    const catalogVideoSamples = await getCatalogVideoSamplesByExercise(VideoCatalog, { exerciseIds });
    const exercisesWithSamples = formatted.map(exercise => ({
      ...exercise,
      catalogVideoSample: catalogVideoSamples[exercise.id] ?? null,
    }));

    res.set('Cache-Control', 'private, max-age=300');
    res.json({ success: true, exercises: exercisesWithSamples, count: exercisesWithSamples.length });
  } catch (error) {
    logger.error('Exercise library error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch exercise library' });
  }
});

/**
 * @route GET /api/exercises/recommended
 * @desc Get exercise recommendations for the current user
 * @access Private
 */
router.get('/recommended', protect, workoutController.getExerciseRecommendations);

/**
 * @route GET /api/exercises/recommended/:userId
 * @desc Get exercise recommendations for a specific user
 * @access Private (Admin/Trainer only)
 */
router.get('/recommended/:userId', protect, authorize(['admin', 'trainer']), authorizeResourceAccess('userId'), workoutController.getExerciseRecommendations);

/**
 * @route GET /api/exercises/:id/teach-mode
 * @desc Deep exercise data for Teach Mode (instructions, cues, safety, biomechanics, progression)
 *       Separate from /:id to avoid bloating the standard exercise response.
 *       Cached for 10 minutes — exercise content doesn't change often.
 * @access Private (authenticated dashboard users)
 */
router.get('/:id/teach-mode', protect, apiLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const Exercise = getExercise();
    if (!Exercise) {
      return res.status(503).json({ success: false, message: 'Exercise model not available' });
    }

    const exercise = await Exercise.findByPk(id);
    if (!exercise) {
      return res.status(404).json({ success: false, message: 'Exercise not found' });
    }

    // Parse JSON fields safely — handles double-encoded strings from raw mode
    const safeParseJSON = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      try {
        let parsed = typeof val === 'string' ? JSON.parse(val) : val;
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        return Array.isArray(parsed) ? parsed : [];
      } catch { return []; }
    };

    res.set('Cache-Control', 'private, max-age=600');
    res.json({
      success: true,
      teachData: {
        id: exercise.id,
        name: exercise.name,
        description: exercise.description || '',
        exerciseKey: exercise.exercise_key || '',
        exerciseType: exercise.exerciseType || '',
        bodyPartCategory: exercise.bodyPartCategory || '',
        source: exercise.source || '',
        difficulty: exercise.difficulty || 0,
        // Deep instruction data
        instructions: exercise.instructions || '',
        coachingCues: safeParseJSON(exercise.coachingCues),
        safetyTips: exercise.safetyTips || '',
        contraindicationNotes: exercise.contraindicationNotes || '',
        // Muscle data
        primaryMuscles: exercise.primaryMuscles || [],
        secondaryMuscles: exercise.secondaryMuscles || [],
        // Biomechanics
        force: exercise.force || null,
        mechanic: exercise.mechanic || null,
        nasmMovementPattern: exercise.nasmMovementPattern || null,
        // Equipment & setting
        equipmentNeeded: exercise.equipmentNeeded || [],
        canBePerformedAtHome: exercise.canBePerformedAtHome || false,
        // Progression
        progressionPath: safeParseJSON(exercise.progressionPath),
        prerequisites: safeParseJSON(exercise.prerequisites),
        optPhases: safeParseJSON(exercise.optPhases),
        // Visual & learning
        videoUrl: exercise.videoUrl || null,
        imageUrl: exercise.imageUrl || null,
        thumbnailUrl: exercise.thumbnailUrl || null,
        scientificReferences: exercise.scientificReferences || '',
        // Training defaults
        defaultTempo: exercise.defaultTempo || null,
        defaultRestSeconds: exercise.defaultRestSeconds || null,
        recommendedSets: exercise.recommendedSets || null,
        recommendedReps: exercise.recommendedReps || null,
        // Gamification
        experiencePointsEarned: exercise.experiencePointsEarned || 10,
      },
    });
  } catch (error) {
    logger.error('Exercise teach-mode fetch error:', error);
    return sendInternalError(res, 'Failed to fetch exercise teach data');
  }
});

/**
 * @route GET /api/exercises/:id
 * @desc Get detailed exercise information
 * @access Private (Trainer/Admin only)
 */
router.get('/:id', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const Exercise = getExercise();

    const exercise = await Exercise.findByPk(id);

    if (!exercise) {
      return res.status(404).json({
        success: false,
        message: 'Exercise not found'
      });
    }

    res.json({
      success: true,
      exercise: {
        id: exercise.id,
        name: exercise.name,
        description: exercise.description,
        instructions: exercise.instructions,
        exerciseType: exercise.exerciseType,
        difficulty: exercise.difficulty,
        primaryMuscles: exercise.primaryMuscles || [],
        secondaryMuscles: exercise.secondaryMuscles || [],
        videoUrl: exercise.videoUrl,
        imageUrl: exercise.imageUrl
      }
    });

  } catch (error) {
    logger.error('Exercise fetch error:', error);
    return sendInternalError(res, 'Failed to fetch exercise details');
  }
});

export default router;
