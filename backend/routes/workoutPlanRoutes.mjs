/**
 * Workout Plan Routes
 * =================
 * API routes for workout plans
 */

import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import { validationMiddleware } from '../middleware/validationMiddleware.mjs';
import { z } from 'zod';

const router = express.Router();

// Import models
import WorkoutPlan from '../models/WorkoutPlan.mjs';
import User from '../models/User.mjs';

/**
 * @route   GET /api/workout/plans
 * @desc    Get all workout plans for a user
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const { 
      userId, 
      status = 'active', 
      page = 1, 
      limit = 10,
      sortBy = 'updatedAt',
      sortDirection = 'desc',
      searchTerm = ''
    } = req.query;
    
    // Build query
    const query = {};
    
    // Add userId filter if provided, otherwise use current user
    if (userId) {
      // Allow trainers and admins to view other users' plans
      if (userId !== req.user.id && !['admin', 'trainer'].includes(req.user.role)) {
        return res.status(403).json({ 
          message: 'You are not authorized to view this user\'s workout plans' 
        });
      }
      query.userId = userId;
    } else {
      query.userId = req.user.id;
    }
    
    // Add status filter if not 'all'
    if (status !== 'all') {
      query.status = status;
    }
    
    // Add search term filter if provided
    if (searchTerm) {
      query.$or = [
        { title: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { tags: { $in: [new RegExp(searchTerm, 'i')] } }
      ];
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Determine sort direction
    const sort = {};
    sort[sortBy] = sortDirection === 'asc' ? 1 : -1;
    
    // Execute query with pagination
    const plans = await WorkoutPlan.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalCount = await WorkoutPlan.countDocuments(query);
    
    res.json({ 
      plans,
      totalCount,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching workout plans:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/workout/plans/:id
 * @desc    Get a specific workout plan
 * @access  Private
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const plan = await WorkoutPlan.findById(req.params.id);
    
    if (!plan) {
      return res.status(404).json({ message: 'Workout plan not found' });
    }
    
    // Check authorization
    if (plan.userId.toString() !== req.user.id && !['admin', 'trainer'].includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'You are not authorized to view this workout plan' 
      });
    }
    
    res.json({ plan });
  } catch (error) {
    console.error('Error fetching workout plan:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Validation schema for creating/updating a workout plan
const planExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  sets: z.number().int().positive(),
  reps: z.string(),
  rest: z.number().int().min(0),
  notes: z.string().optional()
});

const planDaySchema = z.object({
  dayNumber: z.number().int().positive(),
  title: z.string(),
  exercises: z.array(planExerciseSchema)
});

const workoutPlanSchema = z.object({
  userId: z.string(),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string(),
  durationWeeks: z.number().int().positive(),
  status: z.enum(['active', 'archived', 'draft']),
  tags: z.array(z.string()).optional(),
  days: z.array(planDaySchema)
});

/**
 * @route   POST /api/workout/plans
 * @desc    Create a new workout plan
 * @access  Private
 */
router.post('/', 
  protect, 
  validationMiddleware(workoutPlanSchema), 
  async (req, res) => {
    try {
      const planData = req.body;
      
      // Override userId with authenticated user if not admin/trainer
      if (!['admin', 'trainer'].includes(req.user.role)) {
        planData.userId = req.user.id;
      } else {
        // Verify the target user exists if admin/trainer is creating for someone else
        if (planData.userId !== req.user.id) {
          const userExists = await User.findById(planData.userId);
          if (!userExists) {
            return res.status(404).json({ message: 'Target user not found' });
          }
        }
      }
      
      // Create the plan
      const plan = await WorkoutPlan.create(planData);
      
      res.status(201).json({ plan });
    } catch (error) {
      console.error('Error creating workout plan:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

/**
 * @route   PUT /api/workout/plans/:id
 * @desc    Update a workout plan
 * @access  Private
 */
router.put('/:id', 
  protect, 
  validationMiddleware(workoutPlanSchema), 
  async (req, res) => {
    try {
      const planData = req.body;
      
      // Find the plan
      const existingPlan = await WorkoutPlan.findById(req.params.id);
      
      if (!existingPlan) {
        return res.status(404).json({ message: 'Workout plan not found' });
      }
      
      // Check authorization
      if (existingPlan.userId.toString() !== req.user.id && !['admin', 'trainer'].includes(req.user.role)) {
        return res.status(403).json({ 
          message: 'You are not authorized to update this workout plan' 
        });
      }
      
      // Update the plan
      const updatedPlan = await WorkoutPlan.findByIdAndUpdate(
        req.params.id,
        { $set: planData },
        { new: true }
      );
      
      res.json({ plan: updatedPlan });
    } catch (error) {
      console.error('Error updating workout plan:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

/**
 * @route   DELETE /api/workout/plans/:id
 * @desc    Delete a workout plan
 * @access  Private
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    // Find the plan
    const plan = await WorkoutPlan.findById(req.params.id);
    
    if (!plan) {
      return res.status(404).json({ message: 'Workout plan not found' });
    }
    
    // Check authorization
    if (plan.userId.toString() !== req.user.id && !['admin', 'trainer'].includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'You are not authorized to delete this workout plan' 
      });
    }
    
    // Delete the plan
    await WorkoutPlan.findByIdAndDelete(req.params.id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting workout plan:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/workout/plans/clone
 * @desc    Clone an existing workout plan
 * @access  Private
 */
router.post('/clone', protect, async (req, res) => {
  try {
    const { sourcePlanId, overrides = {} } = req.body;
    
    // Find the source plan
    const sourcePlan = await WorkoutPlan.findById(sourcePlanId);
    
    if (!sourcePlan) {
      return res.status(404).json({ message: 'Source workout plan not found' });
    }
    
    // Check authorization
    if (sourcePlan.userId.toString() !== req.user.id && !['admin', 'trainer'].includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'You are not authorized to clone this workout plan' 
      });
    }
    
    // Create a new plan based on the source plan
    const newPlan = {
      ...sourcePlan.toObject(),
      _id: undefined,
      userId: req.user.id, // Set to current user
      title: overrides.title || `Copy of ${sourcePlan.title}`,
      description: overrides.description || sourcePlan.description,
      durationWeeks: overrides.durationWeeks || sourcePlan.durationWeeks,
      createdAt: undefined,
      updatedAt: undefined
    };
    
    // Create the cloned plan
    const plan = await WorkoutPlan.create(newPlan);
    
    res.status(201).json({ plan });
  } catch (error) {
    console.error('Error cloning workout plan:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/workout/plans/:id/archive
 * @desc    Archive a workout plan
 * @access  Private
 */
router.post('/:id/archive', protect, async (req, res) => {
  try {
    // Find the plan
    const plan = await WorkoutPlan.findById(req.params.id);
    
    if (!plan) {
      return res.status(404).json({ message: 'Workout plan not found' });
    }
    
    // Check authorization
    if (plan.userId.toString() !== req.user.id && !['admin', 'trainer'].includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'You are not authorized to archive this workout plan' 
      });
    }
    
    // Update the plan status
    plan.status = 'archived';
    await plan.save();
    
    res.json({ plan });
  } catch (error) {
    console.error('Error archiving workout plan:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/workout/plans/:id/restore
 * @desc    Restore an archived workout plan
 * @access  Private
 */
router.post('/:id/restore', protect, async (req, res) => {
  try {
    // Find the plan
    const plan = await WorkoutPlan.findById(req.params.id);
    
    if (!plan) {
      return res.status(404).json({ message: 'Workout plan not found' });
    }
    
    // Check authorization
    if (plan.userId.toString() !== req.user.id && !['admin', 'trainer'].includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'You are not authorized to restore this workout plan' 
      });
    }
    
    // Update the plan status
    plan.status = 'active';
    await plan.save();
    
    res.json({ plan });
  } catch (error) {
    console.error('Error restoring workout plan:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
