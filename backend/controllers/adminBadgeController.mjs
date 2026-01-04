import { Badge } from '../models/index.mjs';

/**
 * =============================================================================
 * 🛡️ Admin Badge Controller
 * =============================================================================
 *
 * Purpose:
 * Handles admin-only CRUD operations for custom gamification badges.
 *
 * =============================================================================
 */

const adminBadgeController = {
  /**
   * @description Get all custom badges.
   * @route GET /api/admin/badges
   * @access Admin
   */
  async getAllBadges(req, res) {
    try {
      const badges = await Badge.findAll({ order: [['createdAt', 'DESC']] });
      res.status(200).json(badges);
    } catch (error) {
      console.error('Error fetching badges:', error);
      res.status(500).json({ message: 'Server error while fetching badges.' });
    }
  },

  /**
   * @description Create a new custom badge.
   * @route POST /api/admin/badges
   * @access Admin
   */
  async createBadge(req, res) {
    const { name, description, imageUrl, xpReward } = req.body;
    if (!name || !description || !imageUrl) {
      return res.status(400).json({ message: 'Name, description, and imageUrl are required.' });
    }

    try {
      const newBadge = await Badge.create({ name, description, imageUrl, xpReward });
      res.status(201).json(newBadge);
    } catch (error) {
      console.error('Error creating badge:', error);
      res.status(500).json({ message: 'Server error while creating badge.' });
    }
  },

  /**
   * @description Delete a custom badge.
   * @route DELETE /api/admin/badges/:badgeId
   * @access Admin
   */
  async deleteBadge(req, res) {
    try {
      const result = await Badge.destroy({ where: { id: req.params.badgeId } });
      if (result === 0) {
        return res.status(404).json({ message: 'Badge not found.' });
      }
      // In a real app, you might also want to delete the image from cloud storage here.
      res.status(200).json({ message: 'Badge deleted successfully.' });
    } catch (error) {
      console.error('Error deleting badge:', error);
      res.status(500).json({ message: 'Server error while deleting badge.' });
    }
  },
};

export default adminBadgeController;