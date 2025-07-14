/**
 * Exercise Routes
 * ==============
 * Routes for exercise functionality, including recommendations and search
 * Enhanced for NASM WorkoutLogger integration
 */

import express from 'express';
import { protect, authorize, trainerOrAdminOnly } from '../middleware/authMiddleware.mjs';
import workoutController from '../controllers/workoutController.mjs';
import { getExercise } from '../models/index.mjs';
import { Op } from '../database.mjs';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

/**
 * @route GET /api/exercises/search
 * @desc Search exercises for WorkoutLogger autocomplete
 * @access Private (Trainer/Admin only)
 */
router.get('/search', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const { q, limit = 20, type, difficulty, muscleGroup } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    const Exercise = getExercise();
    const searchQuery = q.trim().toLowerCase();
    
    // Build dynamic where clause
    const whereClause = {
      [Op.or]: [
        { name: { [Op.iLike]: `%${searchQuery}%` } },
        { description: { [Op.iLike]: `%${searchQuery}%` } },
        { exerciseType: { [Op.iLike]: `%${searchQuery}%` } }
      ]
    };

    // Add filters if provided
    if (type) {
      whereClause.exerciseType = type;
    }

    if (difficulty) {
      const difficultyRange = parseInt(difficulty);
      whereClause.difficulty = {
        [Op.between]: [difficultyRange - 100, difficultyRange + 100]
      };
    }

    // Search for muscle groups in JSON arrays
    if (muscleGroup) {
      whereClause[Op.or].push(
        { primaryMuscles: { [Op.contains]: [muscleGroup] } },
        { secondaryMuscles: { [Op.contains]: [muscleGroup] } }
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
        // Prioritize exact name matches
        [sequelize.literal(`CASE WHEN LOWER(name) LIKE '%${searchQuery}%' THEN 1 ELSE 2 END`), 'ASC'],
        ['name', 'ASC']
      ],
      limit: parseInt(limit)
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
    res.status(500).json({
      success: false,
      message: 'Failed to search exercises',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exercise categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exercise details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/exercises/recommended
 * @desc Get exercise recommendations for the current user
 * @access Private
 */
router.get('/recommended', workoutController.getExerciseRecommendations);

/**
 * @route GET /api/exercises/recommended/:userId
 * @desc Get exercise recommendations for a specific user
 * @access Private (Admin/Trainer only)
 */
router.get('/recommended/:userId', protect, authorize(['admin', 'trainer']), workoutController.getExerciseRecommendations);

export default router;