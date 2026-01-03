import { User } from '../models/index.mjs';
import { sequelize } from '../models/index.mjs';

/**
 * =============================================================================
 * 🎯 Admin Controller
 * =============================================================================
 *
 * Purpose:
 * Handles administrative tasks, such as fetching user data, managing platform
 * settings, and viewing analytics.
 *
 * =============================================================================
 */

const adminController = {
  /**
   * @description Get a list of all clients with their remaining session credits.
   * @route GET /api/admin/clients
   * @access Private (Admin only)
   */
  async getAllClientsWithCredits(req, res) {
    try {
      const clients = await User.findAll({
        where: {
          role: 'client'
        },
        attributes: [
          'id',
          'firstName',
          'lastName',
          'sessionsRemaining'
        ],
        order: [
          ['lastName', 'ASC'],
          ['firstName', 'ASC']
        ]
      });

      // Format the data to match the frontend's expected structure
      const formattedClients = clients.map(client => ({
        id: client.id,
        name: `${client.firstName} ${client.lastName}`,
        credits: client.sessionsRemaining ?? 0 // Ensure credits is a number
      }));

      res.status(200).json(formattedClients);
    } catch (error) {
      console.error('Error fetching clients with credits:', error);
      res.status(500).json({ message: 'Server error while fetching client data.' });
    }
  },

  /**
   * @description Update a specific client's remaining session credits.
   * @route PUT /api/admin/clients/:clientId/credits
   * @access Private (Admin only)
   * @body { "sessionsRemaining": number }
   */
  async updateClientCredits(req, res) {
    const { clientId } = req.params;
    const { sessionsRemaining } = req.body;

    const credits = parseInt(sessionsRemaining, 10);
    if (isNaN(credits) || credits < 0) {
      return res.status(400).json({ success: false, message: 'A valid, non-negative number of credits is required.' });
    }

    const transaction = await sequelize.transaction();

    try {
      const client = await User.findByPk(clientId, { transaction });

      if (!client || client.role !== 'client') {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: 'Client not found.' });
      }

      await client.update({ sessionsRemaining: credits }, { transaction });

      await transaction.commit();

      res.status(200).json({
        success: true,
        message: `Successfully updated credits for ${client.firstName} ${client.lastName}.`,
        data: { id: client.id, name: `${client.firstName} ${client.lastName}`, credits: credits }
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error updating client credits:', error);
      res.status(500).json({ success: false, message: 'Server error while updating credits.' });
    }
  },

  /**
   * @description Bulk delete sessions by their IDs
   * @route DELETE /api/admin/sessions/bulk
   * @access Private (Admin only)
   * @body { "sessionIds": number[] }
   */
  async bulkDeleteSessions(req, res) {
    const { sessionIds } = req.body;

    if (!sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Session IDs array is required.' });
    }

    const transaction = await sequelize.transaction();

    try {
      const { Session } = await import('../models/index.mjs');

      const deletedCount = await Session.destroy({
        where: { id: sessionIds },
        transaction
      });

      await transaction.commit();

      res.status(200).json({
        success: true,
        message: `Successfully deleted ${deletedCount} session(s).`,
        deletedCount
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error bulk deleting sessions:', error);
      res.status(500).json({ success: false, message: 'Server error while deleting sessions.' });
    }
  }
};

export default adminController;