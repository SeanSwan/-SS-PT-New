import { User } from '../models/index.mjs';
import { sequelize } from '../models/index.mjs';

/**
 * =============================================================================
 * 📦 Session Package Controller
 * =============================================================================
 *
 * Purpose:
 * Handles administrative actions related to managing client session packages,
 * such as manually adding or removing session credits.
 *
 * =============================================================================
 */

const sessionPackageController = {
  /**
   * @description Manually add session credits to a client's account.
   * @route POST /api/session-packages/add-sessions/:clientId
   * @access Private (Admin only)
   * @body { "sessions": number, "notes": string }
   */
  async addSessionsToClient(req, res) {
    const { clientId } = req.params;
    const { sessions, notes } = req.body;
    const adminUserId = req.user.id; // Assuming admin user is available from auth middleware

    // --- Validation ---
    if (!clientId) {
      return res.status(400).json({ success: false, message: 'Client ID is required.' });
    }
    const sessionsToAdd = parseInt(sessions, 10);
    if (isNaN(sessionsToAdd) || sessionsToAdd <= 0) {
      return res.status(400).json({ success: false, message: 'A valid, positive number of sessions is required.' });
    }

    const transaction = await sequelize.transaction();

    try {
      // --- Find the client ---
      const client = await User.findByPk(clientId, { transaction });

      if (!client || client.role !== 'client') {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: 'Client not found.' });
      }

      // --- Update client's session counts ---
      // Using Sequelize.literal to perform atomic update in the database
      await client.update({
        sessionsRemaining: sequelize.literal(`"sessionsRemaining" + ${sessionsToAdd}`),
        totalSessionsAllocated: sequelize.literal(`"totalSessionsAllocated" + ${sessionsToAdd}`),
      }, { transaction });

      await transaction.commit();

      // Fetch the updated client to return the new counts
      const updatedClient = await User.findByPk(clientId);

      res.status(200).json({
        success: true,
        message: `${sessionsToAdd} sessions added successfully to ${client.firstName} ${client.lastName}.`,
        data: {
          sessionsRemaining: updatedClient.sessionsRemaining,
          totalSessionsAllocated: updatedClient.totalSessionsAllocated,
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error adding sessions to client:', error);
      res.status(500).json({ success: false, message: 'Server error while adding sessions.' });
    }
  }
};

export default sessionPackageController;