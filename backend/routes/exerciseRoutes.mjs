// backend/routes/exerciseRoutes.mjs
import express from 'express';
import { authenticateUser, authorizeRoles } from '../middleware/nasmAuthMiddleware.mjs';
import { Exercise, ClientProgress } from '../models/associations.mjs';
import { Op } from 'sequelize';

const router = express.Router();

/**
 * @route GET /api/exercises
 * @desc Get all exercises
 * @access Private
 */
router.get('/',
  authenticateUser,
  async (req, res) => {
    try {
      // Get query parameters for filtering
      const { 
        type, 
        primaryMuscle, 
        difficulty, 
        search,
        limit = 100,
        offset = 0,
        sortBy = 'name',
        sortOrder = 'ASC'
      } = req.query;
      
      // Build filter options
      const where = {};
      
      // Filter by exercise type if provided
      if (type) {
        where.exerciseType = type;
      }
      
      // Filter by difficulty range if provided
      if (difficulty) {
        const [min, max] = difficulty.split('-').map(Number);
        if (!isNaN(min) && !isNaN(max)) {
          where.difficulty = {
            [Op.between]: [min, max]
          };
        } else if (!isNaN(min)) {
          where.difficulty = {
            [Op.gte]: min
          };
        }
      }
      
      // Filter by search term if provided
      if (search) {
        where.name = {
          [Op.iLike]: `%${search}%`
        };
      }
      
      // Get client level to filter unlockable exercises
      let clientLevel = 0;
      if (req.user.role === 'client') {
        const clientProgress = await ClientProgress.findOne({
          where: { userId: req.user.id },
          attributes: ['overallLevel']
        });
        
        if (clientProgress) {
          clientLevel = clientProgress.overallLevel;
        }
      }
      
      // Add level restriction for clients
      if (req.user.role === 'client') {
        where.unlockLevel = {
          [Op.lte]: clientLevel
        };
      }
      
      // If filtering by primaryMuscle, we need special handling since it's stored as JSON
      let exercises;
      
      if (primaryMuscle) {
        // First get all exercises
        exercises = await Exercise.findAll({
          where,
          order: [[sortBy, sortOrder]],
          limit: parseInt(limit),
          offset: parseInt(offset)
        });
        
        // Then filter by primaryMuscle using JS
        exercises = exercises.filter(exercise => {
          const muscles = exercise.primaryMuscles || [];
          return muscles.includes(primaryMuscle);
        });
      } else {
        // Standard query without primaryMuscle filtering
        exercises = await Exercise.findAll({
          where,
          order: [[sortBy, sortOrder]],
          limit: parseInt(limit),
          offset: parseInt(offset)
        });
      }
      
      return res.status(200).json({
        success: true,
        count: exercises.length,
        exercises
      });
      
    } catch (error) {
      console.error('Error fetching exercises:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error fetching exercises',
        error: error.message
      });
    }
});

/**
 * @route GET /api/exercises/:id
 * @desc Get a single exercise by ID
 * @access Private
 */
router.get('/:id',
  authenticateUser,
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const exercise = await Exercise.findByPk(id);
      
      if (!exercise) {
        return res.status(404).json({
          success: false,
          message: 'Exercise not found'
        });
      }
      
      // If user is a client, check if they've unlocked this exercise
      if (req.user.role === 'client') {
        const clientProgress = await ClientProgress.findOne({
          where: { userId: req.user.id },
          attributes: ['overallLevel']
        });
        
        if (clientProgress && exercise.unlockLevel > clientProgress.overallLevel) {
          return res.status(403).json({
            success: false,
            message: 'You have not unlocked this exercise yet'
          });
        }
      }
      
      return res.status(200).json({
        success: true,
        exercise
      });
      
    } catch (error) {
      console.error('Error fetching exercise:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error fetching exercise',
        error: error.message
      });
    }
});

/**
 * @route POST /api/exercises
 * @desc Create a new exercise
 * @access Private (admins and trainers only)
 */
router.post('/',
  authenticateUser,
  authorizeRoles(['admin', 'trainer']),
  async (req, res) => {
    try {
      const {
        name,
        description,
        instructions,
        videoUrl,
        imageUrl,
        exerciseType,
        primaryMuscles,
        secondaryMuscles,
        difficulty,
        progressionPath,
        prerequisites,
        equipmentNeeded,
        canBePerformedAtHome,
        contraindicationNotes,
        safetyTips,
        recommendedSets,
        recommendedReps,
        recommendedDuration,
        restInterval,
        scientificReferences,
        unlockLevel,
        experiencePointsEarned
      } = req.body;
      
      // Validate required fields
      if (!name || !description || !instructions || !exerciseType || !primaryMuscles || difficulty === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }
      
      // Check if exercise with same name already exists
      const existingExercise = await Exercise.findOne({
        where: { name }
      });
      
      if (existingExercise) {
        return res.status(400).json({
          success: false,
          message: 'An exercise with this name already exists'
        });
      }
      
      // Create the new exercise
      const exercise = await Exercise.create({
        name,
        description,
        instructions,
        videoUrl,
        imageUrl,
        exerciseType,
        primaryMuscles,
        secondaryMuscles,
        difficulty,
        progressionPath,
        prerequisites,
        equipmentNeeded,
        canBePerformedAtHome,
        contraindicationNotes,
        safetyTips,
        recommendedSets,
        recommendedReps,
        recommendedDuration,
        restInterval,
        scientificReferences,
        unlockLevel: unlockLevel || 0,
        experiencePointsEarned: experiencePointsEarned || 10,
        isActive: true,
        isPopular: false
      });
      
      return res.status(201).json({
        success: true,
        message: 'Exercise created successfully',
        exercise
      });
      
    } catch (error) {
      console.error('Error creating exercise:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error creating exercise',
        error: error.message
      });
    }
});

/**
 * @route PUT /api/exercises/:id
 * @desc Update an exercise
 * @access Private (admins and trainers only)
 */
router.put('/:id',
  authenticateUser,
  authorizeRoles(['admin', 'trainer']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const exercise = await Exercise.findByPk(id);
      
      if (!exercise) {
        return res.status(404).json({
          success: false,
          message: 'Exercise not found'
        });
      }
      
      // Update fields based on request body
      Object.keys(updates).forEach(key => {
        // Only update valid fields that exist in the model
        if (exercise[key] !== undefined) {
          exercise[key] = updates[key];
        }
      });
      
      // Save all updates
      await exercise.save();
      
      return res.status(200).json({
        success: true,
        message: 'Exercise updated successfully',
        exercise
      });
      
    } catch (error) {
      console.error('Error updating exercise:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error updating exercise',
        error: error.message
      });
    }
});

/**
 * @route DELETE /api/exercises/:id
 * @desc Delete an exercise (soft delete)
 * @access Private (admins only)
 */
router.delete('/:id',
  authenticateUser,
  authorizeRoles(['admin']),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const exercise = await Exercise.findByPk(id);
      
      if (!exercise) {
        return res.status(404).json({
          success: false,
          message: 'Exercise not found'
        });
      }
      
      // Soft delete by setting isActive to false
      exercise.isActive = false;
      await exercise.save();
      
      return res.status(200).json({
        success: true,
        message: 'Exercise deactivated successfully'
      });
      
    } catch (error) {
      console.error('Error deactivating exercise:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error deactivating exercise',
        error: error.message
      });
    }
});

/**
 * @route GET /api/exercises/type/:exerciseType
 * @desc Get exercises by type
 * @access Private
 */
router.get('/type/:exerciseType',
  authenticateUser,
  async (req, res) => {
    try {
      const { exerciseType } = req.params;
      
      // Validate exercise type
      const validTypes = [
        'core', 
        'balance', 
        'stability', 
        'flexibility', 
        'calisthenics',
        'isolation',
        'stabilizers',
        'injury_prevention',
        'injury_recovery',
        'compound'
      ];
      
      if (!validTypes.includes(exerciseType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid exercise type'
        });
      }
      
      // Get client level to filter unlockable exercises
      let clientLevel = 0;
      if (req.user.role === 'client') {
        const clientProgress = await ClientProgress.findOne({
          where: { userId: req.user.id },
          attributes: ['overallLevel']
        });
        
        if (clientProgress) {
          clientLevel = clientProgress.overallLevel;
        }
      }
      
      // Build where clause
      const where = {
        exerciseType,
        isActive: true
      };
      
      // Add level restriction for clients
      if (req.user.role === 'client') {
        where.unlockLevel = {
          [Op.lte]: clientLevel
        };
      }
      
      const exercises = await Exercise.findAll({
        where,
        order: [['difficulty', 'ASC']]
      });
      
      return res.status(200).json({
        success: true,
        count: exercises.length,
        exercises
      });
      
    } catch (error) {
      console.error('Error fetching exercises by type:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error fetching exercises',
        error: error.message
      });
    }
});

/**
 * @route GET /api/exercises/recommended/:userId
 * @desc Get recommended exercises for a client
 * @access Private
 */
router.get('/recommended/:userId?',
  authenticateUser,
  async (req, res) => {
    try {
      let userId = req.params.userId;
      
      // If userId not provided, use the authenticated user
      if (!userId) {
        userId = req.user.id;
      }
      
      // If a trainer/admin is requesting for a client, validate access
      if (userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'trainer') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access other users\' recommended exercises'
        });
      }
      
      // Get client progress to determine level and focus areas
      const clientProgress = await ClientProgress.findOne({
        where: { userId }
      });
      
      if (!clientProgress) {
        return res.status(404).json({
          success: false,
          message: 'Client progress not found'
        });
      }
      
      // Extract NASM category levels and overall level
      const {
        overallLevel,
        coreLevel,
        balanceLevel,
        stabilityLevel,
        flexibilityLevel,
        calisthenicsLevel,
        isolationLevel,
        stabilizersLevel,
        injuryPreventionLevel,
        injuryRecoveryLevel
      } = clientProgress;
      
      // Determine focus areas based on lower levels (areas that need more work)
      // Create an array of [category, level] pairs and sort by level ascending
      const categoryLevels = [
        ['core', coreLevel || 0],
        ['balance', balanceLevel || 0],
        ['stability', stabilityLevel || 0],
        ['flexibility', flexibilityLevel || 0],
        ['calisthenics', calisthenicsLevel || 0],
        ['isolation', isolationLevel || 0],
        ['stabilizers', stabilizersLevel || 0],
        ['injury_prevention', injuryPreventionLevel || 0],
        ['injury_recovery', injuryRecoveryLevel || 0]
      ].sort((a, b) => a[1] - b[1]);
      
      // Extract the 3 lowest categories to focus on
      const focusCategories = categoryLevels.slice(0, 3).map(item => item[0]);
      
      // Get exercises for these focus categories that are appropriate for the client's level
      // We'll get slightly harder exercises to provide progression
      const recommendedExercises = await Exercise.findAll({
        where: {
          exerciseType: {
            [Op.in]: focusCategories
          },
          difficulty: {
            [Op.between]: [Math.max(0, overallLevel - 20), overallLevel + 30]
          },
          unlockLevel: {
            [Op.lte]: overallLevel
          },
          isActive: true
        },
        order: [['difficulty', 'ASC']],
        limit: 10
      });
      
      // Also get key exercises for tracking progression (squats, lunges, planks, reverse planks)
      // These are fundamental exercises specified in the requirements
      const keyExercises = await Exercise.findAll({
        where: {
          name: {
            [Op.iLike]: {
              [Op.any]: ['%squat%', '%lunge%', '%plank%', '%reverse plank%']
            }
          },
          difficulty: {
            [Op.between]: [Math.max(0, overallLevel - 20), overallLevel + 30]
          },
          unlockLevel: {
            [Op.lte]: overallLevel
          },
          isActive: true
        },
        limit: 4
      });
      
      return res.status(200).json({
        success: true,
        focusCategories,
        recommendedExercises,
        keyExercises
      });
      
    } catch (error) {
      console.error('Error fetching recommended exercises:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error fetching recommended exercises',
        error: error.message
      });
    }
});

/**
 * @route GET /api/exercises/muscle/:muscleGroup
 * @desc Get exercises targeting a specific muscle group
 * @access Private
 */
router.get('/muscle/:muscleGroup',
  authenticateUser,
  async (req, res) => {
    try {
      const { muscleGroup } = req.params;
      
      // Validate muscle group
      const validMuscleGroups = [
        'Glutes',
        'Calves',
        'Shoulders',
        'Hamstrings',
        'Abs',
        'Chest',
        'Biceps',
        'Triceps',
        'Tibialis Anterior',
        'Serratus Anterior',
        'Latissimus Dorsi',
        'Hips',
        'Lower Back',
        'Wrists',
        'Forearms',
        'Neck',
        'Quadriceps',
        'Core'
      ];
      
      if (!validMuscleGroups.includes(muscleGroup)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid muscle group'
        });
      }
      
      // Get client level to filter unlockable exercises
      let clientLevel = 0;
      if (req.user.role === 'client') {
        const clientProgress = await ClientProgress.findOne({
          where: { userId: req.user.id },
          attributes: ['overallLevel']
        });
        
        if (clientProgress) {
          clientLevel = clientProgress.overallLevel;
        }
      }
      
      // First get all exercises that could potentially target this muscle
      const allExercises = await Exercise.findAll({
        where: {
          isActive: true,
          ...(req.user.role === 'client' ? { unlockLevel: { [Op.lte]: clientLevel } } : {})
        }
      });
      
      // Then filter by muscle group using JS since we store muscles as JSON
      const exercises = allExercises.filter(exercise => {
        const primaryMuscles = exercise.primaryMuscles || [];
        const secondaryMuscles = exercise.secondaryMuscles || [];
        
        return primaryMuscles.includes(muscleGroup) || secondaryMuscles.includes(muscleGroup);
      });
      
      // Sort by whether it's a primary or secondary target, then by difficulty
      exercises.sort((a, b) => {
        const aPrimary = (a.primaryMuscles || []).includes(muscleGroup);
        const bPrimary = (b.primaryMuscles || []).includes(muscleGroup);
        
        if (aPrimary && !bPrimary) return -1;
        if (!aPrimary && bPrimary) return 1;
        
        return a.difficulty - b.difficulty;
      });
      
      return res.status(200).json({
        success: true,
        count: exercises.length,
        muscleGroup,
        exercises
      });
      
    } catch (error) {
      console.error('Error fetching exercises by muscle group:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error fetching exercises',
        error: error.message
      });
    }
});

/**
 * @route GET /api/exercises/key-exercises
 * @desc Get key NASM exercises (squats, lunges, planks, reverse planks)
 * @access Private
 */
router.get('/key-exercises',
  authenticateUser,
  async (req, res) => {
    try {
      // Get client level to filter unlockable exercises
      let clientLevel = 0;
      if (req.user.role === 'client') {
        const clientProgress = await ClientProgress.findOne({
          where: { userId: req.user.id },
          attributes: ['overallLevel']
        });
        
        if (clientProgress) {
          clientLevel = clientProgress.overallLevel;
        }
      }
      
      // Find exercises matching the key exercise patterns
      const keyExercises = await Exercise.findAll({
        where: {
          name: {
            [Op.iLike]: {
              [Op.any]: ['%squat%', '%lunge%', '%plank%', '%reverse plank%']
            }
          },
          isActive: true,
          ...(req.user.role === 'client' ? { unlockLevel: { [Op.lte]: clientLevel } } : {})
        },
        order: [['difficulty', 'ASC']]
      });
      
      // Group exercises by category
      const squats = keyExercises.filter(ex => ex.name.toLowerCase().includes('squat'));
      const lunges = keyExercises.filter(ex => ex.name.toLowerCase().includes('lunge'));
      const planks = keyExercises.filter(ex => 
        ex.name.toLowerCase().includes('plank') && 
        !ex.name.toLowerCase().includes('reverse plank')
      );
      const reversePlanks = keyExercises.filter(ex => ex.name.toLowerCase().includes('reverse plank'));
      
      return res.status(200).json({
        success: true,
        keyExercises: {
          squats,
          lunges,
          planks,
          reversePlanks
        }
      });
      
    } catch (error) {
      console.error('Error fetching key exercises:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error fetching key exercises',
        error: error.message
      });
    }
});

/**
 * @route GET /api/exercises/progression/:exerciseId
 * @desc Get exercise progression path (prerequisites and next exercises)
 * @access Private
 */
router.get('/progression/:exerciseId',
  authenticateUser,
  async (req, res) => {
    try {
      const { exerciseId } = req.params;
      
      // Find the target exercise
      const exercise = await Exercise.findByPk(exerciseId);
      
      if (!exercise) {
        return res.status(404).json({
          success: false,
          message: 'Exercise not found'
        });
      }
      
      // Get prerequisites if they exist
      const prerequisites = [];
      if (exercise.prerequisites && exercise.prerequisites.length > 0) {
        const prerequisiteIds = exercise.prerequisites;
        const prerequisiteExercises = await Exercise.findAll({
          where: {
            id: {
              [Op.in]: prerequisiteIds
            },
            isActive: true
          }
        });
        
        prerequisites.push(...prerequisiteExercises);
      }
      
      // Find exercises that have this exercise as a prerequisite
      const nextExercises = await Exercise.findAll({
        where: {
          isActive: true
        }
      });
      
      // Filter exercises that have the current exercise in their prerequisite list
      const filteredNextExercises = nextExercises.filter(ex => {
        const prereqs = ex.prerequisites || [];
        return prereqs.includes(exerciseId);
      });
      
      // Also check progression path if it exists
      let progressionPath = [];
      if (exercise.progressionPath && exercise.progressionPath.length > 0) {
        const progressionIds = exercise.progressionPath;
        const progressionExercises = await Exercise.findAll({
          where: {
            id: {
              [Op.in]: progressionIds
            },
            isActive: true
          },
          order: [['difficulty', 'ASC']]
        });
        
        progressionPath = progressionExercises;
      }
      
      return res.status(200).json({
        success: true,
        exercise,
        prerequisites,
        nextExercises: filteredNextExercises,
        progressionPath
      });
      
    } catch (error) {
      console.error('Error fetching exercise progression:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error fetching exercise progression',
        error: error.message
      });
    }
});

export default router;