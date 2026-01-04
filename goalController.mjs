import { Goal } from '../models/index.cjs';

/**
 * =============================================================================
 * 🎯 Goal Controller
 * =============================================================================
 *
 * Purpose:
 * Handles creating, retrieving, updating, and deleting user life goals.
 *
 * =============================================================================
 */

const goalController = {
  /**
   * @description Get all goals for the logged-in user.
   * @route GET /api/goals
   * @access Private
   */
  async getGoalsForUser(req, res) {
    try {
      const goals = await Goal.findAll({
        where: { userId: req.user.id },
        order: [['createdAt', 'DESC']],
      });
      res.status(200).json(goals);
    } catch (error) {
      console.error('Error fetching goals:', error);
      res.status(500).json({ message: 'Server error while fetching goals.' });
    }
  },

  /**
   * @description Create a new goal for the logged-in user.
   * @route POST /api/goals
   * @access Private
   */
  async createGoal(req, res) {
    const { text } = req.body;
    if (!text || text.trim() === '') {
      return res.status(400).json({ message: 'Goal text is required.' });
    }
    try {
      const newGoal = await Goal.create({
        userId: req.user.id,
        text,
        completed: false,
      });
      res.status(201).json(newGoal);
    } catch (error) {
      console.error('Error creating goal:', error);
      res.status(500).json({ message: 'Server error while creating goal.' });
    }
  },

  /**
   * @description Update a user's goal (e.g., toggle completion).
   * @route PUT /api/goals/:goalId
   * @access Private
   */
  async updateGoal(req, res) {
    const { completed } = req.body;
    try {
      const goal = await Goal.findOne({ where: { id: req.params.goalId, userId: req.user.id } });
      if (!goal) return res.status(404).json({ message: 'Goal not found.' });

      goal.completed = completed;
      await goal.save();
      res.status(200).json(goal);
    } catch (error) {
      console.error('Error updating goal:', error);
      res.status(500).json({ message: 'Server error while updating goal.' });
    }
  },

  /**
   * @description Delete a user's goal.
   * @route DELETE /api/goals/:goalId
   * @access Private
   */
  async deleteGoal(req, res) {
    try {
      const result = await Goal.destroy({ where: { id: req.params.goalId, userId: req.user.id } });
      if (result === 0) return res.status(404).json({ message: 'Goal not found.' });
      res.status(200).json({ message: 'Goal deleted successfully.' });
    } catch (error) {
      console.error('Error deleting goal:', error);
      res.status(500).json({ message: 'Server error while deleting goal.' });
    }
  },
};

export default goalController;